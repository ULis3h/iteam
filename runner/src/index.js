import { realpathSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { io } from 'socket.io-client'
import { detectProviders } from './detect.js'
import { runJob } from './exec.js'

const stamp = () => new Date().toISOString().slice(11, 19)
const log = (msg) => console.log(`${stamp()} ${msg}`)

const MAX_LINE = 20_000
const MAX_BUFFERED_LINES = 2000
/** If the server stays away longer than this, running jobs are stopped (the server gives up earlier). */
const DISCONNECT_GRACE_MS = 120_000

export async function start(opts) {
  const name = opts.name || os.hostname()
  const url = opts.server.replace(/\/$/, '')
  const root = opts.root ? realpathSync(opts.root) : ''
  let capabilities = await detectProviders()
  if (!opts.allowCustom) capabilities = capabilities.filter((c) => c !== 'custom')

  log(`iteam-runner v${opts.version} · name "${name}" · CLIs: ${capabilities.filter((c) => c !== 'custom').join(', ') || 'none'} · max jobs ${opts.maxJobs}`)
  if (root) log(`working directories restricted to ${root}`)
  if (!opts.allowCustom) log('custom shell commands are disabled (--no-custom)')
  log(`connecting to ${url} ...`)

  const jobs = new Map()
  let buffered = 0
  let graceTimer = null

  const socket = io(`${url}/runner`, {
    // evaluated before every (re)connection so the server learns which jobs are still running here
    auth: (cb) => {
      detectProviders()
        .then((caps) => {
          capabilities = opts.allowCustom ? caps : caps.filter((c) => c !== 'custom')
        })
        .catch(() => undefined)
        .finally(() =>
          cb({
            token: opts.token,
            name,
            hostname: os.hostname(),
            os: `${os.type()} ${os.release()}`,
            arch: os.arch(),
            version: opts.version,
            capabilities,
            activeJobs: [...jobs.keys()],
            maxJobs: opts.maxJobs,
          }),
        )
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  })

  const emitLog = (jobId, stream, line) => {
    if (!socket.connected) {
      if (buffered >= MAX_BUFFERED_LINES) return
      buffered++
    }
    socket.emit('job:log', { jobId, stream, line: line.length > MAX_LINE ? `${line.slice(0, MAX_LINE)}…` : line })
  }

  socket.on('connect', () => {
    log(jobs.size ? `connected (${jobs.size} job(s) still running here)` : 'connected')
    buffered = 0
    if (graceTimer) {
      clearTimeout(graceTimer)
      graceTimer = null
    }
  })
  socket.on('runner:registered', (data) => log(`registered as ${data.name} (${data.id})`))
  socket.on('runner:error', (data) => {
    log(`server: ${data?.message ?? 'unknown error'}`)
    if (data?.fatal) {
      socket.close()
      process.exit(2)
    }
  })
  socket.on('connect_error', (err) => {
    log(`connection failed: ${err.message}`)
    if (/token/i.test(err.message)) {
      log('the access token was rejected; check ITEAM_TOKEN / --token')
      socket.close()
      process.exit(2)
    }
    if (/websocket|xhr|timeout/i.test(err.message)) log('hint: is the server reachable and does your proxy allow WebSocket upgrades?')
  })
  socket.on('disconnect', (reason) => {
    log(`disconnected (${reason}); ${jobs.size ? `keeping ${jobs.size} job(s) running while reconnecting` : 'reconnecting'}`)
    if (jobs.size && !graceTimer) {
      graceTimer = setTimeout(() => {
        log(`no connection for ${DISCONNECT_GRACE_MS / 1000}s; stopping ${jobs.size} job(s)`)
        for (const handle of jobs.values()) handle.cancel()
      }, DISCONNECT_GRACE_MS)
      graceTimer.unref()
    }
  })

  socket.on('job:run', (job) => {
    if (!job || typeof job.id !== 'string' || typeof job.cmd !== 'string' || !Array.isArray(job.args)) {
      if (job && typeof job.id === 'string') socket.emit('job:done', { jobId: job.id, result: { exitCode: null, output: '', error: 'invalid job spec' } })
      return
    }
    const reject = (message) => {
      log(`✗ job ${job.id.slice(0, 8)} rejected: ${message}`)
      socket.emit('job:done', { jobId: job.id, result: { exitCode: null, output: '', error: message } })
    }
    if (job.shell && !opts.allowCustom) return reject('this runner does not allow custom shell commands (--no-custom)')
    if (root) {
      let cwd
      try {
        cwd = realpathSync(job.cwd || process.cwd())
      } catch {
        return reject(`working directory does not exist on runner: ${job.cwd}`)
      }
      if (cwd !== root && !cwd.startsWith(root + path.sep)) return reject(`working directory ${cwd} is outside the allowed root ${root}`)
    }
    if (jobs.size >= opts.maxJobs) return reject(`runner is at capacity (${opts.maxJobs} jobs)`)

    log(`▶ job ${job.id.slice(0, 8)}: ${job.shell ? job.cmd : [job.cmd, ...job.args].join(' ')}`)
    const handle = runJob(job, {
      onLog: (stream, line) => emitLog(job.id, stream, line),
      onDone: (result) => {
        jobs.delete(job.id)
        log(`${result.exitCode === 0 ? '✓' : '✗'} job ${job.id.slice(0, 8)} finished (exit ${result.exitCode})`)
        socket.emit('job:done', { jobId: job.id, result })
      },
    })
    jobs.set(job.id, handle)
  })

  socket.on('job:cancel', ({ jobId } = {}) => {
    const handle = jobs.get(jobId)
    if (handle) {
      log(`cancelling job ${String(jobId).slice(0, 8)}`)
      handle.cancel()
    }
  })

  setInterval(() => socket.connected && socket.emit('runner:heartbeat'), 30000).unref()

  let stopping = false
  const stop = async () => {
    if (stopping) return
    stopping = true
    if (jobs.size) {
      log(`stopping ${jobs.size} running job(s)…`)
      for (const handle of jobs.values()) handle.cancel()
      const started = Date.now()
      while (jobs.size && Date.now() - started < 10_000) await new Promise((r) => setTimeout(r, 100))
      if (jobs.size) log(`${jobs.size} job(s) did not exit in time`)
    }
    await new Promise((r) => setTimeout(r, 200)) // let queued job:done events flush
    socket.close()
    process.exit(0)
  }
  process.on('SIGINT', () => void stop())
  process.on('SIGTERM', () => void stop())
}
