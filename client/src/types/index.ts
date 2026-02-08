// 用户类型
export interface User {
  id: string
  email: string
  username: string
  avatar?: string
  role: 'user' | 'admin'
  createdAt?: Date
}

// 认证响应类型
export interface AuthResponse {
  message: string
  token: string
  user: User
}

// 团队角色类型
export type DeviceRole = 'frontend' | 'backend' | 'fullstack' | 'devops' | 'qa' | 'architect' | 'pm' | 'designer'

// 设备/员工类型
export interface Device {
  id: string
  name: string
  type: 'vscode' | 'windsurf' | 'antigravity' | 'claude-code' | 'other'
  role?: DeviceRole
  skills?: string[]
  documentIds?: string[]
  status: 'online' | 'offline' | 'idle' | 'working'
  os: string
  ip: string
  currentProject?: string
  currentModule?: string
  lastSeen: Date
  createdAt: Date
  metadata?: {
    cpu?: string
    memory?: string
    version?: string
    [key: string]: any
  }
}

// 贡献类型
export interface Contribution {
  id: string
  deviceId: string
  projectId: string
  commits: number
  linesAdded: number
  linesDeleted: number
  createdAt: Date
  updatedAt: Date
  device?: Device
}

// 任务类型
export interface Task {
  id: string
  deviceId: string
  projectId: string
  module: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'failed' | 'paused'
  createdAt: Date
  updatedAt: Date
  device?: Device
  project?: { id: string; name: string }
}

// 项目类型
export interface Project {
  id: string
  name: string
  description: string
  repository: string
  status: 'active' | 'paused' | 'completed'
  startDate: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
  contributions: Contribution[]
  tasks: Task[]
}

// 文档类型
export interface Document {
  id: string
  title: string
  content: string
  category: 'standard' | 'tech' | 'bug' | 'role-skill' | 'other'
  tags: string[]
  author: string
  createdAt: Date
  updatedAt: Date
}

// WebSocket消息类型
export interface WSMessage {
  type: 'device-status' | 'project-update' | 'task-update' | 'notification'
  payload: any
  timestamp: Date
}

// 统计数据类型
export interface Stats {
  totalDevices: number
  onlineDevices: number
  activeProjects: number
  totalCommits: number
  totalDocs: number
}
