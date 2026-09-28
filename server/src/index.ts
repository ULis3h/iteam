import { config, isLoopback } from './config.js'
import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { Server as SocketIOServer } from 'socket.io'
import { requireToken } from './auth.js'
import type { AppContext } from './context.js'
import { initDb, prisma } from './db.js'
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
import { templateRoutes } from './routes/templates.js'
import { workflowRoutes } from './routes/workflows.js'
import { setupSockets } from './ws/index.js'

const corsOptions = { origin: config.corsOrigins.length ? config.corsOrigins : false, credentials: true }

const app = express()
app.set('trust proxy', 'loopback')
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, { cors: corsOptions, maxHttpBufferSize: 5e6 })

const registry = new RunnerRegistry()
const broadcast = setupSockets(io, prisma, registry)
const logs = new LogWriter(prisma, (line) => broadcast.run(line.runId, 'run:log', line))
const runs = new RunManager(prisma, registry, logs, {
  run: (run) => broadcast.all('run:changed', serializeRun(run)),
  step: (step) => {
    const full = serializeStep(step)
    broadcast.run(step.runId, 'step:changed', full)
    // everyone else only needs the status; prompt/output can be large
    const { prompt: _prompt, output: _output, ...slim } = full
    broadcast.all('step:changed', slim)
  },
})
const ctx: AppContext = { prisma, runs, registry, broadcast }

app.use(cors(corsOptions))
app.use(express.json({ limit: '5mb' }))

// Public endpoints, then everything else behind the (optional) token.
app.use('/api', publicRoutes(ctx))
app.use('/api', requireToken)
app.use('/api', systemRoutes(ctx))
app.use('/api/agents', agentRoutes(ctx))
app.use('/api/runners', runnerRoutes(ctx))
app.use('/api/workflows', workflowRoutes(ctx))
app.use('/api/runs', runRoutes(ctx))
app.use('/api/templates', templateRoutes(ctx))

// Serve the built web UI when present (single-port production mode).
if (existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist))
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')))
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  if ((err as { type?: string })?.type === 'entity.too.large') return res.status(413).json({ error: 'request body too large' })
  if ((err as { code?: string })?.code === 'P2025') return res.status(404).json({ error: 'not found' })
  log.error(err instanceof Error ? err.stack ?? err.message : String(err))
  res.status(500).json({ error: 'internal server error' })
})

/** Delete finished runs (and their steps/logs) older than the retention window. */
async function pruneOldRuns(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000)
  const result = await prisma.run.deleteMany({ where: { status: { in: ['succeeded', 'failed', 'cancelled'] }, finishedAt: { lt: cutoff } } })
  return result.count
}

async function boot() {
  await initDb()
  // Runner status lives in memory; anything still marked online is stale after a restart.
  await prisma.runner.updateMany({ where: { status: 'online' }, data: { status: 'offline' } })

  await new Promise<void>((resolve) => httpServer.listen(config.port, config.host, resolve))

  const caps = await detectCapabilities()
  const found = Object.entries(caps.providers).filter(([id, v]) => v.available && id !== 'custom').map(([id]) => id)
  log.info(`iTeam server v${config.version} listening on http://${config.host}:${config.port}`)
  log.info(`access token: ${config.token ? 'required' : 'not set'} · max parallel steps: ${config.maxParallel}`)
  if (!config.token && !isLoopback(config.host)) {
    log.warn('SECURITY: the API is reachable from the network without a token — set ITEAM_TOKEN or bind HOST=127.0.0.1')
  }
  log.info(`local agent CLIs: ${found.length ? found.join(', ') : 'none detected (install claude / codex / gemini, or use remote runners)'}`)

  await runs.recover()

  if (config.retentionDays > 0) {
    const sweep = async () => {
      try {
        const n = await pruneOldRuns(config.retentionDays)
        if (n) log.info(`retention: deleted ${n} run(s) older than ${config.retentionDays} days`)
      } catch (err) {
        log.error(`retention sweep failed: ${(err as Error).message}`)
      }
    }
    void sweep()
    setInterval(() => void sweep(), 24 * 3600 * 1000).unref()
  }
}

let shuttingDown = false
const shutdown = async () => {
  if (shuttingDown) return
  shuttingDown = true
  log.info('shutting down: stopping running agents')
  const force = setTimeout(() => process.exit(0), 10_000)
  force.unref()
  await runs.shutdown()
  await logs.flush()
  await prisma.$disconnect()
  httpServer.close(() => process.exit(0))
}
process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

export { pruneOldRuns }

void boot().catch((err) => {
  log.error(`failed to start: ${(err as Error).message}`)
  process.exit(1)
})
