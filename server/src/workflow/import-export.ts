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
  warnings: string[]
}

/**
 * Create a workflow from a parsed file inside one transaction; agents are matched by
 * name (case-insensitive) and created when missing.
 */
export async function importWorkflow(prisma: PrismaClient, file: WorkflowFile): Promise<ImportResult> {
  const createdAgents: ImportResult['createdAgents'] = []
  const warnings: string[] = []
  const inline = new Map(file.agents.map((a) => [a.name, a]))

  const workflow = await prisma.$transaction(async (tx) => {
    const all = await tx.agent.findMany()
    const byLower = new Map(all.map((a) => [a.name.toLowerCase(), a]))
    const agentByName = new Map<string, Agent>()

    for (const name of new Set(file.steps.filter((s) => s.type !== 'approval' && s.agent).map((s) => s.agent))) {
      const existing = byLower.get(name.toLowerCase())
      if (existing) {
        agentByName.set(name, existing)
        continue
      }
      const spec = inline.get(name)
      let runnerId: string | null = null
      let location = spec?.location ?? 'local'
      if (spec?.runner) {
        const runner = await tx.runner.findUnique({ where: { name: spec.runner } })
        runnerId = runner?.id ?? null
        if (runnerId) location = 'remote'
      }
      if (location === 'remote' && !runnerId) {
        warnings.push(`agent "${name}": runner "${spec?.runner ?? ''}" is unknown here; created as a local agent`)
        location = 'local'
      }
      const created = await tx.agent.create({
        data: {
          name,
          description: spec?.description ?? '',
          role: spec?.role ?? '',
          location,
          runnerId: location === 'remote' ? runnerId : null,
          provider: spec?.provider ?? 'claude-code',
          model: spec?.model ?? '',
          effort: spec?.effort ?? 'medium',
          workDir: spec?.workDir ?? '',
          command: spec?.command ?? '',
          extraArgs: JSON.stringify(spec?.extraArgs ?? []),
          env: JSON.stringify(spec?.env ?? {}),
          autoApprove: spec?.autoApprove ?? true,
          timeoutSec: spec?.timeoutSec ?? 1800,
          maxConcurrent: spec?.maxConcurrent ?? 1,
          color: spec?.color ?? '',
        },
      })
      agentByName.set(name, created)
      byLower.set(name.toLowerCase(), created)
      createdAgents.push({ id: created.id, name, defaulted: !spec })
    }

    const steps: WorkflowStep[] = file.steps.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      agentId: s.type === 'approval' ? '' : agentByName.get(s.agent)!.id,
      prompt: s.prompt,
      dependsOn: s.dependsOn,
      expectedOutput: s.expectedOutput,
      model: s.model,
      effort: s.effort as WorkflowStep['effort'],
      timeoutSec: s.timeoutSec,
      retries: s.retries,
      continueOnError: s.continueOnError,
      workDir: s.workDir,
      check: s.check,
      when: s.when,
      assertOutput: s.assertOutput,
    }))

    return tx.workflow.create({
      data: { name: file.name, description: file.description, inputs: JSON.stringify(file.inputs), steps: JSON.stringify(steps), settings: JSON.stringify(file.settings ?? {}), source: 'import' },
    })
  })
  return { workflow, createdAgents, warnings }
}

export const workflowToDefinition = (workflow: Workflow): WorkflowDefinition => ({
  name: workflow.name,
  description: workflow.description,
  inputs: parseJson<WorkflowInput[]>(workflow.inputs, []),
  steps: parseJson<WorkflowStep[]>(workflow.steps, []),
  settings: parseJson(workflow.settings, {}),
})

const compact = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && !v.length))) as Partial<T>

/**
 * Serialize a workflow (and the agents it uses) to a portable YAML/JSON document.
 * Agent env values are omitted unless includeEnv is set (they usually hold API keys).
 */
export async function exportWorkflow(prisma: PrismaClient, workflow: Workflow, format: 'yaml' | 'json', includeEnv = false): Promise<string> {
  const def = workflowToDefinition(workflow)
  const agentSteps = def.steps.filter((s) => s.type !== 'approval')
  const agents = await prisma.agent.findMany({ where: { id: { in: [...new Set(agentSteps.map((s) => s.agentId))] } }, include: { runner: true } })
  const byId = new Map(agents.map((a) => [a.id, a]))
  const missing = agentSteps.filter((s) => !byId.has(s.agentId)).map((s) => s.name)
  if (missing.length) throw new Error(`cannot export: step(s) ${missing.map((m) => `"${m}"`).join(', ')} reference a deleted agent; assign an agent in the editor first`)
  const doc = {
    name: def.name,
    description: def.description || undefined,
    inputs: def.inputs.length ? def.inputs : undefined,
    settings: def.settings?.maxCostUsd ? { maxCostUsd: def.settings.maxCostUsd } : undefined,
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
        env: includeEnv && Object.keys(parseJson<Record<string, string>>(a.env, {})).length ? parseJson(a.env, {}) : undefined,
        autoApprove: a.autoApprove ? undefined : false,
        timeoutSec: a.timeoutSec !== 1800 ? a.timeoutSec : undefined,
        maxConcurrent: a.maxConcurrent > 1 ? a.maxConcurrent : undefined,
        color: a.color,
      }),
    ),
    steps: def.steps.map((s) =>
      compact({
        id: s.id,
        name: s.name,
        type: s.type === 'approval' ? 'approval' : undefined,
        agent: s.type === 'approval' ? undefined : (byId.get(s.agentId)?.name ?? s.agentId),
        dependsOn: s.dependsOn,
        model: s.model,
        effort: s.effort,
        timeoutSec: s.timeoutSec,
        retries: s.retries,
        continueOnError: s.continueOnError || undefined,
        workDir: s.workDir,
        check: s.check,
        when: s.when,
        assertOutput: s.assertOutput,
        expectedOutput: s.expectedOutput,
        prompt: s.prompt,
      }),
    ),
  }
  return format === 'json' ? JSON.stringify(doc, null, 2) : YAML.stringify(doc, { lineWidth: 0 })
}
