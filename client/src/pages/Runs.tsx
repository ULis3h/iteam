import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { Card, EmptyState, ErrorBanner, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { formatDuration, formatTime, isActive, statusColor } from '../lib/format'
import { useT } from '../lib/i18n'
import { useReconnect, useSocketEvent } from '../lib/socket'
import type { Run, RunStatus, Workflow } from '../types'

const FILTERS: Array<RunStatus | ''> = ['', 'running', 'waiting', 'succeeded', 'failed', 'cancelled']

export function RunsPage() {
  const { t, locale } = useT()
  const [runs, setRuns] = useState<Run[]>([])
  const [filter, setFilter] = useState<RunStatus | ''>('')
  const [params, setParams] = useSearchParams()
  const workflowId = params.get('workflowId') ?? ''
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [query, setQuery] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const PAGE = 50

  const load = useCallback(async () => {
    try {
      const page = await api.runs({ status: filter === 'running' ? 'running,queued,waiting' : filter || undefined, workflowId: workflowId || undefined, limit: PAGE })
      setRuns(page)
      setHasMore(page.length === PAGE)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [filter, workflowId])
  const loadMore = async () => {
    const last = runs[runs.length - 1]
    if (!last) return
    try {
      const page = await api.runs({ status: filter === 'running' ? 'running,queued,waiting' : filter || undefined, workflowId: workflowId || undefined, limit: PAGE, before: last.createdAt })
      setRuns((prev) => [...prev, ...page.filter((r) => !prev.some((p) => p.id === r.id))])
      setHasMore(page.length === PAGE)
    } catch (err) {
      setError((err as Error).message)
    }
  }
  useEffect(() => {
    void load()
    api.workflows().then(setWorkflows).catch(() => undefined)
  }, [load])
  useSocketEvent(['run:changed', 'step:changed', 'run:deleted'], load, 300)
  useReconnect(load)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? runs.filter((r) => r.name.toLowerCase().includes(q) || r.workflow?.name?.toLowerCase().includes(q)) : runs
  }, [runs, query])

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
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="select w-auto min-w-[200px]" value={workflowId} onChange={(e) => setParams(e.target.value ? { workflowId: e.target.value } : {})}>
          <option value="">{t('runs.filter.workflow')}: {t('common.all')}</option>
          {workflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <input className="input w-64" placeholder={t('runs.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {visible.length === 0 ? (
        <EmptyState title={t('runs.empty')} />
      ) : (
        <Card className="divide-y divide-line fade-in">
          {visible.map((run) => {
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
                {steps.some((s) => s.costUsd != null) && <span className="text-[12px] text-ink-muted font-mono hidden md:inline">${steps.reduce((sum, s) => sum + (s.costUsd ?? 0), 0).toFixed(2)}</span>}
                <span className="text-[12px] text-ink-soft font-mono w-16 text-right">{formatDuration(run.startedAt, run.finishedAt)}</span>
                <button className="btn-ghost btn-sm !px-2 hover:!text-status-failed" disabled={isActive(run.status)} onClick={() => remove(run)}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </Card>
      )}
      {hasMore && !query && (
        <div className="flex justify-center mt-4">
          <button className="btn-secondary" onClick={loadMore}>
            {t('runs.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}
