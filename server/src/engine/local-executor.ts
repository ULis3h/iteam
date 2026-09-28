import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { shellQuote } from './adapters.js'
import type { JobHandle, JobHandlers, JobSpec, LogStream } from './types.js'

const isWin = process.platform === 'win32'
/** Keep at most this much captured stdout per job (the tail is kept). */
export const MAX_OUTPUT_BYTES = 512 * 1024

/** Splits a byte stream into complete lines, decoding UTF-8 across chunk boundaries. */
export class LineSplitter {
  private rest = ''
  private decoder = new StringDecoder('utf8')
  constructor(private readonly emit: (line: string) => void) {}
  push(chunk: Buffer | string) {
    this.rest += typeof chunk === 'string' ? chunk : this.decoder.write(chunk)
    let idx: number
    while ((idx = this.rest.indexOf('\n')) >= 0) {
      this.emit(this.rest.slice(0, idx).replace(/\r$/, ''))
      this.rest = this.rest.slice(idx + 1)
    }
  }
  flush() {
    this.rest += this.decoder.end()
    if (this.rest) this.emit(this.rest)
    this.rest = ''
  }
}

/** Bounded line buffer that keeps the most recent output. */
export class TailBuffer {
  private lines: string[] = []
  private bytes = 0
  truncated = false
  constructor(private readonly limit = MAX_OUTPUT_BYTES) {}
  push(line: string) {
    this.lines.push(line)
    this.bytes += line.length + 1
    while (this.bytes > this.limit && this.lines.length > 1) {
      const dropped = this.lines.shift() as string
      this.bytes -= dropped.length + 1
      this.truncated = true
    }
  }
  text() {
    return this.lines.join('\n').trim()
  }
  tail(n: number) {
    return this.lines.slice(-n).join('\n').trim()
  }
}

/** Environment handed to agent processes: the orchestrator's own secrets are removed. */
export const childEnv = (extra: Record<string, string>): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue
    if (k.startsWith('ITEAM_') || k === 'DATABASE_URL') continue
    env[k] = v
  }
  return { ...env, ...extra }
}

const fill = (text: string, name: string, value: string) => text.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g'), () => value)

/** Substitute the temp-file placeholders; shell commands get quoted paths. */
export const substituteFiles = (value: string, files: { promptFile: string; outputFile: string }, shell: boolean) => {
  const q = (p: string) => (shell ? shellQuote(p) : p)
  return fill(fill(value, 'promptFile', q(files.promptFile)), 'outputFile', q(files.outputFile))
}

/** Build the spawn arguments; on Windows npm shims (.cmd) need a shell. */
export const spawnSpec = (cmd: string, args: string[], shell: boolean): { file: string; args: string[]; shell: boolean } => {
  if (shell) return { file: cmd, args: [], shell: true }
  if (!isWin) return { file: cmd, args, shell: false }
  const quoted = [cmd, ...args].map((a) => (/[\s"&|<>^%]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ')
  return { file: 'cmd.exe', args: ['/d', '/s', '/c', `"${quoted}"`], shell: false }
}

export const killTree = (child: ChildProcess, signal: NodeJS.Signals) => {
  if (!child.pid) return
  try {
    if (isWin) {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => child.kill())
    } else {
      process.kill(-child.pid, signal)
    }
  } catch {
    try {
      child.kill(signal)
    } catch {
      /* already gone */
    }
  }
}

/** Run a job as a child process on this machine. */
export function runLocalJob(job: JobSpec, handlers: JobHandlers): JobHandle {
  let child: ChildProcess | null = null
  let cancelled = false
  let finished = false
  let timer: NodeJS.Timeout | null = null
  let timedOut = false

  const start = async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'iteam-'))
    const files = { promptFile: path.join(dir, 'prompt.md'), outputFile: path.join(dir, 'output.txt') }
    await writeFile(files.promptFile, job.stdin, 'utf8')

    const cmd = substituteFiles(job.cmd, files, job.shell)
    const args = job.args.map((a) => substituteFiles(a, files, false))
    const stdout = new TailBuffer()
    const stderr = new TailBuffer(64 * 1024)

    const finish = async (exitCode: number | null, error?: string) => {
      if (finished) return
      finished = true
      if (timer) clearTimeout(timer)
      let output = stdout.text()
      if (job.useOutputFile) {
        try {
          const fromFile = (await readFile(files.outputFile, 'utf8')).trim()
          if (fromFile) output = fromFile.length > MAX_OUTPUT_BYTES ? fromFile.slice(-MAX_OUTPUT_BYTES) : fromFile
        } catch {
          /* fall back to stdout */
        }
      }
      await rm(dir, { recursive: true, force: true }).catch(() => undefined)
      handlers.onDone({
        exitCode,
        output,
        error: error ?? (exitCode === 0 ? undefined : stderr.tail(20) || `exit code ${exitCode}`),
        timedOut,
        cancelled,
        truncated: stdout.truncated,
      })
    }

    if (cancelled) return finish(null, 'cancelled before start')
    if (!existsSync(job.cwd)) return finish(null, `working directory does not exist: ${job.cwd}`)

    const spec = spawnSpec(cmd, args, job.shell)
    handlers.onLog('system', `$ ${job.shell ? cmd : [cmd, ...args].join(' ')}`)
    handlers.onLog('system', `cwd: ${job.cwd}`)

    try {
      child = spawn(spec.file, spec.args, {
        cwd: job.cwd,
        env: childEnv(job.env),
        shell: spec.shell,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: !isWin,
        windowsVerbatimArguments: isWin && !spec.shell,
      })
    } catch (err) {
      return finish(null, (err as Error).message)
    }

    const out = new LineSplitter((line) => {
      stdout.push(line)
      handlers.onLog('stdout', line)
    })
    const err = new LineSplitter((line) => {
      stderr.push(line)
      handlers.onLog('stderr', line)
    })
    child.stdout?.on('data', (c) => out.push(c))
    child.stderr?.on('data', (c) => err.push(c))
    child.on('error', (e) => {
      handlers.onLog('system', `process error: ${e.message}`)
      void finish(null, e.message)
    })
    child.on('close', (code) => {
      out.flush()
      err.flush()
      void finish(code, cancelled ? 'cancelled' : timedOut ? `timed out after ${job.timeoutSec}s` : undefined)
    })

    child.stdin?.on('error', () => undefined)
    child.stdin?.end(job.stdin)

    if (job.timeoutSec > 0) {
      timer = setTimeout(() => {
        timedOut = true
        handlers.onLog('system', `timeout (${job.timeoutSec}s) reached, terminating`)
        if (child) killTree(child, 'SIGTERM')
        setTimeout(() => child && !finished && killTree(child, 'SIGKILL'), 5000).unref()
      }, job.timeoutSec * 1000)
    }
  }

  void start()

  return {
    cancel: () => {
      cancelled = true
      if (child && !finished) {
        killTree(child, 'SIGTERM')
        setTimeout(() => child && !finished && killTree(child, 'SIGKILL'), 5000).unref()
      }
    },
  }
}

export type { LogStream }
