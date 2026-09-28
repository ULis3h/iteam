import { describe, expect, it } from 'vitest'
import { createParser, summarizeToolInput } from '../src/engine/parsers.js'

describe('claude stream-json parser', () => {
  it('turns events into readable lines and collects result, session and usage', () => {
    const p = createParser('claude-stream-json')!
    expect(p.feed('plain text line')).toBeNull()
    expect(p.feed(JSON.stringify({ type: 'system', subtype: 'init', session_id: 'abcdef123456', model: 'claude-sonnet-5' }))).toEqual([{ stream: 'event', line: '⚙ session abcdef12 · model claude-sonnet-5' }])
    expect(
      p.feed(JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Looking at the code' }, { type: 'tool_use', name: 'Read', input: { file_path: 'src/a.ts' } }, { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }] } })),
    ).toEqual([
      { stream: 'event', line: '💬 Looking at the code' },
      { stream: 'event', line: '🔧 Read src/a.ts' },
      { stream: 'event', line: '🔧 Bash npm test' },
    ])
    expect(p.feed(JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: 'line1\nline2' }] }] } }))).toEqual([{ stream: 'event', line: '↩ line1 line2' }])
    expect(p.feed(JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: 'ENOENT' }] } }))).toEqual([{ stream: 'stderr', line: '↩ ENOENT' }])
    expect(p.feed(JSON.stringify({ type: 'stream_event', event: {} }))).toEqual([])
    const lines = p.feed(
      JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'All done.', total_cost_usd: 0.1234, num_turns: 3, duration_ms: 4200, usage: { input_tokens: 100, cache_read_input_tokens: 900, cache_creation_input_tokens: 0, output_tokens: 50 }, session_id: 'abcdef123456' }),
    )
    expect(lines).toEqual([{ stream: 'event', line: '✓ result · $0.1234 · 3 turns · 4.2s' }])
    expect(p.result()).toEqual({ sessionId: 'abcdef123456', output: 'All done.', costUsd: 0.1234, inputTokens: 1000, outputTokens: 50, turns: 3, isError: false })
  })

  it('flags error results', () => {
    const p = createParser('claude-stream-json')!
    const lines = p.feed(JSON.stringify({ type: 'result', subtype: 'error_max_turns', is_error: true, result: 'stopped', num_turns: 10 }))
    expect(lines?.[0].stream).toBe('stderr')
    expect(p.result().isError).toBe(true)
    expect(p.result().errorMessage).toBe('error_max_turns')
  })
})

describe('codex json parser', () => {
  it('summarises items and usage', () => {
    const p = createParser('codex-json')!
    expect(p.feed(JSON.stringify({ type: 'thread.started', thread_id: 'thread-0001' }))).toEqual([{ stream: 'event', line: '⚙ thread thread-0' }])
    expect(p.feed(JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'ls -la', aggregated_output: 'a\nb', exit_code: 0 } }))).toEqual([
      { stream: 'event', line: '🔧 $ ls -la' },
      { stream: 'event', line: '↩ a b' },
    ])
    expect(p.feed(JSON.stringify({ type: 'item.completed', item: { type: 'file_change', changes: [{ path: 'src/x.ts', kind: 'update' }] } }))).toEqual([{ stream: 'event', line: '📝 update src/x.ts' }])
    expect(p.feed(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Final answer' } }))).toEqual([{ stream: 'event', line: '💬 Final answer' }])
    expect(p.feed(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 10, cached_input_tokens: 5, output_tokens: 7 } }))).toEqual([{ stream: 'event', line: '✓ turn completed · in 15 · out 7 tokens' }])
    expect(p.result()).toMatchObject({ sessionId: 'thread-0001', output: 'Final answer', inputTokens: 15, outputTokens: 7, turns: 1 })
  })

  it('reports failed turns', () => {
    const p = createParser('codex-json')!
    expect(p.feed(JSON.stringify({ type: 'turn.failed', error: { message: 'rate limited' } }))).toEqual([{ stream: 'stderr', line: '✗ rate limited' }])
    expect(p.result().isError).toBe(true)
  })
})

describe('summarizeToolInput', () => {
  it('picks the most useful field per tool', () => {
    expect(summarizeToolInput('Grep', { pattern: 'TODO', path: 'src' })).toBe('TODO in src')
    expect(summarizeToolInput('WebFetch', { url: 'https://x.y' })).toBe('https://x.y')
    expect(summarizeToolInput('Custom', { a: 1 })).toBe('{"a":1}')
    expect(summarizeToolInput('Bash', null)).toBe('')
  })
})
