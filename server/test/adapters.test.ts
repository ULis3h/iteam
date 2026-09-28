import { describe, expect, it } from 'vitest'
import { buildJob, describeJob } from '../src/engine/adapters.js'
import type { AgentRuntime } from '../src/engine/types.js'

const base: AgentRuntime = {
  provider: 'claude-code',
  model: 'sonnet',
  effort: 'high',
  autoApprove: true,
  extraArgs: [],
  command: '',
  env: {},
  workDir: '/tmp',
  timeoutSec: 60,
}

describe('buildJob', () => {
  it('builds a Claude Code print-mode command with model, effort and skip-permissions', () => {
    const job = buildJob('j1', base, 'hello')
    expect(job.cmd).toBe('claude')
    expect(job.args).toEqual(['-p', '--output-format', 'stream-json', '--verbose', '--model', 'sonnet', '--effort', 'high', '--dangerously-skip-permissions'])
    expect(job.stdin).toBe('hello')
    expect(job.shell).toBe(false)
    expect(job.useOutputFile).toBe(false)
    expect(job.parser).toBe('claude-stream-json')
  })

  it('resumes a session for follow-up prompts', () => {
    const job = buildJob('j1', { ...base, resumeSessionId: 'sess-123' }, 'more')
    expect(job.args.slice(0, 6)).toEqual(['-p', '--output-format', 'stream-json', '--verbose', '--resume', 'sess-123'])
  })

  it('uses acceptEdits when auto-approve is off and appends extra args', () => {
    const job = buildJob('j1', { ...base, autoApprove: false, extraArgs: ['--max-turns', '5'] }, 'p')
    expect(job.args).toContain('--permission-mode')
    expect(job.args).toContain('acceptEdits')
    expect(job.args.slice(-2)).toEqual(['--max-turns', '5'])
  })

  it('maps effort max to xhigh for Codex and reads the answer from the output file', () => {
    const job = buildJob('j2', { ...base, provider: 'codex', model: 'gpt-5-codex', effort: 'max' }, 'p')
    expect(job.cmd).toBe('codex')
    expect(job.args[0]).toBe('exec')
    expect(job.args).toContain('--json')
    expect(job.parser).toBe('codex-json')
    expect(job.args).toContain('-o')
    expect(job.args).toContain('{{outputFile}}')
    expect(job.args).toContain('model_reasoning_effort="xhigh"')
    expect(job.args[job.args.length - 1]).toBe('-')
    expect(job.useOutputFile).toBe(true)
  })

  it('builds a Gemini command with yolo mode', () => {
    const job = buildJob('j3', { ...base, provider: 'gemini', model: 'gemini-2.5-pro' }, 'p')
    expect(job.cmd).toBe('gemini')
    expect(job.args).toEqual(['-m', 'gemini-2.5-pro', '--yolo'])
  })

  it('renders custom command templates through the shell with quoted prompt', () => {
    const job = buildJob('j4', { ...base, provider: 'custom', command: `my-agent --model {{model}} --effort {{effort}} --p {{prompt}} > {{outputFile}}` }, `it's "x"`)
    expect(job.shell).toBe(true)
    expect(job.cmd).toBe(`my-agent --model sonnet --effort high --p 'it'\\''s "x"' > {{outputFile}}`)
    expect(job.useOutputFile).toBe(true)
    expect(job.args).toEqual([])
  })

  it('rejects an empty custom command', () => {
    expect(() => buildJob('j5', { ...base, provider: 'custom', command: '  ' }, 'p')).toThrow(/command template/)
  })

  it('describes jobs as a shell-like preview', () => {
    expect(describeJob(buildJob('j6', { ...base, model: '' }, 'p'))).toBe('claude -p --output-format stream-json --verbose --effort high --dangerously-skip-permissions')
  })
})
