import type { Effort, Provider } from '../types'
import type { TKey } from './i18n'

export interface AgentPreset {
  id: string
  nameKey: TKey
  roleKey: TKey
  provider: Provider
  model: string
  effort: Effort
}

/** Role presets that fill the agent form; the CLI/model stays editable. */
export const AGENT_PRESETS: AgentPreset[] = [
  { id: 'architect', nameKey: 'preset.architect.name', roleKey: 'preset.architect.role', provider: 'claude-code', model: 'opus', effort: 'high' },
  { id: 'developer', nameKey: 'preset.developer.name', roleKey: 'preset.developer.role', provider: 'claude-code', model: 'sonnet', effort: 'medium' },
  { id: 'reviewer', nameKey: 'preset.reviewer.name', roleKey: 'preset.reviewer.role', provider: 'claude-code', model: 'sonnet', effort: 'high' },
  { id: 'tester', nameKey: 'preset.tester.name', roleKey: 'preset.tester.role', provider: 'claude-code', model: 'sonnet', effort: 'medium' },
  { id: 'writer', nameKey: 'preset.writer.name', roleKey: 'preset.writer.role', provider: 'claude-code', model: 'haiku', effort: 'low' },
  { id: 'researcher', nameKey: 'preset.researcher.name', roleKey: 'preset.researcher.role', provider: 'claude-code', model: 'sonnet', effort: 'high' },
]
