import type { PrismaClient } from '@prisma/client'
import type { LogStream } from './types.js'

export interface LogLine {
  runId: string
  stepId: string
  seq: number
  ts: string
  stream: LogStream
  line: string
}

/** Maximum persisted lines per step; beyond it only system lines are kept. */
export const MAX_LINES_PER_STEP = 20_000

/** Buffers log lines per step, persists them in batches and broadcasts them live. */
export class LogWriter {
  private seq = new Map<string, number>()
  private capped = new Set<string>()
  private buffer: LogLine[] = []
  private timer: NodeJS.Timeout | null = null
  private flushing: Promise<void> | null = null

  constructor(
    private readonly prisma: PrismaClient,
    private readonly broadcast: (line: LogLine) => void,
  ) {}

  async prime(stepId: string) {
    if (this.seq.has(stepId)) return
    const last = await this.prisma.runLog.findFirst({ where: { stepId }, orderBy: { seq: 'desc' }, select: { seq: true } })
    this.seq.set(stepId, last?.seq ?? 0)
  }

  /** Drop in-memory bookkeeping for a step that reached a terminal state. */
  forget(stepId: string) {
    this.seq.delete(stepId)
    this.capped.delete(stepId)
  }

  write(runId: string, stepId: string, stream: LogStream, line: string) {
    const seq = (this.seq.get(stepId) ?? 0) + 1
    if (seq > MAX_LINES_PER_STEP) {
      if (stream !== 'system') return
      if (!this.capped.has(stepId)) {
        this.capped.add(stepId)
        this.push(runId, stepId, seq, 'system', `log limit of ${MAX_LINES_PER_STEP} lines reached; further output is not stored`)
        this.seq.set(stepId, seq)
        return
      }
    }
    this.seq.set(stepId, seq)
    this.push(runId, stepId, seq, stream, line)
  }

  private push(runId: string, stepId: string, seq: number, stream: LogStream, line: string) {
    const entry: LogLine = { runId, stepId, seq, ts: new Date().toISOString(), stream, line: line.slice(0, 20000) }
    this.buffer.push(entry)
    this.broadcast(entry)
    if (!this.timer) this.timer = setTimeout(() => void this.flush(), 250)
  }

  async flush(): Promise<void> {
    if (this.flushing) await this.flushing
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (!this.buffer.length) return
    const batch = this.buffer
    this.buffer = []
    this.flushing = this.persist(batch).finally(() => (this.flushing = null))
    await this.flushing
  }

  private async persist(batch: LogLine[]) {
    const rows = batch.map((l) => ({ stepId: l.stepId, seq: l.seq, ts: new Date(l.ts), stream: l.stream, line: l.line }))
    try {
      await this.prisma.runLog.createMany({ data: rows })
      return
    } catch {
      /* fall through to row-by-row so one bad row (e.g. a deleted step) does not lose the batch */
    }
    for (const row of rows) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await this.prisma.runLog.create({ data: row })
          break
        } catch (err) {
          const code = (err as { code?: string }).code
          if (code === 'P2003' || code === 'P2025') break // step no longer exists
          if (attempt === 2) console.error('failed to persist log line', (err as Error).message)
          else await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
        }
      }
    }
  }
}
