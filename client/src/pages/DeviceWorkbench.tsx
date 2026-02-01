import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TraceTimeline from '../components/TraceTimeline'
import { getDeviceSessions, getSession, getDeviceStats, deleteSession } from '../services/traces'
import type { TaskSession } from '../services/traces'
import api from '../services/api'

interface Device {
  id: string
  name: string
  type: string
  status: string
  role?: string
}

export default function DeviceWorkbench() {
  const { deviceId } = useParams<{ deviceId: string }>()
  const navigate = useNavigate()

  const [device, setDevice] = useState<Device | null>(null)
  const [sessions, setSessions] = useState<TaskSession[]>([])
  const [selectedSession, setSelectedSession] = useState<TaskSession | null>(null)
  const [stats, setStats] = useState({ total: 0, running: 0, completed: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载设备信息
  useEffect(() => {
    if (!deviceId) return

    const loadDevice = async () => {
      try {
        const response = await api.get(`/devices/${deviceId}`)
        setDevice(response.data)
      } catch (err: any) {
        setError(err.message)
      }
    }

    loadDevice()
  }, [deviceId])

  // 加载会话列表和统计
  useEffect(() => {
    if (!deviceId) return

    const loadData = async () => {
      setLoading(true)
      try {
        const [sessionsData, statsData] = await Promise.all([
          getDeviceSessions(deviceId, { limit: 50 }),
          getDeviceStats(deviceId)
        ])
        setSessions(sessionsData.sessions)
        setStats(statsData)

        // 自动选择第一个或正在运行的会话
        const runningSession = sessionsData.sessions.find(s => s.status === 'running')
        if (runningSession) {
          handleSelectSession(runningSession.id)
        } else if (sessionsData.sessions.length > 0) {
          handleSelectSession(sessionsData.sessions[0].id)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [deviceId])

  // 选择会话
  const handleSelectSession = async (sessionId: string) => {
    try {
      const session = await getSession(sessionId)
      setSelectedSession(session)
    } catch (err: any) {
      console.error('加载会话详情失败:', err)
    }
  }

  // 删除会话
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('确定删除这个追踪会话吗？')) return

    try {
      await deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
      }
    } catch (err: any) {
      console.error('删除会话失败:', err)
    }
  }

  // 获取状态样式
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'running': return 'status-running'
      case 'completed': return 'status-completed'
      case 'failed': return 'status-failed'
      default: return 'status-paused'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="workbench-loading">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="workbench-error">
        <p>{error}</p>
        <button onClick={() => navigate('/devices')}>返回设备列表</button>
      </div>
    )
  }

  return (
    <div className="device-workbench">
      {/* 头部 */}
      <header className="workbench-header">
        <button className="back-btn" onClick={() => navigate('/devices')}>
          ← 返回
        </button>
        <div className="device-info">
          <h1>{device?.name || '设备工作台'}</h1>
          {device && (
            <span className={`device-status ${device.status}`}>
              {device.status}
            </span>
          )}
        </div>
      </header>

      {/* 统计卡片 */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">总会话</span>
          </div>
        </div>
        <div className="stat-card running">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <span className="stat-value">{stats.running}</span>
            <span className="stat-label">进行中</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">已完成</span>
          </div>
        </div>
        <div className="stat-card failed">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <span className="stat-value">{stats.failed}</span>
            <span className="stat-label">失败</span>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="workbench-content">
        {/* 会话列表 */}
        <aside className="session-list">
          <div className="session-list-header">
            <h3>🔍 追踪会话</h3>
            <span className="session-count-badge">{sessions.length}</span>
          </div>
          {sessions.length === 0 ? (
            <div className="no-sessions">
              <div className="empty-icon">📭</div>
              <p>暂无追踪记录</p>
              <span className="empty-hint">当 Agent 执行任务时，追踪记录将显示在这里</span>
            </div>
          ) : (
            <ul>
              {sessions.map(session => (
                <li
                  key={session.id}
                  className={`session-item ${selectedSession?.id === session.id ? 'active' : ''}`}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="session-header">
                    <span className={`session-status ${getStatusClass(session.status)}`} />
                    <span className="session-title">
                      {session.title || session.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="session-meta">
                    <span className="session-time">{formatTime(session.startTime)}</span>
                    <span className="session-count">{session._count?.entries || 0} 条</span>
                  </div>
                  <button
                    className="session-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSession(session.id)
                    }}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 时间线 */}
        <main className="timeline-panel">
          {selectedSession ? (
            <>
              <div className="timeline-header">
                <h3>{selectedSession.title || '任务执行详情'}</h3>
                <span className={`session-badge ${getStatusClass(selectedSession.status)}`}>
                  {selectedSession.status}
                </span>
              </div>
              <TraceTimeline session={selectedSession} />
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">📋</div>
              <p>选择一个会话查看执行详情</p>
              <span className="no-selection-hint">点击左侧追踪会话列表中的任意会话</span>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .device-workbench {
          padding: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .workbench-loading,
        .workbench-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          gap: 1rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .workbench-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .back-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          color: var(--text-secondary);
        }

        .back-btn:hover {
          background: var(--bg-tertiary);
        }

        .device-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .device-info h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .device-status {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .device-status.online { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .device-status.offline { background: rgba(156, 163, 175, 0.2); color: #9ca3af; }
        .device-status.working { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .stat-card.total {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .stat-card.running {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
          border-color: rgba(59, 130, 246, 0.3);
        }

        .stat-card.completed {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
          border-color: rgba(16, 185, 129, 0.3);
        }

        .stat-card.failed {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%);
          border-color: rgba(239, 68, 68, 0.3);
        }

        /* Kanban theme - higher contrast cards */
        body.theme-kanban .stat-card {
          background: rgba(30, 30, 50, 0.8);
          border-color: rgba(255, 255, 255, 0.15);
        }

        body.theme-kanban .stat-card.total {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-color: rgba(139, 92, 246, 0.5);
        }

        body.theme-kanban .stat-card.running {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.15) 100%);
          border-color: rgba(59, 130, 246, 0.5);
        }

        body.theme-kanban .stat-card.completed {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.15) 100%);
          border-color: rgba(16, 185, 129, 0.5);
        }

        body.theme-kanban .stat-card.failed {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.15) 100%);
          border-color: rgba(239, 68, 68, 0.5);
        }

        .stat-icon {
          font-size: 2rem;
          width: 3rem;
          height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.75rem;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
        }

        .stat-card.total .stat-value { color: #a78bfa; }
        .stat-card.running .stat-value { color: #60a5fa; }
        .stat-card.completed .stat-value { color: #34d399; }
        .stat-card.failed .stat-value { color: #f87171; }

        .stat-label {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 0.25rem;
        }

        /* High contrast for kanban theme */
        body.theme-kanban .stat-label {
          color: #e5e7eb;
        }

        .workbench-content {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1.5rem;
          min-height: 60vh;
        }

        .session-list {
          background: linear-gradient(180deg, var(--bg-secondary) 0%, rgba(30, 30, 50, 0.95) 100%);
          border: 1px solid var(--border-color);
          border-radius: 1rem;
          padding: 1.25rem;
          overflow-y: auto;
          max-height: 70vh;
        }

        .session-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .session-list-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #e5e7eb;
        }

        body.theme-kanban .session-list-header h3 {
          color: #ffffff;
        }

        .session-count-badge {
          background: var(--primary);
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 0.5rem;
          min-width: 1.5rem;
          text-align: center;
        }

        .session-list h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: #9ca3af;
        }

        body.theme-kanban .session-list h3 {
          color: #f3f4f6;
        }

        .session-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .no-sessions {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1rem;
          color: #9ca3af;
        }

        body.theme-kanban .no-sessions {
          color: #d1d5db;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .no-sessions p {
          font-size: 1rem;
          margin: 0 0 0.5rem 0;
          color: #6b7280;
        }

        body.theme-kanban .no-sessions p {
          color: #f3f4f6;
        }

        .empty-hint {
          font-size: 0.8rem;
          opacity: 0.7;
          max-width: 200px;
        }

        .session-item {
          padding: 0.75rem;
          border-radius: 0.5rem;
          cursor: pointer;
          margin-bottom: 0.5rem;
          position: relative;
          border: 1px solid transparent;
        }

        .session-item:hover {
          background: var(--bg-tertiary);
        }

        .session-item.active {
          background: var(--bg-tertiary);
          border-color: var(--primary);
        }

        .session-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .session-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-running { background: #3b82f6; animation: pulse 1.5s infinite; }
        .status-completed { background: #10b981; }
        .status-failed { background: #ef4444; }
        .status-paused { background: #9ca3af; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .session-title {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .session-meta {
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
          padding-left: 1rem;
        }

        .session-delete {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0;
          font-size: 0.85rem;
        }

        .session-item:hover .session-delete {
          opacity: 0.5;
        }

        .session-delete:hover {
          opacity: 1 !important;
        }

        .no-sessions {
          text-align: center;
          color: var(--text-muted);
          padding: 2rem;
        }

        .timeline-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 0.75rem;
          padding: 1.5rem;
          overflow-y: auto;
          max-height: 70vh;
        }

        .timeline-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .timeline-header h3 {
          margin: 0;
        }

        .session-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .session-badge.status-running { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .session-badge.status-completed { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .session-badge.status-failed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .no-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #9ca3af;
          text-align: center;
          padding: 3rem;
        }

        body.theme-kanban .no-selection {
          color: #d1d5db;
        }

        .no-selection-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          opacity: 0.5;
        }

        body.theme-kanban .no-selection-icon {
          opacity: 0.7;
        }

        .no-selection p {
          font-size: 1.1rem;
          margin: 0 0 0.5rem 0;
          color: #6b7280;
        }

        body.theme-kanban .no-selection p {
          color: #f3f4f6;
        }

        .no-selection-hint {
          font-size: 0.85rem;
          color: #9ca3af;
        }

        body.theme-kanban .no-selection-hint {
          color: #d1d5db;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .workbench-content {
            grid-template-columns: 1fr;
          }

          .session-list {
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  )
}
