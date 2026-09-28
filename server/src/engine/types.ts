export type Effort = 'low' | 'medium' | 'high' | 'max'
export type Provider = 'claude-code' | 'codex' | 'gemini' | 'custom' | 'demo'
export type Location = 'local' | 'remote'

export const EFFORTS: Effort[] = ['low', 'medium', 'high', 'max']
export const PROVIDER_IDS: Provider[] = ['claude-code', 'codex', 'gemini', 'custom', 'demo']

export type RunStatus = 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled'
export type StepStatus = 'pending' | 'waiting' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'

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
  /** Continue a previous CLI session (follow-up prompts). */
  resumeSessionId?: string
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
  /** Server-side parser for the CLI's machine-readable output (see parsers.ts). */
  parser: 'none' | 'claude-stream-json' | 'codex-json'
  /** Record `git diff` of the working tree after the job finishes. */
  captureDiff?: boolean
  /** Shell command run in cwd after a successful exit; a non-zero exit fails the step. */
  check?: string
}

export interface JobResult {
  exitCode: number | null
  output: string
  error?: string
  timedOut?: boolean
  cancelled?: boolean
  /** Captured output exceeded the cap and only the tail was kept. */
  truncated?: boolean
  /** Git working-tree changes in cwd after the job (when cwd is inside a repository). */
  diff?: string
}

export type LogStream = 'stdout' | 'stderr' | 'system' | 'event'

export interface JobHandlers {
  onLog: (stream: LogStream, line: string) => void
  onDone: (result: JobResult) => void
  /** The process started (local jobs only); lets the server clean up orphans after a crash. */
  onStart?: (info: { pid?: number }) => void
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

export type StepType = 'agent' | 'approval'

export interface WorkflowStep {
  id: string
  name: string
  /** 'agent' (default) runs a CLI agent; 'approval' pauses until a person approves. */
  type?: StepType
  /** Required for agent steps; ignored for approval steps. */
  agentId: string
  /** Agent prompt, or the message shown to the reviewer for approval steps. */
  prompt: string
  dependsOn: string[]
  expectedOutput?: string
  model?: string
  effort?: Effort
  timeoutSec?: number
  retries?: number
  continueOnError?: boolean
  /** Working directory for this step (overrides the agent's). */
  workDir?: string
  /** Follow-up steps continue an earlier CLI session instead of starting fresh. */
  resumeSessionId?: string
  /** Shell command that must exit 0 (in the step's working directory) for the step to count as succeeded. */
  check?: string
  /** Predicate on inputs / upstream results; when false the step (and its descendants) are skipped. See conditions.ts. */
  when?: string
  /** Predicate the step output must satisfy (e.g. `contains 'FINAL'`); otherwise the step fails and retries with feedback. */
  assertOutput?: string
}

export interface WorkflowSettings {
  /** Cancel the run once the summed step cost (from the CLIs' own reports) exceeds this amount. */
  maxCostUsd?: number
  /** Secret of the inbound trigger URL (POST /api/hooks/:workflowId/:token); absent = no trigger. */
  hookToken?: string
}

export interface WorkflowDefinition {
  name: string
  description: string
  inputs: WorkflowInput[]
  steps: WorkflowStep[]
  settings?: WorkflowSettings
}
