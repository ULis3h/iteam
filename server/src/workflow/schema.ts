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

export const stepFieldsSchema = z.object({
  id: identifier,
  name: z.string().min(1),
  prompt: z.string().min(1),
  dependsOn: z.array(z.string()).default([]),
  expectedOutput: z.string().optional(),
  model: z.string().optional(),
  effort: effortSchema.optional(),
  timeoutSec: z.number().int().positive().max(86400).optional(),
  retries: z.number().int().min(0).max(5).optional(),
  continueOnError: z.boolean().optional(),
})

/** Steps as stored in the database and edited in the UI (agent referenced by id). */
export const storedStepSchema = stepFieldsSchema.extend({ agentId: z.string().min(1) })

/** Steps as written in an importable file (agent referenced by name). */
export const fileStepSchema = stepFieldsSchema.extend({ agent: z.string().min(1) })

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
  timeoutSec: z.number().int().positive().optional(),
})

export const workflowBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().default(''),
  inputs: z.array(inputSchema).default([]),
  steps: z.array(storedStepSchema).min(1),
})

export const workflowFileSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().default(''),
  inputs: z.array(inputSchema).default([]),
  agents: z.array(inlineAgentSchema).default([]),
  steps: z.array(fileStepSchema).min(1),
})

export const agentBodySchema = z.object({
  name: z.string().min(1).max(80),
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
  color: z.string().default(''),
})

export type WorkflowFile = z.infer<typeof workflowFileSchema>
export type AgentBody = z.infer<typeof agentBodySchema>

export const formatZodError = (err: z.ZodError): string =>
  err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
