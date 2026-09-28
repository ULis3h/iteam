import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { StringDecoder } from 'node:string_decoder'

const isWin = process.platform === 'win32'
const MAX_OUTPUT_BYTES = 512 * 1024
const MAX_DIFF_BYTES = 200 * 1024

const git = (cwd, args, timeoutMs = 10_000) =>
  new Promise((resolve) => {
    let out = ''
    const child = spawn('git', ['-C', cwd, ...args], { stdio: ['ignore', 'pipe', 'ignore'] })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (c) => (out += c.toString()))
    child.on('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0 ? out : null)
    })
  })

/** Best-effort snapshot of the working-tree changes in cwd (empty when clean, null when not a repo). */
export async function captureGitDiff(cwd) {
  const inside = await git(cwd, ['rev-parse', '--is-inside-work-tree'])
  if (!inside || !inside.trim().startsWith('true')) return null
  const [stat, diff, untracked] = await Promise.all([git(cwd, ['diff', '--stat']), git(cwd, ['diff']), git(cwd, ['ls-files', '--others', '--exclude-standard'])])
  const parts = []
  if (stat?.trim()) parts.push(stat.trim())
  if (untracked?.trim()) parts.push(`untracked:\n${untracked.trim().split('\n').slice(0, 200).map((f) => `  ${f}`).join('\n')}`)
  if (diff?.trim()) parts.push(diff.length > MAX_DIFF_BYTES ? `${diff.slice(0, MAX_DIFF_BYTES)}\n… diff truncated (${diff.length} bytes)` : diff.trimEnd())
  return parts.join('\n\n')
}

class LineSplitter {
  constructor(emit) {
    this.emit = emit
    this.rest = ''
    this.decoder = new StringDecoder('utf8')
  }
  push(chunk) {
    this.rest += typeof chunk === 'string' ? chunk : this.decoder.write(chunk)
    let idx
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

class TailBuffer {
  constructor(limit = MAX_OUTPUT_BYTES) {
    this.limit = limit
    this.lines = []
    this.bytes = 0
    this.truncated = false
  }
  push(line) {
    this.lines.push(line)
    this.bytes += line.length + 1
    while (this.bytes > this.limit && this.lines.length > 1) {
      this.bytes -= this.lines.shift().length + 1
      this.truncated = true
    }
  }
  text() {
    return this.lines.join('\n').trim()
  }
  tail(n) {
    return this.lines.slice(-n).join('\n').trim()
  }
}

const shellQuote = (value) => (isWin ? `"${value.replace(/(["%])/g, '^$1')}"` : `'${value.replace(/'/g, `'\\''`)}'`)
const fill = (text, name, value) => text.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g'), () => value)
const substitute = (value, files, shell) => {
  const q = (p) => (shell ? shellQuote(p) : p)
  return fill(fill(value, 'promptFile', q(files.promptFile)), 'outputFile', q(files.outputFile))
}

const PROTECTED_ENV = /^(PATH|NODE_OPTIONS|HOME|SHELL|LD_[A-Z_]+|DYLD_[A-Z_]+|ITEAM_[A-Z_]+|DATABASE_URL)$/

/** Environment for agent processes: the runner's own credentials are removed and loader variables cannot be overridden. */
const childEnv = (extra) => {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || k.startsWith('ITEAM_')) continue
    env[k] = v
  }
  for (const [k, v] of Object.entries(extra ?? {})) if (!PROTECTED_ENV.test(k)) env[k] = String(v)
  return env
}

const spawnSpec = (cmd, args, shell) => {
  if (shell) return { file: cmd, args: [], shell: true }
  if (!isWin) return { file: cmd, args, shell: false }
  const quoted = [cmd, ...args].map((a) => (/[\s"&|<>^%]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ')
  return { file: 'cmd.exe', args: ['/d', '/s', '/c', `"${quoted}"`], shell: false }
}

const killTree = (child, signal) => {
  if (!child.pid) return
  try {
    if (isWin) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => child.kill())
    else process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      /* gone */
    }
  }
}

/**
 * Execute a job spec sent by the server. Mirrors the server's local executor so
 * local and remote agents behave identically.
 */
export function runJob(job, handlers) {
  let child = null
  let cancelled = false
  let finished = false
  let timedOut = false
  let timer = null

  const start = async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'iteam-'))
    const files = { promptFile: path.join(dir, 'prompt.md'), outputFile: path.join(dir, 'output.txt') }
    await writeFile(files.promptFile, job.stdin ?? '', 'utf8')
    const cmd = substitute(job.cmd, files, !!job.shell)
    const args = (job.args ?? []).map((a) => substitute(a, files, false))
    const stdout = new TailBuffer()
    const stderr = new TailBuffer(64 * 1024)
    const cwd = job.cwd || process.cwd()

    const finish = async (exitCode, error) => {
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
      const diff = job.captureDiff && existsSync(cwd) ? await captureGitDiff(cwd) : null
      handlers.onDone({
        exitCode,
        output,
        error: error ?? (exitCode === 0 ? undefined : stderr.tail(20) || `exit code ${exitCode}`),
        timedOut,
        cancelled,
        truncated: stdout.truncated,
        diff: diff ?? undefined,
      })
    }

    if (cancelled) return finish(null, 'cancelled before start')
    if (!existsSync(cwd)) return finish(null, `working directory does not exist on runner: ${cwd}`)
    const spec = spawnSpec(cmd, args, !!job.shell)
    handlers.onLog('system', `$ ${job.shell ? cmd : [cmd, ...args].join(' ')}`)
    handlers.onLog('system', `cwd: ${cwd} (runner ${os.hostname()})`)

    try {
      child = spawn(spec.file, spec.args, {
        cwd,
        env: childEnv(job.env),
        shell: spec.shell,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: !isWin,
        windowsVerbatimArguments: isWin && !spec.shell,
      })
    } catch (err) {
      return finish(null, err.message)
    }

    const out = new LineSplitter((line) => {
      stdout.push(line)
      handlers.onLog('stdout', line)
    })
    const err = new LineSplitter((line) => {
      stderr.push(line)
      handlers.onLog('stderr', line)
    })
    child.stdout.on('data', (c) => out.push(c))
    child.stderr.on('data', (c) => err.push(c))
    child.on('error', (e) => {
      handlers.onLog('system', `process error: ${e.message}`)
      finish(null, e.message)
    })
    child.on('close', (code) => {
      out.flush()
      err.flush()
      finish(code, cancelled ? 'cancelled' : timedOut ? `timed out after ${job.timeoutSec}s` : undefined)
    })
    child.stdin.on('error', () => undefined)
    child.stdin.end(job.stdin ?? '')

    if (job.timeoutSec > 0) {
      timer = setTimeout(() => {
        timedOut = true
        handlers.onLog('system', `timeout (${job.timeoutSec}s) reached, terminating`)
        killTree(child, 'SIGTERM')
        setTimeout(() => child && !finished && killTree(child, 'SIGKILL'), 5000).unref()
      }, job.timeoutSec * 1000)
    }
  }

  start().catch((err) => {
    // setup failures (temp dir, disk) must never take the runner process down
    if (!finished) {
      finished = true
      handlers.onDone({ exitCode: null, output: '', error: `job setup failed: ${err.message}` })
    }
  })

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
