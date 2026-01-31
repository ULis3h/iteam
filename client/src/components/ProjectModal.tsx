import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Project } from '../types'
import { useTheme } from '../contexts/ThemeContext'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectFormData) => Promise<void>
  project?: Project | null
  title: string
}

export interface ProjectFormData {
  name: string
  description: string
  repository: string
  status: 'active' | 'paused' | 'completed'
  startDate: string
  endDate: string
}

export default function ProjectModal({ isOpen, onClose, onSubmit, project, title }: ProjectModalProps) {
  const { theme } = useTheme()
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    repository: '',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 当 project 改变时，更新表单数据
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        repository: project.repository,
        status: project.status,
        startDate: project.startDate.toISOString().split('T')[0],
        endDate: project.endDate ? project.endDate.toISOString().split('T')[0] : '',
      })
    } else {
      setFormData({
        name: '',
        description: '',
        repository: '',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      })
    }
    setErrors({})
  }, [project, isOpen])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入项目名称'
    } else if (formData.name.length > 100) {
      newErrors.name = '项目名称不能超过100个字符'
    }

    if (formData.description.length > 500) {
      newErrors.description = '描述不能超过500个字符'
    }

    if (formData.repository && !isValidGitUrl(formData.repository)) {
      newErrors.repository = '请输入有效的Git仓库地址'
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = '结束时间不能早于开始时间'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidGitUrl = (url: string): boolean => {
    const gitUrlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    return gitUrlPattern.test(url) || url.includes('github.com') || url.includes('gitlab.com') || url.includes('gitee.com')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error: any) {
      setErrors({
        submit: error.response?.data?.error || '操作失败，请重试'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: keyof ProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${theme === 'kanban' ? 'bg-gray-800' : 'bg-white dark:bg-gray-800'
        }`}>
        {/* 头部 */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'kanban' ? 'border-gray-700' : 'border-gray-200 dark:border-gray-700'
          }`}>
          <h2 className={`text-2xl font-bold ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-900 dark:text-white'
            }`}>{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isSubmitting}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 项目名称 */}
          <div>
            <label htmlFor="name" className={`block text-sm font-medium mb-2 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
              项目名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${theme === 'kanban' ? 'bg-gray-700 text-white' : 'dark:bg-gray-700 dark:text-white'
                } ${errors.name ? 'border-red-500' : theme === 'kanban' ? 'border-gray-600' : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder="输入项目名称"
              disabled={isSubmitting}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* 项目描述 */}
          <div>
            <label htmlFor="description" className={`block text-sm font-medium mb-2 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
              项目描述
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${theme === 'kanban' ? 'bg-gray-700 text-white' : 'dark:bg-gray-700 dark:text-white'
                } ${errors.description ? 'border-red-500' : theme === 'kanban' ? 'border-gray-600' : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder="输入项目描述（可选）"
              disabled={isSubmitting}
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* 仓库地址 */}
          <div>
            <label htmlFor="repository" className={`block text-sm font-medium mb-2 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
              }`}>
              仓库地址
            </label>
            <input
              type="text"
              id="repository"
              value={formData.repository}
              onChange={(e) => handleChange('repository', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${theme === 'kanban' ? 'bg-gray-700 text-white' : 'dark:bg-gray-700 dark:text-white'
                } ${errors.repository ? 'border-red-500' : theme === 'kanban' ? 'border-gray-600' : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder="https://github.com/user/repo"
              disabled={isSubmitting}
            />
            {errors.repository && <p className="mt-1 text-sm text-red-500">{errors.repository}</p>}
          </div>

          {/* 状态和日期 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 状态 */}
            <div>
              <label htmlFor="status" className={`block text-sm font-medium mb-2 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
                }`}>
                状态
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as any)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${theme === 'kanban' ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                  }`}
                disabled={isSubmitting}
              >
                <option value="active">进行中</option>
                <option value="paused">暂停</option>
                <option value="completed">已完成</option>
              </select>
            </div>

            {/* 开始时间 */}
            <div>
              <label htmlFor="startDate" className={`block text-sm font-medium mb-2 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
                }`}>
                开始时间
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${theme === 'kanban' ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                  }`}
                disabled={isSubmitting || !!project} // 编辑时不可修改开始时间
              />
            </div>

            {/* 结束时间 */}
            <div>
              <label htmlFor="endDate" className={`block text-sm font-medium mb-2 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'
                }`}>
                结束时间
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${theme === 'kanban' ? 'bg-gray-700 text-white' : 'dark:bg-gray-700 dark:text-white'
                  } ${errors.endDate ? 'border-red-500' : theme === 'kanban' ? 'border-gray-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                disabled={isSubmitting}
              />
              {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
            </div>
          </div>

          {/* 提交错误 */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2 border rounded-lg ${theme === 'kanban'
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  处理中...
                </>
              ) : (
                project ? '保存' : '创建'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
