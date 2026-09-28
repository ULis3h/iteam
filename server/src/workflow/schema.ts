import { z } from 'zod'
import { EFFORTS, PROVIDER_IDS } from '../engine/types.js'

const identifier = z.string().regex(/^[A-Za-z_][\w-]{0,63}$/, 'use letters, digits, "_" or "-" (must start with a letter)')

export const inputSchema = z.object({
  key: identifier,
  label: z.string().optional(),
  description: z.string().optional(),
  default: z.string().optional(),
  required: z.boolean().optional(),
})

const effortSchema = z.enum(EFFORTS as [string, ...string[]])

export const settingsSchema = z.object({
  maxCostUsd: z.number().positive().max(100000).optional(),
})

export const stepFieldsSchema = z.object({
  id: identifier,
  name: z.string().min(1),
  type: z.enum(['agent', 'approval']).optional(),
  prompt: z.string().min(1),
  dependsOn: z.array(z.string()).default([]),
  expectedOutput: z.string().optional(),
  model: z.string().optional(),
  effort: effortSchema.optional(),
  timeoutSec: z.number().int().positive().max(86400).optional(),
  retries: z.number().int().min(0).max(5).optional(),
  continueOnError: z.boolean().optional(),
  workDir: z.string().max(1024).optional(),
  resumeSessionId: z.string().optional(),
})

const agentRequired = (s: { type?: string; agentId?: string; agent?: string }) => s.type === 'approval' || !!(s.agentId ?? s.agent)

/** Steps as stored in the database and edited in the UI (agent referenced by id). */
export const storedStepSchema = stepFieldsSchema.extend({ agentId: z.string().default('') }).refine(agentRequired, { message: 'agent steps need an agent', path: ['agentId'] })

/** Steps as written in an importable file (agent referenced by name). */
export const fileStepSchema = stepFieldsSchema.extend({ agent: z.string().default('') }).refine(agentRequired, { message: 'agent steps need an agent', path: ['agent'] })

export const inlineAgentSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().optional(),
  role: z.string().optional(),
  location: z.enum(['local', 'remote']).optional(),
  runner: z.string().optional(),
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]).optional(),
  model: z.string().optional(),
  effort: effortSchema.optional(),
  workDir: z.string().optional(),
  command: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  autoApprove: z.boolean().optional(),
  timeoutSec: z.number().int().positive().max(86400).optional(),
  maxConcurrent: z.number().int().min(1).max(16).optional(),
  color: z.string().max(32).optional(),
})

const uniqueInputKeys = (inputs: Array<{ key: string }>) => new Set(inputs.map((i) => i.key)).size === inputs.length

export const workflowBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).default(''),
  inputs: z.array(inputSchema).default([]).refine(uniqueInputKeys, { message: 'input keys must be unique' }),
  steps: z.array(storedStepSchema).min(1),
  settings: settingsSchema.default({}),
})

export const workflowFileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).default(''),
  inputs: z.array(inputSchema).default([]).refine(uniqueInputKeys, { message: 'input keys must be unique' }),
  agents: z.array(inlineAgentSchema).default([]),
  steps: z.array(fileStepSchema).min(1),
  settings: settingsSchema.default({}),
})

export const agentBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().default(''),
  role: z.string().default(''),
  location: z.enum(['local', 'remote']).default('local'),
  runnerId: z.string().nullable().optional(),
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]).default('claude-code'),
  model: z.string().default(''),
  effort: effortSchema.default('medium'),
  workDir: z.string().default(''),
  command: z.string().default(''),
  extraArgs: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  autoApprove: z.boolean().default(true),
  timeoutSec: z.number().int().positive().max(86400).default(1800),
  maxConcurrent: z.number().int().min(1).max(16).default(1),
  color: z.string().max(32).default(''),
})

export const runBodySchema = z.object({
  inputs: z.record(z.string().max(200_000)).optional(),
  name: z.string().trim().max(120).optional(),
})

export const quickRunSchema = z.object({
  agentId: z.string().min(1),
  prompt: z.string().trim().min(1).max(200_000),
  name: z.string().trim().max(120).optional(),
  workDir: z.string().trim().max(1024).optional(),
})

export const followUpSchema = z.object({ prompt: z.string().trim().min(1).max(200_000) })

export const runListQuerySchema = z.object({
  status: z.string().max(100).optional(),
  workflowId: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  before: z.string().datetime().optional(),
})

export const logsQuerySchema = z.object({
  stepId: z.string().max(64).optional(),
  after: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(20_000).default(5000),
})

export const pruneSchema = z.object({ days: z.number().int().min(0).max(3650) })

export type WorkflowFile = z.infer<typeof workflowFileSchema>
export type AgentBody = z.infer<typeof agentBodySchema>

export const formatZodError = (err: z.ZodError): string =>
  err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')

export const approvalSchema = z.object({
  approved: z.boolean(),
  note: z.string().trim().max(20_000).optional(),
})
