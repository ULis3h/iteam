import { useState, useEffect } from 'react'
import { Bot, Users, Zap, ChevronRight, Briefcase, MessageSquare, Target, Link2 } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

interface AgentTemplate {
  id: string
  code: string
  name: string
  title: string
  icon: string
  role: string
  experience: string | null
  expertise: string[]
  communication: string | null
  principles: string[]
  workflows: string[]
  isBuiltIn: boolean
  devices: { id: string; name: string; status: string }[]
}

interface Workflow {
  id: string
  code: string
  name: string
  description: string
  phase: number
  agentCode: string
  category: string
}

export default function Agents() {
  const { theme } = useTheme()
  const [agents, setAgents] = useState<AgentTemplate[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [agentsRes, workflowsRes] = await Promise.all([
        api.get('/agents'),
        api.get('/workflows')
      ])
      setAgents(agentsRes.data)
      setWorkflows(workflowsRes.data)
      if (agentsRes.data.length > 0 && !selectedAgent) {
        setSelectedAgent(agentsRes.data[0])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAgentWorkflows = (agentCode: string) => {
    return workflows.filter(w => w.agentCode === agentCode)
  }

  const getPhaseLabel = (phase: number) => {
    const labels: Record<number, string> = {
      1: '分析',
      2: '规划',
      3: '方案',
      4: '实施'
    }
    return labels[phase] || `Phase ${phase}`
  }

  const getPhaseColor = (phase: number) => {
    const colors: Record<number, string> = {
      1: 'bg-blue-500',
      2: 'bg-purple-500',
      3: 'bg-orange-500',
      4: 'bg-green-500'
    }
    return colors[phase] || 'bg-gray-500'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'idle':
        return 'bg-green-500'
      case 'working':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-400'
    }
  }

  const cardBg = theme === 'kanban'
    ? 'bg-gray-800/90 border-gray-700'
    : 'bg-white/90 border-gray-200'

  const textPrimary = theme === 'kanban' ? 'text-white' : 'text-gray-900'
  const textSecondary = theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>
            Agent 模板
          </h1>
          <p className={`mt-1 ${textSecondary}`}>
            BMAD 风格的专业 AI Agent 角色定义
          </p>
        </div>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Bot className="h-5 w-5 text-primary-500" />
          <span className={`font-medium ${textPrimary}`}>{agents.length} 个模板</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent 列表 */}
        <div className="lg:col-span-1 space-y-3">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`w-full text-left p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 ${cardBg} ${
                selectedAgent?.id === agent.id
                  ? 'ring-2 ring-primary-500 border-primary-500'
                  : 'hover:border-primary-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{agent.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${textPrimary}`}>{agent.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'} ${textSecondary}`}>
                      {agent.code}
                    </span>
                  </div>
                  <p className={`text-sm ${textSecondary}`}>{agent.title}</p>
                </div>
                <ChevronRight className={`h-5 w-5 ${textSecondary}`} />
              </div>

              {/* 关联设备数量 */}
              {agent.devices.length > 0 && (
                <div className="mt-3 flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary-500" />
                  <span className={`text-xs ${textSecondary}`}>
                    {agent.devices.length} 个设备使用此模板
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Agent 详情 */}
        {selectedAgent && (
          <div className={`lg:col-span-2 rounded-xl border backdrop-blur-sm ${cardBg} overflow-hidden`}>
            {/* 头部 */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-4">
                <div className="text-5xl">{selectedAgent.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className={`text-2xl font-bold ${textPrimary}`}>{selectedAgent.name}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${theme === 'kanban' ? 'bg-primary-500/20 text-primary-400' : 'bg-primary-100 text-primary-700'}`}>
                      {selectedAgent.code}
                    </span>
                  </div>
                  <p className={`text-lg ${textSecondary}`}>{selectedAgent.title}</p>
                  {selectedAgent.experience && (
                    <p className={`text-sm mt-1 ${textSecondary}`}>
                      <Briefcase className="inline h-4 w-4 mr-1" />
                      {selectedAgent.experience}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="p-6 space-y-6">
              {/* 角色描述 */}
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${textSecondary}`}>
                  角色定位
                </h3>
                <p className={textPrimary}>{selectedAgent.role}</p>
              </div>

              {/* 沟通风格 */}
              {selectedAgent.communication && (
                <div>
                  <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 flex items-center ${textSecondary}`}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    沟通风格
                  </h3>
                  <p className={`italic ${textSecondary}`}>"{selectedAgent.communication}"</p>
                </div>
              )}

              {/* 专长领域 */}
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 flex items-center ${textSecondary}`}>
                  <Zap className="h-4 w-4 mr-1" />
                  专长领域
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.expertise.map((skill, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-sm ${theme === 'kanban' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* 核心原则 */}
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 flex items-center ${textSecondary}`}>
                  <Target className="h-4 w-4 mr-1" />
                  核心原则
                </h3>
                <ul className="space-y-2">
                  {selectedAgent.principles.map((principle, index) => (
                    <li key={index} className={`flex items-start ${textPrimary}`}>
                      <span className="text-primary-500 mr-2">•</span>
                      {principle}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 可执行工作流 */}
              <div>
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 flex items-center ${textSecondary}`}>
                  <Link2 className="h-4 w-4 mr-1" />
                  可执行工作流
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getAgentWorkflows(selectedAgent.code).map((workflow) => (
                    <div
                      key={workflow.id}
                      className={`p-3 rounded-lg border ${theme === 'kanban' ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${getPhaseColor(workflow.phase)}`}></span>
                        <span className={`font-medium ${textPrimary}`}>{workflow.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${theme === 'kanban' ? 'bg-gray-600' : 'bg-gray-200'} ${textSecondary}`}>
                          {getPhaseLabel(workflow.phase)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${textSecondary}`}>{workflow.description}</p>
                      <code className={`text-xs mt-2 inline-block px-2 py-0.5 rounded ${theme === 'kanban' ? 'bg-gray-800' : 'bg-gray-100'} text-primary-500`}>
                        /{workflow.code}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {/* 关联设备 */}
              {selectedAgent.devices.length > 0 && (
                <div>
                  <h3 className={`text-sm font-semibold uppercase tracking-wider mb-2 flex items-center ${textSecondary}`}>
                    <Users className="h-4 w-4 mr-1" />
                    关联设备 ({selectedAgent.devices.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.devices.map((device) => (
                      <div
                        key={device.id}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`}></span>
                        <span className={`text-sm ${textPrimary}`}>{device.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
