import { useState, useEffect } from 'react'
import { Monitor, Plus, MoreVertical, X, Cpu, HardDrive, MemoryStick, Activity, Gauge, Info } from 'lucide-react'
import type { Device } from '../types'
import { OSIcon } from '../components/OSIcon'
import DeviceEditModal from '../components/DeviceEditModal'
import { getAuthHeaders } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

// 设备详情接口，扩展 metadata
interface DeviceDetails extends Device {
  metadata?: {
    cpu?: string
    cpuCores?: number
    cpuUsage?: number
    memory?: string
    memoryUsage?: number
    gpu?: string
    gpuMemory?: string
    gpuUsage?: number
    disk?: string
    diskUsage?: number
    diskTotal?: string
    diskUsed?: string
    version?: string
    hostname?: string
    uptime?: number
  }
}

// 设备详情模态框组件
function DeviceDetailModal({
  device,
  onClose,
}: {
  device: DeviceDetails | null
  onClose: () => void
}) {
  if (!device) return null

  const metadata = device.metadata || {}

  // 格式化运行时间
  const formatUptime = (seconds?: number) => {
    if (!seconds) return '未知'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}天 ${hours}小时`
    if (hours > 0) return `${hours}小时 ${minutes}分钟`
    return `${minutes}分钟`
  }

  // 使用率进度条
  const UsageBar = ({ value, color }: { value?: number; color: string }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full ${color}`}
        style={{ width: `${value || 0}%` }}
      ></div>
    </div>
  )

  // 根据使用率返回颜色
  const getUsageColor = (value?: number) => {
    if (!value) return 'bg-gray-400'
    if (value < 50) return 'bg-green-500'
    if (value < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* 模态框 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden my-8">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <Monitor className="h-8 w-8 text-primary-500 transition-transform duration-200 group-hover:scale-105" />
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg ring-2 ring-white/80 dark:ring-gray-700/80 backdrop-blur-sm transition-all duration-200 group-hover:ring-4 group-hover:shadow-xl">
                <OSIcon os={device.os} className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {device.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {device.ip} · {device.os}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto overscroll-contain">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-1">
                <Info className="h-4 w-4" />
                <span className="text-sm">主机名</span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {metadata.hostname || device.name}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-1">
                <Activity className="h-4 w-4" />
                <span className="text-sm">运行时间</span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {formatUptime(metadata.uptime)}
              </p>
            </div>
          </div>

          {/* CPU 信息 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">CPU</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metadata.cpuUsage !== undefined ? `${metadata.cpuUsage}%` : '未知'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {metadata.cpu || '未知'} {metadata.cpuCores ? `(${metadata.cpuCores}核)` : ''}
            </p>
            <UsageBar value={metadata.cpuUsage} color={getUsageColor(metadata.cpuUsage)} />
          </div>

          {/* 内存信息 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MemoryStick className="h-5 w-5 text-purple-500" />
                <span className="font-medium text-gray-900 dark:text-white">内存</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metadata.memoryUsage !== undefined ? `${metadata.memoryUsage}%` : '未知'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {metadata.memory || '未知'}
            </p>
            <UsageBar value={metadata.memoryUsage} color={getUsageColor(metadata.memoryUsage)} />
          </div>

          {/* GPU 信息 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Gauge className="h-5 w-5 text-green-500" />
                <span className="font-medium text-gray-900 dark:text-white">GPU</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metadata.gpuUsage !== undefined ? `${metadata.gpuUsage}%` : '未知'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {metadata.gpu || '未知'} {metadata.gpuMemory ? `(${metadata.gpuMemory})` : ''}
            </p>
            <UsageBar value={metadata.gpuUsage} color={getUsageColor(metadata.gpuUsage)} />
          </div>

          {/* 硬盘信息 */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5 text-orange-500" />
                <span className="font-medium text-gray-900 dark:text-white">硬盘</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {metadata.diskUsage !== undefined ? `${metadata.diskUsage}%` : '未知'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {metadata.disk || '未知'}
              {metadata.diskUsed && metadata.diskTotal
                ? ` (已用 ${metadata.diskUsed} / 共 ${metadata.diskTotal})`
                : ''}
            </p>
            <UsageBar value={metadata.diskUsage} color={getUsageColor(metadata.diskUsage)} />
          </div>

          {/* 软件版本 */}
          {metadata.version && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-1">
                <span className="text-sm">Agent 版本</span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {metadata.version}
              </p>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Devices() {
  const { theme } = useTheme()
  const [devices, setDevices] = useState<Device[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [detailDevice, setDetailDevice] = useState<DeviceDetails | null>(null)
  const [editDevice, setEditDevice] = useState<Device | null>(null)
  const [isAddingDevice, setIsAddingDevice] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  useEffect(() => {
    // 点击外部关闭菜单
    const handleClickOutside = () => setOpenMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    // 从API获取设备列表
    const fetchDevices = () => {
      fetch('http://localhost:3000/api/devices', {
        headers: getAuthHeaders(),
      })
        .then(res => {
          if (!res.ok) throw new Error('API error')
          return res.json()
        })
        .then(data => {
          console.log('Devices:', data)
          // 转换日期字符串为 Date 对象
          if (Array.isArray(data)) {
            const devicesWithDates = data.map((device: Device) => ({
              ...device,
              lastSeen: new Date(device.lastSeen),
              createdAt: new Date(device.createdAt),
            }))
            setDevices(devicesWithDates)
          }
        })
        .catch(err => console.error('Devices error:', err))
    }

    fetchDevices()
    // 每10秒刷新一次数据，与 Dashboard 保持一致
    const interval = setInterval(fetchDevices, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleDeleteDevice = async (id: string) => {
    if (!window.confirm('确定要删除此设备吗？')) return

    try {
      await fetch(`http://localhost:3000/api/devices/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      // 刷新列表
      const updatedDevices = devices.filter(d => d.id !== id)
      setDevices(updatedDevices)
      setOpenMenuId(null)
    } catch (err) {
      console.error('Delete error:', err)
      alert('删除失败')
    }
  }

  // 查看设备详情
  const handleViewDetails = async (deviceId: string) => {
    setIsLoadingDetails(true)
    setOpenMenuId(null)
    try {
      const response = await fetch(`http://localhost:3000/api/devices/${deviceId}`, {
        headers: getAuthHeaders(),
      })
      const data = await response.json()
      // 解析 metadata JSON 字符串
      if (data.metadata && typeof data.metadata === 'string') {
        try {
          data.metadata = JSON.parse(data.metadata)
        } catch {
          data.metadata = {}
        }
      }
      setDetailDevice({
        ...data,
        lastSeen: new Date(data.lastSeen),
        createdAt: new Date(data.createdAt),
      })
    } catch (err) {
      console.error('获取设备详情失败:', err)
      alert('获取设备详情失败')
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleEditDevice = (device: Device) => {
    // Parse skills and documentIds if they are JSON strings
    const deviceToEdit = { ...device };
    if (typeof deviceToEdit.skills === 'string') {
      try { deviceToEdit.skills = JSON.parse(deviceToEdit.skills); } catch { }
    }
    if (typeof deviceToEdit.documentIds === 'string') {
      try { deviceToEdit.documentIds = JSON.parse(deviceToEdit.documentIds); } catch { }
    }
    setEditDevice(deviceToEdit);
    setOpenMenuId(null);
  };

  const handleSaveDevice = async (updatedFields: Partial<Device>) => {
    if (!editDevice) return;

    try {
      const response = await fetch(`http://localhost:3000/api/devices/${editDevice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updatedFields),
      });

      if (!response.ok) throw new Error('Failed to update device');

      const updatedDevice = await response.json();

      setDevices(prev => prev.map(d =>
        d.id === updatedDevice.id
          ? { ...updatedDevice, lastSeen: new Date(updatedDevice.lastSeen), createdAt: new Date(updatedDevice.createdAt) }
          : d
      ));
      setEditDevice(null);
    } catch (error) {
      console.error('Update error:', error);
      alert('更新设备失败');
    }
  };

  const handleAddDevice = () => {
    setIsAddingDevice(true);
  };

  const handleSaveNewDevice = async (deviceFields: Partial<Device>) => {
    try {
      const response = await fetch('http://localhost:3000/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(deviceFields),
      });

      if (!response.ok) throw new Error('Failed to create device');

      const newDevice = await response.json();

      setDevices(prev => [...prev, {
        ...newDevice,
        lastSeen: new Date(newDevice.lastSeen),
        createdAt: new Date(newDevice.createdAt)
      }]);
      setIsAddingDevice(false);
    } catch (error) {
      console.error('Create error:', error);
      alert('添加设备失败');
    }
  };

  const getStatusColor = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'working':
        return 'bg-blue-500 animate-pulse'
      case 'idle':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-gray-500'
    }
  }

  const getIconColor = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-500'
      case 'working':
        return 'text-blue-500'
      case 'idle':
        return 'text-yellow-500'
      case 'offline':
      default:
        return 'text-gray-400'
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
    }
  }

  const getDeviceTypeText = (type: Device['type']) => {
    const types = {
      'vscode': 'VS Code',
      'windsurf': 'Windsurf',
      'antigravity': 'Antigravity',
      'claude-code': 'Claude Code',
      'other': '其他',
    }
    return types[type]
  }

  // 获取角色文本和颜色
  const getRoleInfo = (role?: string) => {
    const roles: Record<string, { text: string; color: string; bgColor: string }> = {
      'frontend': { text: '前端开发', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/50' },
      'backend': { text: '后端开发', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/50' },
      'fullstack': { text: '全栈开发', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/50' },
      'devops': { text: 'DevOps', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/50' },
      'qa': { text: '测试工程师', color: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50' },
      'architect': { text: '架构师', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/50' },
      'pm': { text: '项目经理', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-100 dark:bg-indigo-900/50' },
      'designer': { text: 'UI/UX设计', color: 'text-pink-700 dark:text-pink-300', bgColor: 'bg-pink-100 dark:bg-pink-900/50' },
    }
    return roles[role || ''] || { text: '未分配', color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700' }
  }

  const formatLastSeen = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    return `${days}天前`
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
            }`}>
            设备管理
          </h1>
          <p className={`mt-2 ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
            }`}>
            管理和监控所有开发设备
          </p>
        </div>
        <button
          onClick={handleAddDevice}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          添加设备
        </button>
      </div>

      {/* 设备列表 */}
      <div className={`rounded-lg shadow overflow-visible ${theme === 'kanban'
        ? 'bg-gray-800 border border-gray-700'
        : 'gradient-card'
        }`}>
        <table className={`min-w-full ${theme === 'kanban' ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'
          }`}>
          <thead className={`${theme === 'kanban' ? 'bg-gray-900/50' : 'bg-gray-50/50'
            }`}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                设备
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                角色
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                类型/系统
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                状态
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                当前工作
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                最后活跃
              </th>
              <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                操作
              </th>
            </tr>
          </thead>
          <tbody className={`${theme === 'kanban' ? 'divide-y divide-gray-700' : 'bg-white/50 divide-y divide-gray-200'
            }`}>
            {devices.map((device) => (
              <tr key={device.id} className={`${theme === 'kanban' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50/50'
                }`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="relative group">
                      <Monitor className={`h-10 w-10 ${getIconColor(device.status)} transition-transform duration-200 group-hover:scale-105`} />
                      <div className={`absolute -bottom-1 -right-1 rounded-full p-1 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:ring-4 group-hover:shadow-xl ${theme === 'kanban'
                        ? 'bg-gray-800 ring-2 ring-gray-700/90'
                        : 'bg-white ring-2 ring-white/90'
                        }`}>
                        <OSIcon os={device.os} className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-medium ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
                        }`}>
                        {device.name}
                      </div>
                      <div className={`text-sm ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {device.ip}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const roleInfo = getRoleInfo((device as any).role)
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.bgColor} ${roleInfo.color}`}>
                        {roleInfo.text}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
                    }`}>
                    {getDeviceTypeText(device.type)}
                  </div>
                  <div className={`text-sm ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                    {device.os}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(device.status)} mr-2`}></div>
                    <span className={`text-sm ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
                      }`}>
                      {getStatusText(device.status)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {device.currentProject ? (
                    <div>
                      <div className={`text-sm ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
                        }`}>
                        {device.currentProject}
                      </div>
                      <div className={`text-sm ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        {device.currentModule}
                      </div>
                    </div>
                  ) : (
                    <span className={`text-sm ${theme === 'kanban' ? 'text-gray-500' : 'text-gray-400'
                      }`}>-</span>
                  )}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  {formatLastSeen(device.lastSeen)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(openMenuId === device.id ? null : device.id)
                    }}
                    className={`focus:outline-none p-1 rounded-full ${theme === 'kanban'
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>

                  {openMenuId === device.id && (
                    <div
                      className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-[60] border ${theme === 'kanban'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                        }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-1">
                        <button
                          onClick={() => handleViewDetails(device.id)}
                          className={`block w-full text-left px-4 py-2 text-sm ${theme === 'kanban'
                              ? 'text-gray-200 hover:bg-gray-700'
                              : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          详情
                        </button>
                        <button
                          onClick={() => window.open(`/device/${device.id}/hud`, '_blank')}
                          className={`block w-full text-left px-4 py-2 text-sm font-medium ${theme === 'kanban'
                              ? 'text-cyan-400 hover:bg-gray-700'
                              : 'text-cyan-600 hover:bg-gray-100'
                            }`}
                        >
                          工作台
                        </button>
                        <button
                          onClick={() => handleEditDevice(device)}
                          className={`block w-full text-left px-4 py-2 text-sm ${theme === 'kanban'
                              ? 'text-gray-200 hover:bg-gray-700'
                              : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className={`block w-full text-left px-4 py-2 text-sm ${theme === 'kanban'
                              ? 'text-red-400 hover:bg-gray-700'
                              : 'text-red-600 hover:bg-gray-100'
                            }`}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 设备详情模态框 */}
      {detailDevice && (
        <DeviceDetailModal
          device={detailDevice}
          onClose={() => setDetailDevice(null)}
        />
      )}

      {/* 编辑设备模态框 */}
      {editDevice && (
        <DeviceEditModal
          device={editDevice}
          onClose={() => setEditDevice(null)}
          onSave={handleSaveDevice}
        />
      )}

      {/* 添加设备模态框 */}
      {isAddingDevice && (
        <DeviceEditModal
          onClose={() => setIsAddingDevice(false)}
          onSave={handleSaveNewDevice}
        />
      )}

      {/* 加载中遮罩 */}
      {isLoadingDetails && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        </div>
      )}
    </div>
  )
}
