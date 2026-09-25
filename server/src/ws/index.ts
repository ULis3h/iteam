import type { Server, Socket } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import { tokenIsValid } from '../auth.js'
import type { Broadcaster } from '../context.js'
import type { RunnerRegistry } from '../engine/runner-registry.js'
import type { JobResult, LogStream } from '../engine/types.js'
import { log } from '../logger.js'
import { serializeRunner } from '../routes/helpers.js'

const authGuard = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token ?? socket.handshake.query?.token
  if (tokenIsValid(typeof token === 'string' ? token : undefined)) return next()
  next(new Error('invalid or missing access token'))
}

export function setupSockets(io: Server, prisma: PrismaClient, registry: RunnerRegistry): Broadcaster {
  const ui = io.of('/ui')
  const runners = io.of('/runner')

  ui.use(authGuard)
  ui.on('connection', (socket) => {
    socket.on('run:subscribe', (runId: string) => typeof runId === 'string' && socket.join(`run:${runId}`))
    socket.on('run:unsubscribe', (runId: string) => typeof runId === 'string' && socket.leave(`run:${runId}`))
  })

  const broadcast: Broadcaster = {
    all: (event, payload) => ui.emit(event, payload),
    run: (runId, event, payload) => ui.to(`run:${runId}`).emit(event, payload),
  }

  runners.use(authGuard)
  runners.on('connection', async (socket) => {
    const auth = socket.handshake.auth ?? {}
    const name = String(auth.name || '').trim()
    if (!name) {
      socket.emit('runner:error', { message: 'runner name is required' })
      return socket.disconnect(true)
    }
    const capabilities = Array.isArray(auth.capabilities) ? auth.capabilities.map(String) : []
    const runner = await prisma.runner.upsert({
      where: { name },
      update: { status: 'online', hostname: String(auth.hostname ?? ''), os: String(auth.os ?? ''), arch: String(auth.arch ?? ''), version: String(auth.version ?? ''), capabilities: JSON.stringify(capabilities), lastSeen: new Date() },
      create: { name, status: 'online', hostname: String(auth.hostname ?? ''), os: String(auth.os ?? ''), arch: String(auth.arch ?? ''), version: String(auth.version ?? ''), capabilities: JSON.stringify(capabilities) },
    })
    registry.attach(runner.id, socket)
    socket.emit('runner:registered', { id: runner.id, name: runner.name })
    broadcast.all('runner:changed', serializeRunner(runner))
    log.info(`runner online: ${runner.name} (${capabilities.join(', ') || 'no CLIs detected'})`)

    socket.on('job:log', (data: { jobId: string; stream: LogStream; line: string }) => {
      if (data && typeof data.jobId === 'string') registry.handleLog(data.jobId, data.stream, String(data.line ?? ''))
    })
    socket.on('job:done', (data: { jobId: string; result: JobResult }) => {
      if (data && typeof data.jobId === 'string') registry.handleDone(data.jobId, data.result)
    })
    socket.on('runner:heartbeat', () => {
      void prisma.runner.update({ where: { id: runner.id }, data: { lastSeen: new Date() } }).catch(() => undefined)
    })

    socket.on('disconnect', async () => {
      registry.detach(runner.id, socket.id)
      if (registry.isOnline(runner.id)) return // replaced by a newer connection with the same name
      const updated = await prisma.runner.update({ where: { id: runner.id }, data: { status: 'offline', lastSeen: new Date() } }).catch(() => null)
      if (updated) broadcast.all('runner:changed', serializeRunner(updated))
      log.info(`runner offline: ${runner.name}`)
    })
  })

  return broadcast
}
