import type { LogStream } from './types.js'

export type ParserKind = 'none' | 'claude-stream-json' | 'codex-json'

export interface ParsedLine {
  stream: LogStream
  line: string
}

export interface StepUsage {
  output?: string
  sessionId?: string
  costUsd?: number
  inputTokens?: number
  outputTokens?: number
  turns?: number
  isError?: boolean
  errorMessage?: string
}

/**
 * Turns a CLI's machine-readable event stream into human-readable log lines and
 * collects the final answer, session id and usage. `feed` returns null for lines
 * that are not events (they are passed through as plain stdout).
 */
export interface OutputParser {
  feed: (line: string) => ParsedLine[] | null
  result: () => StepUsage
}

const clip = (text: string, max: number): string => {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1)}…` : one
}

const tryJson = (line: string): Record<string, unknown> | null => {
  const t = line.trim()
  if (!t.startsWith('{')) return null
  try {
    const v = JSON.parse(t)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** Compact one-line description of a tool call's input. */
export const summarizeToolInput = (name: string, input: unknown): string => {
  if (!input || typeof input !== 'object') return ''
  const i = input as Record<string, unknown>
  const s = (k: string) => (typeof i[k] === 'string' ? (i[k] as string) : undefined)
  switch (name) {
    case 'Bash':
      return clip(s('command') ?? '', 200)
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return s('file_path') ?? s('path') ?? ''
    case 'Grep':
    case 'Glob':
      return [s('pattern'), s('path')].filter(Boolean).join(' in ')
    case 'WebFetch':
      return s('url') ?? ''
    case 'WebSearch':
      return s('query') ?? ''
    case 'Task':
    case 'Agent':
      return clip(s('description') ?? s('prompt') ?? '', 120)
    default:
      return clip(JSON.stringify(input), 160)
  }
}

const textOfContent = (content: unknown): string => {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((b) => (b && typeof b === 'object' && typeof (b as { text?: unknown }).text === 'string' ? (b as { text: string }).text : ''))
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function claudeParser(): OutputParser {
  const usage: StepUsage = {}
  return {
    feed(line) {
      const e = tryJson(line)
      if (!e) return null
      const out: ParsedLine[] = []
      const type = e.type
      if (type === 'system') {
        if (e.subtype === 'init') {
          if (typeof e.session_id === 'string') usage.sessionId = e.session_id
          out.push({ stream: 'event', line: `⚙ session ${String(e.session_id ?? '').slice(0, 8)} · model ${String(e.model ?? '')}` })
        }
        return out
      }
      if (type === 'assistant' || type === 'user') {
        const message = e.message as { content?: unknown } | undefined
        const blocks = Array.isArray(message?.content) ? (message!.content as Array<Record<string, unknown>>) : []
        for (const b of blocks) {
          if (b.type === 'text' && typeof b.text === 'string' && b.text.trim()) out.push({ stream: 'event', line: `💬 ${b.text.trim()}` })
          else if (b.type === 'tool_use') out.push({ stream: 'event', line: `🔧 ${String(b.name ?? 'tool')} ${summarizeToolInput(String(b.name ?? ''), b.input)}`.trimEnd() })
          else if (b.type === 'tool_result') {
            const text = textOfContent(b.content)
            const preview = clip(text, 200)
            if (preview) out.push({ stream: b.is_error ? 'stderr' : 'event', line: `↩ ${preview}` })
          }
        }
        return out
      }
      if (type === 'result') {
        const u = (e.usage ?? {}) as Record<string, unknown>
        usage.output = typeof e.result === 'string' ? e.result : usage.output
        usage.costUsd = num(e.total_cost_usd)
        usage.inputTokens = (num(u.input_tokens) ?? 0) + (num(u.cache_read_input_tokens) ?? 0) + (num(u.cache_creation_input_tokens) ?? 0)
        usage.outputTokens = num(u.output_tokens)
        usage.turns = num(e.num_turns)
        const subtype = String(e.subtype ?? '')
        usage.isError = e.is_error === true || (subtype !== '' && subtype !== 'success')
        if (usage.isError) usage.errorMessage = subtype || 'error'
        const parts = [usage.isError ? `✗ ${subtype || 'error'}` : '✓ result']
        if (usage.costUsd !== undefined) parts.push(`$${usage.costUsd.toFixed(4)}`)
        if (usage.turns !== undefined) parts.push(`${usage.turns} turns`)
        if (num(e.duration_ms) !== undefined) parts.push(`${((e.duration_ms as number) / 1000).toFixed(1)}s`)
        out.push({ stream: usage.isError ? 'stderr' : 'event', line: parts.join(' · ') })
        if (usage.isError && typeof e.result === 'string' && e.result.trim()) out.push({ stream: 'stderr', line: clip(e.result, 500) })
        return out
      }
      return out // stream_event, rate_limit_event, etc. are not shown
    },
    result: () => usage,
  }
}

function codexParser(): OutputParser {
  const usage: StepUsage = {}
  return {
    feed(line) {
      const e = tryJson(line)
      if (!e) return null
      const out: ParsedLine[] = []
      const type = String(e.type ?? '')
      if (type === 'thread.started') {
        if (typeof e.thread_id === 'string') usage.sessionId = e.thread_id
        out.push({ stream: 'event', line: `⚙ thread ${String(e.thread_id ?? '').slice(0, 8)}` })
      } else if (type === 'item.completed') {
        const item = (e.item ?? {}) as Record<string, unknown>
        const kind = String(item.type ?? '')
        if (kind === 'agent_message' && typeof item.text === 'string') {
          usage.output = item.text
          out.push({ stream: 'event', line: `💬 ${item.text.trim()}` })
        } else if (kind === 'reasoning' && typeof item.text === 'string') {
          out.push({ stream: 'event', line: `🧠 ${clip(item.text, 300)}` })
        } else if (kind === 'command_execution') {
          out.push({ stream: 'event', line: `🔧 $ ${clip(String(item.command ?? ''), 200)}` })
          const output = typeof item.aggregated_output === 'string' ? clip(item.aggregated_output, 200) : ''
          const code = num(item.exit_code)
          if (output) out.push({ stream: code && code !== 0 ? 'stderr' : 'event', line: `↩ ${output}${code && code !== 0 ? ` (exit ${code})` : ''}` })
        } else if (kind === 'file_change') {
          const changes = Array.isArray(item.changes) ? (item.changes as Array<Record<string, unknown>>) : []
          for (const c of changes) out.push({ stream: 'event', line: `📝 ${String(c.kind ?? 'change')} ${String(c.path ?? '')}` })
        } else if (kind === 'mcp_tool_call') {
          out.push({ stream: 'event', line: `🔧 ${String(item.server ?? '')}/${String(item.tool ?? '')}` })
        } else if (kind === 'web_search') {
          out.push({ stream: 'event', line: `🔍 ${String(item.query ?? '')}` })
        } else if (kind === 'error') {
          out.push({ stream: 'stderr', line: `✗ ${String(item.message ?? 'error')}` })
        }
      } else if (type === 'turn.completed') {
        const u = (e.usage ?? {}) as Record<string, unknown>
        usage.inputTokens = (num(u.input_tokens) ?? 0) + (num(u.cached_input_tokens) ?? 0)
        usage.outputTokens = num(u.output_tokens)
        usage.turns = (usage.turns ?? 0) + 1
        out.push({ stream: 'event', line: `✓ turn completed · in ${usage.inputTokens} · out ${usage.outputTokens ?? 0} tokens` })
      } else if (type === 'turn.failed' || type === 'error') {
        const err = (e.error ?? {}) as Record<string, unknown>
        usage.isError = true
        usage.errorMessage = String(err.message ?? e.message ?? 'turn failed')
        out.push({ stream: 'stderr', line: `✗ ${usage.errorMessage}` })
      }
      return out
    },
    result: () => usage,
  }
}

export function createParser(kind: ParserKind): OutputParser | null {
  switch (kind) {
    case 'claude-stream-json':
      return claudeParser()
    case 'codex-json':
      return codexParser()
    default:
      return null
  }
}
