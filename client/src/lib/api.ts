import type { Agent, AgentInput, ImportPreview, LogLine, Run, RunStep, Runner, Stats, SystemInfo, Workflow, WorkflowDefinition, WorkflowTemplate } from '../types'

import { storage } from './storage'

const TOKEN_KEY = 'iteam.token'

export const getToken = () => storage.get(TOKEN_KEY) ?? ''
/** Persist the token for this tab (session) or, when asked, for this device. */
export const setToken = (token: string, remember = false) => (token ? storage.set(TOKEN_KEY, token, remember) : storage.remove(TOKEN_KEY))

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn)

interface RequestOptions {
  raw?: boolean
  /** Use this token instead of the stored one (token verification before persisting). */
  token?: string
  /** Do not trigger the global unauthorized handler on 401. */
  quiet?: boolean
}

async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = opts.token ?? getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch (err) {
    throw new ApiError(0, `network error: ${(err as Error).message}`)
  }
  if (res.status === 401 && !opts.quiet) onUnauthorized?.()
  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`
    try {
      const data = await res.json()
      message = data.error ?? message
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (opts.raw ? res.text() : res.json()) as Promise<T>
}

export const api = {
  system: () => request<SystemInfo>('GET', '/system'),
  refreshSystem: () => request<SystemInfo>('GET', '/system?refresh=1'),
  verifyToken: (token?: string) => request<{ ok: boolean }>('POST', '/auth/verify', {}, { token, quiet: true }),
  stats: () => request<Stats>('GET', '/stats'),

  agents: () => request<Agent[]>('GET', '/agents'),
  createAgent: (data: AgentInput) => request<Agent>('POST', '/agents', data),
  updateAgent: (id: string, data: AgentInput) => request<Agent>('PUT', `/agents/${id}`, data),
  deleteAgent: (id: string, force = false) => request<void>('DELETE', `/agents/${id}${force ? '?force=1' : ''}`),
  agentUsage: (id: string) => request<{ workflows: Array<{ id: string; name: string }>; pendingSteps: number }>('GET', `/agents/${id}/usage`),

  runners: () => request<Runner[]>('GET', '/runners'),
  deleteRunner: (id: string) => request<void>('DELETE', `/runners/${id}`),

  workflows: () => request<Workflow[]>('GET', '/workflows'),
  workflow: (id: string) => request<Workflow>('GET', `/workflows/${id}`),
  createWorkflow: (data: WorkflowDefinition) => request<Workflow>('POST', '/workflows', data),
  updateWorkflow: (id: string, data: WorkflowDefinition) => request<Workflow>('PUT', `/workflows/${id}`, data),
  deleteWorkflow: (id: string) => request<void>('DELETE', `/workflows/${id}`),
  validateWorkflow: (data: WorkflowDefinition) => request<{ ok: boolean; stages: string[][]; warnings: string[] }>('POST', '/workflows/validate', data),
  runWorkflow: (id: string, inputs: Record<string, string>, name?: string) => request<Run>('POST', `/workflows/${id}/run`, { inputs, name }),
  previewImport: (content: string) => request<ImportPreview>('POST', '/workflows/preview', { content }),
  importWorkflow: (content: string, run: boolean, inputs?: Record<string, string>) =>
    request<{ workflow: Workflow; createdAgents: Array<{ id: string; name: string; defaulted: boolean }>; run: Run | null }>('POST', '/workflows/import', { content, run, inputs }),
  templates: () => request<WorkflowTemplate[]>('GET', '/templates'),
  exportWorkflow: (id: string, format: 'yaml' | 'json') => request<string>('GET', `/workflows/${id}/export?format=${format}`, undefined, { raw: true }),

  runs: (params: { status?: string; workflowId?: string; limit?: number; before?: string } = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.set('status', params.status)
    if (params.workflowId) q.set('workflowId', params.workflowId)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.before) q.set('before', params.before)
    const s = q.toString()
    return request<Run[]>('GET', `/runs${s ? `?${s}` : ''}`)
  },
  run: (id: string) => request<Run>('GET', `/runs/${id}`),
  runLogs: (id: string, stepId?: string) => request<LogLine[]>('GET', `/runs/${id}/logs?limit=20000${stepId ? `&stepId=${stepId}` : ''}`),
  runStep: (runId: string, stepId: string) => request<RunStep>('GET', `/runs/${runId}/steps/${stepId}`),
  quickRun: (agentId: string, prompt: string, name?: string, workDir?: string) => request<Run>('POST', '/runs/quick', { agentId, prompt, name, workDir }),
  followUp: (runId: string, stepId: string, prompt: string) => request<Run>('POST', `/runs/${runId}/steps/${stepId}/followup`, { prompt }),
  approveStep: (runId: string, stepId: string, approved: boolean, note?: string) => request<Run>('POST', `/runs/${runId}/steps/${stepId}/approve`, { approved, note }),
  rerunFrom: (runId: string, stepId: string) => request<Run>('POST', `/runs/${runId}/steps/${stepId}/rerun-from`, {}),
  cancelRun: (id: string) => request<Run>('POST', `/runs/${id}/cancel`, {}),
  retryRun: (id: string) => request<Run>('POST', `/runs/${id}/retry`, {}),
  rerun: (id: string, inputs?: Record<string, string>, name?: string) => request<Run>('POST', `/runs/${id}/rerun`, { inputs, name }),
  deleteRun: (id: string) => request<void>('DELETE', `/runs/${id}`),
}
