import { useEffect, useMemo, useState } from 'react'
import { layoutDag } from '../lib/dag'
import { formatDuration, statusColor } from '../lib/format'
import { useT } from '../lib/i18n'
import { StatusBadge } from './StatusBadge'
import type { RunStep } from '../types'

/**
 * Roadmap of a run: the planned execution stages (from the DAG) and a Gantt-style
 * timeline of when each step actually ran.
 */
export function RoadmapTimeline({ steps, onSelect, selectedId }: { steps: RunStep[]; onSelect?: (id: string) => void; selectedId?: string | null }) {
  const { t } = useT()
  const [now, setNow] = useState(Date.now())
  const live = steps.some((s) => s.status === 'running')
  useEffect(() => {
    if (!live) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [live])

  const stages = useMemo(() => layoutDag(steps.map((s) => ({ id: s.key, dependsOn: s.dependsOn }))).stages, [steps])
  const byKey = useMemo(() => new Map(steps.map((s) => [s.key, s])), [steps])

  const times = steps.filter((s) => s.startedAt).map((s) => ({ start: new Date(s.startedAt!).getTime(), end: s.finishedAt ? new Date(s.finishedAt).getTime() : now }))
  const t0 = times.length ? Math.min(...times.map((x) => x.start)) : 0
  const t1 = times.length ? Math.max(...times.map((x) => x.end), t0 + 1000) : 1
  const span = Math.max(1, t1 - t0)

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div>
        <h3 className="text-[13px] font-semibold mb-1">{t('runDetail.stages')}</h3>
        <p className="text-[12px] text-ink-muted mb-3">{t('runDetail.stagesDesc')}</p>
        <ol className="relative border-l border-line ml-2 space-y-4">
          {stages.map((stage, i) => (
            <li key={i} className="pl-4">
              <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-ink" />
              <p className="text-[12px] font-medium text-ink-soft mb-1.5">{t('runDetail.stage', { n: i + 1 })}</p>
              <div className="flex flex-wrap gap-1.5">
                {stage.map((key) => {
                  const s = byKey.get(key)!
                  return (
                    <button
                      key={key}
                      onClick={() => onSelect?.(s.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 h-7 text-[12px] bg-white hover:bg-[#f5f6f8] ${selectedId === s.id ? 'border-ink' : 'border-line'}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(s.status) }} />
                      {s.name}
                      <span className="text-ink-muted">· {s.agentName}</span>
                    </button>
                  )
                })}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="text-[13px] font-semibold mb-3">{t('runDetail.timeline')}</h3>
        <div className="space-y-2">
          {steps.map((s) => {
            const start = s.startedAt ? new Date(s.startedAt).getTime() : null
            const end = s.finishedAt ? new Date(s.finishedAt).getTime() : now
            const left = start ? ((start - t0) / span) * 100 : 0
            const width = start ? Math.max(0.8, ((end - start) / span) * 100) : 0
            return (
              <div key={s.id} className={`grid grid-cols-[170px_1fr_64px] items-center gap-3 rounded-lg px-2 py-1 cursor-pointer ${selectedId === s.id ? 'bg-black/5' : 'hover:bg-black/[0.03]'}`} onClick={() => onSelect?.(s.id)}>
                <div className="truncate">
                  <span className="text-[13px] font-medium">{s.name}</span>
                  <span className="text-[11px] text-ink-muted ml-1.5">{s.agentName}</span>
                </div>
                <div className="relative h-5 rounded-md bg-[#f0f1f4] overflow-hidden">
                  {start ? (
                    <div
                      className="absolute top-0 h-full rounded-md"
                      style={{ left: `${left}%`, width: `${width}%`, background: statusColor(s.status), opacity: s.status === 'running' ? 0.75 : 0.9 }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center px-2 text-[11px] text-ink-muted">
                      {s.status === 'pending' ? t('runDetail.notStarted') : <StatusBadge status={s.status} small />}
                    </div>
                  )}
                </div>
                <span className="text-[12px] text-ink-soft text-right font-mono">{formatDuration(s.startedAt, s.finishedAt, now)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
