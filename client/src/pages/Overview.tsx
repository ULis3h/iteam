import { ArrowRight, Check, Circle, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { Card, ErrorBanner, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { useApp } from '../lib/app'
import { formatDuration, isActive, relativeTime } from '../lib/format'
import { useT } from '../lib/i18n'
import { useReconnect, useSocketEvent } from '../lib/socket'
import type { Agent, Run, Stats } from '../types'

export function OverviewPage() {
  const { t, locale } = useT()
  const { system } = useApp()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [agentId, setAgentId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [workDir, setWorkDir] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, a, r] = await Promise.all([api.stats(), api.agents(), api.runs({ limit: 8 })])
      setStats(s)
      setAgents(a)
      setRuns(r)
      setAgentId((id) => id || a.find((x) => x.state === 'ready')?.id || a[0]?.id || '')
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  useSocketEvent(['run:changed', 'agent:changed', 'agent:deleted', 'runner:changed', 'workflow:changed', 'run:deleted'], load, 300)
  useReconnect(load)
  // step events are frequent: refresh at most once a second
  const throttle = useRef<ReturnType<typeof setTimeout> | null>(null)
  useSocketEvent(
    'step:changed',
    useCallback(() => {
      if (throttle.current) return
      throttle.current = setTimeout(() => {
        throttle.current = null
        void load()
      }, 1000)
    }, [load]),
  )
  const [now, setNow] = useState(Date.now())
  const live = runs.some((r) => isActive(r.status))
  useEffect(() => {
    if (!live) return
    const h = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(h)
  }, [live])

  const quickRun = async () => {
    setBusy(true)
    try {
      const run = await api.quickRun(agentId, prompt.trim(), undefined, workDir.trim() || undefined)
      navigate(`/runs/${run.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const cliDetected = Object.values(system?.capabilities?.providers ?? {}).some((p) => p.available) || agents.some((a) => a.provider === 'custom')
  const checklist = [
    { key: 'cli', done: cliDetected, label: t('overview.checklist.cli'), hint: t('overview.checklist.cliHint'), to: '/settings', action: t('overview.checklist.check') },
    { key: 'agent', done: agents.length > 0, label: t('overview.checklist.agent'), to: '/agents', action: t('overview.addAgent') },
    { key: 'workflow', done: (stats?.workflows ?? 0) > 0, label: t('overview.checklist.workflow'), to: '/workflows?import=1', action: t('overview.getStarted.import') },
    { key: 'run', done: runs.length > 0, label: t('overview.checklist.run'), to: '/workflows', action: t('common.run') },
  ]

  const statCards: Array<[string, number | string]> = stats
    ? [
        [t('overview.stat.agents'), stats.agents],
        [t('overview.stat.runners'), stats.runnersOnline],
        [t('overview.stat.workflows'), stats.workflows],
        [t('overview.stat.running'), stats.running],
        [t('overview.stat.succeeded'), stats.succeeded24h],
        [t('overview.stat.failed'), stats.failed24h],
      ]
    : []

  return (
    <div>
      <PageHeader title={t('overview.title')} subtitle={t('overview.subtitle')} />
      <ErrorBanner message={error} onClose={() => setError(null)} />

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map(([label, value]) => (
          <Card key={label} className="p-4 fade-in">
            <div className="text-[11px] text-ink-muted">{label}</div>
            <div className="text-[24px] font-semibold tracking-tight mt-0.5">{value}</div>
          </Card>
        ))}
      </div>

      {stats && checklist.some((c) => !c.done) && (
        <Card className="p-6 mb-6 fade-in">
          <h2 className="text-[15px] font-semibold">{t('overview.checklist.title')}</h2>
          <p className="text-[13px] text-ink-soft mb-4">{t('overview.checklist.desc')}</p>
          <ol className="space-y-2">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-3 text-[13px]">
                {item.done ? <Check size={16} className="text-status-success shrink-0" /> : <Circle size={16} className="text-ink-muted shrink-0" />}
                <span className={`flex-1 ${item.done ? 'text-ink-muted line-through' : ''}`}>
                  {item.label}
                  {!item.done && item.hint && <span className="block text-[12px] text-ink-muted">{item.hint}</span>}
                </span>
                {!item.done && (
                  <Link to={item.to} className="btn-secondary btn-sm">
                    {item.action} <ArrowRight size={13} />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
      {agents.length > 0 && (
        <Card className="p-6 mb-6 fade-in">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-semibold">{t('overview.quick.title')}</h2>
          </div>
          <p className="text-[13px] text-ink-soft mb-4">{t('overview.quick.desc')}</p>
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <div className="space-y-3">
              <select className="select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.model || a.provider}
                  </option>
                ))}
              </select>
              <input className="input mono" placeholder={t('overview.quick.workDir')} value={workDir} onChange={(e) => setWorkDir(e.target.value)} />
            </div>
            <textarea className="textarea min-h-[92px]" placeholder={t('overview.quick.prompt')} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn-primary" disabled={busy || !agentId || !prompt.trim()} onClick={quickRun}>
              <Play size={14} /> {t('overview.quick.submit')}
            </button>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold">{t('overview.recent')}</h2>
        <Link to="/runs" className="text-[13px] text-ink-soft hover:text-ink inline-flex items-center gap-1">
          {t('common.viewAll')} <ArrowRight size={14} />
        </Link>
      </div>
      {runs.length === 0 ? (
        <Card className="p-6 text-[13px] text-ink-muted">{t('runs.empty')}</Card>
      ) : (
        <Card className="divide-y divide-line">
          {runs.map((r) => {
            const done = r.steps?.filter((s) => s.status === 'succeeded').length ?? 0
            return (
              <Link key={r.id} to={`/runs/${r.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-black/[0.02] first:rounded-t-2xl last:rounded-b-2xl">
                <StatusBadge status={r.status} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{r.name}</div>
                  <div className="text-[11px] text-ink-muted">
                    {t('runs.progress', { done, total: r.steps?.length ?? 0 })} · {relativeTime(r.createdAt, locale)}
                  </div>
                </div>
                <span className="text-[12px] text-ink-soft font-mono">{formatDuration(r.startedAt, r.finishedAt, now)}</span>
              </Link>
            )
          })}
        </Card>
      )}
    </div>
  )
}
