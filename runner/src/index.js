import os from 'node:os'
import { io } from 'socket.io-client'
import { detectProviders } from './detect.js'
import { runJob } from './exec.js'

const VERSION = '1.0.0'
const stamp = () => new Date().toISOString().slice(11, 19)
const log = (msg) => console.log(`${stamp()} ${msg}`)

export async function start(opts) {
  const name = opts.name || os.hostname()
  const capabilities = await detectProviders()
  const url = opts.server.replace(/\/$/, '')

  log(`iteam-runner v${VERSION} · name "${name}" · CLIs: ${capabilities.filter((c) => c !== 'custom').join(', ') || 'none'}`)
  log(`connecting to ${url} ...`)

  const socket = io(`${url}/runner`, {
    transports: ['websocket'],
    auth: { token: opts.token, name, hostname: os.hostname(), os: `${os.type()} ${os.release()}`, arch: os.arch(), version: VERSION, capabilities },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
  })

  const jobs = new Map()

  socket.on('connect', () => log('connected'))
  socket.on('runner:registered', (data) => log(`registered as ${data.name} (${data.id})`))
  socket.on('runner:error', (data) => log(`server error: ${data.message}`))
  socket.on('connect_error', (err) => log(`connection failed: ${err.message}`))
  socket.on('disconnect', (reason) => {
    log(`disconnected (${reason})`)
    for (const [jobId, handle] of jobs) {
      handle.cancel()
      jobs.delete(jobId)
    }
  })

  socket.on('job:run', (job) => {
    log(`▶ job ${job.id.slice(0, 8)}: ${job.shell ? job.cmd : [job.cmd, ...job.args].join(' ')}`)
    const handle = runJob(job, {
      onLog: (stream, line) => socket.emit('job:log', { jobId: job.id, stream, line }),
      onDone: (result) => {
        jobs.delete(job.id)
        log(`${result.exitCode === 0 ? '✓' : '✗'} job ${job.id.slice(0, 8)} finished (exit ${result.exitCode})`)
        socket.emit('job:done', { jobId: job.id, result })
      },
    })
    jobs.set(job.id, handle)
  })

  socket.on('job:cancel', ({ jobId }) => {
    const handle = jobs.get(jobId)
    if (handle) {
      log(`cancelling job ${jobId.slice(0, 8)}`)
      handle.cancel()
    }
  })

  setInterval(() => socket.connected && socket.emit('runner:heartbeat'), 30000).unref()

  const stop = () => {
    log('stopping')
    for (const handle of jobs.values()) handle.cancel()
    socket.close()
    setTimeout(() => process.exit(0), 300)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}
