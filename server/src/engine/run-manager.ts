import type { Agent, PrismaClient, Run, RunStep } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { config } from '../config.js'
import { parseJson } from '../db.js'
import { log } from '../logger.js'
import { buildJob } from './adapters.js'
import { topologicalOrder } from './dag.js'
import { runLocalJob } from './local-executor.js'
import type { LogWriter } from './log-writer.js'
import { createParser, type ParserKind, type StepUsage } from './parsers.js'
import type { RunnerRegistry } from './runner-registry.js'
import { renderTemplate } from './template.js'
import type { AgentRuntime, Effort, JobHandle, JobResult, LogStream, Provider, WorkflowDefinition, WorkflowStep } from './types.js'

export interface RunEvents {
  run: (run: Run) => void
  step: (step: RunStep) => void
}

export interface CreateRunOptions {
  workflowId?: string | null
  inputs?: Record<string, string>
  name?: string
}

/** Everything a step needs to execute, frozen on the RunStep when the run is created. */
export interface StepRuntime extends AgentRuntime {
  agentId: string
  agentName: string
  role: string
  location: 'local' | 'remote'
  runnerId: string | null
  maxConcurrent: number
}

interface ActiveJob {
  jobId: string
  runId: string
  agentId: string
  handle: JobHandle | null
}

const isHardFailure = (s: RunStep) => s.status === 'failed' && !s.continueOnError
const isSatisfied = (s: RunStep) => s.status === 'succeeded' || (s.status === 'failed' && s.continueOnError)
const backoffMs = (attempt: number) => Math.min(30_000, 1000 * 2 ** Math.max(0, attempt - 1))

export const resolveRuntime = (agent: Agent, step: Pick<WorkflowStep, 'model' | 'effort' | 'timeoutSec' | 'workDir' | 'resumeSessionId'>): StepRuntime => ({
  agentId: agent.id,
  agentName: agent.name,
  role: agent.role,
  location: agent.location === 'remote' ? 'remote' : 'local',
  runnerId: agent.location === 'remote' ? agent.runnerId : null,
  maxConcurrent: Math.max(1, agent.maxConcurrent || 1),
  provider: agent.provider as Provider,
  model: step.model || agent.model,
  effort: (step.effort || agent.effort) as Effort,
  autoApprove: agent.autoApprove,
  extraArgs: parseJson<string[]>(agent.extraArgs, []),
  command: agent.command,
  env: parseJson<Record<string, string>>(agent.env, {}),
  workDir: step.workDir || agent.workDir || (agent.location === 'remote' ? '' : config.defaultWorkDir),
  timeoutSec: step.timeoutSec || agent.timeoutSec,
  resumeSessionId: step.resumeSessionId,
})

/**
 * Executes runs: resolves the DAG, dispatches steps to local/remote executors and
 * tracks state. Invariants: every completion is correlated with the job that produced
 * it (stale results after cancel/retry are ignored), capacity is reserved before any
 * await, and runs deferred by capacity are re-scheduled when any step finishes.
 */
export class RunManager {
  private active = new Map<string, ActiveJob>() // stepId -> job in flight
  private stopping = new Map<string, string>() // stepId -> jobId being killed
  private reserved = 0
  private runningByAgent = new Map<string, number>()
  private waiting = new Set<string>() // runs with ready steps deferred by capacity
  private retryAfter = new Map<string, number>()
  private locks = new Map<string, Promise<void>>()
  private closed = false

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

  hasActiveSteps(runId: string): boolean {
    for (const job of this.active.values()) if (job.runId === runId) return true
    return false
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
            const runtime = resolveRuntime(agent, step)
            return {
              key: step.id,
              name: step.name,
              order: order.indexOf(step.id),
              agentId: agent.id,
              agentName: agent.name,
              dependsOn: JSON.stringify(step.dependsOn),
              maxAttempts: (step.retries ?? 0) + 1,
              continueOnError: !!step.continueOnError,
              provider: runtime.provider,
              model: runtime.model,
              effort: runtime.effort,
              location: runtime.location,
              runnerId: runtime.runnerId,
              runtime: JSON.stringify(runtime),
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
      const updated = await this.prisma.run.update({ where: { id: runId }, data: { status: 'running', startedAt: new Date() } })
      this.events.run(updated)
    })
    await this.tick(runId)
  }

  async cancel(runId: string, reason = 'cancelled by user') {
    await this.withLock(runId, async () => {
      const run = await this.prisma.run.findUnique({ where: { id: runId }, include: { steps: true } })
      if (!run || !['queued', 'running'].includes(run.status)) return
      for (const step of run.steps) {
        if (step.status === 'running') {
          this.stopJob(step.id)
          this.logs.write(run.id, step.id, 'system', reason)
        }
        if (step.status === 'running' || step.status === 'pending') {
          this.retryAfter.delete(step.id)
          const updated = await this.prisma.runStep.update({
            where: { id: step.id },
            data: { status: 'cancelled', finishedAt: new Date(), error: 'cancelled' },
          })
          this.events.step(updated)
        }
      }
      const updated = await this.prisma.run.update({ where: { id: runId }, data: { status: 'cancelled', finishedAt: new Date(), error: reason } })
      this.waiting.delete(runId)
      this.events.run(updated)
    })
    await this.logs.flush()
    void this.tickWaiting()
  }

  /** Reset failed / skipped / cancelled steps and continue the run. Succeeded steps keep their output. */
  async retry(runId: string) {
    const existing = await this.prisma.run.findUnique({ where: { id: runId }, select: { status: true } })
    if (!existing) throw new Error('run not found')
    if (!['failed', 'cancelled'].includes(existing.status)) throw new Error('only failed or cancelled runs can be retried')
    await this.waitForStopping(runId)
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

  /** Stop every running job before the process exits so agents do not keep editing workspaces. */
  async shutdown() {
    this.closed = true
    const runIds = new Set([...this.active.values()].map((j) => j.runId))
    for (const runId of runIds) await this.cancel(runId, 'server shutting down')
    await this.logs.flush()
  }

  // ---------- scheduling ----------

  private slots(): number {
    return this.active.size + this.reserved
  }

  private async tickWaiting() {
    for (const runId of [...this.waiting]) await this.tick(runId)
  }

  private async tick(runId: string) {
    if (this.closed) return
    await this.withLock(runId, async () => {
      const run = await this.prisma.run.findUnique({ where: { id: runId }, include: { steps: { orderBy: { order: 'asc' } } } })
      if (!run || run.status !== 'running') {
        this.waiting.delete(runId)
        return
      }

      const byKey = new Map(run.steps.map((s) => [s.key, s]))
      let deferred = false
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

        const notBefore = this.retryAfter.get(step.id)
        if (notBefore && notBefore > Date.now()) {
          deferred = true
          continue
        }
        if (this.slots() >= config.maxParallel) {
          deferred = true
          break
        }
        const runtime = this.runtimeOf(step)
        const agentKey = runtime?.agentId ?? step.agentId
        if (agentKey && (this.runningByAgent.get(agentKey) ?? 0) >= (runtime?.maxConcurrent ?? 1)) {
          deferred = true
          continue
        }
        if (runtime?.location === 'remote' && this.registry.isOnline(runtime.runnerId) && !this.registry.hasCapacity(runtime.runnerId)) {
          deferred = true // the runner is busy; try again when a job finishes
          continue
        }

        this.reserved++
        let started: RunStep
        try {
          started = await this.startStep(run, step, byKey, runtime)
        } catch (err) {
          started = await this.failStep(run, step, `internal error: ${(err as Error).message}`, false)
        } finally {
          this.reserved--
        }
        byKey.set(step.key, started)
      }

      if (deferred) this.waiting.add(runId)
      else this.waiting.delete(runId)

      const steps = [...byKey.values()]
      const open = steps.some((s) => s.status === 'pending' || s.status === 'running')
      if (!open) await this.finalize(run.id, steps)
    })
  }

  private runtimeOf(step: RunStep): StepRuntime | null {
    const parsed = parseJson<Partial<StepRuntime> | null>(step.runtime, null)
    return parsed && parsed.provider ? (parsed as StepRuntime) : null
  }

  private async startStep(run: Run & { steps: RunStep[] }, step: RunStep, byKey: Map<string, RunStep>, frozen: StepRuntime | null): Promise<RunStep> {
    const def = parseJson<WorkflowDefinition>(run.snapshot, { name: run.name, description: '', inputs: [], steps: [] })
    const stepDef = def.steps.find((s) => s.id === step.key)
    if (!stepDef) return this.failStep(run, step, 'step definition missing from run snapshot', false)

    // Runs created before runtimes were frozen fall back to the live agent configuration.
    let runtime = frozen
    if (!runtime) {
      const agent = step.agentId ? await this.prisma.agent.findUnique({ where: { id: step.agentId } }) : null
      if (!agent) return this.failStep(run, step, `agent "${step.agentName}" no longer exists`, false)
      runtime = resolveRuntime(agent, stepDef)
    }
    if (runtime.location === 'remote') {
      // the runner binding may legitimately change after the run was created
      const agent = await this.prisma.agent.findUnique({ where: { id: runtime.agentId }, select: { runnerId: true, location: true } })
      if (agent?.location === 'remote' && agent.runnerId) runtime.runnerId = agent.runnerId
      if (!this.registry.isOnline(runtime.runnerId)) return this.failStep(run, step, `runner for agent "${runtime.agentName}" is offline`, true)
    }

    const inputs = parseJson<Record<string, string>>(run.inputs, {})
    const context = {
      inputs,
      input: inputs,
      steps: Object.fromEntries([...byKey.values()].map((s) => [s.key, { output: s.output ?? '', status: s.status, error: s.error ?? '' }])),
      run: { id: run.id, name: run.name },
      workflow: { name: def.name },
    }
    const rendered = renderTemplate(stepDef.prompt, context)
    // the working directory may reference inputs too, e.g. workDir: "{{inputs.repo}}"
    if (/\{\{/.test(runtime.workDir)) {
      const dir = renderTemplate(runtime.workDir, context)
      if (dir.missing.length) return this.failStep(run, step, `working directory template is unresolved: ${dir.missing.join(', ')}`, false)
      runtime = { ...runtime, workDir: dir.text.trim() }
    }
    const parts: string[] = []
    if (runtime.role.trim() && !runtime.resumeSessionId) parts.push(runtime.role.trim(), '---')
    parts.push(rendered.text.trim())
    if (stepDef.expectedOutput?.trim()) parts.push('---', `Expected output:\n${stepDef.expectedOutput.trim()}`)
    const prompt = parts.join('\n\n')

    const jobId = randomUUID()
    let job
    try {
      job = buildJob(jobId, runtime, prompt)
    } catch (err) {
      return this.failStep(run, step, (err as Error).message, false)
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
        location: runtime.location,
        runnerId: runtime.runnerId,
      },
    })
    this.events.step(updated)

    await this.logs.prime(step.id)
    const write = (stream: LogStream, line: string) => this.logs.write(run.id, step.id, stream, line)
    write('system', `▶ attempt ${attempt}/${step.maxAttempts} · agent ${runtime.agentName} · ${runtime.provider}${runtime.model ? ` / ${runtime.model}` : ''} · effort ${runtime.effort}${runtime.resumeSessionId ? ` · resume ${runtime.resumeSessionId.slice(0, 8)}` : ''}`)
    if (!runtime.autoApprove) write('system', 'auto-approve is off: in headless mode the CLI denies tool calls it cannot ask about (file edits stay allowed)')
    if (rendered.missing.length) write('system', `warning: unresolved template variables: ${rendered.missing.join(', ')}`)

    // Register the job before dispatching so an immediate completion cannot be mistaken for a stale one.
    const entry: ActiveJob = { jobId, runId: run.id, agentId: runtime.agentId, handle: null }
    this.active.set(step.id, entry)
    this.runningByAgent.set(runtime.agentId, (this.runningByAgent.get(runtime.agentId) ?? 0) + 1)

    const parser = createParser(job.parser)
    const handlers = {
      onLog: (stream: LogStream, line: string) => {
        if (stream === 'stdout' && parser) {
          const parsed = parser.feed(line)
          if (parsed) {
            for (const p of parsed) write(p.stream, p.line)
            return
          }
        }
        write(stream, line)
      },
      onDone: (result: JobResult) => void this.onStepDone(run.id, step.id, jobId, result, parser?.result() ?? {}, job.parser),
    }
    entry.handle = runtime.location === 'remote' ? this.registry.dispatch(runtime.runnerId as string, job, handlers) : runLocalJob(job, handlers)
    return updated
  }

  /** Mark a step failed before it could start; retryable failures (e.g. runner offline) respect maxAttempts. */
  private async failStep(run: Run, step: RunStep, error: string, retryable: boolean): Promise<RunStep> {
    await this.logs.prime(step.id)
    const attempt = step.attempt + 1
    const willRetry = retryable && attempt < step.maxAttempts
    this.logs.write(run.id, step.id, 'system', willRetry ? `✗ ${error} · retrying in ${backoffMs(attempt) / 1000}s (attempt ${attempt}/${step.maxAttempts})` : `✗ ${error}`)
    if (willRetry) this.scheduleRetry(run.id, step.id, attempt)
    const updated = await this.prisma.runStep.update({
      where: { id: step.id },
      data: willRetry
        ? { status: 'pending', attempt, error }
        : { status: 'failed', error, attempt, startedAt: step.startedAt ?? new Date(), finishedAt: new Date() },
    })
    this.events.step(updated)
    return updated
  }

  private scheduleRetry(runId: string, stepId: string, attempt: number) {
    const delay = backoffMs(attempt)
    this.retryAfter.set(stepId, Date.now() + delay)
    const timer = setTimeout(() => {
      this.retryAfter.delete(stepId)
      void this.tick(runId)
    }, delay)
    timer.unref()
  }

  private async onStepDone(runId: string, stepId: string, jobId: string, result: JobResult, usage: StepUsage, parserKind: ParserKind) {
    const current = this.active.get(stepId)
    if (!current || current.jobId !== jobId) {
      // A completion from a job that was cancelled or superseded: only bookkeeping.
      if (this.stopping.get(stepId) === jobId) this.stopping.delete(stepId)
      return
    }
    this.active.delete(stepId)
    this.runningByAgent.set(current.agentId, Math.max(0, (this.runningByAgent.get(current.agentId) ?? 1) - 1))

    await this.withLock(runId, async () => {
      const step = await this.prisma.runStep.findUnique({ where: { id: stepId } })
      if (!step || step.status !== 'running') return

      const write = (line: string) => this.logs.write(runId, stepId, 'system', line)
      // With an event-stream parser the final answer comes from the parser; fall back to raw stdout
      // when no result event was seen (e.g. a CLI version that printed plain text).
      const output = parserKind === 'claude-stream-json' ? (usage.output ?? result.output) : result.output?.trim() ? result.output : (usage.output ?? '')
      if (result.truncated) write('note: captured output was truncated to the last part')
      const failure = result.error ?? (usage.isError ? (usage.errorMessage ?? 'agent reported an error') : undefined)
      const success = result.exitCode === 0 && !result.cancelled && !result.timedOut && !usage.isError
      const meta = {
        sessionId: usage.sessionId ?? step.sessionId,
        costUsd: usage.costUsd ?? step.costUsd,
        inputTokens: usage.inputTokens ?? step.inputTokens,
        outputTokens: usage.outputTokens ?? step.outputTokens,
        turns: usage.turns ?? step.turns,
      }
      let data: Partial<RunStep>

      if (success) {
        write(`✓ finished (exit 0)`)
        data = { ...meta, status: 'succeeded', output, exitCode: 0, error: null, finishedAt: new Date() }
      } else if (result.cancelled) {
        data = { ...meta, status: 'cancelled', output, exitCode: result.exitCode, error: 'cancelled', finishedAt: new Date() }
      } else if (step.attempt < step.maxAttempts) {
        write(`✗ failed (${failure ?? `exit ${result.exitCode}`}) · retrying in ${backoffMs(step.attempt) / 1000}s (attempt ${step.attempt}/${step.maxAttempts} used)`)
        this.scheduleRetry(runId, stepId, step.attempt)
        data = { ...meta, status: 'pending', output, exitCode: result.exitCode, error: failure ?? null }
      } else {
        write(`✗ failed (${failure ?? `exit ${result.exitCode}`})`)
        data = { ...meta, status: 'failed', output, exitCode: result.exitCode, error: failure ?? `exit code ${result.exitCode}`, finishedAt: new Date() }
      }

      let updated: RunStep
      try {
        updated = await this.prisma.runStep.update({ where: { id: stepId }, data })
      } catch (err) {
        const message = `failed to record result: ${(err as Error).message}`
        write(message)
        updated = await this.prisma.runStep.update({ where: { id: stepId }, data: { status: 'failed', error: message, finishedAt: new Date() } })
      }
      this.events.step(updated)
      if (updated.status !== 'pending') this.logs.forget(stepId)
    })
    await this.logs.flush()
    await this.tick(runId)
    await this.tickWaiting()
  }

  private stopJob(stepId: string) {
    const job = this.active.get(stepId)
    if (!job) return
    this.active.delete(stepId)
    this.stopping.set(stepId, job.jobId)
    this.runningByAgent.set(job.agentId, Math.max(0, (this.runningByAgent.get(job.agentId) ?? 1) - 1))
    job.handle?.cancel()
    // the process has up to ~5s to die; after that we stop waiting for it
    setTimeout(() => {
      if (this.stopping.get(stepId) === job.jobId) this.stopping.delete(stepId)
    }, 7000).unref()
  }

  private async waitForStopping(runId: string, maxMs = 7000) {
    const steps = await this.prisma.runStep.findMany({ where: { runId }, select: { id: true } })
    const ids = new Set(steps.map((s) => s.id))
    const started = Date.now()
    while (Date.now() - started < maxMs && [...this.stopping.keys()].some((id) => ids.has(id))) {
      await new Promise((r) => setTimeout(r, 150))
    }
  }

  private async finalize(runId: string, steps: RunStep[]) {
    const hardFailed = steps.filter(isHardFailure)
    const cancelled = steps.some((s) => s.status === 'cancelled')
    const status = hardFailed.length ? 'failed' : cancelled ? 'cancelled' : 'succeeded'
    const error = hardFailed.length ? `${hardFailed.length} step(s) failed: ${hardFailed.map((s) => s.name).join(', ')}` : null
    const updated = await this.prisma.run.update({ where: { id: runId }, data: { status, error, finishedAt: new Date() } })
    this.waiting.delete(runId)
    for (const s of steps) {
      this.retryAfter.delete(s.id)
      this.logs.forget(s.id)
    }
    this.events.run(updated)
    await this.logs.flush()
  }

  private withLock(runId: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.locks.get(runId) ?? Promise.resolve()
    const next = prev
      .catch(() => undefined)
      .then(fn)
      .catch(async (err) => {
        // Never leave a run silently stuck: surface the error on the run itself.
        const message = (err as Error).message
        log.error(`run ${runId}: ${message}`)
        try {
          const run = await this.prisma.run.findUnique({ where: { id: runId } })
          if (run && run.status === 'running') {
            const updated = await this.prisma.run.update({ where: { id: runId }, data: { status: 'failed', error: `internal error: ${message}`, finishedAt: new Date() } })
            this.events.run(updated)
          }
        } catch {
          /* database unavailable; nothing more we can do */
        }
      })
      .finally(() => {
        if (this.locks.get(runId) === next) this.locks.delete(runId)
      })
    this.locks.set(runId, next)
    return next
  }
}
