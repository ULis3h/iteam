import type { Server, Socket } from 'socket.io'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { isAuthLimited, recordAuthFailure, tokenIsValid } from '../auth.js'
import { config } from '../config.js'
import type { Broadcaster } from '../context.js'
import type { RunnerRegistry } from '../engine/runner-registry.js'
import { log } from '../logger.js'
import { serializeRunner } from '../routes/helpers.js'

const guardWith = (expected: string) => (socket: Socket, next: (err?: Error) => void) => {
  const ip = socket.handshake.address ?? 'unknown'
  if (isAuthLimited(ip)) return next(new Error('too many failed authentication attempts'))
  const token = socket.handshake.auth?.token
  if (tokenIsValid(typeof token === 'string' ? token : undefined, expected)) return next()
  recordAuthFailure(ip)
  next(new Error('invalid or missing access token'))
}

const jobLogSchema = z.object({
  jobId: z.string().min(1),
  stream: z.enum(['stdout', 'stderr', 'system', 'event']),
  line: z.string().max(20_000),
})

const jobDoneSchema = z.object({
  jobId: z.string().min(1),
  result: z.object({
    exitCode: z.number().int().nullable(),
    output: z.string().max(2_000_000).default(''),
    error: z.string().max(20_000).optional(),
    timedOut: z.boolean().optional(),
    cancelled: z.boolean().optional(),
    truncated: z.boolean().optional(),
  }),
})

const runnerNameSchema = z.string().trim().min(1).max(80)

export function setupSockets(io: Server, prisma: PrismaClient, registry: RunnerRegistry): Broadcaster {
  const ui = io.of('/ui')
  const runners = io.of('/runner')

  ui.use(guardWith(config.token))
  ui.on('connection', (socket) => {
    socket.on('run:subscribe', (runId: string) => typeof runId === 'string' && socket.join(`run:${runId}`))
    socket.on('run:unsubscribe', (runId: string) => typeof runId === 'string' && socket.leave(`run:${runId}`))
  })

  const broadcast: Broadcaster = {
    all: (event, payload) => ui.emit(event, payload),
    run: (runId, event, payload) => ui.to(`run:${runId}`).emit(event, payload),
  }

  runners.use(guardWith(config.runnerToken))
  runners.on('connection', async (socket) => {
    const auth = socket.handshake.auth ?? {}
    const parsedName = runnerNameSchema.safeParse(auth.name)
    if (!parsedName.success) {
      socket.emit('runner:error', { message: 'runner name is required (1-80 characters)', fatal: true })
      return socket.disconnect(true)
    }
    const name = parsedName.data
    const capabilities = Array.isArray(auth.capabilities) ? auth.capabilities.map(String).slice(0, 20) : []
    const meta = { hostname: String(auth.hostname ?? '').slice(0, 200), os: String(auth.os ?? '').slice(0, 200), arch: String(auth.arch ?? '').slice(0, 40), version: String(auth.version ?? '').slice(0, 40) }
    const runner = await prisma.runner.upsert({
      where: { name },
      update: { status: 'online', ...meta, capabilities: JSON.stringify(capabilities), lastSeen: new Date() },
      create: { name, status: 'online', ...meta, capabilities: JSON.stringify(capabilities) },
    })
    registry.attach(runner.id, socket)
    socket.emit('runner:registered', { id: runner.id, name: runner.name })
    broadcast.all('runner:changed', serializeRunner(runner, true))
    log.info(`runner online: ${runner.name} (${capabilities.filter((c) => c !== 'custom').join(', ') || 'no CLIs detected'})`)

    socket.on('job:log', (data: unknown) => {
      const parsed = jobLogSchema.safeParse(data)
      if (parsed.success) registry.handleLog(socket.id, parsed.data.jobId, parsed.data.stream, parsed.data.line)
    })
    socket.on('job:done', (data: unknown) => {
      const parsed = jobDoneSchema.safeParse(data)
      if (parsed.success) registry.handleDone(socket.id, parsed.data.jobId, parsed.data.result)
      else if (data && typeof data === 'object' && typeof (data as { jobId?: unknown }).jobId === 'string') {
        registry.handleDone(socket.id, (data as { jobId: string }).jobId, { exitCode: null, output: '', error: `runner sent an invalid result: ${parsed.error.issues[0]?.message ?? 'bad payload'}` })
      }
    })
    socket.on('runner:heartbeat', () => {
      void prisma.runner.update({ where: { id: runner.id }, data: { lastSeen: new Date() } }).catch(() => undefined)
    })

    socket.on('disconnect', async () => {
      registry.detach(runner.id, socket.id)
      if (registry.isOnline(runner.id)) return // superseded by a newer connection with the same name
      const updated = await prisma.runner.update({ where: { id: runner.id }, data: { status: 'offline', lastSeen: new Date() } }).catch(() => null)
      if (updated) broadcast.all('runner:changed', serializeRunner(updated, false))
      log.info(`runner offline: ${runner.name}`)
    })
  })

  return broadcast
}
