import type { Agent, Run, RunStep, Runner, Workflow } from '@prisma/client'
import type { Request, Response, NextFunction } from 'express'
import { parseJson } from '../db.js'

export const asyncRoute =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const serializeRunner = (r: Runner) => ({ ...r, capabilities: parseJson<string[]>(r.capabilities, []) })

export const serializeAgent = (a: Agent & { runner?: Runner | null }) => ({
  ...a,
  extraArgs: parseJson<string[]>(a.extraArgs, []),
  env: parseJson<Record<string, string>>(a.env, {}),
  runner: a.runner ? serializeRunner(a.runner) : null,
})

export const serializeWorkflow = (w: Workflow & { _count?: { runs: number } }) => ({
  ...w,
  inputs: parseJson(w.inputs, []),
  steps: parseJson(w.steps, []),
})

export const serializeStep = (s: RunStep) => ({ ...s, dependsOn: parseJson<string[]>(s.dependsOn, []) })

export const serializeRun = (r: Run & { steps?: RunStep[]; workflow?: Workflow | null }) => ({
  ...r,
  inputs: parseJson<Record<string, string>>(r.inputs, {}),
  snapshot: parseJson(r.snapshot, null),
  steps: r.steps ? r.steps.map(serializeStep) : undefined,
  workflow: r.workflow ? { id: r.workflow.id, name: r.workflow.name } : r.workflow,
})
