import { Router } from 'express'
import { config } from '../config.js'
import type { AppContext } from '../context.js'
import { PROVIDERS } from '../engine/adapters.js'
import { detectCapabilities } from '../engine/capabilities.js'
import { EFFORTS } from '../engine/types.js'
import { asyncRoute } from './helpers.js'

/** Endpoints reachable without a token: the UI must learn whether a token is required. */
export function publicRoutes(ctx: AppContext) {
  const router = Router()

  router.get('/health', (_req, res) => res.json({ status: 'ok', version: config.version, time: new Date().toISOString() }))

  // Public: the UI needs to know whether a token is required before it can send one.
  router.get(
    '/system',
    asyncRoute(async (req, res) => {
      const caps = await detectCapabilities(req.query.refresh === '1')
      res.json({
        version: config.version,
        authRequired: !!config.token,
        maxParallel: config.maxParallel,
        defaultWorkDir: config.defaultWorkDir,
        platform: process.platform,
        providers: PROVIDERS,
        efforts: EFFORTS,
        capabilities: caps,
        activeSteps: ctx.runs.activeSteps(),
      })
    }),
  )

  return router
}

export function systemRoutes(ctx: AppContext) {
  const router = Router()

  router.post('/auth/verify', (_req, res) => res.json({ ok: true }))

  router.get(
    '/stats',
    asyncRoute(async (_req, res) => {
      const since = new Date(Date.now() - 24 * 3600 * 1000)
      const [agents, runners, workflows, running, failed24h, succeeded24h, recent] = await Promise.all([
        ctx.prisma.agent.count(),
        ctx.prisma.runner.count({ where: { status: 'online' } }),
        ctx.prisma.workflow.count(),
        ctx.prisma.run.count({ where: { status: { in: ['running', 'queued'] } } }),
        ctx.prisma.run.count({ where: { status: 'failed', finishedAt: { gte: since } } }),
        ctx.prisma.run.count({ where: { status: 'succeeded', finishedAt: { gte: since } } }),
        ctx.prisma.run.count({ where: { createdAt: { gte: since } } }),
      ])
      res.json({ agents, runnersOnline: runners, workflows, running, failed24h, succeeded24h, runs24h: recent })
    }),
  )

  return router
}
