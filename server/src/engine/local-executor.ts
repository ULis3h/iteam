import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { JobHandle, JobHandlers, JobSpec, LogStream } from './types.js'

/** Splits a byte stream into complete lines and forwards them. */
export class LineSplitter {
  private rest = ''
  constructor(private readonly emit: (line: string) => void) {}
  push(chunk: Buffer | string) {
    this.rest += chunk.toString()
    let idx: number
    while ((idx = this.rest.indexOf('\n')) >= 0) {
      this.emit(this.rest.slice(0, idx).replace(/\r$/, ''))
      this.rest = this.rest.slice(idx + 1)
    }
  }
  flush() {
    if (this.rest) this.emit(this.rest)
    this.rest = ''
  }
}

const substitute = (value: string, files: { promptFile: string; outputFile: string }) =>
  value
    .replace(/\{\{\s*promptFile\s*\}\}/g, files.promptFile)
    .replace(/\{\{\s*outputFile\s*\}\}/g, files.outputFile)

const killTree = (child: ChildProcess, signal: NodeJS.Signals) => {
  if (!child.pid) return
  try {
    if (process.platform === 'win32') child.kill(signal)
    else process.kill(-child.pid, signal)
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

    const cmd = substitute(job.cmd, files)
    const args = job.args.map((a) => substitute(a, files))
    const stdout: string[] = []
    const stderr: string[] = []

    const finish = async (exitCode: number | null, error?: string) => {
      if (finished) return
      finished = true
      if (timer) clearTimeout(timer)
      let output = stdout.join('\n').trim()
      if (job.useOutputFile) {
        try {
          const fromFile = (await readFile(files.outputFile, 'utf8')).trim()
          if (fromFile) output = fromFile
        } catch {
          /* fall back to stdout */
        }
      }
      await rm(dir, { recursive: true, force: true }).catch(() => undefined)
      handlers.onDone({
        exitCode,
        output,
        error: error ?? (exitCode === 0 ? undefined : stderr.slice(-20).join('\n').trim() || `exit code ${exitCode}`),
        timedOut,
        cancelled,
      })
    }

    if (cancelled) return finish(null, 'cancelled before start')
    if (!existsSync(job.cwd)) return finish(null, `working directory does not exist: ${job.cwd}`)

    handlers.onLog('system', `$ ${job.shell ? cmd : [cmd, ...args].join(' ')}`)
    handlers.onLog('system', `cwd: ${job.cwd}`)

    try {
      child = spawn(cmd, args, {
        cwd: job.cwd,
        env: { ...process.env, ...job.env },
        shell: job.shell,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
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
        setTimeout(() => child && killTree(child, 'SIGKILL'), 5000)
      }, job.timeoutSec * 1000)
    }
  }

  void start()

  return {
    cancel: () => {
      cancelled = true
      if (child && !finished) {
        killTree(child, 'SIGTERM')
        setTimeout(() => child && !finished && killTree(child, 'SIGKILL'), 5000)
      }
    },
  }
}

export type { LogStream }
