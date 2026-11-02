import type { PrismaClient, Run, RunStep } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { config } from '../src/config.js'
import type { LogWriter } from '../src/engine/log-writer.js'
import { RunManager, type StepRuntime } from '../src/engine/run-manager.js'
import type { RunnerRegistry } from '../src/engine/runner-registry.js'
import type { JobHandlers, JobSpec } from '../src/engine/types.js'

const originalMaxParallel = config.maxParallel
afterEach(() => { config.maxParallel = originalMaxParallel })
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

function fixture(maxConcurrent = 1) {
  config.maxParallel = 8 // Do not let the global cap mask the agent cap.
  const runtime: StepRuntime = {
    agentId: 'agent', agentName: 'Agent', role: '', provider: 'custom', command: 'echo unused',
    extraArgs: [], env: {}, workDir: '/tmp', timeoutSec: 30, location: 'remote',
    runnerId: 'runner', maxConcurrent, model: '', effort: 'default', autoApprove: false,
  }
  const runs = ['A', 'B', 'C'].map((id) => ({
    id, name: id, status: 'queued', inputs: '{}',
    snapshot: JSON.stringify({ name: id, inputs: [], steps: [{ id: 'task', name: 'Task', agentId: 'agent', prompt: 'x', dependsOn: [] }] }),
    steps: [{ id: `step-${id}`, runId: id, key: 'task', name: 'Task', agentId: 'agent', agentName: 'Agent', status: 'pending', attempt: 0, maxAttempts: 1, runtime: JSON.stringify(runtime), dependsOn: '[]' }],
  })) as Array<Run & { steps: RunStep[] }>
  const steps = runs.flatMap((r) => r.steps)
  const db = {
    run: {
      findUnique: vi.fn(async ({ where }) => runs.find((r) => r.id === where.id)),
      update: vi.fn(async ({ where, data }) => Object.assign(runs.find((r) => r.id === where.id)!, data)),
    },
    agent: { findUnique: vi.fn(async () => ({ runnerId: 'runner', location: 'remote' })) },
    runStep: {
      findUnique: vi.fn(async ({ where }) => steps.find((s) => s.id === where.id)),
      update: vi.fn(async ({ where, data }) => Object.assign(steps.find((s) => s.id === where.id)!, data)),
    },
  }
  const handlers: JobHandlers[] = []
  const registry = {
    isOnline: vi.fn(() => true), hasCapacity: vi.fn(() => true),
    dispatch: vi.fn((_runner: string, _job: JobSpec, callbacks: JobHandlers) => {
      handlers.push(callbacks)
      return { cancel: vi.fn() }
    }),
  }
  const logs = { prime: vi.fn(async (_id: string) => {}), write: vi.fn(), forget: vi.fn(), flush: vi.fn(async () => {}) }
  const manager = new RunManager(db as unknown as PrismaClient, registry as unknown as RunnerRegistry, logs as unknown as LogWriter, { run: vi.fn(), step: vi.fn() })
  return { manager, db, registry, logs, runs, handlers }
}

describe('cross-run agent capacity', () => {
  it('does not lose a wakeup when deferral logging is still pending', async () => {
    const f = fixture()
    const enteringStart = deferred()
    const releaseStart = deferred()
    const enteringLog = deferred()
    const releaseLog = deferred()
    f.db.agent.findUnique.mockImplementationOnce(async () => {
      enteringStart.resolve()
      await releaseStart.promise
      throw new Error('startup failed')
    })
    const first = f.manager.start('A')
    await enteringStart.promise
    f.logs.prime.mockImplementationOnce(async () => {
      enteringLog.resolve()
      await releaseLog.promise
    })
    const second = f.manager.start('B')
    await enteringLog.promise
    releaseStart.resolve()
    await first
    releaseLog.resolve()
    await second
    await vi.waitFor(() => expect(f.handlers).toHaveLength(1))
    f.handlers[0].onDone({ exitCode: 0, output: 'ok' })
    await vi.waitFor(() => expect(f.runs[1].status).toBe('succeeded'))
    expect(f.manager.runningCount('agent')).toBe(0)
  })

  it('does not double-count an immediate completion during dispatch', async () => {
    const f = fixture()
    f.registry.dispatch.mockImplementation((_runner, _job, callbacks) => {
      callbacks.onDone({ exitCode: 0, output: 'ok' })
      return { cancel: vi.fn() }
    })
    await Promise.all(f.runs.map((r) => f.manager.start(r.id)))
    await vi.waitFor(() => expect(f.runs.every((r) => r.status === 'succeeded')).toBe(true))
    expect(f.manager.runningCount('agent')).toBe(0)
    expect(f.manager.activeSteps()).toBe(0)
  })

  it.each([1, 2])('reserves maxConcurrent=%i before startup awaits and resumes deferred runs', async (limit) => {
    const f = fixture(limit)
    const entered = deferred()
    const release = deferred()
    f.db.agent.findUnique.mockImplementationOnce(async () => {
      entered.resolve()
      await release.promise
      return { runnerId: 'runner', location: 'remote' }
    })
    const first = f.manager.start('A')
    await entered.promise
    try {
      await Promise.all([f.manager.start('B'), f.manager.start('C')])
      expect(f.registry.dispatch).toHaveBeenCalledTimes(limit - 1)
    } finally {
      release.resolve()
      await first
    }
    expect(f.manager.runningCount('agent')).toBe(limit)
    expect(f.manager.activeSteps()).toBe(limit)
    for (let i = 0; i < 3; i++) {
      await vi.waitFor(() => expect(f.handlers.length).toBeGreaterThan(i))
      f.handlers[i].onDone({ exitCode: 0, output: 'ok' })
    }
    await vi.waitFor(() => expect(f.runs.every((r) => r.status === 'succeeded')).toBe(true))
    expect(f.manager.runningCount('agent')).toBe(0)
    expect(f.manager.activeSteps()).toBe(0)
  })

  it.each(['offline', 'database', 'logs', 'dispatch', 'failure reporting'] as const)('releases startup capacity after %s failure and wakes another run', async (failure) => {
    const f = fixture()
    const entered = deferred()
    const release = deferred()
    f.db.agent.findUnique.mockImplementationOnce(async () => {
      entered.resolve()
      await release.promise
      if (failure === 'offline' || failure === 'failure reporting') f.registry.isOnline.mockReturnValueOnce(false)
      return { runnerId: 'runner', location: 'remote' }
    })
    const first = f.manager.start('A')
    await entered.promise
    await f.manager.start('B')
    if (failure === 'database') f.db.runStep.update.mockRejectedValueOnce(new Error('database unavailable'))
    if (failure === 'logs' || failure === 'failure reporting') f.logs.prime.mockRejectedValueOnce(new Error('logs unavailable'))
    if (failure === 'failure reporting') f.logs.prime.mockRejectedValueOnce(new Error('failure logging unavailable'))
    if (failure === 'dispatch') f.registry.dispatch.mockImplementationOnce(() => { throw new Error('dispatch failed') })
    release.resolve()
    await first
    await vi.waitFor(() => expect(f.handlers).toHaveLength(1))
    expect(f.runs[0].status).toBe('failed')
    expect(f.runs[1].steps[0].status).toBe('running')
    expect(f.manager.runningCount('agent')).toBe(1)
    expect(f.manager.activeSteps()).toBe(1)
    f.handlers[0].onDone({ exitCode: 0, output: 'ok' })
    await vi.waitFor(() => expect(f.runs[1].status).toBe('succeeded'))
    expect(f.manager.runningCount('agent')).toBe(0)
    expect(f.manager.activeSteps()).toBe(0)
  })
})
