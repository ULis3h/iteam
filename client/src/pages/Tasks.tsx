import { useState, useEffect } from 'react'
import {
    ClipboardList,
    Plus,
    Search,
    LayoutList,
    KanbanSquare,
    PlayCircle,
    CheckCircle2,
    XCircle,
    PauseCircle,
    Clock,
    Trash2,
    RefreshCw
} from 'lucide-react'
import type { Task, Device, Project } from '../types'
import taskService, { type CreateTaskData } from '../services/taskService'
import api from '../services/api'
import TaskModal from '../components/TaskModal'
import { useTheme } from '../contexts/ThemeContext'

export default function Tasks() {
    const { theme } = useTheme()
    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [deviceFilter, setDeviceFilter] = useState<string>('')
    const [projectFilter, setProjectFilter] = useState<string>('')

    // Options for filters
    const [devices, setDevices] = useState<Device[]>([])
    const [projects, setProjects] = useState<Project[]>([])

    // Load initial data
    useEffect(() => {
        fetchOptions()
        fetchTasks()
    }, [])

    // Refresh tasks when filters change
    useEffect(() => {
        fetchTasks()
    }, [statusFilter, deviceFilter, projectFilter])

    const fetchOptions = async () => {
        try {
            const [devRes, projRes] = await Promise.all([
                api.get<Device[]>('/devices'),
                api.get<Project[]>('/projects')
            ])
            setDevices(devRes.data || [])
            setProjects(projRes.data || [])
        } catch (error) {
            console.error('Failed to load filter options:', error)
        }
    }

    const fetchTasks = async () => {
        try {
            setIsLoading(true)
            const filters: any = {}
            if (statusFilter !== 'all') filters.status = statusFilter
            if (deviceFilter) filters.deviceId = deviceFilter
            if (projectFilter) filters.projectId = projectFilter

            const data = await taskService.getAllTasks(filters)
            setTasks(data as unknown as Task[])
        } catch (error) {
            console.error('Failed to fetch tasks:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateTask = async (data: any) => {
        try {
            await taskService.createTask(data as CreateTaskData)
            await fetchTasks()
            setIsModalOpen(false)
        } catch (error) {
            console.error('Failed to create task:', error)
            throw error
        }
    }

    const handleDeleteTask = async (id: string) => {
        if (!confirm('确定要删除这个任务吗？')) return
        try {
            await taskService.deleteTask(id)
            setTasks(tasks.filter(t => t.id !== id))
        } catch (error) {
            console.error('Failed to delete task:', error)
            alert('删除任务失败')
        }
    }

    const [redispatching, setRedispatching] = useState<string | null>(null)

    const handleRedispatch = async (id: string) => {
        try {
            setRedispatching(id)
            const result = await taskService.redispatchTask(id)
            alert(result.message || '任务已重新分发')
            await fetchTasks()
        } catch (error) {
            console.error('Failed to redispatch task:', error)
            alert('重新执行任务失败')
        } finally {
            setRedispatching(null)
        }
    }

    // Filter by search query manually since API might not support partial text search on all fields
    const filteredTasks = tasks.filter(task => {
        if (!searchQuery) return true
        const lowQuery = searchQuery.toLowerCase()
        return (
            task.module.toLowerCase().includes(lowQuery) ||
            task.description.toLowerCase().includes(lowQuery) ||
            task.device?.name.toLowerCase().includes(lowQuery) ||
            task.project?.name.toLowerCase().includes(lowQuery)
        )
    })

    const statusConfig = {
        pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700', label: '等待中' },
        active: { icon: PlayCircle, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: '进行中' },
        completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: '已完成' },
        failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: '失败' },
        paused: { icon: PauseCircle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: '已暂停' },
    }

    const renderStatusBadge = (status: string) => {
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
        const Icon = config.icon
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
            </span>
        )
    }

    const isKanbanTheme = theme === 'kanban'
    const cardClass = isKanbanTheme
        ? 'bg-gray-800 border-gray-700 text-gray-100'
        : 'bg-white border-gray-200 text-gray-900 hover:shadow-md'

    const renderBoardView = () => {
        const columns = ['pending', 'active', 'completed', 'failed']

        return (
            <div className="flex overflow-x-auto pb-4 gap-6 h-[calc(100vh-24rem)]">
                {columns.map(status => {
                    const statusTasks = filteredTasks.filter(t =>
                        status === 'failed' ? (t.status === 'failed' || t.status === 'paused') : t.status === status
                    )
                    const config = statusConfig[status as keyof typeof statusConfig]

                    return (
                        <div key={status} className="flex-shrink-0 w-80 flex flex-col">
                            <div className={`flex items-center justify-between mb-4 px-1`}>
                                <h3 className={`font-semibold flex items-center ${isKanbanTheme ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <config.icon className={`w-4 h-4 mr-2 ${config.color}`} />
                                    {status === 'failed' ? '异常/暂停' : config.label}
                                    <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-xs px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                                        {statusTasks.length}
                                    </span>
                                </h3>
                            </div>

                            <div className={`flex-1 overflow-y-auto p-2 -mx-2 space-y-3 rounded-xl ${isKanbanTheme ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                {statusTasks.map(task => (
                                    <div key={task.id} className={`p-4 rounded-xl border transition-all ${cardClass}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-mono px-2 py-0.5 rounded ${isKanbanTheme ? 'bg-gray-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {task.module}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleRedispatch(task.id)}
                                                    disabled={redispatching === task.id}
                                                    className="text-gray-400 hover:text-blue-500 transition-colors"
                                                    title="重新执行"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${redispatching === task.id ? 'animate-spin' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTask(task.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                    title="删除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="font-medium mb-1 line-clamp-2">{task.description}</h4>
                                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                {task.device && (
                                                    <span className="flex items-center" title={`设备: ${task.device.name}`}>
                                                        <LayoutList className="w-3 h-3 mr-1" />
                                                        {task.device.name}
                                                    </span>
                                                )}
                                            </div>
                                            <span>
                                                {new Date(task.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {statusTasks.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm italic">
                                        暂无任务
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderListView = () => (
        <div className={`rounded-xl border overflow-hidden ${isKanbanTheme ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <table className="w-full text-left text-sm">
                <thead className={`${isKanbanTheme ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                    <tr>
                        <th className="px-6 py-3 font-medium">任务ID/模块</th>
                        <th className="px-6 py-3 font-medium">描述</th>
                        <th className="px-6 py-3 font-medium">状态</th>
                        <th className="px-6 py-3 font-medium">设备</th>
                        <th className="px-6 py-3 font-medium">项目</th>
                        <th className="px-6 py-3 font-medium">更新时间</th>
                        <th className="px-6 py-3 font-medium text-right">操作</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${isKanbanTheme ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {filteredTasks.map(task => (
                        <tr key={task.id} className={`group transition-colors ${isKanbanTheme ? 'hover:bg-gray-700/50 text-gray-300' : 'hover:bg-gray-50 text-gray-900'}`}>
                            <td className="px-6 py-4">
                                <div className="font-mono text-xs opacity-70 mb-1">{task.id.slice(0, 8)}</div>
                                <div className="font-medium">{task.module}</div>
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate" title={task.description}>
                                {task.description}
                            </td>
                            <td className="px-6 py-4">
                                {renderStatusBadge(task.status)}
                            </td>
                            <td className="px-6 py-4">
                                {task.device ? (
                                    <span className="flex items-center text-xs">
                                        <span className={`w-2 h-2 rounded-full mr-2 ${task.device.status === 'online' ? 'bg-green-500' : 'bg-gray-300'
                                            }`} />
                                        {task.device.name}
                                    </span>
                                ) : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-6 py-4">
                                {task.project?.name || <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                                {new Date(task.updatedAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => handleRedispatch(task.id)}
                                        disabled={redispatching === task.id}
                                        className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        title="重新执行"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${redispatching === task.id ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredTasks.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                没有找到匹配的任务
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-3xl font-bold flex items-center gap-3 ${isKanbanTheme ? 'text-gray-100' : 'text-gray-800'}`}>
                        <ClipboardList className={`w-8 h-8 ${isKanbanTheme ? 'text-blue-400' : 'text-blue-600'}`} />
                        任务管理
                    </h1>
                    <p className={`mt-1 ${isKanbanTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                        监控和管理所有 Agent 执行任务
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <div className={`flex items-center p-1 rounded-lg border ${isKanbanTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list'
                                ? (isKanbanTheme ? 'bg-gray-700 text-white shadow' : 'bg-gray-100 text-gray-900 shadow-sm')
                                : 'text-gray-400 hover:text-gray-500'
                                }`}
                        >
                            <LayoutList className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'board'
                                ? (isKanbanTheme ? 'bg-gray-700 text-white shadow' : 'bg-gray-100 text-gray-900 shadow-sm')
                                : 'text-gray-400 hover:text-gray-500'
                                }`}
                        >
                            <KanbanSquare className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        新建任务
                    </button>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between ${isKanbanTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
                }`}>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索任务..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={`pl-9 pr-4 py-2 rounded-lg border text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isKanbanTheme
                                ? 'bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {['all', 'pending', 'active', 'completed', 'failed'].map(status => {
                            const isActive = statusFilter === status
                            return (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${isActive
                                        ? 'bg-blue-100/50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                        : isKanbanTheme
                                            ? 'border-gray-700 text-gray-400 hover:bg-gray-700'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {status === 'all' ? '全部' : statusConfig[status as keyof typeof statusConfig]?.label || status}
                                </button>
                            )
                        })}
                    </div>

                    <div className={`w-px h-6 mx-1 ${isKanbanTheme ? 'bg-gray-700' : 'bg-gray-200'}`} />

                    <select
                        value={deviceFilter}
                        onChange={e => setDeviceFilter(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isKanbanTheme ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                            }`}
                    >
                        <option value="">所有设备</option>
                        {devices.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>

                    <select
                        value={projectFilter}
                        onChange={e => setProjectFilter(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${isKanbanTheme ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                            }`}
                    >
                        <option value="">所有项目</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content Content */}
            <div className="flex-1 min-h-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <p className="mt-4 text-sm text-gray-500">加载任务中...</p>
                        </div>
                    </div>
                ) : (
                    viewMode === 'list' ? renderListView() : renderBoardView()
                )}
            </div>

            {/* Create Task Modal */}
            {isModalOpen && (
                <TaskModal
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleCreateTask}
                />
            )}
        </div>
    )
}
