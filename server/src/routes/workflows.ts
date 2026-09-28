import { Router } from 'express'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config.js'
import type { AppContext } from '../context.js'
import { stages, topologicalOrder } from '../engine/dag.js'
import { templateIssues } from '../engine/template.js'
import { exportWorkflow, importWorkflow, parseWorkflowFile, workflowToDefinition } from '../workflow/import-export.js'
import { formatZodError, runBodySchema, workflowBodySchema } from '../workflow/schema.js'
import { asyncRoute, HttpError, serializeRun, serializeWorkflow } from './helpers.js'

export function workflowRoutes(ctx: AppContext) {
  const router = Router()

  const validateBody = async (body: unknown) => {
    const parsed = workflowBodySchema.safeParse(body)
    if (!parsed.success) throw new HttpError(400, formatZodError(parsed.error))
    try {
      topologicalOrder(parsed.data.steps.map((s) => ({ id: s.id, dependsOn: s.dependsOn })))
    } catch (err) {
      throw new HttpError(400, (err as Error).message)
    }
    const agentSteps = parsed.data.steps.filter((s) => s.type !== 'approval')
    const ids = [...new Set(agentSteps.map((s) => s.agentId))]
    const found = new Set((await ctx.prisma.agent.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((a) => a.id))
    const orphan = agentSteps.find((s) => !found.has(s.agentId))
    if (orphan) throw new HttpError(400, `step "${orphan.name}" references an agent that does not exist`)
    return { data: parsed.data, warnings: templateIssues(parsed.data) }
  }

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      const workflows = await ctx.prisma.workflow.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { runs: true } }, runs: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, createdAt: true } } },
      })
      res.json(workflows.map((w) => ({ ...serializeWorkflow(w), runCount: w._count.runs, lastRun: w.runs[0] ?? null })))
    }),
  )

  router.post(
    '/validate',
    asyncRoute(async (req, res) => {
      const { data, warnings } = await validateBody(req.body)
      res.json({ ok: true, warnings, stages: stages(data.steps.map((s) => ({ id: s.id, dependsOn: s.dependsOn }))) })
    }),
  )

  router.post(
    '/import',
    asyncRoute(async (req, res) => {
      const { content, run } = req.body as { content?: string; run?: boolean }
      const runBody = runBodySchema.safeParse({ inputs: req.body?.inputs, name: req.body?.name })
      if (!runBody.success) throw new HttpError(400, formatZodError(runBody.error))
      if (typeof content !== 'string') throw new HttpError(400, 'content (string) is required')
      let file
      try {
        file = parseWorkflowFile(content)
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      if (run) {
        // check inputs before touching the database so a bad request creates nothing
        const missing = file.inputs.filter((i) => i.required && !(runBody.data.inputs?.[i.key] || i.default)).map((i) => i.label || i.key)
        if (missing.length) throw new HttpError(400, `required input(s) missing: ${missing.join(', ')}`)
      }
      const result = await importWorkflow(ctx.prisma, file)
      ctx.broadcast.all('workflow:changed', serializeWorkflow(result.workflow))
      let startedRun = null
      if (run) {
        try {
          const created = await ctx.runs.createRun(workflowToDefinition(result.workflow), { workflowId: result.workflow.id, inputs: runBody.data.inputs, name: runBody.data.name })
          void ctx.runs.start(created.id)
          startedRun = serializeRun(created)
        } catch (err) {
          throw new HttpError(400, `workflow imported but could not start: ${(err as Error).message}`)
        }
      }
      res.status(201).json({ workflow: serializeWorkflow(result.workflow), createdAgents: result.createdAgents, warnings: result.warnings, run: startedRun })
    }),
  )

  /** One-click demo: import examples/demo.yaml once (demo agents, no CLI needed) and start a run. */
  router.post(
    '/demo',
    asyncRoute(async (_req, res) => {
      let content: string
      try {
        content = await readFile(path.join(config.examplesDir, 'demo.yaml'), 'utf8')
      } catch {
        throw new HttpError(404, 'the demo workflow file (examples/demo.yaml) is missing')
      }
      const file = parseWorkflowFile(content)
      let workflow = await ctx.prisma.workflow.findFirst({ where: { name: file.name } })
      if (!workflow) {
        const result = await importWorkflow(ctx.prisma, file)
        workflow = result.workflow
        ctx.broadcast.all('workflow:changed', serializeWorkflow(workflow))
        if (result.createdAgents.length) ctx.broadcast.all('agent:changed', { id: '*' })
      }
      let run
      try {
        run = await ctx.runs.createRun(workflowToDefinition(workflow), { workflowId: workflow.id })
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      void ctx.runs.start(run.id)
      res.status(201).json(serializeRun(run))
    }),
  )

  router.post(
    '/preview',
    asyncRoute(async (req, res) => {
      const { content } = req.body as { content?: string }
      if (typeof content !== 'string') throw new HttpError(400, 'content (string) is required')
      try {
        const file = parseWorkflowFile(content)
        const names = [...new Set(file.steps.map((s) => s.agent))]
        const existing = await ctx.prisma.agent.findMany({ select: { name: true } })
        const lower = new Set(existing.map((a) => a.name.toLowerCase()))
        const have = new Set(names.filter((n) => lower.has(n.toLowerCase())))
        const inline = new Map(file.agents.map((a) => [a.name, a]))
        res.json({
          ok: true,
          name: file.name,
          description: file.description,
          inputs: file.inputs,
          steps: file.steps.map((s) => ({ id: s.id, name: s.name, agent: s.agent, dependsOn: s.dependsOn })),
          agents: names.map((n) => {
            const spec = inline.get(n)
            const status = have.has(n) ? 'existing' : spec ? 'create' : 'create-default'
            // show exactly what an imported agent would execute before anything is created
            const detail = status === 'existing' ? undefined : { provider: spec?.provider ?? 'claude-code', model: spec?.model ?? '', command: spec?.command ?? '', autoApprove: spec?.autoApprove ?? true, workDir: spec?.workDir ?? '', location: spec?.location ?? 'local', envKeys: Object.keys(spec?.env ?? {}) }
            return { name: n, status, detail }
          }),
          stages: stages(file.steps.map((s) => ({ id: s.id, dependsOn: s.dependsOn }))),
          warnings: templateIssues(file),
        })
      } catch (err) {
        res.json({ ok: false, error: (err as Error).message })
      }
    }),
  )

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const workflow = await ctx.prisma.workflow.findUnique({ where: { id: req.params.id } })
      if (!workflow) throw new HttpError(404, 'workflow not found')
      res.json(serializeWorkflow(workflow))
    }),
  )

  router.get(
    '/:id/export',
    asyncRoute(async (req, res) => {
      const workflow = await ctx.prisma.workflow.findUnique({ where: { id: req.params.id } })
      if (!workflow) throw new HttpError(404, 'workflow not found')
      const format = req.query.format === 'json' ? 'json' : 'yaml'
      let body
      try {
        body = await exportWorkflow(ctx.prisma, workflow, format, req.query.includeEnv === '1')
      } catch (err) {
        throw new HttpError(409, (err as Error).message)
      }
      res.type(format === 'json' ? 'application/json' : 'text/yaml').send(body)
    }),
  )

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const { data } = await validateBody(req.body)
      const workflow = await ctx.prisma.workflow.create({
        data: { name: data.name, description: data.description, inputs: JSON.stringify(data.inputs), steps: JSON.stringify(data.steps), source: 'ui' },
      })
      ctx.broadcast.all('workflow:changed', serializeWorkflow(workflow))
      res.status(201).json(serializeWorkflow(workflow))
    }),
  )

  router.put(
    '/:id',
    asyncRoute(async (req, res) => {
      const { data } = await validateBody(req.body)
      const workflow = await ctx.prisma.workflow.update({
        where: { id: req.params.id },
        data: { name: data.name, description: data.description, inputs: JSON.stringify(data.inputs), steps: JSON.stringify(data.steps) },
      })
      ctx.broadcast.all('workflow:changed', serializeWorkflow(workflow))
      res.json(serializeWorkflow(workflow))
    }),
  )

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      await ctx.prisma.workflow.delete({ where: { id: req.params.id } })
      ctx.broadcast.all('workflow:deleted', { id: req.params.id })
      res.status(204).end()
    }),
  )

  router.post(
    '/:id/run',
    asyncRoute(async (req, res) => {
      const workflow = await ctx.prisma.workflow.findUnique({ where: { id: req.params.id } })
      if (!workflow) throw new HttpError(404, 'workflow not found')
      const body = runBodySchema.safeParse(req.body ?? {})
      if (!body.success) throw new HttpError(400, formatZodError(body.error))
      let run
      try {
        run = await ctx.runs.createRun(workflowToDefinition(workflow), { workflowId: workflow.id, inputs: body.data.inputs, name: body.data.name })
      } catch (err) {
        throw new HttpError(400, (err as Error).message)
      }
      void ctx.runs.start(run.id)
      res.status(201).json(serializeRun(run))
    }),
  )

  return router
}
