import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { isAuthLimited, recordAuthFailure, tokenFromRequest, tokenIsValid } from '../auth.js'
import { parseJson } from '../db.js'
import type { WorkflowSettings } from '../engine/types.js'
import { workflowToDefinition } from '../workflow/import-export.js'
import { formatZodError, runBodySchema } from '../workflow/schema.js'
import { config } from '../config.js'
import type { AppContext } from '../context.js'
import { PROVIDERS } from '../engine/adapters.js'
import { detectCapabilities } from '../engine/capabilities.js'
import { EFFORTS } from '../engine/types.js'
import { asyncRoute, HttpError } from './helpers.js'

/** Endpoints reachable without a token: the UI must learn whether a token is required. */
export function publicRoutes(ctx: AppContext) {
  const router = Router()

  router.get('/health', (_req, res) => res.json({ status: 'ok', version: config.version, time: new Date().toISOString() }))

  router.get(
    '/system',
    asyncRoute(async (req, res) => {
      const authorized = tokenIsValid(tokenFromRequest(req))
      const base = { version: config.version, authRequired: !!config.token, providers: PROVIDERS, efforts: EFFORTS }
      if (!authorized) return res.json(base) // nothing about the host leaks before authentication
      const caps = await detectCapabilities(req.query.refresh === '1')
      res.json({
        ...base,
        host: config.host,
        maxParallel: config.maxParallel,
        defaultWorkDir: config.defaultWorkDir,
        platform: process.platform,
        capabilities: caps,
        activeSteps: ctx.runs.activeSteps(),
        retentionDays: config.retentionDays,
        runnerTokenSeparate: config.runnerToken !== config.token,
      })
    }),
  )

  /** Inbound trigger: start a run with the workflow's hook secret instead of a session token. */
  router.post(
    '/hooks/:workflowId/:token',
    asyncRoute(async (req, res) => {
      if (isAuthLimited(req.ip ?? '')) throw new HttpError(429, 'too many failed attempts; try again later')
      const workflow = await ctx.prisma.workflow.findUnique({ where: { id: req.params.workflowId } })
      const expected = workflow ? parseJson<WorkflowSettings>(workflow.settings, {}).hookToken : undefined
      const given = req.params.token
      const ok = !!workflow && !!expected && expected.length === given.length && timingSafeEqual(Buffer.from(expected), Buffer.from(given))
      if (!ok) {
        recordAuthFailure(req.ip ?? '')
        throw new HttpError(404, 'unknown trigger') // do not reveal whether the workflow exists
      }
      const body = runBodySchema.safeParse(req.body ?? {})
      if (!body.success) throw new HttpError(400, formatZodError(body.error))
      let run
      try {
        run = await ctx.runs.createRun(workflowToDefinition(workflow!), { workflowId: workflow!.id, inputs: body.data.inputs, name: body.data.name })
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      void ctx.runs.start(run.id)
      res.status(201).json({ id: run.id, status: run.status, url: `${config.publicUrl}/runs/${run.id}` })
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
      const [cost24h, costTotal] = await Promise.all([
        ctx.prisma.runStep.aggregate({ _sum: { costUsd: true }, where: { finishedAt: { gte: since } } }),
        ctx.prisma.runStep.aggregate({ _sum: { costUsd: true } }),
      ])
      const [agents, workflows, running, failed24h, succeeded24h, recent] = await Promise.all([
        ctx.prisma.agent.count(),
        ctx.prisma.workflow.count(),
        ctx.prisma.run.count({ where: { status: { in: ['running', 'queued', 'waiting'] } } }),
        ctx.prisma.run.count({ where: { status: 'failed', finishedAt: { gte: since } } }),
        ctx.prisma.run.count({ where: { status: 'succeeded', finishedAt: { gte: since } } }),
        ctx.prisma.run.count({ where: { createdAt: { gte: since } } }),
      ])
      res.json({ agents, runnersOnline: ctx.registry.onlineIds().length, workflows, running, failed24h, succeeded24h, runs24h: recent, cost24h: cost24h._sum.costUsd ?? 0, costTotal: costTotal._sum.costUsd ?? 0 })
    }),
  )

  return router
}
