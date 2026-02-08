import api from './api'

export interface TaskFilters {
    deviceId?: string
    projectId?: string
    status?: string
    limit?: number
}

export interface CreateTaskData {
    title: string
    description: string
    deviceId: string
    projectId: string
    type?: 'code_generation' | 'code_review' | 'bug_fix' | 'test_generation' | 'refactor' | 'custom'
    workDir?: string
}

export interface TaskResponse {
    id: string
    deviceId: string
    projectId: string
    module: string
    description: string
    status: string
    createdAt: string
    updatedAt: string
    device?: { id: string; name: string; status: string }
    project?: { id: string; name: string }
    dispatched?: boolean
    message?: string
}

class TaskService {
    /**
     * 获取所有任务
     */
    async getAllTasks(filters?: TaskFilters): Promise<TaskResponse[]> {
        const params = new URLSearchParams()
        if (filters?.deviceId) params.append('deviceId', filters.deviceId)
        if (filters?.projectId) params.append('projectId', filters.projectId)
        if (filters?.status) params.append('status', filters.status)
        if (filters?.limit) params.append('limit', String(filters.limit))

        const query = params.toString()
        const response = await api.get<TaskResponse[]>(`/tasks${query ? `?${query}` : ''}`)
        return response.data
    }

    /**
     * 获取单个任务
     */
    async getTaskById(id: string): Promise<TaskResponse> {
        const response = await api.get<TaskResponse>(`/tasks/${id}`)
        return response.data
    }

    /**
     * 创建任务并分发给 Agent
     */
    async createTask(data: CreateTaskData): Promise<TaskResponse> {
        const response = await api.post<TaskResponse>('/tasks', data)
        return response.data
    }

    /**
     * 更新任务状态
     */
    async updateTaskStatus(id: string, status: string, result?: string): Promise<TaskResponse> {
        const response = await api.patch<TaskResponse>(`/tasks/${id}`, { status, result })
        return response.data
    }

    /**
     * 删除任务
     */
    async deleteTask(id: string): Promise<void> {
        await api.delete(`/tasks/${id}`)
    }
}

export default new TaskService()
