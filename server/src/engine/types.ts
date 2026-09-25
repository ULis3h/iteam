export type Effort = 'low' | 'medium' | 'high' | 'max'
export type Provider = 'claude-code' | 'codex' | 'gemini' | 'custom'
export type Location = 'local' | 'remote'

export const EFFORTS: Effort[] = ['low', 'medium', 'high', 'max']
export const PROVIDER_IDS: Provider[] = ['claude-code', 'codex', 'gemini', 'custom']

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type StepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'

/** Runtime configuration of an agent, resolved right before a step executes. */
export interface AgentRuntime {
  provider: Provider
  model: string
  effort: Effort
  autoApprove: boolean
  extraArgs: string[]
  command: string
  env: Record<string, string>
  workDir: string
  timeoutSec: number
}

/** A concrete process to execute, understood by both the local executor and remote runners. */
export interface JobSpec {
  id: string
  cmd: string
  args: string[]
  shell: boolean
  stdin: string
  cwd: string
  env: Record<string, string>
  timeoutSec: number
  /** Read the final answer from the `{{outputFile}}` placeholder path instead of stdout. */
  useOutputFile: boolean
}

export interface JobResult {
  exitCode: number | null
  output: string
  error?: string
  timedOut?: boolean
  cancelled?: boolean
}

export type LogStream = 'stdout' | 'stderr' | 'system'

export interface JobHandlers {
  onLog: (stream: LogStream, line: string) => void
  onDone: (result: JobResult) => void
}

export interface JobHandle {
  cancel: () => void
}

/** Workflow definition types (stored as JSON in the database and used by import/export). */
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

export interface WorkflowDefinition {
  name: string
  description: string
  inputs: WorkflowInput[]
  steps: WorkflowStep[]
}
