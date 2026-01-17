import { useState, useEffect } from 'react'
import { FolderGit2, Plus, GitBranch, Users, TrendingUp, Edit2, Trash2 } from 'lucide-react'
import type { Project } from '../types'
import projectService from '../services/projectService'
import ProjectModal, { type ProjectFormData } from '../components/ProjectModal'

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            项目管理
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            追踪和管理所有开发项目
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          新建项目
        </button>
      </div>

      {/* 项目列表 */}
      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <FolderGit2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            还没有项目
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            点击上方"新建项目"按钮创建第一个项目
          </p>
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
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* 项目头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
                        <FolderGit2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {project.name}
                          </h3>
                          {getStatusBadge(project.status)}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {project.description || '暂无描述'}
                        </p>
                        {project.repository && (
                          <a
                            href={project.repository}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-flex items-center"
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
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="编辑项目"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="删除项目"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
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
                        {project.contributions.length}
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
                  {activeTasks.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        当前任务
                      </h4>
                      <div className="space-y-2">
                        {activeTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {task.module}
                              </span>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
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
