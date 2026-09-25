import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { Card, EmptyState, ErrorBanner, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { formatDuration, formatTime, statusColor } from '../lib/format'
import { useT } from '../lib/i18n'
import { useSocketEvent } from '../lib/socket'
import type { Run, RunStatus } from '../types'

const FILTERS: Array<RunStatus | ''> = ['', 'running', 'succeeded', 'failed', 'cancelled']

export function RunsPage() {
  const { t, locale } = useT()
  const [runs, setRuns] = useState<Run[]>([])
  const [filter, setFilter] = useState<RunStatus | ''>('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setRuns(await api.runs({ status: filter === 'running' ? 'running,queued' : filter || undefined, limit: 100 }))
    } catch (err) {
      setError((err as Error).message)
    }
  }, [filter])
  useEffect(() => {
    void load()
  }, [load])
  useSocketEvent(['run:changed', 'step:changed', 'run:deleted'], load)

  const remove = async (run: Run) => {
    if (!confirm(t('common.confirmDelete', { name: run.name }))) return
    try {
      await api.deleteRun(run.id)
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('runs.title')}
        subtitle={t('runs.subtitle')}
        actions={
          <div className="flex rounded-full border border-line bg-white p-0.5">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`h-8 px-3 rounded-full text-[12px] font-medium transition ${filter === f ? 'bg-ink text-white' : 'text-ink-soft hover:bg-black/5'}`}>
                {f ? t(`status.${f}` as never) : t('runs.filter.all')}
              </button>
            ))}
          </div>
        }
      />
      <ErrorBanner message={error} onClose={() => setError(null)} />
      {runs.length === 0 ? (
        <EmptyState title={t('runs.empty')} />
      ) : (
        <Card className="divide-y divide-line fade-in">
          {runs.map((run) => {
            const steps = run.steps ?? []
            return (
              <div key={run.id} className="flex items-center gap-4 px-5 py-3 hover:bg-black/[0.02] first:rounded-t-2xl last:rounded-b-2xl">
                <StatusBadge status={run.status} />
                <Link to={`/runs/${run.id}`} className="min-w-0 flex-1">
                  <div className="font-medium truncate">{run.name}</div>
                  <div className="text-[11px] text-ink-muted truncate">
                    {run.workflow?.name ? `${run.workflow.name} · ` : ''}
                    {formatTime(run.createdAt, locale)}
                  </div>
                </Link>
                <div className="hidden sm:flex items-center gap-1" title={steps.map((s) => `${s.name}: ${s.status}`).join('\n')}>
                  {steps.map((s) => (
                    <span key={s.id} className="w-2 h-2 rounded-full" style={{ background: statusColor(s.status) }} />
                  ))}
                </div>
                <span className="text-[12px] text-ink-soft font-mono w-16 text-right">{formatDuration(run.startedAt, run.finishedAt)}</span>
                <button className="btn-ghost btn-sm !px-2 hover:!text-status-failed" disabled={run.status === 'running' || run.status === 'queued'} onClick={() => remove(run)}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}
