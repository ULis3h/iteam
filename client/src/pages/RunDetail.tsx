import { ArrowLeft, Check, Copy, Download, Maximize2, MessageSquarePlus, RotateCcw, Square, Trash2, Play, X, SkipForward } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LogViewer } from '../components/LogViewer'
import { PipelineGraph } from '../components/PipelineGraph'
import { RoadmapTimeline } from '../components/RoadmapTimeline'
import { RunDialog } from '../components/RunDialog'
import { StatusBadge } from '../components/StatusBadge'
import { Card, ErrorBanner, Field, InfoBanner, Modal, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { copyText, formatDuration, formatTime, isActive, isTerminal } from '../lib/format'
import { useT } from '../lib/i18n'
import { subscribeRun, useReconnect, useSocketEvent } from '../lib/socket'
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
  const [rerunOpen, setRerunOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const seen = useRef(new Set<string>())
  const pendingSteps = useRef<RunStep[]>([])
  const loaded = useRef(false)
  const detailRef = useRef<HTMLDivElement>(null)

  const mergeStep = (prev: Run, step: RunStep): Run => ({ ...prev, steps: prev.steps?.map((s) => (s.id === step.id ? { ...s, ...step } : s)) })

  const load = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([api.run(id), api.runLogs(id)])
      // apply step events that arrived while the snapshot was in flight
      let merged = r
      for (const step of pendingSteps.current) merged = mergeStep(merged, step)
      pendingSteps.current = []
      loaded.current = true
      setRun(merged)
      setLogs((prev) => {
        const keys = new Set(l.map((x) => `${x.stepId}:${x.seq}`))
        const extra = prev.filter((x) => !keys.has(`${x.stepId}:${x.seq}`))
        const all = [...l, ...extra].sort((a, b) => (a.stepId === b.stepId ? a.seq - b.seq : 0))
        seen.current = new Set(all.map((x) => `${x.stepId}:${x.seq}`))
        return all
      })
    } catch (err) {
      setError((err as Error).message)
    }
  }, [id])

  useEffect(() => {
    loaded.current = false
    seen.current = new Set()
    const unsubscribe = subscribeRun(id)
    void load()
    return unsubscribe
  }, [id, load])
  useReconnect(load)

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
      if (!loaded.current) {
        pendingSteps.current.push(step)
        return
      }
      setRun((prev) => (prev ? mergeStep(prev, step) : prev))
    }, [id]),
  )
  useSocketEvent(
    'run:log',
    useCallback((payload: unknown) => {
      const line = payload as LogLine
      if (line.runId !== id) return
      const key = `${line.stepId}:${line.seq}`
      if (seen.current.has(key)) return
      seen.current.add(key)
      setLogs((prev) => [...prev, line])
    }, [id]),
  )
  useSocketEvent(
    'run:deleted',
    useCallback((payload: unknown) => {
      const p = payload as { id: string }
      if (p.id === id) navigate('/runs')
    }, [id, navigate]),
  )

  const active = !!run && isActive(run.status)
  useEffect(() => {
    if (!active) return
    const h = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(h)
  }, [active])

  const steps = useMemo(() => run?.steps ?? [], [run])
  const selectedStep = steps.find((s) => s.id === selected) ?? null
  const done = steps.filter((s) => s.status === 'succeeded').length
  const awaiting = steps.find((s) => s.status === 'waiting') ?? null
  const focusStep = (stepId: string) => {
    setSelected(stepId)
    setTab('pipeline')
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

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
            {steps.some((s) => s.costUsd != null) && (
              <span>
                {t('runDetail.totalCost')} ${steps.reduce((sum, s) => sum + (s.costUsd ?? 0), 0).toFixed(4)}
              </span>
            )}
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
              <button className="btn-secondary" onClick={() => setRerunOpen(true)}>
                <Play size={14} /> {t('runDetail.rerun')}
              </button>
              <button
                className="btn-ghost"
                title={t('runDetail.downloadRun')}
                onClick={() => {
                  const blob = new Blob([JSON.stringify({ ...run, logs }, null, 2)], { type: 'application/json' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = `run-${run.id.slice(0, 8)}.json`
                  a.click()
                  URL.revokeObjectURL(a.href)
                }}
              >
                <Download size={14} />
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  if (confirm(t('common.confirmDelete', { name: run.name }))) api.deleteRun(run.id).then(() => navigate('/runs')).catch((e) => setError(e.message))
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
      {awaiting && (
        <InfoBanner>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{t('runDetail.approval.banner', { name: awaiting.name })}</span>
            <button className="btn-primary btn-sm" onClick={() => focusStep(awaiting.id)}>
              {t('runDetail.approval.open')}
            </button>
          </div>
        </InfoBanner>
      )}

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
              nodes={steps.map((s) => ({ id: s.key, name: s.name, agentName: s.provider === 'approval' ? t('editor.step.type.approval') : s.agentName, meta: s.provider === 'approval' ? undefined : s.model || s.provider, dependsOn: s.dependsOn, status: s.status }))}
              selectedId={selectedStep?.key ?? null}
              onSelect={(key) => {
                const step = steps.find((s) => s.key === key)
                if (step) {
                  setSelected(step.id)
                  requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
                }
              }}
            />
          </Card>
          <Card className="p-5 min-h-[160px]">
            <div ref={detailRef} />
            {selectedStep ? (
              <StepDetail
                step={selectedStep}
                now={now}
                runFinished={isTerminal(run.status)}
                onApprove={(approved, note) => act(() => api.approveStep(run.id, selectedStep.id, approved, note))}
                onRerunFrom={() => {
                  if (confirm(t('runDetail.rerunFromConfirm', { name: selectedStep.name }))) void act(() => api.rerunFrom(run.id, selectedStep.id))
                }}
                onLogs={() => {
                  setLogStep(selectedStep.id)
                  setTab('logs')
                }}
                onFollowUp={async (prompt) => {
                  const created = await api.followUp(run.id, selectedStep.id, prompt)
                  navigate(`/runs/${created.id}`)
                }}
              />
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
      <RunDialog
        open={rerunOpen}
        name={run.name}
        inputs={(run.snapshot?.inputs ?? []).map((i) => ({ ...i, default: run.inputs[i.key] ?? i.default }))}
        onClose={() => setRerunOpen(false)}
        onStart={async (values, name) => {
          const created = await api.rerun(run.id, values, name)
          navigate(`/runs/${created.id}`)
        }}
      />
    </div>
  )
}

function TextBlock({ label, text, tone }: { label: string; text: string; tone?: 'error' }) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const cls = tone === 'error' ? 'bg-red-50 text-status-failed' : 'bg-[#f7f7f9]'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="label !mb-0">{label}</div>
        <div className="flex gap-1">
          <button
            className="btn-ghost btn-sm !px-2"
            title={t('runDetail.copy')}
            onClick={async () => {
              setCopied(await copyText(text))
              setTimeout(() => setCopied(false), 1500)
            }}
          >
            <Copy size={13} /> {copied ? t('common.copied') : ''}
          </button>
          <button className="btn-ghost btn-sm !px-2" title={t('runDetail.expand')} onClick={() => setExpanded(true)}>
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
      <pre className={`mono whitespace-pre-wrap break-words rounded-xl p-3 max-h-64 overflow-auto ${cls}`}>{text}</pre>
      <Modal open={expanded} onClose={() => setExpanded(false)} title={label} wide>
        <pre className={`mono whitespace-pre-wrap break-words rounded-xl p-4 ${cls}`}>{text}</pre>
      </Modal>
    </div>
  )
}

function StepDetail({
  step,
  now,
  runFinished,
  onLogs,
  onFollowUp,
  onApprove,
  onRerunFrom,
}: {
  step: RunStep
  now: number
  runFinished: boolean
  onLogs: () => void
  onFollowUp: (prompt: string) => Promise<void>
  onApprove: (approved: boolean, note: string) => Promise<void>
  onRerunFrom: () => void
}) {
  const { t, locale } = useT()
  const [showPrompt, setShowPrompt] = useState(false)
  const [note, setNote] = useState('')
  const [deciding, setDeciding] = useState(false)
  const approval = step.provider === 'approval'
  const decide = async (approved: boolean) => {
    setDeciding(true)
    try {
      await onApprove(approved, note.trim())
      setNote('')
    } finally {
      setDeciding(false)
    }
  }
  const [followOpen, setFollowOpen] = useState(false)
  const [followPrompt, setFollowPrompt] = useState('')
  const [followBusy, setFollowBusy] = useState(false)
  const [followError, setFollowError] = useState<string | null>(null)
  const canFollowUp = !!step.sessionId && step.provider === 'claude-code' && (step.status === 'succeeded' || step.status === 'failed')
  return (
    <div className="text-[13px] space-y-4 max-w-4xl">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[15px]">{step.name}</h3>
          <StatusBadge status={step.status} />
        </div>
        <div className="text-[12px] text-ink-muted mt-1">
          {approval ? (
            t('editor.step.type.approval')
          ) : (
            <>
              {step.agentName} · {step.provider}
              {step.model ? ` / ${step.model}` : ''} · {t('common.effort')} {step.effort || '—'} · {step.location === 'remote' ? t('common.remote') : t('common.local')}
            </>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        <dt className="text-ink-muted">{t('common.started')}</dt>
        <dd>{formatTime(step.startedAt, locale)}</dd>
        <dt className="text-ink-muted">{t('common.duration')}</dt>
        <dd className="font-mono">{formatDuration(step.startedAt, step.finishedAt, now)}</dd>
        <dt className="text-ink-muted">{t('runDetail.attempt', { n: step.attempt, m: step.maxAttempts })}</dt>
        <dd>{step.exitCode !== null ? `${t('runDetail.exit')} ${step.exitCode}` : '—'}</dd>
        {step.costUsd != null && (
          <>
            <dt className="text-ink-muted">{t('runDetail.cost')}</dt>
            <dd className="font-mono">${step.costUsd.toFixed(4)}</dd>
          </>
        )}
        {(step.inputTokens != null || step.outputTokens != null) && (
          <>
            <dt className="text-ink-muted">{t('runDetail.tokens')}</dt>
            <dd className="font-mono">
              {(step.inputTokens ?? 0).toLocaleString()} / {(step.outputTokens ?? 0).toLocaleString()}
            </dd>
          </>
        )}
        {step.turns != null && (
          <>
            <dt className="text-ink-muted">{t('runDetail.turns')}</dt>
            <dd>{step.turns}</dd>
          </>
        )}
      </dl>
      {step.status === 'waiting' && (
        <div className="rounded-xl border border-[#d9ccff] bg-[#f6f2ff] p-4 space-y-3">
          <div>
            <div className="font-semibold text-[14px]">{t('runDetail.approval.title')}</div>
            <div className="text-[12px] text-ink-soft mt-0.5">{t('runDetail.approval.hint')}</div>
          </div>
          {step.prompt && <pre className="mono whitespace-pre-wrap break-words rounded-lg bg-white/70 p-3 max-h-64 overflow-auto">{step.prompt}</pre>}
          <textarea className="textarea min-h-[72px] bg-white" placeholder={t('runDetail.approval.note')} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" disabled={deciding} onClick={() => void decide(true)}>
              <Check size={13} /> {t('runDetail.approval.approve')}
            </button>
            <button className="btn-danger btn-sm" disabled={deciding} onClick={() => void decide(false)}>
              <X size={13} /> {t('runDetail.approval.reject')}
            </button>
          </div>
        </div>
      )}
      {step.error && <TextBlock label={t('runDetail.error')} text={step.error} tone="error" />}
      {step.output && <TextBlock label={t('runDetail.output')} text={step.output} />}
      {step.diff && <TextBlock label={t('runDetail.diff')} text={step.diff} />}
      {step.prompt && step.status !== 'waiting' && (
        <div>
          <button className="label !mb-1 underline underline-offset-2 hover:text-ink" onClick={() => setShowPrompt((v) => !v)}>
            {showPrompt ? '−' : '+'} {t('runDetail.prompt')}
          </button>
          {showPrompt && <TextBlock label={t('runDetail.prompt')} text={step.prompt} />}
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" onClick={onLogs}>
          {t('runDetail.logs')}
        </button>
        {canFollowUp && (
          <button className="btn-primary btn-sm" onClick={() => setFollowOpen(true)}>
            <MessageSquarePlus size={13} /> {t('runDetail.followUp')}
          </button>
        )}
        {runFinished && isTerminal(step.status) && (
          <button className="btn-secondary btn-sm" onClick={onRerunFrom} title={t('runDetail.rerunFrom')}>
            <SkipForward size={13} /> {t('runDetail.rerunFrom')}
          </button>
        )}
      </div>
      <Modal
        open={followOpen}
        onClose={() => setFollowOpen(false)}
        title={t('runDetail.followUp.title', { name: step.name })}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setFollowOpen(false)}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-primary"
              disabled={followBusy || !followPrompt.trim()}
              onClick={async () => {
                setFollowBusy(true)
                setFollowError(null)
                try {
                  await onFollowUp(followPrompt.trim())
                } catch (err) {
                  setFollowError((err as Error).message)
                } finally {
                  setFollowBusy(false)
                }
              }}
            >
              {t('runDetail.followUp.submit')}
            </button>
          </>
        }
      >
        <ErrorBanner message={followError} onClose={() => setFollowError(null)} />
        <Field label={t('runDetail.followUp')} hint={t('runDetail.followUp.hint')}>
          <textarea className="textarea min-h-[120px]" autoFocus placeholder={t('runDetail.followUp.placeholder')} value={followPrompt} onChange={(e) => setFollowPrompt(e.target.value)} />
        </Field>
      </Modal>
    </div>
  )
}
