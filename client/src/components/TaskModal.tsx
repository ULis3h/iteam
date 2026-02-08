import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

interface TaskFormData {
    title: string
    description: string
    deviceId: string
    projectId: string
    type: string
    workDir: string
}

interface DeviceOption {
    id: string
    name: string
    status: string
    role?: string
}

interface ProjectOption {
    id: string
    name: string
    status: string
}

interface TaskModalProps {
    onClose: () => void
    onSubmit: (data: TaskFormData) => Promise<void>
}

const TASK_TYPES = [
    { value: 'code_generation', label: '代码生成', icon: '💻' },
    { value: 'code_review', label: '代码审查', icon: '🔍' },
    { value: 'bug_fix', label: 'Bug修复', icon: '🐛' },
    { value: 'test_generation', label: '测试生成', icon: '🧪' },
    { value: 'refactor', label: '代码重构', icon: '♻️' },
    { value: 'custom', label: '自定义', icon: '⚡' },
]

export default function TaskModal({ onClose, onSubmit }: TaskModalProps) {
    const { theme } = useTheme()
    const [devices, setDevices] = useState<DeviceOption[]>([])
    const [projects, setProjects] = useState<ProjectOption[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState<TaskFormData>({
        title: '',
        description: '',
        deviceId: '',
        projectId: '',
        type: 'custom',
        workDir: '',
    })

    useEffect(() => {
        // 加载设备和项目列表
        Promise.all([
            api.get<DeviceOption[]>('/devices'),
            api.get<ProjectOption[]>('/projects'),
        ]).then(([devRes, projRes]) => {
            setDevices(devRes.data || [])
            setProjects(projRes.data || [])
        }).catch(err => {
            console.error('Failed to load options:', err)
            setError('加载设备和项目列表失败')
        })
    }, [])

    const handleChange = (field: keyof TaskFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
        setError('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title.trim()) { setError('请输入任务标题'); return }
        if (!form.description.trim()) { setError('请输入任务描述'); return }
        if (!form.deviceId) { setError('请选择目标设备'); return }
        if (!form.projectId) { setError('请选择所属项目'); return }

        setLoading(true)
        try {
            await onSubmit(form)
            onClose()
        } catch (err: any) {
            setError(err?.response?.data?.error || '创建任务失败')
        } finally {
            setLoading(false)
        }
    }

    const isDark = theme === 'kanban'
    const cardBg = isDark ? 'bg-gray-800' : 'bg-white'
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200'
    const textPrimary = isDark ? 'text-gray-100' : 'text-gray-900'
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500'
    const inputBg = isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative ${cardBg} rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden`}>
                {/* 头部 */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor}`}>
                    <h2 className={`text-xl font-bold ${textPrimary}`}>新建任务</h2>
                    <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    {/* 任务类型 */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>任务类型</label>
                        <div className="grid grid-cols-3 gap-2">
                            {TASK_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => handleChange('type', t.value)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${form.type === t.value
                                            ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                                            : isDark
                                                ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <span className="mr-1">{t.icon}</span> {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 标题 */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>任务标题</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="请输入任务标题"
                            className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${inputBg}`}
                        />
                    </div>

                    {/* 描述 */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>任务描述</label>
                        <textarea
                            value={form.description}
                            onChange={e => handleChange('description', e.target.value)}
                            placeholder="请详细描述任务需求..."
                            rows={3}
                            className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none ${inputBg}`}
                        />
                    </div>

                    {/* 目标设备 */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>目标设备</label>
                        <select
                            value={form.deviceId}
                            onChange={e => handleChange('deviceId', e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${inputBg}`}
                        >
                            <option value="">请选择设备</option>
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.status === 'online' || d.status === 'idle' ? '🟢 在线' : '⚫ 离线'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 所属项目 */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>所属项目</label>
                        <select
                            value={form.projectId}
                            onChange={e => handleChange('projectId', e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${inputBg}`}
                        >
                            <option value="">请选择项目</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 工作目录 */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>工作目录 <span className="font-normal opacity-60">(可选)</span></label>
                        <input
                            type="text"
                            value={form.workDir}
                            onChange={e => handleChange('workDir', e.target.value)}
                            placeholder="/path/to/project"
                            className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm ${inputBg}`}
                        />
                    </div>
                </form>

                {/* 底部 */}
                <div className={`px-6 py-4 border-t ${borderColor} flex space-x-3`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '创建中...' : '创建任务'}
                    </button>
                </div>
            </div>
        </div>
    )
}
