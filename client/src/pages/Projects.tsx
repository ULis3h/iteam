import { useState, useEffect } from 'react'
import { FolderGit2, Plus, GitBranch, Users, TrendingUp } from 'lucide-react'
import type { Project } from '../types'

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    // TODO: 从API获取项目列表
    setProjects([
      {
        id: '1',
        name: 'iTeam项目',
        description: '一人即团队协作管理系统',
        repository: 'https://github.com/user/iteam',
        status: 'active',
        startDate: new Date('2024-01-01'),
        contributors: [
          {
            deviceId: '1',
            commits: 85,
            linesAdded: 5420,
            linesDeleted: 1230,
          },
          {
            deviceId: '2',
            commits: 42,
            linesAdded: 2840,
            linesDeleted: 850,
          },
        ],
        currentTasks: [
          {
            deviceId: '1',
            module: '前端开发',
            description: '实现Dashboard页面',
          },
          {
            deviceId: '2',
            module: '后端API',
            description: '开发WebSocket实时通信',
          },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'AI助手集成',
        description: 'MCP协议集成多种AI助手',
        repository: 'https://github.com/user/ai-integration',
        status: 'active',
        startDate: new Date('2024-02-01'),
        contributors: [
          {
            deviceId: '1',
            commits: 23,
            linesAdded: 1240,
            linesDeleted: 320,
          },
        ],
        currentTasks: [],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: '文档管理系统',
        description: '团队知识库和文档管理',
        repository: 'https://github.com/user/docs',
        status: 'paused',
        startDate: new Date('2023-12-01'),
        endDate: new Date('2024-01-15'),
        contributors: [
          {
            deviceId: '1',
            commits: 12,
            linesAdded: 680,
            linesDeleted: 120,
          },
        ],
        currentTasks: [],
        createdAt: new Date('2023-12-01'),
        updatedAt: new Date('2024-01-15'),
      },
    ])
  }, [])

  const getStatusBadge = (status: Project['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    }
    const labels = {
      active: '进行中',
      paused: '暂停',
      completed: '已完成',
    }
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const getTotalCommits = (project: Project) =>
    project.contributors.reduce((sum, c) => sum + c.commits, 0)

  const getTotalLines = (project: Project) => {
    const added = project.contributors.reduce((sum, c) => sum + c.linesAdded, 0)
    const deleted = project.contributors.reduce((sum, c) => sum + c.linesDeleted, 0)
    return { added, deleted, total: added - deleted }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            项目管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            追踪和管理所有开发项目
          </p>
        </div>
        <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="h-5 w-5 mr-2" />
          新建项目
        </button>
      </div>

      {/* 项目列表 */}
      <div className="grid grid-cols-1 gap-6">
        {projects.map((project) => {
          const totalCommits = getTotalCommits(project)
          const lines = getTotalLines(project)

          return (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* 项目头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                      <FolderGit2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {project.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {project.description}
                      </p>
                      <a
                        href={project.repository}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-flex items-center"
                      >
                        <GitBranch className="h-4 w-4 mr-1" />
                        {project.repository}
                      </a>
                    </div>
                  </div>
                  {getStatusBadge(project.status)}
                </div>

                {/* 统计信息 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <GitBranch className="h-4 w-4 mr-1" />
                      提交数
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalCommits}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <Users className="h-4 w-4 mr-1" />
                      贡献者
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {project.contributors.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      新增代码
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      +{lines.added.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <TrendingUp className="h-4 w-4 mr-1 rotate-180" />
                      删除代码
                    </div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      -{lines.deleted.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 当前任务 */}
                {project.currentTasks.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      当前任务
                    </h4>
                    <div className="space-y-2">
                      {project.currentTasks.map((task, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {task.module}
                            </span>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {task.description}
                            </p>
                          </div>
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 项目时间线 */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      开始时间: {project.startDate.toLocaleDateString('zh-CN')}
                    </span>
                    {project.endDate && (
                      <span>
                        结束时间: {project.endDate.toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
