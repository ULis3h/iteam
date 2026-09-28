import type { Agent, Run, RunStep, Runner, Workflow } from '@prisma/client'
import type { Request, Response, NextFunction } from 'express'
import { parseJson } from '../db.js'

export const asyncRoute =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message)
  }
}

/** Placeholder returned instead of agent env values; sending it back keeps the stored value. */
export const ENV_MASK = '••••••••'

export const maskEnv = (env: Record<string, string>): Record<string, string> => Object.fromEntries(Object.keys(env).map((k) => [k, ENV_MASK]))

/** Merge an incoming env map with the stored one: masked values are kept, others replaced. */
export const mergeEnv = (stored: Record<string, string>, incoming: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(incoming).map(([k, v]) => [k, v === ENV_MASK ? (stored[k] ?? '') : v]))

export const serializeRunner = (r: Runner, online?: boolean) => ({
  ...r,
  status: online === undefined ? r.status : online ? 'online' : 'offline',
  capabilities: parseJson<string[]>(r.capabilities, []),
})

export const serializeAgent = (a: Agent & { runner?: Runner | null }, runnerOnline?: boolean) => ({
  ...a,
  extraArgs: parseJson<string[]>(a.extraArgs, []),
  env: maskEnv(parseJson<Record<string, string>>(a.env, {})),
  runner: a.runner ? serializeRunner(a.runner, runnerOnline) : null,
})

export const serializeWorkflow = (w: Workflow & { _count?: { runs: number } }) => ({
  ...w,
  inputs: parseJson(w.inputs, []),
  steps: parseJson(w.steps, []),
})

/** The frozen runtime (which may contain env secrets) never leaves the server. */
export const serializeStep = (s: RunStep) => {
  const { runtime: _runtime, ...rest } = s
  return { ...rest, dependsOn: parseJson<string[]>(s.dependsOn, []) }
}

export const serializeRun = (r: Run & { steps?: RunStep[]; workflow?: Workflow | null }) => ({
  ...r,
  inputs: parseJson<Record<string, string>>(r.inputs, {}),
  snapshot: parseJson(r.snapshot, null),
  steps: r.steps ? r.steps.map(serializeStep) : undefined,
  workflow: r.workflow ? { id: r.workflow.id, name: r.workflow.name } : r.workflow,
})
