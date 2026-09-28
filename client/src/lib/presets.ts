import type { Effort, Provider } from '../types'
import type { TKey } from './i18n'

export type ModelTier = 'strong' | 'balanced' | 'fast'

export interface AgentPreset {
  id: string
  nameKey: TKey
  roleKey: TKey
  tier: ModelTier
  effort: Effort
}

/** Role presets fill name, role and effort; the model is chosen for whichever CLI is selected. */
export const AGENT_PRESETS: AgentPreset[] = [
  { id: 'architect', nameKey: 'preset.architect.name', roleKey: 'preset.architect.role', tier: 'strong', effort: 'high' },
  { id: 'developer', nameKey: 'preset.developer.name', roleKey: 'preset.developer.role', tier: 'balanced', effort: 'medium' },
  { id: 'reviewer', nameKey: 'preset.reviewer.name', roleKey: 'preset.reviewer.role', tier: 'balanced', effort: 'high' },
  { id: 'tester', nameKey: 'preset.tester.name', roleKey: 'preset.tester.role', tier: 'balanced', effort: 'medium' },
  { id: 'writer', nameKey: 'preset.writer.name', roleKey: 'preset.writer.role', tier: 'fast', effort: 'low' },
  { id: 'researcher', nameKey: 'preset.researcher.name', roleKey: 'preset.researcher.role', tier: 'balanced', effort: 'high' },
]

const TIER_MODELS: Record<Provider, Record<ModelTier, string>> = {
  'claude-code': { strong: 'opus', balanced: 'sonnet', fast: 'haiku' },
  codex: { strong: 'gpt-5-codex', balanced: 'gpt-5-codex', fast: 'gpt-5' },
  gemini: { strong: 'gemini-2.5-pro', balanced: 'gemini-2.5-pro', fast: 'gemini-2.5-flash' },
  custom: { strong: '', balanced: '', fast: '' },
}

export const presetModel = (provider: Provider, tier: ModelTier): string => TIER_MODELS[provider]?.[tier] ?? ''
