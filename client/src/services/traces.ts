import api from './api'

export interface TaskSession {
    id: string
    taskId: string | null
    deviceId: string
    status: 'running' | 'completed' | 'failed' | 'paused'
    title: string | null
    startTime: string
    endTime: string | null
    createdAt: string
    updatedAt: string
    entries?: TraceEntry[]
    device?: {
        id: string
        name: string
    }
    _count?: {
        entries: number
    }
}

export interface TraceEntry {
    id: string
    sessionId: string
    timestamp: string
    type: 'task_received' | 'thinking' | 'discussion' | 'step' | 'result' | 'error'
    title: string
    content: string
    metadata: string | null
    duration: number | null
    createdAt: string
}

// 获取设备的所有会话
export const getDeviceSessions = async (
    deviceId: string,
    options: { limit?: number; offset?: number } = {}
): Promise<{ sessions: TaskSession[]; total: number }> => {
    const { limit = 20, offset = 0 } = options
    const response = await api.get(`/traces/device/${deviceId}`, {
        params: { limit, offset }
    })
    return response.data
}

// 获取会话详情
export const getSession = async (sessionId: string): Promise<TaskSession> => {
    const response = await api.get(`/traces/session/${sessionId}`)
    return response.data
}

// 获取设备追踪统计
export const getDeviceStats = async (
    deviceId: string
): Promise<{ total: number; running: number; completed: number; failed: number }> => {
    const response = await api.get(`/traces/stats/${deviceId}`)
    return response.data
}

// 删除会话
export const deleteSession = async (sessionId: string): Promise<void> => {
    await api.delete(`/traces/session/${sessionId}`)
}
