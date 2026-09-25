export type Effort = 'low' | 'medium' | 'high' | 'max'
export type Provider = 'claude-code' | 'codex' | 'gemini' | 'custom'
export type Location = 'local' | 'remote'
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type StepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'
export type AgentState = 'ready' | 'busy' | 'offline' | 'missing-cli'

export interface ProviderSpec {
  id: Provider
  label: string
  bin: string
  models: string[]
  supportsEffort: boolean
  hint: string
}

export interface SystemInfo {
  version: string
  authRequired: boolean
  maxParallel: number
  defaultWorkDir: string
  platform: string
  providers: ProviderSpec[]
  efforts: Effort[]
  capabilities: { checkedAt: string; providers: Record<string, { available: boolean; path: string | null }> }
  activeSteps: number
}

export interface Runner {
  id: string
  name: string
  hostname: string
  os: string
  arch: string
  version: string
  status: 'online' | 'offline'
  capabilities: string[]
  lastSeen: string
  createdAt: string
  agents?: number
  activeJobs?: number
}

export interface Agent {
  id: string
  name: string
  description: string
  role: string
  location: Location
  runnerId: string | null
  provider: Provider
  model: string
  effort: Effort
  workDir: string
  command: string
  extraArgs: string[]
  env: Record<string, string>
  autoApprove: boolean
  timeoutSec: number
  color: string
  createdAt: string
  updatedAt: string
  runner?: Runner | null
  state: AgentState
  busy: number
}

export type AgentInput = Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'runner' | 'state' | 'busy'>

export interface WorkflowInput {
  key: string
  label?: string
  description?: string
  default?: string
  required?: boolean
}

export interface WorkflowStep {
  id: string
  name: string
  agentId: string
  prompt: string
  dependsOn: string[]
  expectedOutput?: string
  model?: string
  effort?: Effort
  timeoutSec?: number
  retries?: number
  continueOnError?: boolean
}

export interface Workflow {
  id: string
  name: string
  description: string
  inputs: WorkflowInput[]
  steps: WorkflowStep[]
  source: 'ui' | 'import'
  createdAt: string
  updatedAt: string
  runCount?: number
  lastRun?: { id: string; status: RunStatus; createdAt: string } | null
}

export interface WorkflowDefinition {
  name: string
  description: string
  inputs: WorkflowInput[]
  steps: WorkflowStep[]
}

export interface RunStep {
  id: string
  runId: string
  key: string
  name: string
  order: number
  agentId: string | null
  agentName: string
  dependsOn: string[]
  status: StepStatus
  attempt: number
  maxAttempts: number
  continueOnError: boolean
  prompt: string | null
  output: string | null
  error: string | null
  exitCode: number | null
  provider: string
  model: string
  effort: string
  location: Location
  runnerId: string | null
  startedAt: string | null
  finishedAt: string | null
}

export interface Run {
  id: string
  workflowId: string | null
  name: string
  status: RunStatus
  inputs: Record<string, string>
  snapshot: WorkflowDefinition | null
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  steps?: RunStep[]
  workflow?: { id: string; name: string } | null
}

export interface LogLine {
  runId: string
  stepId: string
  seq: number
  ts: string
  stream: 'stdout' | 'stderr' | 'system'
  line: string
}

export interface Stats {
  agents: number
  runnersOnline: number
  workflows: number
  running: number
  failed24h: number
  succeeded24h: number
  runs24h: number
}

export interface ImportPreview {
  ok: boolean
  error?: string
  name?: string
  description?: string
  inputs?: WorkflowInput[]
  steps?: Array<{ id: string; name: string; agent: string; dependsOn: string[] }>
  agents?: Array<{ name: string; status: 'existing' | 'create' | 'create-default' }>
  stages?: string[][]
}
