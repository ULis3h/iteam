import { useState, useEffect } from 'react'
import { Workflow, Play, CheckCircle, Clock, AlertCircle, ChevronRight, Zap, ArrowRight } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

interface WorkflowData {
  id: string
  code: string
  name: string
  description: string
  phase: number
  agentCode: string
  category: string
  steps: { order: number; name: string; description: string }[]
  inputs: string[] | null
  outputs: string[] | null
  prerequisites: string[] | null
  isBuiltIn: boolean
}

interface WorkflowExecution {
  id: string
  status: string
  progress: number
  currentStep: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  workflow: { code: string; name: string; phase: number }
  project: { id: string; name: string }
  device: { id: string; name: string }
}

export default function Workflows() {
  const { theme } = useTheme()
  const [workflows, setWorkflows] = useState<WorkflowData[]>([])
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [workflowsRes, executionsRes] = await Promise.all([
        api.get('/workflows'),
        api.get('/workflows/executions/all?limit=10')
      ])
      setWorkflows(workflowsRes.data)
      setExecutions(executionsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const phases = [
    { id: 1, name: '分析', icon: '🔍', color: 'from-blue-400 to-blue-600', description: '问题定义与研究' },
    { id: 2, name: '规划', icon: '📋', color: 'from-purple-400 to-purple-600', description: 'PRD与需求定义' },
    { id: 3, name: '方案', icon: '🏗️', color: 'from-orange-400 to-orange-600', description: '架构与技术设计' },
    { id: 4, name: '实施', icon: '🚀', color: 'from-green-400 to-green-600', description: '开发与交付' }
  ]

  const getPhaseWorkflows = (phase: number) => {
    return workflows.filter(w => w.phase === phase)
  }

  const quickFlowWorkflows = workflows.filter(w => w.category === 'quick-flow')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <Play className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '等待中',
      running: '执行中',
      completed: '已完成',
      failed: '失败',
      paused: '已暂停'
    }
    return labels[status] || status
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
            工作流
          </h1>
          <p className={`mt-1 ${textSecondary}`}>
            BMAD 驱动的结构化开发流程
          </p>
        </div>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <Workflow className="h-5 w-5 text-primary-500" />
          <span className={`font-medium ${textPrimary}`}>{workflows.length} 个工作流</span>
        </div>
      </div>

      {/* 快速流程 */}
      <div className={`rounded-xl border backdrop-blur-sm p-6 ${cardBg}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className={`text-lg font-semibold ${textPrimary}`}>快速流程 (Quick Flow)</h2>
          <span className={`text-sm ${textSecondary}`}>适用于小功能和Bug修复</span>
        </div>

        <div className="flex items-center justify-center space-x-4 py-4">
          {quickFlowWorkflows.map((workflow, index) => (
            <div key={workflow.id} className="flex items-center">
              <button
                onClick={() => setSelectedWorkflow(workflow)}
                className={`px-6 py-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedWorkflow?.id === workflow.id
                    ? 'border-primary-500 bg-primary-500/10'
                    : theme === 'kanban'
                    ? 'border-gray-600 hover:border-primary-400'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <code className="text-primary-500 font-mono">/{workflow.code}</code>
                <p className={`text-sm mt-1 ${textPrimary}`}>{workflow.name}</p>
              </button>
              {index < quickFlowWorkflows.length - 1 && (
                <ArrowRight className={`mx-2 h-5 w-5 ${textSecondary}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 完整流程阶段 */}
      <div>
        <h2 className={`text-lg font-semibold mb-4 ${textPrimary}`}>完整开发流程</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {phases.map((phase) => (
            <button
              key={phase.id}
              onClick={() => setSelectedPhase(selectedPhase === phase.id ? null : phase.id)}
              className={`relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 text-left ${cardBg} ${
                selectedPhase === phase.id
                  ? 'ring-2 ring-primary-500'
                  : 'hover:border-primary-300'
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${phase.color}`}></div>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-2xl">{phase.icon}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${textPrimary}`}>Phase {phase.id}</span>
                    <span className={textSecondary}>·</span>
                    <span className={textPrimary}>{phase.name}</span>
                  </div>
                  <p className={`text-sm ${textSecondary}`}>{phase.description}</p>
                </div>
              </div>
              <div className={`mt-3 text-sm ${textSecondary}`}>
                {getPhaseWorkflows(phase.id).length} 个工作流
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 选中阶段的工作流列表 */}
      {selectedPhase && (
        <div className={`rounded-xl border backdrop-blur-sm ${cardBg}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`font-semibold ${textPrimary}`}>
              {phases.find(p => p.id === selectedPhase)?.icon} Phase {selectedPhase} - {phases.find(p => p.id === selectedPhase)?.name} 工作流
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {getPhaseWorkflows(selectedPhase).map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => setSelectedWorkflow(workflow)}
                className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                  selectedWorkflow?.id === workflow.id
                    ? 'border-primary-500 bg-primary-500/10'
                    : theme === 'kanban'
                    ? 'border-gray-600 hover:border-primary-400'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <code className="text-primary-500 font-mono text-sm">/{workflow.code}</code>
                    <h4 className={`font-medium mt-1 ${textPrimary}`}>{workflow.name}</h4>
                  </div>
                  <ChevronRight className={`h-5 w-5 ${textSecondary}`} />
                </div>
                <p className={`text-sm mt-2 ${textSecondary}`}>{workflow.description}</p>
                <div className={`mt-2 text-xs ${textSecondary}`}>
                  Agent: <span className="text-primary-500">{workflow.agentCode}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 工作流详情 */}
      {selectedWorkflow && (
        <div className={`rounded-xl border backdrop-blur-sm ${cardBg}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <code className="text-primary-500 font-mono">/{selectedWorkflow.code}</code>
              <h3 className={`font-semibold text-lg ${textPrimary}`}>{selectedWorkflow.name}</h3>
            </div>
            <button
              onClick={() => setSelectedWorkflow(null)}
              className={`px-3 py-1 rounded-lg ${theme === 'kanban' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${textSecondary}`}
            >
              关闭
            </button>
          </div>
          <div className="p-4 space-y-4">
            <p className={textSecondary}>{selectedWorkflow.description}</p>

            {/* 步骤 */}
            <div>
              <h4 className={`font-medium mb-3 ${textPrimary}`}>执行步骤</h4>
              <div className="space-y-3">
                {selectedWorkflow.steps.map((step, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-3 rounded-lg ${theme === 'kanban' ? 'bg-gray-700/50' : 'bg-gray-50'}`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold`}>
                      {step.order}
                    </div>
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{step.name}</p>
                      <p className={`text-sm ${textSecondary}`}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 输入输出 */}
            <div className="grid grid-cols-2 gap-4">
              {selectedWorkflow.inputs && (
                <div>
                  <h4 className={`font-medium mb-2 ${textPrimary}`}>输入</h4>
                  <div className="space-y-1">
                    {selectedWorkflow.inputs.map((input, index) => (
                      <div key={index} className={`text-sm px-2 py-1 rounded ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'} ${textSecondary}`}>
                        {input}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedWorkflow.outputs && (
                <div>
                  <h4 className={`font-medium mb-2 ${textPrimary}`}>输出</h4>
                  <div className="space-y-1">
                    {selectedWorkflow.outputs.map((output, index) => (
                      <div key={index} className={`text-sm px-2 py-1 rounded ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'} ${textSecondary}`}>
                        {output}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 前置工作流 */}
            {selectedWorkflow.prerequisites && selectedWorkflow.prerequisites.length > 0 && (
              <div>
                <h4 className={`font-medium mb-2 ${textPrimary}`}>前置工作流</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWorkflow.prerequisites.map((prereq, index) => (
                    <code key={index} className={`text-sm px-2 py-1 rounded ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'} text-primary-500`}>
                      /{prereq}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 最近执行记录 */}
      {executions.length > 0 && (
        <div className={`rounded-xl border backdrop-blur-sm ${cardBg}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`font-semibold ${textPrimary}`}>最近执行记录</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {executions.map((execution) => (
              <div key={execution.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(execution.status)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <code className="text-primary-500 text-sm">/{execution.workflow.code}</code>
                      <span className={textPrimary}>{execution.workflow.name}</span>
                    </div>
                    <p className={`text-sm ${textSecondary}`}>
                      {execution.project.name} · {execution.device.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm ${textSecondary}`}>{getStatusLabel(execution.status)}</span>
                  {execution.status === 'running' && (
                    <div className="mt-1 w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${execution.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
