import { useState, useEffect } from 'react'
import { FolderGit2, Plus, GitBranch, Users, TrendingUp, Edit2, Trash2 } from 'lucide-react'
import type { Project } from '../types'
import projectService from '../services/projectService'
import ProjectModal, { type ProjectFormData } from '../components/ProjectModal'
import { useTheme } from '../contexts/ThemeContext'

export default function Projects() {
  const { theme } = useTheme()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)


  // 获取项目列表
  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      const data = await projectService.getAllProjects()
      setProjects(data)
    } catch (error) {
      console.error('获取项目列表失败:', error)
      alert('获取项目列表失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  // 创建项目
  const handleCreateProject = async (data: ProjectFormData) => {
    await projectService.createProject({
      name: data.name,
      description: data.description || undefined,
      repository: data.repository || undefined,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
    })
    await fetchProjects()
    alert('项目创建成功')
  }

  // 更新项目
  const handleUpdateProject = async (data: ProjectFormData) => {
    if (!editingProject) return

    await projectService.updateProject(editingProject.id, {
      name: data.name,
      description: data.description || undefined,
      repository: data.repository || undefined,
      status: data.status,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
    })
    await fetchProjects()
    alert('项目更新成功')
  }

  // 删除项目
  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm(`确定要删除项目"${project.name}"吗？此操作将同时删除相关的贡献和任务数据，且不可恢复。`)) {
      return
    }

    try {
      await projectService.deleteProject(project.id)
      await fetchProjects()
      alert('项目已删除')
    } catch (error) {
      console.error('删除项目失败:', error)
      alert('删除项目失败，请重试')
    }
  }

  // 打开创建模态框
  const openCreateModal = () => {
    setEditingProject(null)
    setIsModalOpen(true)
  }

  // 打开编辑模态框
  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setIsModalOpen(true)
  }

  // 关闭模态框
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
  }

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
    project.contributions.reduce((sum, c) => sum + c.commits, 0)

  const getTotalLines = (project: Project) => {
    const added = project.contributions.reduce((sum, c) => sum + c.linesAdded, 0)
    const deleted = project.contributions.reduce((sum, c) => sum + c.linesDeleted, 0)
    return { added, deleted, total: added - deleted }
  }

  // 获取活跃任务
  const getActiveTasks = (project: Project) => {
    return project.tasks.filter(task => task.status === 'active')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
            }`}>
            项目
          </h1>
          <p className={`mt-2 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-600'
            }`}>
            管理您的项目并跟踪其进度
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${theme === 'kanban'
            ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
            : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
        >
          <Plus className="h-5 w-5 mr-2" />
          创建项目
        </button>
      </div>

      {/* 项目列表 */}
      {projects.length === 0 ? (
        <div className={`text-center py-12 ${theme === 'kanban'
          ? ''
          : 'gradient-card rounded-lg'
          }`}>
          <div className="mb-6 flex justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
              <Plus className={`h-8 w-8 ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-400'
                }`} />
            </div>
          </div>
          <h3 className={`text-lg font-medium mb-2 ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
            }`}>
            还没有项目
          </h3>
          <p className={`mb-6 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-600'
            }`}>
            通过创建您的第一个项目开始。
          </p>
          <button
            onClick={openCreateModal}
            className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${theme === 'kanban'
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            创建您的第一个项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {projects.map((project) => {
            const totalCommits = getTotalCommits(project)
            const lines = getTotalLines(project)
            const activeTasks = getActiveTasks(project)

            return (
              <div
                key={project.id}
                className={`rounded-lg ${theme === 'kanban'
                  ? 'bg-gray-800'
                  : 'gradient-card hover:shadow-lg'
                  } transition-shadow`}
              >
                <div className="p-6">
                  {/* 项目头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`p-3 rounded-lg ${theme === 'kanban'
                        ? 'bg-gray-700'
                        : 'bg-primary-100'
                        }`}>
                        <FolderGit2 className={`h-6 w-6 ${theme === 'kanban'
                          ? 'text-gray-400'
                          : 'text-primary-600'
                          }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className={`text-xl font-semibold ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
                            }`}>
                            {project.name}
                          </h3>
                          {getStatusBadge(project.status)}
                        </div>
                        <p className={`mt-1 ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                          {project.description || '暂无描述'}
                        </p>
                        {project.repository && (
                          <a
                            href={project.repository}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm hover:underline mt-2 inline-flex items-center ${theme === 'kanban'
                              ? 'text-gray-400 hover:text-gray-300'
                              : 'text-primary-600'
                              }`}
                          >
                            <GitBranch className="h-4 w-4 mr-1" />
                            {project.repository}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(project)}
                        className={`p-2 rounded-lg transition-colors ${theme === 'kanban'
                          ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                          : 'text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        title="编辑项目"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project)}
                        className={`p-2 rounded-lg transition-colors ${theme === 'kanban'
                          ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                          : 'text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        title="删除项目"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* 统计信息 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className={`rounded-lg p-4 ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-50 dark:bg-gray-700'
                      }`}>
                      <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                        <GitBranch className="h-4 w-4 mr-1" />
                        提交数
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {totalCommits}
                      </div>
                    </div>
                    <div className={`rounded-lg p-4 ${theme === 'kanban' ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 dark:bg-gray-700'
                      }`}>
                      <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                        <Users className="h-4 w-4 mr-1" />
                        贡献者
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {project.contributions.length}
                      </div>
                    </div>
                    <div className={`rounded-lg p-4 ${theme === 'kanban' ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 dark:bg-gray-700'
                      }`}>
                      <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-1">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        新增代码
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        +{lines.added.toLocaleString()}
                      </div>
                    </div>
                    <div className={`rounded-lg p-4 ${theme === 'kanban' ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 dark:bg-gray-700'
                      }`}>
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
                  {activeTasks.length > 0 && (
                    <div className={`pt-4 border-t ${theme === 'kanban' ? 'border-gray-700' : 'border-gray-200 dark:border-gray-700'
                      }`}>
                      <h4 className={`text-sm font-medium mb-3 ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-900 dark:text-white'
                        }`}>
                        当前任务
                      </h4>
                      <div className="space-y-2">
                        {activeTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-50 dark:bg-gray-700'
                              }`}
                          >
                            <div>
                              <span className={`text-sm font-medium ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-900 dark:text-white'
                                }`}>
                                {task.module}
                              </span>
                              <p className={`text-sm ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                {task.description}
                              </p>
                              {task.device && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  执行设备: {task.device.name}
                                </p>
                              )}
                            </div>
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 项目时间线 */}
                  <div className={`pt-4 mt-4 border-t ${theme === 'kanban' ? 'border-gray-700' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                    <div className={`flex items-center justify-between text-sm ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
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
      )}

      {/* 项目模态框 */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        project={editingProject}
        title={editingProject ? '编辑项目' : '新建项目'}
      />
    </div>
  )
}
