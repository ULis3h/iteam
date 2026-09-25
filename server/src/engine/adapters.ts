import type { AgentRuntime, Effort, JobSpec, Provider } from './types.js'

export interface ProviderSpec {
  id: Provider
  label: string
  bin: string
  models: string[]
  supportsEffort: boolean
  hint: string
}

export const PROVIDERS: ProviderSpec[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    bin: 'claude',
    models: ['sonnet', 'opus', 'haiku', 'claude-sonnet-5', 'claude-opus-5-5', 'claude-fable-5-1', 'claude-haiku-4-5'],
    supportsEffort: true,
    hint: 'claude -p --effort <level> --model <model>',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    bin: 'codex',
    models: ['gpt-5-codex', 'gpt-5', 'o4-mini'],
    supportsEffort: true,
    hint: 'codex exec -m <model> -c model_reasoning_effort=<level>',
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    bin: 'gemini',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    supportsEffort: false,
    hint: 'gemini -m <model> (prompt via stdin)',
  },
  {
    id: 'custom',
    label: 'Custom command',
    bin: '',
    models: [],
    supportsEffort: true,
    hint: 'Template placeholders: {{prompt}} {{promptFile}} {{outputFile}} {{model}} {{effort}} {{workDir}}',
  },
]

export const providerSpec = (id: string): ProviderSpec =>
  PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1]

const CODEX_EFFORT: Record<Effort, string> = { low: 'low', medium: 'medium', high: 'high', max: 'xhigh' }

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`

/** Translate an agent runtime + prompt into a concrete process spec. */
export function buildJob(id: string, runtime: AgentRuntime, prompt: string): JobSpec {
  const base = {
    id,
    stdin: prompt,
    cwd: runtime.workDir,
    env: runtime.env,
    timeoutSec: runtime.timeoutSec,
  }

  switch (runtime.provider) {
    case 'claude-code': {
      const args = ['-p', '--output-format', 'text']
      if (runtime.model) args.push('--model', runtime.model)
      if (runtime.effort) args.push('--effort', runtime.effort)
      if (runtime.autoApprove) args.push('--dangerously-skip-permissions')
      else args.push('--permission-mode', 'acceptEdits')
      args.push(...runtime.extraArgs)
      return { ...base, cmd: 'claude', args, shell: false, useOutputFile: false }
    }
    case 'codex': {
      const args = ['exec', '--skip-git-repo-check', '-o', '{{outputFile}}']
      if (runtime.model) args.push('-m', runtime.model)
      if (runtime.effort) args.push('-c', `model_reasoning_effort="${CODEX_EFFORT[runtime.effort]}"`)
      args.push(runtime.autoApprove ? '--dangerously-bypass-approvals-and-sandbox' : '--full-auto')
      args.push(...runtime.extraArgs, '-')
      return { ...base, cmd: 'codex', args, shell: false, useOutputFile: true }
    }
    case 'gemini': {
      const args: string[] = []
      if (runtime.model) args.push('-m', runtime.model)
      if (runtime.autoApprove) args.push('--yolo')
      else args.push('--approval-mode', 'auto_edit')
      args.push(...runtime.extraArgs)
      return { ...base, cmd: 'gemini', args, shell: false, useOutputFile: false }
    }
    case 'custom':
    default: {
      const template = runtime.command.trim()
      if (!template) throw new Error('custom provider requires a command template')
      const cmd = template
        .replace(/\{\{\s*model\s*\}\}/g, runtime.model)
        .replace(/\{\{\s*effort\s*\}\}/g, runtime.effort)
        .replace(/\{\{\s*workDir\s*\}\}/g, runtime.workDir)
        .replace(/\{\{\s*prompt\s*\}\}/g, shellQuote(prompt))
      const useOutputFile = /\{\{\s*outputFile\s*\}\}/.test(cmd)
      return { ...base, cmd, args: [], shell: true, useOutputFile }
    }
  }
}

/** A human readable preview of the command (used in logs and the UI). */
export const describeJob = (job: JobSpec): string =>
  job.shell ? job.cmd : [job.cmd, ...job.args].map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')
