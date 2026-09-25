import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import { Toggle } from './ui'
import type { LogLine, RunStep } from '../types'

const STREAM_CLASS: Record<LogLine['stream'], string> = {
  stdout: 'text-ink',
  stderr: 'text-[#b4562e]',
  system: 'text-accent',
}

/** Live log console for a run: filter by step, follow the tail, search. */
export function LogViewer({ logs, steps, stepId, onStepChange }: { logs: LogLine[]; steps: RunStep[]; stepId: string | null; onStepChange: (id: string | null) => void }) {
  const { t } = useT()
  const [follow, setFollow] = useState(true)
  const [filter, setFilter] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const stepNames = useMemo(() => new Map(steps.map((s) => [s.id, s.name])), [steps])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return logs.filter((l) => (!stepId || l.stepId === stepId) && (!q || l.line.toLowerCase().includes(q)))
  }, [logs, stepId, filter])

  useEffect(() => {
    if (follow && box.current) box.current.scrollTop = box.current.scrollHeight
  }, [visible.length, follow])

  return (
    <div className="flex flex-col h-[560px]">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select className="select w-auto min-w-[180px]" value={stepId ?? ''} onChange={(e) => onStepChange(e.target.value || null)}>
          <option value="">{t('runDetail.allSteps')}</option>
          {steps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.agentName}
            </option>
          ))}
        </select>
        <input className="input w-56" placeholder={t('runDetail.logsFilter')} value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="text-[12px] text-ink-muted ml-auto">{visible.length} lines</span>
        <Toggle checked={follow} onChange={setFollow} label={t('runDetail.follow')} />
      </div>
      <div
        ref={box}
        className="flex-1 overflow-auto rounded-xl border border-line bg-[#fbfbfc] p-3 mono leading-[1.6]"
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
          if (!atBottom && follow) setFollow(false)
        }}
      >
        {visible.length === 0 ? (
          <div className="text-ink-muted">{t('runDetail.noLogs')}</div>
        ) : (
          visible.map((l) => (
            <div key={`${l.stepId}-${l.seq}`} className="flex gap-3 hover:bg-black/[0.03] px-1 rounded">
              <span className="text-ink-muted shrink-0 w-[60px] tabular-nums">{new Date(l.ts).toLocaleTimeString('en-GB', { hour12: false })}</span>
              {!stepId && <span className="text-ink-muted shrink-0 w-[110px] truncate">{stepNames.get(l.stepId) ?? l.stepId.slice(0, 8)}</span>}
              <span className={`whitespace-pre-wrap break-words ${STREAM_CLASS[l.stream]}`}>{l.line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
