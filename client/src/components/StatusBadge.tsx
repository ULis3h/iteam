import { useT } from '../lib/i18n'
import { statusColor } from '../lib/format'
import type { AgentState, RunStatus, StepStatus } from '../types'

export function StatusBadge({ status, small }: { status: RunStatus | StepStatus; small?: boolean }) {
  const { t } = useT()
  const color = statusColor(status)
  const running = status === 'running'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium shrink-0 whitespace-nowrap ${small ? 'h-5 px-1.5 text-[11px]' : 'h-6 px-2 text-[12px]'}`}
      style={{ background: `${color}14`, color }}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${running ? 'pulse-ring' : ''}`} style={{ background: color }} />
      {t(`status.${status}` as never)}
    </span>
  )
}

const AGENT_STATE_COLOR: Record<AgentState, string> = {
  ready: '#1f9d61',
  busy: '#3b6cf6',
  offline: '#9aa0a6',
  'missing-cli': '#c9820a',
}

export function AgentStateBadge({ state }: { state: AgentState }) {
  const { t } = useT()
  const color = AGENT_STATE_COLOR[state]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full h-6 px-2 text-[12px] font-medium shrink-0 whitespace-nowrap" style={{ background: `${color}14`, color }}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${state === 'busy' ? 'pulse-ring' : ''}`} style={{ background: color }} />
      {t(`agent.state.${state}` as never)}
    </span>
  )
}
