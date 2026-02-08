import { useState, useEffect } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts'
import { BarChart3, TrendingUp, Users, PieChart } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import type { Project, Device } from '../types'

export default function Analytics() {
    const { theme } = useTheme()
    const isKanban = theme === 'kanban'

    // Data states
    const [contributionData, setContributionData] = useState<any[]>([])
    const [projectData, setProjectData] = useState<any[]>([])
    const [deviceData, setDeviceData] = useState<any[]>([])
    const [roleData, setRoleData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchAnalyticsData()
    }, [])

    const fetchAnalyticsData = async () => {
        try {
            setIsLoading(true)
            const [contribRes, overviewRes, projectsRes, devicesRes] = await Promise.all([
                api.get('/stats/contributions?days=14'),
                api.get('/stats/overview'),
                api.get<any[]>('/stats/projects'),
                api.get<any[]>('/stats/devices')
            ])

            setContributionData(contribRes.data)
            setRoleData(overviewRes.data.roles)

            // Transform project stats for chart
            const pData = projectsRes.data.map((p: any) => ({
                name: p.name,
                activeTasks: p.activeTasks,
                totalCommits: p.totalCommits
            }))
            setProjectData(pData)

            // Transform device stats for chart
            const dData = devicesRes.data.map((d: any) => ({
                name: d.name,
                commits: d.totalCommits,
                lines: d.totalLinesAdded + d.totalLinesDeleted
            }))
            setDeviceData(dData)

        } catch (error) {
            console.error('Failed to fetch analytics data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Chart Styles
    const axisStyle = {
        stroke: isKanban ? '#9CA3AF' : '#6B7280',
        fontSize: 12,
        tickLine: false,
        axisLine: false
    }

    const tooltipStyle = {
        backgroundColor: isKanban ? '#1F2937' : '#FFFFFF',
        borderColor: isKanban ? '#374151' : '#E5E7EB',
        color: isKanban ? '#F3F4F6' : '#111827',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderWidth: 1
    }

    const gridColor = isKanban ? '#374151' : '#E5E7EB'

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <div>
                <h1 className={`text-3xl font-bold flex items-center gap-3 ${isKanban ? 'text-gray-100' : 'text-gray-800'}`}>
                    <BarChart3 className={`w-8 h-8 ${isKanban ? 'text-blue-400' : 'text-blue-600'}`} />
                    数据分析
                </h1>
                <p className={`mt-1 ${isKanban ? 'text-gray-400' : 'text-gray-500'}`}>
                    深度洞察团队效能与项目进展
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Contribution Trends */}
                <div className={`p-6 rounded-2xl border ${isKanban ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={`text-lg font-semibold flex items-center gap-2 ${isKanban ? 'text-gray-100' : 'text-gray-800'}`}>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            代码贡献趋势 (近14天)
                        </h2>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={contributionData}>
                                <defs>
                                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="date" {...axisStyle} tickFormatter={(str) => str.slice(5)} />
                                <YAxis {...axisStyle} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area
                                    type="monotone"
                                    dataKey="commits" // Note: This assumes only 1 device for now, need to fix API to be generic or sum
                                    stroke="#3B82F6"
                                    fillOpacity={1}
                                    fill="url(#colorCommits)"
                                    name="提交数"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Project Progress */}
                <div className={`p-6 rounded-2xl border ${isKanban ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={`text-lg font-semibold flex items-center gap-2 ${isKanban ? 'text-gray-100' : 'text-gray-800'}`}>
                            <PieChart className="w-5 h-5 text-purple-500" />
                            项目活动概览
                        </h2>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                                <XAxis type="number" {...axisStyle} />
                                <YAxis dataKey="name" type="category" width={100} {...axisStyle} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend />
                                <Bar dataKey="activeTasks" name="活跃任务" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} />
                                <Bar dataKey="totalCommits" name="总提交" fill="#EC4899" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Device Activity */}
                <div className={`p-6 rounded-2xl border ${isKanban ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={`text-lg font-semibold flex items-center gap-2 ${isKanban ? 'text-gray-100' : 'text-gray-800'}`}>
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            设备贡献排行
                        </h2>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deviceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                <XAxis dataKey="name" {...axisStyle} />
                                <YAxis {...axisStyle} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Legend />
                                <Bar dataKey="commits" name="提交数" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="lines" name="代码行变动" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Skill Radar */}
                <div className={`p-6 rounded-2xl border ${isKanban ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className={`text-lg font-semibold flex items-center gap-2 ${isKanban ? 'text-gray-100' : 'text-gray-800'}`}>
                            <Users className="w-5 h-5 text-orange-500" />
                            团队角色分布
                        </h2>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={roleData}>
                                <PolarGrid stroke={gridColor} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: isKanban ? '#9CA3AF' : '#6B7280', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar
                                    name="角色分布"
                                    dataKey="A"
                                    stroke="#F59E0B"
                                    fill="#F59E0B"
                                    fillOpacity={0.6}
                                />
                                <Tooltip contentStyle={tooltipStyle} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    )
}
