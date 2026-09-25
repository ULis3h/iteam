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

/** Buffers log lines per step, persists them in batches and broadcasts them live. */
export class LogWriter {
  private seq = new Map<string, number>()
  private buffer: LogLine[] = []
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly prisma: PrismaClient,
    private readonly broadcast: (line: LogLine) => void,
  ) {}

  async prime(stepId: string) {
    if (this.seq.has(stepId)) return
    const last = await this.prisma.runLog.findFirst({ where: { stepId }, orderBy: { seq: 'desc' }, select: { seq: true } })
    this.seq.set(stepId, last?.seq ?? 0)
  }

  write(runId: string, stepId: string, stream: LogStream, line: string) {
    const seq = (this.seq.get(stepId) ?? 0) + 1
    this.seq.set(stepId, seq)
    const entry: LogLine = { runId, stepId, seq, ts: new Date().toISOString(), stream, line: line.slice(0, 20000) }
    this.buffer.push(entry)
    this.broadcast(entry)
    if (!this.timer) this.timer = setTimeout(() => void this.flush(), 250)
  }

  async flush() {
    this.timer = null
    if (!this.buffer.length) return
    const batch = this.buffer
    this.buffer = []
    try {
      await this.prisma.runLog.createMany({
        data: batch.map((l) => ({ stepId: l.stepId, seq: l.seq, ts: new Date(l.ts), stream: l.stream, line: l.line })),
      })
    } catch (err) {
      console.error('failed to persist logs', err)
    }
  }
}
