import { ArrowLeft, RotateCcw, Square, Trash2, Play } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LogViewer } from '../components/LogViewer'
import { PipelineGraph } from '../components/PipelineGraph'
import { RoadmapTimeline } from '../components/RoadmapTimeline'
import { StatusBadge } from '../components/StatusBadge'
import { Card, ErrorBanner, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { formatDuration, formatTime } from '../lib/format'
import { useT } from '../lib/i18n'
import { getSocket, useSocketEvent } from '../lib/socket'
import type { LogLine, Run, RunStep } from '../types'

type Tab = 'pipeline' | 'roadmap' | 'logs'

export function RunDetailPage() {
  const { id = '' } = useParams()
  const { t, locale } = useT()
  const navigate = useNavigate()
  const [run, setRun] = useState<Run | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [tab, setTab] = useState<Tab>('pipeline')
  const [selected, setSelected] = useState<string | null>(null)
  const [logStep, setLogStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([api.run(id), api.runLogs(id)])
      setRun(r)
      setLogs(l)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [id])

  useEffect(() => {
    void load()
    const s = getSocket()
    s.emit('run:subscribe', id)
    return () => {
      s.emit('run:unsubscribe', id)
    }
  }, [id, load])

  useSocketEvent(
    'run:changed',
    useCallback((payload: unknown) => {
      const r = payload as Run
      if (r.id === id) setRun((prev) => (prev ? { ...prev, ...r, steps: prev.steps } : prev))
    }, [id]),
  )
  useSocketEvent(
    'step:changed',
    useCallback((payload: unknown) => {
      const step = payload as RunStep
      if (step.runId !== id) return
      setRun((prev) => (prev ? { ...prev, steps: prev.steps?.map((s) => (s.id === step.id ? step : s)) } : prev))
    }, [id]),
  )
  useSocketEvent(
    'run:log',
    useCallback((payload: unknown) => {
      const line = payload as LogLine
      if (line.runId !== id) return
      setLogs((prev) => (prev.some((l) => l.stepId === line.stepId && l.seq === line.seq) ? prev : [...prev, line]))
    }, [id]),
  )

  const active = run?.status === 'running' || run?.status === 'queued'
  useEffect(() => {
    if (!active) return
    const h = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(h)
  }, [active])

  const steps = useMemo(() => run?.steps ?? [], [run])
  const selectedStep = steps.find((s) => s.id === selected) ?? null
  const done = steps.filter((s) => s.status === 'succeeded').length

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      await load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center py-20">
        {error ? <ErrorBanner message={error} /> : <Spinner size={22} />}
      </div>
    )
  }

  return (
    <div>
      <Link to="/runs" className="inline-flex items-center gap-1 text-[13px] text-ink-soft hover:text-ink mb-3">
        <ArrowLeft size={14} /> {t('nav.runs')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5 fade-in">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold tracking-tight truncate">{run.name}</h1>
            <StatusBadge status={run.status} />
          </div>
          <div className="text-[12px] text-ink-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {run.workflow && (
              <Link to={`/workflows/${run.workflow.id}`} className="hover:text-ink">
                {run.workflow.name}
              </Link>
            )}
            <span>
              {t('common.started')} {formatTime(run.startedAt, locale)}
            </span>
            <span>
              {t('common.duration')} {formatDuration(run.startedAt, run.finishedAt, now)}
            </span>
            <span>{t('runs.progress', { done, total: steps.length })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {active ? (
            <button className="btn-danger" onClick={() => act(() => api.cancelRun(run.id))}>
              <Square size={14} /> {t('runDetail.cancel')}
            </button>
          ) : (
            <>
              {(run.status === 'failed' || run.status === 'cancelled') && (
                <button className="btn-primary" onClick={() => act(() => api.retryRun(run.id))}>
                  <RotateCcw size={14} /> {t('runDetail.retry')}
                </button>
              )}
              <button className="btn-secondary" onClick={() => api.rerun(run.id).then((r) => navigate(`/runs/${r.id}`)).catch((e) => setError(e.message))}>
                <Play size={14} /> {t('runDetail.rerun')}
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  if (confirm(t('common.confirmDelete', { name: run.name }))) void api.deleteRun(run.id).then(() => navigate('/runs'))
                }}
              >
                <Trash2 size={14} /> {t('runDetail.delete')}
              </button>
            </>
          )}
        </div>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />
      {run.error && run.status !== 'running' && <ErrorBanner message={run.error} />}

      {Object.keys(run.inputs).length > 0 && (
        <Card className="p-4 mb-4 text-[12px] flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-ink-muted">{t('runDetail.inputs')}</span>
          {Object.entries(run.inputs).map(([k, v]) => (
            <span key={k}>
              <span className="mono text-ink-soft">{k}</span> = <span className="break-all">{v || '—'}</span>
            </span>
          ))}
        </Card>
      )}

      <div className="flex gap-1 mb-4 border-b border-line">
        {(['pipeline', 'roadmap', 'logs'] as Tab[]).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 h-9 text-[13px] font-medium border-b-2 -mb-px transition ${tab === k ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {t(`runDetail.${k}` as never)}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <div className="grid gap-4">
          <Card className="p-4 overflow-hidden">
            <PipelineGraph
              nodes={steps.map((s) => ({ id: s.key, name: s.name, agentName: s.agentName, meta: s.model || s.provider, dependsOn: s.dependsOn, status: s.status }))}
              selectedId={selectedStep?.key ?? null}
              onSelect={(key) => {
                const step = steps.find((s) => s.key === key)
                if (step) setSelected(step.id)
              }}
            />
          </Card>
          <Card className="p-5 min-h-[160px]">
            {selectedStep ? (
              <StepDetail step={selectedStep} now={now} onLogs={() => {
                setLogStep(selectedStep.id)
                setTab('logs')
              }} />
            ) : (
              <div className="text-[13px] text-ink-muted h-full flex items-center justify-center text-center">{t('runDetail.selectStep')}</div>
            )}
          </Card>
        </div>
      )}

      {tab === 'roadmap' && (
        <Card className="p-5">
          <RoadmapTimeline steps={steps} selectedId={selected} onSelect={(sid) => {
            setSelected(sid)
            setTab('pipeline')
          }} />
        </Card>
      )}

      {tab === 'logs' && (
        <Card className="p-4">
          <LogViewer logs={logs} steps={steps} stepId={logStep} onStepChange={setLogStep} />
        </Card>
      )}
    </div>
  )
}

function StepDetail({ step, now, onLogs }: { step: RunStep; now: number; onLogs: () => void }) {
  const { t, locale } = useT()
  const [showPrompt, setShowPrompt] = useState(false)
  return (
    <div className="text-[13px] space-y-4 max-w-4xl">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[15px]">{step.name}</h3>
          <StatusBadge status={step.status} />
        </div>
        <div className="text-[12px] text-ink-muted mt-1">
          {step.agentName} · {step.provider}
          {step.model ? ` / ${step.model}` : ''} · {t('common.effort')} {step.effort || '—'} · {step.location === 'remote' ? t('common.remote') : t('common.local')}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        <dt className="text-ink-muted">{t('common.started')}</dt>
        <dd>{formatTime(step.startedAt, locale)}</dd>
        <dt className="text-ink-muted">{t('common.duration')}</dt>
        <dd className="font-mono">{formatDuration(step.startedAt, step.finishedAt, now)}</dd>
        <dt className="text-ink-muted">{t('runDetail.attempt', { n: step.attempt, m: step.maxAttempts })}</dt>
        <dd>{step.exitCode !== null ? `${t('runDetail.exit')} ${step.exitCode}` : '—'}</dd>
      </dl>
      {step.error && (
        <div>
          <div className="label">{t('runDetail.error')}</div>
          <pre className="mono whitespace-pre-wrap break-words rounded-xl bg-red-50 text-status-failed p-3 max-h-40 overflow-auto">{step.error}</pre>
        </div>
      )}
      {step.output && (
        <div>
          <div className="label">{t('runDetail.output')}</div>
          <pre className="mono whitespace-pre-wrap break-words rounded-xl bg-[#f7f7f9] p-3 max-h-64 overflow-auto">{step.output}</pre>
        </div>
      )}
      {step.prompt && (
        <div>
          <button className="label !mb-1 underline underline-offset-2 hover:text-ink" onClick={() => setShowPrompt((v) => !v)}>
            {showPrompt ? '−' : '+'} {t('runDetail.prompt')}
          </button>
          {showPrompt && <pre className="mono whitespace-pre-wrap break-words rounded-xl bg-[#f7f7f9] p-3 max-h-64 overflow-auto">{step.prompt}</pre>}
        </div>
      )}
      <button className="btn-secondary btn-sm" onClick={onLogs}>
        {t('runDetail.logs')}
      </button>
    </div>
  )
}
