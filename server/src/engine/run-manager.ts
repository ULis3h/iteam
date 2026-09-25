import type { PrismaClient, Run, RunStep } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { parseJson } from '../db.js'
import { log } from '../logger.js'
import { buildJob } from './adapters.js'
import { topologicalOrder } from './dag.js'
import { runLocalJob } from './local-executor.js'
import type { LogWriter } from './log-writer.js'
import type { RunnerRegistry } from './runner-registry.js'
import { renderTemplate } from './template.js'
import type { AgentRuntime, Effort, JobHandle, JobResult, Provider, WorkflowDefinition } from './types.js'

export interface RunEvents {
  run: (run: Run) => void
  step: (step: RunStep) => void
}

export interface CreateRunOptions {
  workflowId?: string | null
  inputs?: Record<string, string>
  name?: string
}

const isHardFailure = (s: RunStep) => s.status === 'failed' && !s.continueOnError
const isSatisfied = (s: RunStep) => s.status === 'succeeded' || (s.status === 'failed' && s.continueOnError)

/** Executes runs: resolves the DAG, dispatches steps to local/remote executors, tracks state. */
export class RunManager {
  private active = new Map<string, JobHandle>()
  private runningByAgent = new Map<string, number>()
  private locks = new Map<string, Promise<void>>()

  constructor(
    private readonly prisma: PrismaClient,
    private readonly registry: RunnerRegistry,
    private readonly logs: LogWriter,
    private readonly events: RunEvents,
  ) {}

  runningCount(agentId: string): number {
    return this.runningByAgent.get(agentId) ?? 0
  }

  activeSteps(): number {
    return this.active.size
  }

  // ---------- creation ----------

  async createRun(def: WorkflowDefinition, opts: CreateRunOptions = {}): Promise<Run & { steps: RunStep[] }> {
    if (!def.steps.length) throw new Error('workflow has no steps')
    const order = topologicalOrder(def.steps.map((s) => ({ id: s.id, dependsOn: s.dependsOn })))

    const agentIds = [...new Set(def.steps.map((s) => s.agentId))]
    const agents = await this.prisma.agent.findMany({ where: { id: { in: agentIds } } })
    const agentById = new Map(agents.map((a) => [a.id, a]))
    for (const step of def.steps) {
      if (!agentById.has(step.agentId)) throw new Error(`step "${step.name}" references a missing agent`)
    }

    const inputs: Record<string, string> = {}
    for (const input of def.inputs) {
      const provided = opts.inputs?.[input.key]
      const value = provided !== undefined && provided !== '' ? provided : (input.default ?? '')
      if (input.required && !value) throw new Error(`input "${input.label || input.key}" is required`)
      inputs[input.key] = value
    }
    for (const [k, v] of Object.entries(opts.inputs ?? {})) if (!(k in inputs)) inputs[k] = v

    const run = await this.prisma.run.create({
      data: {
        workflowId: opts.workflowId ?? null,
        name: opts.name?.trim() || def.name,
        status: 'queued',
        inputs: JSON.stringify(inputs),
        snapshot: JSON.stringify(def),
        steps: {
          create: def.steps.map((step) => {
            const agent = agentById.get(step.agentId)!
            return {
              key: step.id,
              name: step.name,
              order: order.indexOf(step.id),
              agentId: agent.id,
              agentName: agent.name,
              dependsOn: JSON.stringify(step.dependsOn),
              maxAttempts: (step.retries ?? 0) + 1,
              continueOnError: !!step.continueOnError,
              provider: agent.provider,
              model: step.model || agent.model,
              effort: step.effort || agent.effort,
              location: agent.location,
              runnerId: agent.location === 'remote' ? agent.runnerId : null,
            }
          }),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    this.events.run(run)
    return run
  }

  // ---------- lifecycle ----------

  async start(runId: string) {
    await this.withLock(runId, async () => {
      const run = await this.prisma.run.findUnique({ where: { id: runId } })
      if (!run || run.status !== 'queued') return
      const updated = await this.prisma.run.update({
        where: { id: runId },
        data: { status: 'running', startedAt: new Date() },
      })
      this.events.run(updated)
    })
    await this.tick(runId)
  }

  async cancel(runId: string) {
    await this.withLock(runId, async () => {
      const run = await this.prisma.run.findUnique({ where: { id: runId }, include: { steps: true } })
      if (!run || !['queued', 'running'].includes(run.status)) return
      for (const step of run.steps) {
        if (step.status === 'running') {
          this.active.get(step.id)?.cancel()
          this.logs.write(run.id, step.id, 'system', 'cancelled by user')
        }
        if (step.status === 'running' || step.status === 'pending') {
          const updated = await this.prisma.runStep.update({
            where: { id: step.id },
            data: { status: 'cancelled', finishedAt: new Date(), error: 'cancelled' },
          })
          this.events.step(updated)
        }
      }
      const updated = await this.prisma.run.update({
        where: { id: runId },
        data: { status: 'cancelled', finishedAt: new Date(), error: 'cancelled by user' },
      })
      this.events.run(updated)
    })
  }

  /** Reset failed / skipped / cancelled steps and continue the run. Succeeded steps keep their output. */
  async retry(runId: string) {
    const existing = await this.prisma.run.findUnique({ where: { id: runId }, select: { status: true } })
    if (!existing) throw new Error('run not found')
    if (!['failed', 'cancelled'].includes(existing.status)) throw new Error('only failed or cancelled runs can be retried')
    await this.withLock(runId, async () => {
      const run = await this.prisma.run.findUnique({ where: { id: runId }, include: { steps: true } })
      if (!run) return
      for (const step of run.steps) {
        if (['failed', 'skipped', 'cancelled'].includes(step.status)) {
          await this.logs.prime(step.id)
          this.logs.write(run.id, step.id, 'system', '— retry requested —')
          const updated = await this.prisma.runStep.update({
            where: { id: step.id },
            data: { status: 'pending', attempt: 0, output: null, error: null, exitCode: null, startedAt: null, finishedAt: null },
          })
          this.events.step(updated)
        }
      }
      const updated = await this.prisma.run.update({
        where: { id: runId },
        data: { status: 'running', error: null, finishedAt: null, startedAt: run.startedAt ?? new Date() },
      })
      this.events.run(updated)
    })
    await this.tick(runId)
  }

  /** Called once at boot: anything left "running" by a previous process cannot be resumed. */
  async recover() {
    const stale = await this.prisma.runStep.updateMany({
      where: { status: 'running' },
      data: { status: 'failed', error: 'server restarted while the step was running', finishedAt: new Date() },
    })
    const runs = await this.prisma.run.updateMany({
      where: { status: 'running' },
      data: { status: 'failed', error: 'server restarted during execution', finishedAt: new Date() },
    })
    if (stale.count || runs.count) log.warn(`recovered ${runs.count} interrupted run(s), ${stale.count} step(s)`)
    const queued = await this.prisma.run.findMany({ where: { status: 'queued' }, select: { id: true } })
    for (const run of queued) void this.start(run.id)
  }

  // ---------- scheduling ----------

  private async tick(runId: string) {
    await this.withLock(runId, async () => {
      const run = await this.prisma.run.findUnique({ where: { id: runId }, include: { steps: { orderBy: { order: 'asc' } } } })
      if (!run || run.status !== 'running') return

      const byKey = new Map(run.steps.map((s) => [s.key, s]))
      for (const step of run.steps) {
        if (step.status !== 'pending') continue
        const deps = parseJson<string[]>(step.dependsOn, []).map((k) => byKey.get(k)).filter(Boolean) as RunStep[]
        const blocker = deps.find((d) => isHardFailure(d) || d.status === 'skipped' || d.status === 'cancelled')
        if (blocker) {
          const updated = await this.prisma.runStep.update({
            where: { id: step.id },
            data: { status: 'skipped', error: `skipped: upstream step "${blocker.name}" ${blocker.status}`, finishedAt: new Date() },
          })
          byKey.set(step.key, updated)
          this.events.step(updated)
          continue
        }
        if (!deps.every(isSatisfied)) continue
        if (this.active.size >= config.maxParallel) break
        const started = await this.startStep(run, step, byKey)
        byKey.set(step.key, started)
      }

      const steps = [...byKey.values()]
      const open = steps.some((s) => s.status === 'pending' || s.status === 'running')
      if (!open) await this.finalize(run.id, steps)
    })
  }

  private async startStep(run: Run & { steps: RunStep[] }, step: RunStep, byKey: Map<string, RunStep>): Promise<RunStep> {
    const def = parseJson<WorkflowDefinition>(run.snapshot, { name: run.name, description: '', inputs: [], steps: [] })
    const stepDef = def.steps.find((s) => s.id === step.key)
    const agent = step.agentId ? await this.prisma.agent.findUnique({ where: { id: step.agentId } }) : null

    const fail = async (error: string) => {
      await this.logs.prime(step.id)
      this.logs.write(run.id, step.id, 'system', error)
      const updated = await this.prisma.runStep.update({
        where: { id: step.id },
        data: { status: 'failed', error, startedAt: new Date(), finishedAt: new Date(), attempt: step.attempt + 1 },
      })
      this.events.step(updated)
      return updated
    }

    if (!stepDef) return fail('step definition missing from run snapshot')
    if (!agent) return fail(`agent "${step.agentName}" no longer exists`)
    if (agent.location === 'remote' && !this.registry.isOnline(agent.runnerId)) {
      return fail(`runner for agent "${agent.name}" is offline`)
    }

    const runtime: AgentRuntime = {
      provider: agent.provider as Provider,
      model: stepDef.model || agent.model,
      effort: (stepDef.effort || agent.effort) as Effort,
      autoApprove: agent.autoApprove,
      extraArgs: parseJson<string[]>(agent.extraArgs, []),
      command: agent.command,
      env: parseJson<Record<string, string>>(agent.env, {}),
      workDir: agent.workDir || (agent.location === 'remote' ? '' : config.defaultWorkDir),
      timeoutSec: stepDef.timeoutSec || agent.timeoutSec,
    }

    const context = {
      inputs: parseJson<Record<string, string>>(run.inputs, {}),
      input: parseJson<Record<string, string>>(run.inputs, {}),
      steps: Object.fromEntries(
        [...byKey.values()].map((s) => [s.key, { output: s.output ?? '', status: s.status, error: s.error ?? '' }]),
      ),
      run: { id: run.id, name: run.name },
      workflow: { name: def.name },
    }
    const rendered = renderTemplate(stepDef.prompt, context)
    const parts: string[] = []
    if (agent.role.trim()) parts.push(agent.role.trim(), '---')
    parts.push(rendered.text.trim())
    if (stepDef.expectedOutput?.trim()) parts.push('---', `Expected output:\n${stepDef.expectedOutput.trim()}`)
    const prompt = parts.join('\n\n')

    let job
    try {
      job = buildJob(randomUUID(), runtime, prompt)
    } catch (err) {
      return fail((err as Error).message)
    }

    const attempt = step.attempt + 1
    const updated = await this.prisma.runStep.update({
      where: { id: step.id },
      data: {
        status: 'running',
        attempt,
        startedAt: new Date(),
        finishedAt: null,
        error: null,
        prompt,
        provider: runtime.provider,
        model: runtime.model,
        effort: runtime.effort,
        location: agent.location,
        runnerId: agent.location === 'remote' ? agent.runnerId : null,
      },
    })
    this.events.step(updated)

    await this.logs.prime(step.id)
    const write = (stream: 'stdout' | 'stderr' | 'system', line: string) => this.logs.write(run.id, step.id, stream, line)
    write('system', `▶ attempt ${attempt}/${step.maxAttempts} · agent ${agent.name} · ${runtime.provider}${runtime.model ? ` / ${runtime.model}` : ''} · effort ${runtime.effort}`)
    if (rendered.missing.length) write('system', `warning: unresolved template variables: ${rendered.missing.join(', ')}`)

    const handlers = {
      onLog: write,
      onDone: (result: JobResult) => void this.onStepDone(run.id, step.id, agent.id, result),
    }
    const handle = agent.location === 'remote'
      ? this.registry.dispatch(agent.runnerId as string, job, handlers)
      : runLocalJob(job, handlers)

    this.active.set(step.id, handle)
    this.runningByAgent.set(agent.id, (this.runningByAgent.get(agent.id) ?? 0) + 1)
    return updated
  }

  private async onStepDone(runId: string, stepId: string, agentId: string, result: JobResult) {
    this.active.delete(stepId)
    this.runningByAgent.set(agentId, Math.max(0, (this.runningByAgent.get(agentId) ?? 1) - 1))

    await this.withLock(runId, async () => {
      const step = await this.prisma.runStep.findUnique({ where: { id: stepId } })
      if (!step || step.status !== 'running') return

      const write = (line: string) => this.logs.write(runId, stepId, 'system', line)
      const success = result.exitCode === 0 && !result.cancelled && !result.timedOut
      let data: Partial<RunStep>

      if (success) {
        write(`✓ finished (exit 0)`)
        data = { status: 'succeeded', output: result.output, exitCode: 0, error: null, finishedAt: new Date() }
      } else if (result.cancelled) {
        data = { status: 'cancelled', output: result.output, exitCode: result.exitCode, error: 'cancelled', finishedAt: new Date() }
      } else if (step.attempt < step.maxAttempts) {
        write(`✗ failed (${result.error ?? `exit ${result.exitCode}`}) · retrying (${step.attempt}/${step.maxAttempts})`)
        data = { status: 'pending', output: result.output, exitCode: result.exitCode, error: result.error ?? null }
      } else {
        write(`✗ failed (${result.error ?? `exit ${result.exitCode}`})`)
        data = { status: 'failed', output: result.output, exitCode: result.exitCode, error: result.error ?? `exit code ${result.exitCode}`, finishedAt: new Date() }
      }

      const updated = await this.prisma.runStep.update({ where: { id: stepId }, data })
      this.events.step(updated)
    })
    await this.logs.flush()
    await this.tick(runId)
  }

  private async finalize(runId: string, steps: RunStep[]) {
    const hardFailed = steps.filter(isHardFailure)
    const cancelled = steps.some((s) => s.status === 'cancelled')
    const status = hardFailed.length ? 'failed' : cancelled ? 'cancelled' : 'succeeded'
    const error = hardFailed.length ? `${hardFailed.length} step(s) failed: ${hardFailed.map((s) => s.name).join(', ')}` : null
    const updated = await this.prisma.run.update({
      where: { id: runId },
      data: { status, error, finishedAt: new Date() },
    })
    this.events.run(updated)
    await this.logs.flush()
  }

  private withLock(runId: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.locks.get(runId) ?? Promise.resolve()
    const next = prev
      .catch(() => undefined)
      .then(fn)
      .catch((err) => log.error(`run ${runId}: ${(err as Error).message}`))
    this.locks.set(runId, next)
    return next
  }
}
