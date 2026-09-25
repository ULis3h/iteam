import { config } from './config.js'
import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { Server as SocketIOServer } from 'socket.io'
import { requireToken } from './auth.js'
import type { AppContext } from './context.js'
import { prisma } from './db.js'
import { detectCapabilities } from './engine/capabilities.js'
import { LogWriter } from './engine/log-writer.js'
import { RunManager } from './engine/run-manager.js'
import { RunnerRegistry } from './engine/runner-registry.js'
import { log } from './logger.js'
import { agentRoutes } from './routes/agents.js'
import { HttpError, serializeRun, serializeStep } from './routes/helpers.js'
import { runnerRoutes } from './routes/runners.js'
import { runRoutes } from './routes/runs.js'
import { publicRoutes, systemRoutes } from './routes/system.js'
import { workflowRoutes } from './routes/workflows.js'
import { setupSockets } from './ws/index.js'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, { cors: { origin: true, credentials: true }, maxHttpBufferSize: 5e6 })

const registry = new RunnerRegistry()
const broadcast = setupSockets(io, prisma, registry)
const logs = new LogWriter(prisma, (line) => broadcast.run(line.runId, 'run:log', line))
const runs = new RunManager(prisma, registry, logs, {
  run: (run) => broadcast.all('run:changed', serializeRun(run)),
  step: (step) => broadcast.all('step:changed', serializeStep(step)),
})
const ctx: AppContext = { prisma, runs, registry, broadcast }

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '5mb' }))

// Public endpoints, then everything else behind the (optional) token.
app.use('/api', publicRoutes(ctx))
app.use('/api', requireToken)
app.use('/api', systemRoutes(ctx))
app.use('/api/agents', agentRoutes(ctx))
app.use('/api/runners', runnerRoutes(ctx))
app.use('/api/workflows', workflowRoutes(ctx))
app.use('/api/runs', runRoutes(ctx))

// Serve the built web UI when present (single-port production mode).
if (existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist))
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')))
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  const message = err instanceof Error ? err.message : 'internal error'
  if ((err as { code?: string })?.code === 'P2025') return res.status(404).json({ error: 'not found' })
  log.error(message)
  res.status(500).json({ error: message })
})

httpServer.listen(config.port, async () => {
  const caps = await detectCapabilities()
  const found = Object.entries(caps.providers).filter(([id, v]) => v.available && id !== 'custom').map(([id]) => id)
  log.info(`iTeam server v${config.version} listening on http://localhost:${config.port}`)
  log.info(`access token: ${config.token ? 'required' : 'not set (open access)'} · max parallel steps: ${config.maxParallel}`)
  log.info(`local agent CLIs: ${found.length ? found.join(', ') : 'none detected (install claude / codex / gemini, or use remote runners)'}`)
  await runs.recover()
})

const shutdown = async () => {
  log.info('shutting down')
  await logs.flush()
  await prisma.$disconnect()
  httpServer.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 2000).unref()
}
process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
