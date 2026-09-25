import type { Agent, PrismaClient, Workflow } from '@prisma/client'
import YAML from 'yaml'
import { topologicalOrder } from '../engine/dag.js'
import type { WorkflowDefinition, WorkflowInput, WorkflowStep } from '../engine/types.js'
import { parseJson } from '../db.js'
import { formatZodError, workflowFileSchema, type WorkflowFile } from './schema.js'

export const parseWorkflowFile = (content: string): WorkflowFile => {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('empty file')
  let raw: unknown
  try {
    raw = trimmed.startsWith('{') ? JSON.parse(trimmed) : YAML.parse(trimmed)
  } catch (err) {
    throw new Error(`cannot parse file: ${(err as Error).message}`)
  }
  const result = workflowFileSchema.safeParse(raw)
  if (!result.success) throw new Error(formatZodError(result.error))
  topologicalOrder(result.data.steps.map((s) => ({ id: s.id, dependsOn: s.dependsOn })))
  return result.data
}

export interface ImportResult {
  workflow: Workflow
  createdAgents: Array<{ id: string; name: string; defaulted: boolean }>
}

/** Create a workflow from a parsed file; agents are matched by name and created when missing. */
export async function importWorkflow(prisma: PrismaClient, file: WorkflowFile): Promise<ImportResult> {
  const createdAgents: ImportResult['createdAgents'] = []
  const inline = new Map(file.agents.map((a) => [a.name, a]))
  const agentByName = new Map<string, Agent>()

  for (const name of new Set(file.steps.map((s) => s.agent))) {
    const existing = await prisma.agent.findUnique({ where: { name } })
    if (existing) {
      agentByName.set(name, existing)
      continue
    }
    const spec = inline.get(name)
    let runnerId: string | null = null
    if (spec?.runner) {
      const runner = await prisma.runner.findUnique({ where: { name: spec.runner } })
      runnerId = runner?.id ?? null
    }
    const created = await prisma.agent.create({
      data: {
        name,
        description: spec?.description ?? '',
        role: spec?.role ?? '',
        location: spec?.location ?? (runnerId ? 'remote' : 'local'),
        runnerId,
        provider: spec?.provider ?? 'claude-code',
        model: spec?.model ?? '',
        effort: spec?.effort ?? 'medium',
        workDir: spec?.workDir ?? '',
        command: spec?.command ?? '',
        extraArgs: JSON.stringify(spec?.extraArgs ?? []),
        env: JSON.stringify(spec?.env ?? {}),
        autoApprove: spec?.autoApprove ?? true,
        timeoutSec: spec?.timeoutSec ?? 1800,
      },
    })
    agentByName.set(name, created)
    createdAgents.push({ id: created.id, name, defaulted: !spec })
  }

  const steps: WorkflowStep[] = file.steps.map((s) => ({
    id: s.id,
    name: s.name,
    agentId: agentByName.get(s.agent)!.id,
    prompt: s.prompt,
    dependsOn: s.dependsOn,
    expectedOutput: s.expectedOutput,
    model: s.model,
    effort: s.effort as WorkflowStep['effort'],
    timeoutSec: s.timeoutSec,
    retries: s.retries,
    continueOnError: s.continueOnError,
  }))

  const workflow = await prisma.workflow.create({
    data: {
      name: file.name,
      description: file.description,
      inputs: JSON.stringify(file.inputs),
      steps: JSON.stringify(steps),
      source: 'import',
    },
  })
  return { workflow, createdAgents }
}

export const workflowToDefinition = (workflow: Workflow): WorkflowDefinition => ({
  name: workflow.name,
  description: workflow.description,
  inputs: parseJson<WorkflowInput[]>(workflow.inputs, []),
  steps: parseJson<WorkflowStep[]>(workflow.steps, []),
})

const compact = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && !v.length))) as Partial<T>

/** Serialize a workflow (and the agents it uses) to a portable YAML/JSON document. */
export async function exportWorkflow(prisma: PrismaClient, workflow: Workflow, format: 'yaml' | 'json'): Promise<string> {
  const def = workflowToDefinition(workflow)
  const agents = await prisma.agent.findMany({ where: { id: { in: [...new Set(def.steps.map((s) => s.agentId))] } }, include: { runner: true } })
  const byId = new Map(agents.map((a) => [a.id, a]))
  const doc = {
    name: def.name,
    description: def.description || undefined,
    inputs: def.inputs.length ? def.inputs : undefined,
    agents: agents.map((a) =>
      compact({
        name: a.name,
        description: a.description,
        role: a.role,
        location: a.location === 'remote' ? 'remote' : undefined,
        runner: a.runner?.name,
        provider: a.provider,
        model: a.model,
        effort: a.effort,
        workDir: a.workDir,
        command: a.command,
        extraArgs: parseJson<string[]>(a.extraArgs, []),
        env: Object.keys(parseJson<Record<string, string>>(a.env, {})).length ? parseJson(a.env, {}) : undefined,
        autoApprove: a.autoApprove ? undefined : false,
        timeoutSec: a.timeoutSec !== 1800 ? a.timeoutSec : undefined,
      }),
    ),
    steps: def.steps.map((s) =>
      compact({
        id: s.id,
        name: s.name,
        agent: byId.get(s.agentId)?.name ?? s.agentId,
        dependsOn: s.dependsOn,
        model: s.model,
        effort: s.effort,
        timeoutSec: s.timeoutSec,
        retries: s.retries,
        continueOnError: s.continueOnError || undefined,
        expectedOutput: s.expectedOutput,
        prompt: s.prompt,
      }),
    ),
  }
  return format === 'json' ? JSON.stringify(doc, null, 2) : YAML.stringify(doc, { lineWidth: 0 })
}
