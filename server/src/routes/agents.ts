import { Router } from 'express'
import type { AppContext } from '../context.js'
import { availableProviderIds, detectCapabilities } from '../engine/capabilities.js'
import { parseJson } from '../db.js'
import { agentBodySchema, formatZodError } from '../workflow/schema.js'
import { asyncRoute, HttpError, serializeAgent } from './helpers.js'

export function agentRoutes(ctx: AppContext) {
  const router = Router()

  const withState = async (agents: Parameters<typeof serializeAgent>[0][]) => {
    const caps = availableProviderIds(await detectCapabilities())
    return agents.map((a) => {
      const busy = ctx.runs.runningCount(a.id)
      const online = a.location === 'local' ? true : ctx.registry.isOnline(a.runnerId)
      const cliAvailable = a.location === 'local'
        ? caps.includes(a.provider)
        : parseJson<string[]>(a.runner?.capabilities ?? '[]', []).includes(a.provider) || a.provider === 'custom'
      const state = !online ? 'offline' : busy ? 'busy' : cliAvailable ? 'ready' : 'missing-cli'
      return { ...serializeAgent(a), state, busy }
    })
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

  const validate = (body: unknown) => {
    const parsed = agentBodySchema.safeParse(body)
    if (!parsed.success) throw new HttpError(400, formatZodError(parsed.error))
    const data = parsed.data
    if (data.provider === 'custom' && !data.command.trim()) throw new HttpError(400, 'custom provider requires a command template')
    if (data.location === 'remote' && !data.runnerId) throw new HttpError(400, 'remote agents must be bound to a runner')
    return {
      ...data,
      runnerId: data.location === 'remote' ? data.runnerId : null,
      extraArgs: JSON.stringify(data.extraArgs),
      env: JSON.stringify(data.env),
    }
  }

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const data = validate(req.body)
      const exists = await ctx.prisma.agent.findUnique({ where: { name: data.name } })
      if (exists) throw new HttpError(409, `an agent named "${data.name}" already exists`)
      const agent = await ctx.prisma.agent.create({ data, include: { runner: true } })
      const [payload] = await withState([agent])
      ctx.broadcast.all('agent:changed', payload)
      res.status(201).json(payload)
    }),
  )

  router.put(
    '/:id',
    asyncRoute(async (req, res) => {
      const data = validate(req.body)
      const clash = await ctx.prisma.agent.findFirst({ where: { name: data.name, NOT: { id: req.params.id } } })
      if (clash) throw new HttpError(409, `an agent named "${data.name}" already exists`)
      const agent = await ctx.prisma.agent.update({ where: { id: req.params.id }, data, include: { runner: true } })
      const [payload] = await withState([agent])
      ctx.broadcast.all('agent:changed', payload)
      res.json(payload)
    }),
  )

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      if (ctx.runs.runningCount(req.params.id) > 0) throw new HttpError(409, 'agent is currently running a step')
      await ctx.prisma.agent.delete({ where: { id: req.params.id } })
      ctx.broadcast.all('agent:deleted', { id: req.params.id })
      res.status(204).end()
    }),
  )

  return router
}
