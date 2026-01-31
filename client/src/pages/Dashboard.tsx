import { useEffect, useState } from 'react'
import { Monitor, FolderGit2, FileText, TrendingUp, Circle, Cpu, HardDrive, Zap } from 'lucide-react'
import type { Stats, Device } from '../types'
import { OSIcon } from '../components/OSIcon'
import { getAuthHeaders } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Dashboard() {
  const { theme } = useTheme()
  const [stats, setStats] = useState<Stats>({
    totalDevices: 0,
    onlineDevices: 0,
    activeProjects: 0,
    totalCommits: 0,
    totalDocs: 0,
  })

  const [onlineDevices, setOnlineDevices] = useState<Device[]>([])

  useEffect(() => {
    // 从API获取数据
    const fetchData = () => {
      fetch('http://localhost:3000/api/stats', {
        headers: getAuthHeaders(),
      })
        .then(res => {
          if (!res.ok) throw new Error('API error')
          return res.json()
        })
        .then(data => {
          console.log('Stats:', data)
          setStats(data)
        })
        .catch(err => console.error('Stats error:', err))

      fetch('http://localhost:3000/api/devices', {
        headers: getAuthHeaders(),
      })
        .then(res => {
          if (!res.ok) throw new Error('API error')
          return res.json()
        })
        .then(data => {
          console.log('Devices:', data)
          if (Array.isArray(data)) {
            const devicesWithDates = data.map((device: Device) => ({
              ...device,
              lastSeen: new Date(device.lastSeen),
              createdAt: new Date(device.createdAt),
            }))
            setOnlineDevices(devicesWithDates)
          }
        })
        .catch(err => console.error('Devices error:', err))
    }

    fetchData()
    // 每10秒刷新一次数据
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const statCards = [
    {
      title: '总设备数',
      value: stats.totalDevices,
      icon: Monitor,
      gradient: 'from-blue-400 to-blue-600',
      bgGradient: 'from-blue-500/20 to-purple-500/20',
      change: '+0',
    },
    {
      title: '在线设备',
      value: stats.onlineDevices,
      icon: Circle,
      gradient: 'from-green-400 to-emerald-600',
      bgGradient: 'from-green-500/20 to-cyan-500/20',
      change: `${stats.onlineDevices}/${stats.totalDevices}`,
    },
    {
      title: '活跃项目',
      value: stats.activeProjects,
      icon: FolderGit2,
      gradient: 'from-purple-400 to-pink-600',
      bgGradient: 'from-purple-500/20 to-pink-500/20',
      change: '+1',
    },
    {
      title: '总提交数',
      value: stats.totalCommits,
      icon: TrendingUp,
      gradient: 'from-orange-400 to-red-600',
      bgGradient: 'from-orange-500/20 to-red-500/20',
      change: '+12',
    },
    {
      title: '文档数量',
      value: stats.totalDocs,
      icon: FileText,
      gradient: 'from-pink-400 to-rose-600',
      bgGradient: 'from-pink-500/20 to-rose-500/20',
      change: '+3',
    },
  ]

  const getStatusColor = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return 'from-green-400 to-emerald-500'
      case 'working':
        return 'from-blue-400 to-cyan-500'
      case 'idle':
        return 'from-yellow-400 to-orange-500'
      case 'offline':
        return 'from-gray-400 to-gray-500'
      default:
        return 'from-gray-400 to-gray-500'
    }
  }

  const getStatusText = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return '在线'
      case 'working':
        return '工作中'
      case 'idle':
        return '空闲'
      case 'offline':
        return '离线'
      default:
        return '未知'
    }
  }

  const getDeviceTypeText = (type: Device['type']) => {
    switch (type) {
      case 'vscode':
        return 'VS Code'
      case 'windsurf':
        return 'Windsurf'
      case 'antigravity':
        return 'Antigravity'
      case 'claude-code':
        return 'Claude Code'
      default:
        return '其他'
    }
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="animate-slide-up">
        <h1 className={`text-4xl font-bold mb-2 tracking-tight ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
          }`}>
          仪表盘
        </h1>
        <p className={`text-lg ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
          }`}>
          一览团队协作状态
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {statCards.map((card, index) => (
          <div
            key={card.title}
            className="group relative overflow-hidden"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* 卡片背景 */}
            <div className={`rounded-2xl p-6 h-full transition-all duration-300 hover:scale-105 hover:shadow-2xl ${theme === 'kanban'
              ? 'bg-gray-800 border border-gray-700'
              : 'gradient-card'
              }`}>
              {/* 渐变背景装饰 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity rounded-2xl`} />

              <div className="relative z-10">
                {/* 图标 */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${theme === 'kanban'
                    ? 'text-gray-400 bg-gray-700/50'
                    : 'text-gray-500 bg-gray-200/50'
                    }`}>
                    {card.change}
                  </div>
                </div>

                {/* 数值 */}
                <div>
                  <p className={`text-sm mb-1 ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    {card.title}
                  </p>
                  <p className={`text-3xl font-bold ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
                    }`}>
                    {card.value}
                  </p>
                </div>
              </div>

              {/* 光泽效果 */}
              <div className="absolute inset-0 bg-gradient-shine bg-[length:200%_100%] opacity-0 group-hover:opacity-100 group-hover:animate-shine transition-opacity rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* 设备列表 */}
      <div className={`rounded-2xl overflow-hidden shadow-2xl animate-slide-up ${theme === 'kanban'
          ? 'bg-gray-800 border border-gray-700'
          : 'gradient-card'
        }`} style={{ animationDelay: '0.2s' }}>
        {/* 标题栏 */}
        <div className={`px-6 py-5 border-b ${theme === 'kanban'
            ? 'border-gray-700 bg-gradient-to-r from-gray-900/50 to-transparent'
            : 'border-white/10 bg-gradient-to-r from-white/5 to-transparent'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg">
                <Monitor className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
                  }`}>
                  设备列表
                </h2>
                <p className={`text-sm ${theme === 'kanban' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                  共 {onlineDevices.length} 个设备 · {onlineDevices.filter(d => d.status !== 'offline').length} 个在线
                </p>
              </div>
            </div>
            <Zap className="h-5 w-5 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* 设备列表 */}
        <div className="p-6">
          {onlineDevices.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">暂无设备</p>
            </div>
          ) : (
            <div className="space-y-4">
              {onlineDevices.map((device, index) => (
                <div
                  key={device.id}
                  className={`group relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${theme === 'kanban'
                      ? 'bg-gray-700/50 hover:bg-gray-700 border border-gray-600'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    } ${device.status === 'offline' ? 'opacity-50' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* 状态指示条 */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${getStatusColor(device.status)}`} />

                  <div className="flex items-center justify-between">
                    {/* 设备信息 */}
                    <div className="flex items-center space-x-4 flex-1">
                      {/* 设备图标 + OS Badge */}
                      <div className="relative">
                        <div className={`absolute inset-0 bg-gradient-to-br ${getStatusColor(device.status)} blur-lg opacity-50`} />
                        <div className={`relative p-3 bg-gradient-to-br ${getStatusColor(device.status)} rounded-xl`}>
                          <Monitor className="h-6 w-6 text-white" />
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                            <OSIcon os={device.os} className="w-3 h-3 text-gray-800" />
                          </div>
                        </div>
                      </div>

                      {/* 设备详情 */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className={`font-semibold text-lg ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
                            }`}>
                            {device.name}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r ${getStatusColor(device.status)} text-white`}>
                            {getStatusText(device.status)}
                          </span>
                        </div>
                        <div className={`flex items-center space-x-4 text-sm ${theme === 'kanban' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                          <span className="flex items-center space-x-1">
                            <Cpu className="h-3.5 w-3.5" />
                            <span>{getDeviceTypeText(device.type)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <HardDrive className="h-3.5 w-3.5" />
                            <span>{device.os}</span>
                          </span>
                          <span>{device.ip}</span>
                        </div>
                      </div>
                    </div>

                    {/* 当前任务 */}
                    {device.currentProject && (
                      <div className="text-right ml-4">
                        <p className={`text-sm font-medium mb-1 ${theme === 'kanban' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                          {device.currentProject}
                        </p>
                        <p className={`text-xs ${theme === 'kanban' ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                          {device.currentModule || '-'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 悬停光泽效果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
