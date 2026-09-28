import { execSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient, Run, RunStep } from '@prisma/client'
import { LogWriter } from '../src/engine/log-writer.js'
import { RunManager } from '../src/engine/run-manager.js'
import { RunnerRegistry } from '../src/engine/runner-registry.js'
import type { WorkflowDefinition } from '../src/engine/types.js'

/**
 * Engine integration test: a real SQLite database (temporary file) and real child
 * processes, using the "custom" provider so no agent CLI is required.
 */
let dir: string
let prisma: PrismaClient
let manager: RunManager
let logs: LogWriter
const events: { runs: Run[]; steps: RunStep[] } = { runs: [], steps: [] }

const waitFor = async (runId: string, done: (run: Run & { steps: RunStep[] }) => boolean, timeoutMs = 20000) => {
  const started = Date.now()
  for (;;) {
    const run = await prisma.run.findUnique({ where: { id: runId }, include: { steps: { orderBy: { order: 'asc' } } } })
    if (run && done(run)) return run
    if (Date.now() - started > timeoutMs) throw new Error(`timeout waiting for run ${runId}: ${run?.status}`)
    await new Promise((r) => setTimeout(r, 100))
  }
}
const finished = (run: Run) => ['succeeded', 'failed', 'cancelled'].includes(run.status)

beforeAll(async () => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'iteam-test-'))
  const url = `file:${path.join(dir, 'test.db')}`
  process.env.DATABASE_URL = url
  execSync('npx prisma migrate deploy', { cwd: path.resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore' })
  const { PrismaClient } = await import('@prisma/client')
  prisma = new PrismaClient({ datasources: { db: { url } } })
  const registry = new RunnerRegistry()
  logs = new LogWriter(prisma, () => undefined)
  manager = new RunManager(prisma, registry, logs, {
    run: (r) => events.runs.push(r),
    step: (s) => events.steps.push(s),
  })
})

afterAll(async () => {
  await logs.flush()
  await prisma.$disconnect()
  rmSync(dir, { recursive: true, force: true })
})

const makeAgent = async (name: string, command: string, extra: Record<string, unknown> = {}) =>
  prisma.agent.create({ data: { name, provider: 'custom', command, workDir: os.tmpdir(), timeoutSec: 30, ...extra } })

describe('RunManager', () => {
  it('runs a diamond DAG, passes outputs downstream and records logs', async () => {
    const echo = await makeAgent('echo', `printf 'OUT:'; cat`)
    const def: WorkflowDefinition = {
      name: 'diamond',
      description: '',
      inputs: [{ key: 'topic', required: true }],
      steps: [
        { id: 'plan', name: 'Plan', agentId: echo.id, prompt: 'plan {{inputs.topic}}', dependsOn: [] },
        { id: 'a', name: 'A', agentId: echo.id, prompt: 'a<{{steps.plan.output}}>', dependsOn: ['plan'] },
        { id: 'b', name: 'B', agentId: echo.id, prompt: 'b<{{steps.plan.output}}>', dependsOn: ['plan'] },
        { id: 'end', name: 'End', agentId: echo.id, prompt: '{{steps.a.output}}|{{steps.b.output}}', dependsOn: ['a', 'b'] },
      ],
    }
    const created = await manager.createRun(def, { inputs: { topic: 'login' } })
    expect(created.status).toBe('queued')
    expect(created.steps.map((s) => s.key)).toEqual(['plan', 'a', 'b', 'end'])
    await manager.start(created.id)
    const run = await waitFor(created.id, finished)
    expect(run.status).toBe('succeeded')
    const byKey = Object.fromEntries(run.steps.map((s) => [s.key, s]))
    expect(byKey.plan.output).toBe('OUT:plan login')
    expect(byKey.a.output).toBe('OUT:a<OUT:plan login>')
    expect(byKey.end.output).toBe('OUT:OUT:a<OUT:plan login>|OUT:b<OUT:plan login>')
    expect(run.steps.every((s) => s.exitCode === 0 && s.attempt === 1)).toBe(true)
    // B must not start before Plan finished
    expect(new Date(byKey.b.startedAt!).getTime()).toBeGreaterThanOrEqual(new Date(byKey.plan.finishedAt!).getTime())
    await logs.flush()
    const lines = await prisma.runLog.findMany({ where: { stepId: byKey.plan.id }, orderBy: { seq: 'asc' } })
    expect(lines.some((l) => l.stream === 'stdout' && l.line === 'OUT:plan login')).toBe(true)
    expect(lines.some((l) => l.stream === 'system' && l.line.includes('attempt 1/1'))).toBe(true)
  })

  it('rejects missing required inputs and unknown agents at creation time', async () => {
    const echo = await prisma.agent.findUniqueOrThrow({ where: { name: 'echo' } })
    const def: WorkflowDefinition = { name: 'x', description: '', inputs: [{ key: 'must', required: true }], steps: [{ id: 's', name: 'S', agentId: echo.id, prompt: 'p', dependsOn: [] }] }
    await expect(manager.createRun(def, {})).rejects.toThrow(/required/)
    await expect(manager.createRun({ ...def, inputs: [], steps: [{ ...def.steps[0], agentId: 'nope' }] }, {})).rejects.toThrow(/missing agent/)
  })

  it('retries a flaky step with backoff, skips downstream of a hard failure, honours continueOnError', async () => {
    // a command that fails until a marker file exists (created on the first failure)
    const marker = (name: string) => path.join(dir, `marker-${name}`)
    const flaky = (name: string) => `cat >/dev/null; if [ -f '${marker(name)}' ]; then printf fixed; else touch '${marker(name)}'; echo boom >&2; exit 3; fi`
    const hard = await makeAgent('hard', flaky('hard'))
    const auto = await makeAgent('auto', flaky('auto'))
    const soft = await makeAgent('soft', `cat >/dev/null; echo nope >&2; exit 1`)
    const echo = await prisma.agent.findUniqueOrThrow({ where: { name: 'echo' } })
    const def: WorkflowDefinition = {
      name: 'failures',
      description: '',
      inputs: [],
      steps: [
        { id: 'bad', name: 'Bad', agentId: hard.id, prompt: 'x', dependsOn: [] },
        { id: 'after-bad', name: 'After bad', agentId: echo.id, prompt: 'y', dependsOn: ['bad'] },
        { id: 'auto', name: 'Auto retry', agentId: auto.id, prompt: 'x', dependsOn: [], retries: 1 },
        { id: 'soft', name: 'Soft', agentId: soft.id, prompt: 'x', dependsOn: [], continueOnError: true },
        { id: 'after-soft', name: 'After soft', agentId: echo.id, prompt: 'got:{{steps.soft.output}}', dependsOn: ['soft'] },
      ],
    }
    const created = await manager.createRun(def, {})
    await manager.start(created.id)
    const run = await waitFor(created.id, finished)
    const byKey = Object.fromEntries(run.steps.map((s) => [s.key, s]))
    expect(run.status).toBe('failed')
    expect(byKey.bad.status).toBe('failed')
    expect(byKey.bad.attempt).toBe(1)
    expect(byKey.bad.exitCode).toBe(3)
    expect(byKey.bad.error).toContain('boom')
    expect(byKey['after-bad'].status).toBe('skipped')
    expect(byKey.auto.status).toBe('succeeded')
    expect(byKey.auto.attempt).toBe(2)
    expect(byKey.auto.output).toBe('fixed')
    expect(byKey.soft.status).toBe('failed')
    expect(byKey['after-soft'].status).toBe('succeeded')
    expect(byKey['after-soft'].output).toBe('OUT:got:')
    expect(run.error).toContain('Bad')
    await logs.flush()
    const autoLines = await prisma.runLog.findMany({ where: { stepId: byKey.auto.id } })
    expect(autoLines.some((l) => /retrying in 1s/.test(l.line))).toBe(true)

    // the run's agent configuration is frozen: editing the agent must not change the retry
    await prisma.agent.update({ where: { id: hard.id }, data: { command: `printf never; cat >/dev/null` } })
    await manager.retry(created.id)
    const retried = await waitFor(created.id, finished)
    const again = Object.fromEntries(retried.steps.map((s) => [s.key, s]))
    expect(retried.status).toBe('succeeded')
    expect(again.bad.status).toBe('succeeded')
    expect(again.bad.output).toBe('fixed') // marker exists now; frozen command, not "never"
    expect(again['after-bad'].status).toBe('succeeded')
    expect(again['after-soft'].attempt).toBe(1) // untouched
    expect(again.auto.attempt).toBe(2) // untouched
  })

  it('cancels running steps and marks pending steps cancelled', async () => {
    const slow = await makeAgent('slow', `cat >/dev/null; sleep 20; echo late`)
    const def: WorkflowDefinition = {
      name: 'cancel',
      description: '',
      inputs: [],
      steps: [
        { id: 's1', name: 'S1', agentId: slow.id, prompt: 'x', dependsOn: [] },
        { id: 's2', name: 'S2', agentId: slow.id, prompt: 'x', dependsOn: ['s1'] },
      ],
    }
    const created = await manager.createRun(def, {})
    await manager.start(created.id)
    await waitFor(created.id, (r) => r.steps.some((s) => s.status === 'running'))
    await manager.cancel(created.id)
    const run = await waitFor(created.id, finished)
    expect(run.status).toBe('cancelled')
    expect(run.steps.map((s) => s.status)).toEqual(['cancelled', 'cancelled'])
    expect(manager.activeSteps()).toBe(0)
    await expect(manager.retry('does-not-exist')).rejects.toThrow(/not found/)
  })

  it('parses Claude stream-json output into events, usage and a resumable session', async () => {
    const bin = path.join(dir, 'bin')
    mkdtempSync(path.join(os.tmpdir(), 'x-')) // ensure tmp is writable
    const script = `#!/usr/bin/env bash
cat >/dev/null
echo "args: $*" >&2
echo '{"type":"system","subtype":"init","session_id":"sess-001","model":"stub"}'
echo '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{"file_path":"a.ts"}}]}}'
echo '{"type":"result","subtype":"success","is_error":false,"result":"FINAL ANSWER","total_cost_usd":0.05,"num_turns":2,"duration_ms":10,"usage":{"input_tokens":10,"output_tokens":5}}'
`
    const { mkdirSync } = await import('node:fs')
    mkdirSync(bin, { recursive: true })
    writeFileSync(path.join(bin, 'claude'), script)
    chmodSync(path.join(bin, 'claude'), 0o755)
    const oldPath = process.env.PATH
    process.env.PATH = `${bin}:${oldPath}`
    try {
      const agent = await prisma.agent.create({ data: { name: 'claude-stub', provider: 'claude-code', model: 'sonnet', workDir: os.tmpdir(), timeoutSec: 30 } })
      const def: WorkflowDefinition = { name: 'claude', description: '', inputs: [], steps: [{ id: 's', name: 'S', agentId: agent.id, prompt: 'hello', dependsOn: [] }] }
      const created = await manager.createRun(def, {})
      await manager.start(created.id)
      const run = await waitFor(created.id, finished)
      const step = run.steps[0]
      expect(run.status).toBe('succeeded')
      expect(step.output).toBe('FINAL ANSWER')
      expect(step.sessionId).toBe('sess-001')
      expect(step.costUsd).toBe(0.05)
      expect(step.inputTokens).toBe(10)
      expect(step.outputTokens).toBe(5)
      expect(step.turns).toBe(2)
      await logs.flush()
      const lines = await prisma.runLog.findMany({ where: { stepId: step.id }, orderBy: { seq: 'asc' } })
      expect(lines.map((l) => l.line)).toContain('🔧 Read a.ts')
      expect(lines.some((l) => l.stream === 'event' && l.line.startsWith('✓ result · $0.0500'))).toBe(true)
      expect(lines.some((l) => l.line.startsWith('{'))).toBe(false)

      // follow-up resumes the session and does not repeat the role
      await prisma.agent.update({ where: { id: agent.id }, data: { role: 'ROLE TEXT' } })
      const follow = await manager.createRun({ ...def, steps: [{ ...def.steps[0], prompt: 'continue', resumeSessionId: step.sessionId! }] }, {})
      await manager.start(follow.id)
      const followRun = await waitFor(follow.id, finished)
      expect(followRun.status).toBe('succeeded')
      expect(followRun.steps[0].prompt).toBe('continue')
      const followLines = await (async () => {
        await logs.flush()
        return prisma.runLog.findMany({ where: { stepId: followRun.steps[0].id } })
      })()
      expect(followLines.some((l) => l.stream === 'stderr' && l.line.includes('--resume sess-001'))).toBe(true)
    } finally {
      process.env.PATH = oldPath
    }
  })

  it('does not starve a second run when the global slot cap is exhausted', async () => {
    const { config } = await import('../src/config.js')
    const original = config.maxParallel
    config.maxParallel = 1
    try {
      const slow = await makeAgent('slow1', `cat >/dev/null; sleep 1; echo a`, { maxConcurrent: 4 })
      const def = (n: string): WorkflowDefinition => ({ name: n, description: '', inputs: [], steps: [{ id: 's', name: 'S', agentId: slow.id, prompt: 'x', dependsOn: [] }] })
      const a = await manager.createRun(def('A'), {})
      const b = await manager.createRun(def('B'), {})
      await manager.start(a.id)
      await manager.start(b.id)
      const [ra, rb] = await Promise.all([waitFor(a.id, finished, 15000), waitFor(b.id, finished, 15000)])
      expect(ra.status).toBe('succeeded')
      expect(rb.status).toBe('succeeded')
      // B could only start after A released the single slot
      expect(new Date(rb.steps[0].startedAt!).getTime()).toBeGreaterThanOrEqual(new Date(ra.steps[0].finishedAt!).getTime() - 50)
    } finally {
      config.maxParallel = original
    }
  })

  it('serialises steps of the same agent according to maxConcurrent', async () => {
    const serial = await makeAgent('serial', `cat >/dev/null; sleep 0.6; echo ok`)
    const def: WorkflowDefinition = {
      name: 'serial',
      description: '',
      inputs: [],
      steps: [
        { id: 'p', name: 'P', agentId: serial.id, prompt: 'x', dependsOn: [] },
        { id: 'q', name: 'Q', agentId: serial.id, prompt: 'x', dependsOn: [] },
      ],
    }
    const created = await manager.createRun(def, {})
    await manager.start(created.id)
    const run = await waitFor(created.id, finished, 15000)
    expect(run.status).toBe('succeeded')
    const [p, q] = run.steps
    const overlap = Math.min(new Date(p.finishedAt!).getTime(), new Date(q.finishedAt!).getTime()) - Math.max(new Date(p.startedAt!).getTime(), new Date(q.startedAt!).getTime())
    expect(overlap).toBeLessThanOrEqual(50)
  })

  it('ignores the late result of a cancelled process after a retry started a new attempt', async () => {
    // process ignores SIGTERM for a while so its exit arrives after the retry has started
    const stubborn = await makeAgent('stubborn', `cat >/dev/null; trap '' TERM; sleep 2; echo late-result`, { timeoutSec: 30 })
    const def: WorkflowDefinition = { name: 'stale', description: '', inputs: [], steps: [{ id: 's', name: 'S', agentId: stubborn.id, prompt: 'x', dependsOn: [] }] }
    const created = await manager.createRun(def, {})
    await manager.start(created.id)
    await waitFor(created.id, (r) => r.steps[0].status === 'running')
    await manager.cancel(created.id)
    expect((await waitFor(created.id, finished)).status).toBe('cancelled')
    // retry waits for the old process (bounded), then runs a fresh attempt that must not be clobbered
    await manager.retry(created.id)
    const run = await waitFor(created.id, finished, 20000)
    expect(run.status).toBe('succeeded')
    expect(run.steps[0].output).toBe('late-result')
    expect(run.steps[0].attempt).toBe(1)
  }, 30000)

  it('honours a per-step working directory (quick tasks)', async () => {
    const pwd = await makeAgent('pwd', `cat >/dev/null; pwd`)
    const sub = path.join(dir, 'workspace-x')
    const { mkdirSync } = await import('node:fs')
    mkdirSync(sub, { recursive: true })
    const def: WorkflowDefinition = { name: 'cwd', description: '', inputs: [], steps: [{ id: 's', name: 'S', agentId: pwd.id, prompt: 'x', dependsOn: [], workDir: sub }] }
    const created = await manager.createRun(def, {})
    await manager.start(created.id)
    const run = await waitFor(created.id, finished)
    expect(run.steps[0].output).toBe(sub)
  })

  it('keeps multi-byte UTF-8 intact across chunk boundaries and strips orchestrator secrets from the env', async () => {
    process.env.ITEAM_TOKEN = 'secret-token'
    const zh = await makeAgent('zh', `cat >/dev/null; printf '中文输出' | head -c 4; sleep 0.1; printf '中文输出' | tail -c +5; echo; echo "TOKEN=[\${ITEAM_TOKEN:-}] DB=[\${DATABASE_URL:-}]"`, { env: JSON.stringify({ MY_KEY: 'v1' }) })
    const def: WorkflowDefinition = { name: 'utf8', description: '', inputs: [], steps: [{ id: 's', name: 'S', agentId: zh.id, prompt: 'x', dependsOn: [] }] }
    const created = await manager.createRun(def, {})
    await manager.start(created.id)
    const run = await waitFor(created.id, finished)
    expect(run.steps[0].output).toContain('中文输出')
    expect(run.steps[0].output).not.toContain('\uFFFD')
    expect(run.steps[0].output).toContain('TOKEN=[] DB=[]')
    delete process.env.ITEAM_TOKEN
  })

  it('times out long-running steps', async () => {
    const hang = await makeAgent('hang', `cat >/dev/null; sleep 30`, { timeoutSec: 1 })
    const def: WorkflowDefinition = { name: 't', description: '', inputs: [], steps: [{ id: 'h', name: 'H', agentId: hang.id, prompt: 'x', dependsOn: [] }] }
    const created = await manager.createRun(def, {})
    await manager.start(created.id)
    const run = await waitFor(created.id, finished, 30000)
    expect(run.status).toBe('failed')
    expect(run.steps[0].error).toMatch(/timed out/)
  }, 40000)
})
