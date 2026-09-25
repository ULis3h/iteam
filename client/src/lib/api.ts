import type { Agent, AgentInput, ImportPreview, LogLine, Run, RunStep, Runner, Stats, SystemInfo, Workflow, WorkflowDefinition } from '../types'

const TOKEN_KEY = 'iteam.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY) ?? ''
export const setToken = (token: string) => (token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY))

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn)

async function request<T>(method: string, path: string, body?: unknown, raw = false): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  if (res.status === 401) onUnauthorized?.()
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = await res.json()
      message = data.error ?? message
    } catch {
      /* not json */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (raw ? res.text() : res.json()) as Promise<T>
}

export const api = {
  system: () => request<SystemInfo>('GET', '/system'),
  refreshSystem: () => request<SystemInfo>('GET', '/system?refresh=1'),
  verifyToken: () => request<{ ok: boolean }>('POST', '/auth/verify', {}),
  stats: () => request<Stats>('GET', '/stats'),

  agents: () => request<Agent[]>('GET', '/agents'),
  createAgent: (data: AgentInput) => request<Agent>('POST', '/agents', data),
  updateAgent: (id: string, data: AgentInput) => request<Agent>('PUT', `/agents/${id}`, data),
  deleteAgent: (id: string) => request<void>('DELETE', `/agents/${id}`),

  runners: () => request<Runner[]>('GET', '/runners'),
  deleteRunner: (id: string) => request<void>('DELETE', `/runners/${id}`),

  workflows: () => request<Workflow[]>('GET', '/workflows'),
  workflow: (id: string) => request<Workflow>('GET', `/workflows/${id}`),
  createWorkflow: (data: WorkflowDefinition) => request<Workflow>('POST', '/workflows', data),
  updateWorkflow: (id: string, data: WorkflowDefinition) => request<Workflow>('PUT', `/workflows/${id}`, data),
  deleteWorkflow: (id: string) => request<void>('DELETE', `/workflows/${id}`),
  validateWorkflow: (data: WorkflowDefinition) => request<{ ok: boolean; stages: string[][] }>('POST', '/workflows/validate', data),
  runWorkflow: (id: string, inputs: Record<string, string>, name?: string) => request<Run>('POST', `/workflows/${id}/run`, { inputs, name }),
  previewImport: (content: string) => request<ImportPreview>('POST', '/workflows/preview', { content }),
  importWorkflow: (content: string, run: boolean, inputs?: Record<string, string>) =>
    request<{ workflow: Workflow; createdAgents: Array<{ id: string; name: string; defaulted: boolean }>; run: Run | null }>('POST', '/workflows/import', { content, run, inputs }),
  exportWorkflow: (id: string, format: 'yaml' | 'json') => request<string>('GET', `/workflows/${id}/export?format=${format}`, undefined, true),

  runs: (params: { status?: string; workflowId?: string; limit?: number } = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.set('status', params.status)
    if (params.workflowId) q.set('workflowId', params.workflowId)
    if (params.limit) q.set('limit', String(params.limit))
    const s = q.toString()
    return request<Run[]>('GET', `/runs${s ? `?${s}` : ''}`)
  },
  run: (id: string) => request<Run>('GET', `/runs/${id}`),
  runLogs: (id: string, stepId?: string) => request<LogLine[]>('GET', `/runs/${id}/logs${stepId ? `?stepId=${stepId}` : ''}`),
  runStep: (runId: string, stepId: string) => request<RunStep>('GET', `/runs/${runId}/steps/${stepId}`),
  quickRun: (agentId: string, prompt: string, name?: string, workDir?: string) => request<Run>('POST', '/runs/quick', { agentId, prompt, name, workDir }),
  cancelRun: (id: string) => request<Run>('POST', `/runs/${id}/cancel`, {}),
  retryRun: (id: string) => request<Run>('POST', `/runs/${id}/retry`, {}),
  rerun: (id: string) => request<Run>('POST', `/runs/${id}/rerun`, {}),
  deleteRun: (id: string) => request<void>('DELETE', `/runs/${id}`),
}
