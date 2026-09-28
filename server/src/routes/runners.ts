import { Router } from 'express'
import type { AppContext } from '../context.js'
import { asyncRoute, HttpError, serializeRunner } from './helpers.js'

export function runnerRoutes(ctx: AppContext) {
  const router = Router()

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      const runners = await ctx.prisma.runner.findMany({ orderBy: { createdAt: 'asc' }, include: { _count: { select: { agents: true } } } })
      res.json(runners.map((r) => ({ ...serializeRunner(r, ctx.registry.isOnline(r.id)), agents: r._count.agents, activeJobs: ctx.registry.activeJobs(r.id), maxJobs: ctx.registry.isOnline(r.id) ? ctx.registry.maxJobs(r.id) : r.maxJobs })))
    }),
  )

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      if (ctx.registry.isOnline(req.params.id)) throw new HttpError(409, 'runner is online; stop it before removing')
      await ctx.prisma.runner.delete({ where: { id: req.params.id } })
      ctx.broadcast.all('runner:deleted', { id: req.params.id })
      res.status(204).end()
    }),
  )

  return router
}
