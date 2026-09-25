import { Router } from 'express'
import type { AppContext } from '../context.js'
import type { WorkflowDefinition } from '../engine/types.js'
import { asyncRoute, HttpError, serializeRun, serializeStep } from './helpers.js'

export function runRoutes(ctx: AppContext) {
  const router = Router()

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const { status, workflowId } = req.query as Record<string, string | undefined>
      const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)))
      const runs = await ctx.prisma.run.findMany({
        where: { ...(status ? { status: { in: status.split(',') } } : {}), ...(workflowId ? { workflowId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { steps: { orderBy: { order: 'asc' }, select: { id: true, key: true, name: true, status: true, agentName: true, order: true, dependsOn: true, startedAt: true, finishedAt: true } }, workflow: true },
      })
      res.json(runs.map((r) => ({ ...serializeRun({ ...r, steps: undefined }), steps: r.steps.map((s) => ({ ...s, dependsOn: JSON.parse(s.dependsOn) })) })))
    }),
  )

  /** One-off task: run a single prompt on one agent without saving a workflow. */
  router.post(
    '/quick',
    asyncRoute(async (req, res) => {
      const { agentId, prompt, name, workDir } = req.body as { agentId?: string; prompt?: string; name?: string; workDir?: string }
      if (!agentId || !prompt?.trim()) throw new HttpError(400, 'agentId and prompt are required')
      const agent = await ctx.prisma.agent.findUnique({ where: { id: agentId } })
      if (!agent) throw new HttpError(404, 'agent not found')
      const title = name?.trim() || prompt.trim().split('\n')[0].slice(0, 60)
      const def: WorkflowDefinition = {
        name: title,
        description: '',
        inputs: [],
        steps: [{ id: 'task', name: title, agentId, prompt: workDir ? `Working directory: ${workDir}\n\n${prompt}` : prompt, dependsOn: [] }],
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

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const run = await ctx.prisma.run.findUnique({ where: { id: req.params.id }, include: { steps: { orderBy: { order: 'asc' } }, workflow: true } })
      if (!run) throw new HttpError(404, 'run not found')
      res.json(serializeRun(run))
    }),
  )

  router.get(
    '/:id/logs',
    asyncRoute(async (req, res) => {
      const stepId = typeof req.query.stepId === 'string' ? req.query.stepId : undefined
      const after = Number(req.query.after ?? 0)
      const steps = await ctx.prisma.runStep.findMany({ where: { runId: req.params.id, ...(stepId ? { id: stepId } : {}) }, select: { id: true } })
      const logs = await ctx.prisma.runLog.findMany({
        where: { stepId: { in: steps.map((s) => s.id) }, ...(after ? { seq: { gt: after } } : {}) },
        orderBy: [{ stepId: 'asc' }, { seq: 'asc' }],
        take: 20000,
      })
      res.json(logs.map((l) => ({ runId: req.params.id, stepId: l.stepId, seq: l.seq, ts: l.ts, stream: l.stream, line: l.line })))
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
      const source = await ctx.prisma.run.findUnique({ where: { id: req.params.id } })
      if (!source) throw new HttpError(404, 'run not found')
      const def = JSON.parse(source.snapshot) as WorkflowDefinition
      const inputs = { ...(JSON.parse(source.inputs) as Record<string, string>), ...((req.body?.inputs as Record<string, string>) ?? {}) }
      let run
      try {
        run = await ctx.runs.createRun(def, { workflowId: source.workflowId, inputs, name: source.name })
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
      if (['running', 'queued'].includes(run.status)) throw new HttpError(409, 'cancel the run before deleting it')
      await ctx.prisma.run.delete({ where: { id: req.params.id } })
      ctx.broadcast.all('run:deleted', { id: req.params.id })
      res.status(204).end()
    }),
  )

  return router
}
