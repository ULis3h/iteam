import api from './api'
import type { Project } from '../types'

export interface CreateProjectData {
  name: string
  description?: string
  repository?: string
  status?: 'active' | 'paused' | 'completed'
  startDate?: string
  endDate?: string | null
}

export interface UpdateProjectData {
  name?: string
  description?: string
  repository?: string
  status?: 'active' | 'paused' | 'completed'
  endDate?: string | null
}

export interface AddContributionData {
  deviceId: string
  commits?: number
  linesAdded?: number
  linesDeleted?: number
}

class ProjectService {
  /**
   * 获取所有项目
   */
  async getAllProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>('/projects')
    return response.data.map(project => ({
      ...project,
      startDate: new Date(project.startDate),
      endDate: project.endDate ? new Date(project.endDate) : undefined,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }))
  }

  /**
   * 获取单个项目
   */
  async getProjectById(id: string): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`)
    return {
      ...response.data,
      startDate: new Date(response.data.startDate),
      endDate: response.data.endDate ? new Date(response.data.endDate) : undefined,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    }
  }

  /**
   * 创建项目
   */
  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await api.post<Project>('/projects', data)
    return {
      ...response.data,
      startDate: new Date(response.data.startDate),
      endDate: response.data.endDate ? new Date(response.data.endDate) : undefined,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    }
  }

  /**
   * 更新项目
   */
  async updateProject(id: string, data: UpdateProjectData): Promise<Project> {
    const response = await api.put<Project>(`/projects/${id}`, data)
    return {
      ...response.data,
      startDate: new Date(response.data.startDate),
      endDate: response.data.endDate ? new Date(response.data.endDate) : undefined,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  }

  /**
   * 添加/更新项目贡献
   */
  async addContribution(projectId: string, data: AddContributionData): Promise<void> {
    await api.post(`/projects/${projectId}/contributions`, data)
  }
}

export default new ProjectService()
