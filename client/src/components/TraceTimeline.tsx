import { useState } from 'react'
import type { TaskSession } from '../services/traces'

interface TraceTimelineProps {
    session: TaskSession
}

// 条目类型图标和颜色
const entryConfig: Record<string, { icon: string; color: string; bg: string }> = {
    task_received: { icon: '📥', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    thinking: { icon: '🧠', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    discussion: { icon: '💬', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
    step: { icon: '⚡', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    result: { icon: '✅', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    error: { icon: '❌', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
}

export default function TraceTimeline({ session }: TraceTimelineProps) {
    const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

    const toggleEntry = (id: string) => {
        setExpandedEntries(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const formatDuration = (ms: number | null) => {
        if (!ms) return null
        if (ms < 1000) return `${ms}ms`
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
    }

    const parseContent = (content: string): string => {
        try {
            const parsed = JSON.parse(content)
            return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
        } catch {
            return content
        }
    }

    if (!session.entries || session.entries.length === 0) {
        return (
            <div className="trace-timeline-empty">
                <p>暂无追踪记录</p>
            </div>
        )
    }

    return (
        <div className="trace-timeline">
            {session.entries.map((entry, index) => {
                const config = entryConfig[entry.type] || entryConfig.step
                const isExpanded = expandedEntries.has(entry.id)
                const content = parseContent(entry.content)
                const isLong = content.length > 200

                return (
                    <div
                        key={entry.id}
                        className="trace-entry"
                        style={{ '--entry-color': config.color, '--entry-bg': config.bg } as React.CSSProperties}
                    >
                        {/* 时间线连接线 */}
                        {index < session.entries!.length - 1 && (
                            <div className="trace-line" />
                        )}

                        {/* 图标 */}
                        <div className="trace-icon">
                            <span>{config.icon}</span>
                        </div>

                        {/* 内容 */}
                        <div className="trace-content">
                            <div className="trace-header">
                                <span className="trace-title">{entry.title}</span>
                                <span className="trace-time">{formatTime(entry.timestamp)}</span>
                                {entry.duration && (
                                    <span className="trace-duration">{formatDuration(entry.duration)}</span>
                                )}
                            </div>

                            <div
                                className={`trace-body ${isExpanded ? 'expanded' : ''} ${isLong ? 'truncated' : ''}`}
                                onClick={() => isLong && toggleEntry(entry.id)}
                            >
                                <pre>{isExpanded || !isLong ? content : content.slice(0, 200) + '...'}</pre>
                                {isLong && (
                                    <button className="trace-expand-btn">
                                        {isExpanded ? '收起' : '展开'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}

            <style>{`
        .trace-timeline {
          position: relative;
          padding: 1rem 0;
        }

        .trace-timeline-empty {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }

        .trace-entry {
          display: flex;
          gap: 1rem;
          position: relative;
          padding-bottom: 1.5rem;
        }

        .trace-line {
          position: absolute;
          left: 1.25rem;
          top: 2.5rem;
          bottom: 0;
          width: 2px;
          background: linear-gradient(to bottom, var(--entry-color), transparent);
          opacity: 0.3;
        }

        .trace-icon {
          flex-shrink: 0;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--entry-bg);
          border: 2px solid var(--entry-color);
          font-size: 1.1rem;
          z-index: 1;
        }

        .trace-content {
          flex: 1;
          min-width: 0;
        }

        .trace-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .trace-title {
          font-weight: 600;
          color: var(--text-primary);
        }

        .trace-time {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: monospace;
        }

        .trace-duration {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          background: var(--entry-bg);
          color: var(--entry-color);
          border-radius: 1rem;
        }

        .trace-body {
          background: var(--bg-secondary);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          position: relative;
          cursor: pointer;
        }

        .trace-body pre {
          margin: 0;
          font-size: 0.85rem;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          color: var(--text-secondary);
        }

        .trace-body.truncated:not(.expanded) {
          max-height: 100px;
          overflow: hidden;
        }

        .trace-expand-btn {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          background: var(--entry-color);
          color: white;
          border: none;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          cursor: pointer;
          opacity: 0.9;
        }

        .trace-expand-btn:hover {
          opacity: 1;
        }
      `}</style>
        </div>
    )
}
