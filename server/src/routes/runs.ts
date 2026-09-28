import { Router } from 'express'
import type { AppContext } from '../context.js'
import type { WorkflowDefinition } from '../engine/types.js'
import { approvalSchema, followUpSchema, formatZodError, logsQuerySchema, pruneSchema, quickRunSchema, runBodySchema, runListQuerySchema } from '../workflow/schema.js'
import { asyncRoute, HttpError, serializeRun, serializeStep } from './helpers.js'

const parse = <T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: import('zod').ZodError } }, value: unknown): T => {
  const result = schema.safeParse(value)
  if (!result.success) throw new HttpError(400, formatZodError(result.error))
  return result.data
}

export function runRoutes(ctx: AppContext) {
  const router = Router()

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const q = parse(runListQuerySchema, req.query)
      const runs = await ctx.prisma.run.findMany({
        where: {
          ...(q.status ? { status: { in: q.status.split(',').map((s) => s.trim()).filter(Boolean) } } : {}),
          ...(q.workflowId ? { workflowId: q.workflowId } : {}),
          ...(q.before ? { createdAt: { lt: new Date(q.before) } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: q.limit,
        include: { steps: { orderBy: { order: 'asc' }, select: { id: true, key: true, name: true, status: true, agentName: true, order: true, dependsOn: true, startedAt: true, finishedAt: true, costUsd: true } }, workflow: true },
      })
      res.json(runs.map((r) => ({ ...serializeRun({ ...r, steps: undefined }), steps: r.steps.map((s) => ({ ...s, dependsOn: JSON.parse(s.dependsOn) })) })))
    }),
  )

  /** One-off task: run a single prompt on one agent without saving a workflow. */
  router.post(
    '/quick',
    asyncRoute(async (req, res) => {
      const body = parse(quickRunSchema, req.body)
      const agent = await ctx.prisma.agent.findUnique({ where: { id: body.agentId } })
      if (!agent) throw new HttpError(404, 'agent not found')
      const title = body.name || body.prompt.split('\n')[0].slice(0, 60)
      const def: WorkflowDefinition = {
        name: title,
        description: '',
        inputs: [],
        steps: [{ id: 'task', name: title, agentId: agent.id, prompt: body.prompt, dependsOn: [], workDir: body.workDir || undefined }],
      }
      let run
      try {
        run = await ctx.runs.createRun(def, { name: title })
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      void ctx.runs.start(run.id)
      res.status(201).json(serializeRun(run))
    }),
  )

  /** Delete finished runs older than N days (0 = all finished runs). */
  router.post(
    '/prune',
    asyncRoute(async (req, res) => {
      const { days } = parse(pruneSchema, req.body)
      const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000)
      const result = await ctx.prisma.run.deleteMany({ where: { status: { in: ['succeeded', 'failed', 'cancelled'] }, finishedAt: { lt: cutoff } } })
      ctx.broadcast.all('run:deleted', { id: '*' })
      res.json({ deleted: result.count })
    }),
  )

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const run = await ctx.prisma.run.findUnique({ where: { id: req.params.id }, include: { steps: { orderBy: { order: 'asc' } }, workflow: true } })
      if (!run) throw new HttpError(404, 'run not found')
      res.json(serializeRun(run))
    }),
  )

  /** Log lines ordered by (stepId, seq); page with `after` per step and `limit`. */
  router.get(
    '/:id/logs',
    asyncRoute(async (req, res) => {
      const q = parse(logsQuerySchema, req.query)
      const steps = await ctx.prisma.runStep.findMany({ where: { runId: req.params.id, ...(q.stepId ? { id: q.stepId } : {}) }, select: { id: true } })
      const logs = await ctx.prisma.runLog.findMany({
        where: { stepId: { in: steps.map((s) => s.id) }, ...(q.after ? { seq: { gt: q.after } } : {}) },
        orderBy: [{ stepId: 'asc' }, { seq: 'asc' }],
        take: q.limit + 1,
      })
      res.setHeader('X-Has-More', logs.length > q.limit ? '1' : '0')
      res.json(logs.slice(0, q.limit).map((l) => ({ runId: req.params.id, stepId: l.stepId, seq: l.seq, ts: l.ts, stream: l.stream, line: l.line })))
    }),
  )

  router.get(
    '/:id/steps/:stepId',
    asyncRoute(async (req, res) => {
      const step = await ctx.prisma.runStep.findFirst({ where: { id: req.params.stepId, runId: req.params.id } })
      if (!step) throw new HttpError(404, 'step not found')
      res.json(serializeStep(step))
    }),
  )

  /** Continue a finished step's CLI session with a new prompt (recorded as a new run). */
  router.post(
    '/:id/steps/:stepId/followup',
    asyncRoute(async (req, res) => {
      const { prompt } = parse(followUpSchema, req.body)
      const step = await ctx.prisma.runStep.findFirst({ where: { id: req.params.stepId, runId: req.params.id } })
      if (!step) throw new HttpError(404, 'step not found')
      if (!step.agentId) throw new HttpError(400, 'the agent of this step no longer exists')
      if (!step.sessionId) throw new HttpError(400, 'this step has no resumable session')
      if (step.provider !== 'claude-code') throw new HttpError(400, 'follow-ups are currently supported for Claude Code steps only')
      const title = `↩ ${step.name}: ${prompt.split('\n')[0]}`.slice(0, 80)
      const def: WorkflowDefinition = {
        name: title,
        description: '',
        inputs: [],
        steps: [{ id: 'followup', name: title, agentId: step.agentId, prompt, dependsOn: [], resumeSessionId: step.sessionId, model: step.model || undefined, effort: (step.effort || undefined) as WorkflowDefinition['steps'][number]['effort'] }],
      }
      let run
      try {
        run = await ctx.runs.createRun(def, { name: title })
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      void ctx.runs.start(run.id)
      res.status(201).json(serializeRun(run))
    }),
  )

  /** Approve or reject a step that is waiting for a person. */
  router.post(
    '/:id/steps/:stepId/approve',
    asyncRoute(async (req, res) => {
      const body = parse(approvalSchema, req.body ?? {})
      try {
        await ctx.runs.approve(req.params.id, req.params.stepId, body.approved, body.note)
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      const run = await ctx.prisma.run.findUnique({ where: { id: req.params.id }, include: { steps: { orderBy: { order: 'asc' } } } })
      if (!run) throw new HttpError(404, 'run not found')
      res.json(serializeRun(run))
    }),
  )

  /** Re-execute one step and everything downstream of it inside the same run. */
  router.post(
    '/:id/steps/:stepId/rerun-from',
    asyncRoute(async (req, res) => {
      try {
        await ctx.runs.rerunFrom(req.params.id, req.params.stepId)
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      const run = await ctx.prisma.run.findUnique({ where: { id: req.params.id }, include: { steps: { orderBy: { order: 'asc' } } } })
      if (!run) throw new HttpError(404, 'run not found')
      res.json(serializeRun(run))
    }),
  )

  router.post(
    '/:id/cancel',
    asyncRoute(async (req, res) => {
      await ctx.runs.cancel(req.params.id)
      const run = await ctx.prisma.run.findUnique({ where: { id: req.params.id }, include: { steps: { orderBy: { order: 'asc' } } } })
      if (!run) throw new HttpError(404, 'run not found')
      res.json(serializeRun(run))
    }),
  )

  router.post(
    '/:id/retry',
    asyncRoute(async (req, res) => {
      try {
        await ctx.runs.retry(req.params.id)
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      const run = await ctx.prisma.run.findUnique({ where: { id: req.params.id }, include: { steps: { orderBy: { order: 'asc' } } } })
      res.json(serializeRun(run!))
    }),
  )

  /** Start a brand-new run with the same definition and inputs. */
  router.post(
    '/:id/rerun',
    asyncRoute(async (req, res) => {
      const body = parse(runBodySchema, req.body ?? {})
      const source = await ctx.prisma.run.findUnique({ where: { id: req.params.id } })
      if (!source) throw new HttpError(404, 'run not found')
      const def = JSON.parse(source.snapshot) as WorkflowDefinition
      const inputs = { ...(JSON.parse(source.inputs) as Record<string, string>), ...(body.inputs ?? {}) }
      let run
      try {
        run = await ctx.runs.createRun(def, { workflowId: source.workflowId, inputs, name: body.name || source.name })
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      void ctx.runs.start(run.id)
      res.status(201).json(serializeRun(run))
    }),
  )

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      const run = await ctx.prisma.run.findUnique({ where: { id: req.params.id } })
      if (!run) throw new HttpError(404, 'run not found')
      if (['running', 'queued', 'waiting'].includes(run.status)) throw new HttpError(409, 'cancel the run before deleting it')
      await ctx.prisma.run.delete({ where: { id: req.params.id } })
      ctx.broadcast.all('run:deleted', { id: req.params.id })
      res.status(204).end()
    }),
  )

  return router
}
