import { Router } from 'express'
import { config } from '../config.js'
import { buildJob, DEMO_COMMAND, describeJob } from '../engine/adapters.js'
import type { AgentRuntime, Effort, Provider } from '../engine/types.js'
import type { AppContext } from '../context.js'
import { availableProviderIds, detectCapabilities } from '../engine/capabilities.js'
import type { WorkflowStep } from '../engine/types.js'
import { parseJson } from '../db.js'
import { agentBodySchema, formatZodError } from '../workflow/schema.js'
import { asyncRoute, HttpError, mergeEnv, serializeAgent } from './helpers.js'

export function agentRoutes(ctx: AppContext) {
  const router = Router()

  const withState = async (agents: Parameters<typeof serializeAgent>[0][]) => {
    const caps = availableProviderIds(await detectCapabilities())
    const spend = await ctx.prisma.runStep.groupBy({ by: ['agentId'], _sum: { costUsd: true }, where: { agentId: { in: agents.map((a) => a.id) }, costUsd: { not: null } } })
    const costById = new Map(spend.map((s) => [s.agentId, s._sum.costUsd ?? 0]))
    return agents.map((a) => {
      const busy = ctx.runs.runningCount(a.id)
      const online = a.location === 'local' ? true : ctx.registry.isOnline(a.runnerId)
      const cliAvailable = a.location === 'local'
        ? caps.includes(a.provider)
        : parseJson<string[]>(a.runner?.capabilities ?? '[]', []).includes(a.provider) || a.provider === 'custom'
      const state = !online ? 'offline' : busy ? 'busy' : cliAvailable ? 'ready' : 'missing-cli'
      return { ...serializeAgent(a, a.location === 'remote' ? online : undefined), state, busy, costTotal: costById.get(a.id) ?? 0 }
    })
  }

  /** Workflows whose steps reference the agent (steps are JSON, so this is a scan). */
  const usageOf = async (agentId: string) => {
    const workflows = await ctx.prisma.workflow.findMany({ select: { id: true, name: true, steps: true } })
    return workflows
      .filter((w) => parseJson<WorkflowStep[]>(w.steps, []).some((s) => s.agentId === agentId))
      .map((w) => ({ id: w.id, name: w.name }))
  }

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      const agents = await ctx.prisma.agent.findMany({ orderBy: { createdAt: 'asc' }, include: { runner: true } })
      res.json(await withState(agents))
    }),
  )

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const agent = await ctx.prisma.agent.findUnique({ where: { id: req.params.id }, include: { runner: true } })
      if (!agent) throw new HttpError(404, 'agent not found')
      res.json((await withState([agent]))[0])
    }),
  )

  router.get(
    '/:id/usage',
    asyncRoute(async (req, res) => {
      const workflows = await usageOf(req.params.id)
      const pendingSteps = await ctx.prisma.runStep.count({ where: { agentId: req.params.id, status: { in: ['pending', 'running'] } } })
      res.json({ workflows, pendingSteps })
    }),
  )

  const validate = async (body: unknown, existingId?: string) => {
    const parsed = agentBodySchema.safeParse(body)
    if (!parsed.success) throw new HttpError(400, formatZodError(parsed.error))
    const data = parsed.data
    if (data.provider === 'custom' && !data.command.trim()) throw new HttpError(400, 'custom provider requires a command template')
    if (data.provider === 'demo' && data.location === 'remote') throw new HttpError(400, 'demo agents run on the server; choose "local"')
    if (data.location === 'remote') {
      if (!data.runnerId) throw new HttpError(400, 'remote agents must be bound to a runner')
      const runner = await ctx.prisma.runner.findUnique({ where: { id: data.runnerId } })
      if (!runner) throw new HttpError(400, 'the selected runner does not exist')
    }
    const clash = (await ctx.prisma.agent.findMany({ select: { id: true, name: true } })).find((a) => a.name.toLowerCase() === data.name.toLowerCase() && a.id !== existingId)
    if (clash) throw new HttpError(409, `an agent named "${clash.name}" already exists`)
    return { ...data, runnerId: data.location === 'remote' ? data.runnerId : null, extraArgs: JSON.stringify(data.extraArgs) }
  }

  /** What a (possibly unsaved) agent configuration would execute: shown live in the agent form. */
  router.post(
    '/preview',
    asyncRoute(async (req, res) => {
      const parsed = agentBodySchema.safeParse(req.body)
      if (!parsed.success) throw new HttpError(400, formatZodError(parsed.error))
      const a = parsed.data
      const runtime: AgentRuntime = {
        provider: a.provider as Provider,
        model: a.model,
        effort: a.effort as Effort,
        autoApprove: a.autoApprove,
        extraArgs: a.extraArgs,
        command: a.command,
        env: {},
        workDir: a.workDir || (a.location === 'remote' ? '' : config.defaultWorkDir),
        timeoutSec: a.timeoutSec,
      }
      try {
        const job = buildJob('preview', runtime, '<prompt>')
        res.json({ command: job.cmd === DEMO_COMMAND ? 'built-in demo agent (no process)' : describeJob(job), cwd: runtime.workDir || '(runner directory)', stdin: job.cmd !== DEMO_COMMAND })
      } catch (err) {
        res.json({ error: (err as Error).message })
      }
    }),
  )

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const data = await validate(req.body)
      const agent = await ctx.prisma.agent.create({ data: { ...data, env: JSON.stringify(data.env) }, include: { runner: true } })
      const [payload] = await withState([agent])
      ctx.broadcast.all('agent:changed', payload)
      res.status(201).json(payload)
    }),
  )

  router.put(
    '/:id',
    asyncRoute(async (req, res) => {
      const existing = await ctx.prisma.agent.findUnique({ where: { id: req.params.id } })
      if (!existing) throw new HttpError(404, 'agent not found')
      const data = await validate(req.body, existing.id)
      // masked env values coming back from the UI keep their stored secrets
      const env = mergeEnv(parseJson<Record<string, string>>(existing.env, {}), data.env)
      const agent = await ctx.prisma.agent.update({ where: { id: req.params.id }, data: { ...data, env: JSON.stringify(env) }, include: { runner: true } })
      const [payload] = await withState([agent])
      ctx.broadcast.all('agent:changed', payload)
      res.json(payload)
    }),
  )

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      if (ctx.runs.runningCount(req.params.id) > 0) throw new HttpError(409, 'agent is currently running a step')
      const pending = await ctx.prisma.runStep.count({ where: { agentId: req.params.id, status: { in: ['pending', 'running'] } } })
      if (pending > 0) throw new HttpError(409, `agent has ${pending} pending step(s) in active runs; cancel them first`)
      const usage = await usageOf(req.params.id)
      if (usage.length && req.query.force !== '1') {
        throw new HttpError(409, `agent is used by ${usage.length} workflow(s): ${usage.map((w) => w.name).join(', ')}. Reassign those steps or delete with force=1`, { workflows: usage })
      }
      await ctx.prisma.agent.delete({ where: { id: req.params.id } })
      ctx.broadcast.all('agent:deleted', { id: req.params.id })
      res.status(204).end()
    }),
  )

  return router
}
