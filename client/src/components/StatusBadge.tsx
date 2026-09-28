import { useT } from '../lib/i18n'
import { statusColor, statusTextColor } from '../lib/format'
import type { AgentState, RunStatus, StepStatus } from '../types'

export function StatusBadge({ status, small }: { status: RunStatus | StepStatus; small?: boolean }) {
  const { t } = useT()
  const color = statusColor(status)
  const running = status === 'running'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium shrink-0 whitespace-nowrap ${small ? 'h-5 px-1.5 text-[11px]' : 'h-6 px-2 text-[12px]'}`}
      style={{ background: `${color}1a`, color: statusTextColor(status) }}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${running ? 'pulse-ring' : ''}`} style={{ background: color }} />
      {t(`status.${status}` as never)}
    </span>
  )
}

const AGENT_STATE_COLOR: Record<AgentState, { dot: string; text: string }> = {
  ready: { dot: '#1f9d61', text: '#157a4a' },
  busy: { dot: '#3b6cf6', text: '#2a55c9' },
  offline: { dot: '#9aa0a6', text: '#5f6368' },
  'missing-cli': { dot: '#c9820a', text: '#8f5a00' },
}

export function AgentStateBadge({ state }: { state: AgentState }) {
  const { t } = useT()
  const color = AGENT_STATE_COLOR[state]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full h-6 px-2 text-[12px] font-medium shrink-0 whitespace-nowrap" style={{ background: `${color.dot}1a`, color: color.text }}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${state === 'busy' ? 'pulse-ring' : ''}`} style={{ background: color.dot }} />
      {t(`agent.state.${state}` as never)}
    </span>
  )
}
