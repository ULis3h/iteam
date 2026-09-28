import { ArrowLeft, ChevronDown, ChevronUp, Play, Plus, Trash2 } from 'lucide-react'
import { useDirty } from '../lib/dirty'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PipelineGraph } from '../components/PipelineGraph'
import { RunDialog } from '../components/RunDialog'
import { Card, ErrorBanner, Field, InfoBanner, Spinner, Toggle } from '../components/ui'
import { api } from '../lib/api'
import { useApp } from '../lib/app'
import { layoutDag } from '../lib/dag'
import { copyText, ensureId, slugify } from '../lib/format'
import { useT } from '../lib/i18n'
import type { Agent, Effort, Workflow, WorkflowDefinition, WorkflowInput, WorkflowStep } from '../types'

const newStep = (taken: string[], agentId: string, n: number): WorkflowStep => ({
  id: ensureId(`step-${n}`, taken),
  name: '',
  agentId,
  prompt: '',
  dependsOn: [],
})

export function WorkflowEditorPage() {
  const { id } = useParams()
  const { t } = useT()
  const { system } = useApp()
  const navigate = useNavigate()
  const isNew = !id
  const [loading, setLoading] = useState(!isNew)
  const [agents, setAgents] = useState<Agent[]>([])
  const [def, setDef] = useState<WorkflowDefinition>({ name: '', description: '', inputs: [], steps: [], settings: {} })
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [runTarget, setRunTarget] = useState<Workflow | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [notFound, setNotFound] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  // stable React keys for step cards (step ids are user-editable)
  const [uids, setUids] = useState<string[]>([])
  const [hookToken, setHookToken] = useState<string | null>(null)
  const [hookCopied, setHookCopied] = useState(false)
  const dirtyGuard = useDirty()
  const serverPort = window.location.port === '5173' ? '3000' : window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
  const hookUrl = `${window.location.protocol}//${window.location.hostname}:${serverPort}/api/hooks/${id}/${hookToken}`

  useEffect(() => {
    api.agents().then(setAgents).catch((e) => setError(e.message))
    if (!id) return
    api
      .workflow(id)
      .then((w) => {
        setDef({ name: w.name, description: w.description, inputs: w.inputs, steps: w.steps, settings: { maxCostUsd: w.settings?.maxCostUsd } })
        setHookToken(w.settings?.hookToken ?? null)
        setUids(w.steps.map(() => crypto.randomUUID()))
        setExpanded(Object.fromEntries(w.steps.map((s) => [s.id, true])))
      })
      .catch((e) => (e.status === 404 ? setNotFound(true) : setError(e.message)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    dirtyGuard.setDirty(dirty)
    return () => dirtyGuard.setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty])

  const update = useCallback((patch: Partial<WorkflowDefinition>) => {
    setDef((d) => ({ ...d, ...patch }))
    setDirty(true)
  }, [])

  const updateStep = (stepId: string, patch: Partial<WorkflowStep>) => {
    const renamed = patch.id && patch.id !== stepId ? patch.id : null
    const ref = renamed ? new RegExp(`\\{\\{(\\s*)steps\\.${stepId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`, 'g') : null
    const rewrite = (text?: string) => (ref && text ? text.replace(ref, `{{$1steps.${renamed}.`) : text)
    update({
      steps: def.steps.map((s) => {
        const next = s.id === stepId ? { ...s, ...patch } : s
        if (!renamed) return next
        // keep dependency references and {{steps.<id>.output}} mentions in sync when a step id changes
        return { ...next, dependsOn: next.dependsOn.map((d) => (d === stepId ? renamed : d)), prompt: rewrite(next.prompt) ?? next.prompt, expectedOutput: rewrite(next.expectedOutput) }
      }),
    })
    if (renamed) setExpanded((e) => ({ ...e, [renamed]: e[stepId] !== false }))
  }

  const addStep = () => {
    const step = newStep(def.steps.map((s) => s.id), agents[0]?.id ?? '', def.steps.length + 1)
    update({ steps: [...def.steps, step] })
    setUids((u) => [...u, crypto.randomUUID()])
    setExpanded((e) => ({ ...e, [step.id]: true }))
  }

  const removeStep = (index: number) => {
    const stepId = def.steps[index].id
    update({ steps: def.steps.filter((_, i) => i !== index).map((s) => ({ ...s, dependsOn: s.dependsOn.filter((d) => d !== stepId) })) })
    setUids((u) => u.filter((_, i) => i !== index))
  }

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= def.steps.length) return
    const steps = [...def.steps]
    ;[steps[index], steps[target]] = [steps[target], steps[index]]
    update({ steps })
    setUids((u) => {
      const next = [...u]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const validate = (): string | null => {
    if (!def.name.trim()) return t('common.name') + ' ' + t('common.required')
    if (!def.steps.length) return t('editor.validation.noSteps')
    for (const s of def.steps) {
      if (s.type !== 'approval' && !s.agentId) return t('editor.validation.agent', { name: s.name || s.id })
      if (!s.prompt.trim()) return t('editor.validation.prompt', { name: s.name || s.id })
    }
    return null
  }

  const save = async (): Promise<Workflow | null> => {
    const problem = validate()
    if (problem) {
      setError(problem)
      return null
    }
    setSaving(true)
    setError(null)
    try {
      const payload: WorkflowDefinition = {
        ...def,
        name: def.name.trim(),
        settings: def.settings?.maxCostUsd ? { maxCostUsd: def.settings.maxCostUsd } : {},
        steps: def.steps.map((s) =>
          s.type === 'approval'
            ? { id: s.id, name: s.name.trim() || s.id, type: 'approval' as const, agentId: '', prompt: s.prompt, dependsOn: s.dependsOn, continueOnError: s.continueOnError || undefined }
            : { ...s, type: undefined, name: s.name.trim() || s.id, model: s.model || undefined, effort: s.effort || undefined, expectedOutput: s.expectedOutput?.trim() || undefined, check: s.check?.trim() || undefined, when: s.when?.trim() || undefined, assertOutput: s.assertOutput?.trim() || undefined },
        ),
      }
      const saved = id ? await api.updateWorkflow(id, payload) : await api.createWorkflow(payload)
      setDirty(false)
      dirtyGuard.setDirty(false)
      api.validateWorkflow(payload).then((v) => setWarnings(v.warnings ?? [])).catch(() => undefined)
      if (!id) navigate(`/workflows/${saved.id}`, { replace: true })
      return saved
    } catch (err) {
      setError((err as Error).message)
      return null
    } finally {
      setSaving(false)
    }
  }

  const stages = useMemo(() => layoutDag(def.steps.map((s) => ({ id: s.id, dependsOn: s.dependsOn }))).stages, [def.steps])
  const agentName = (s: WorkflowStep) => (s.type === 'approval' ? t('editor.step.type.approval') : (agents.find((a) => a.id === s.agentId)?.name ?? '—'))

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={22} />
      </div>
    )
  }
  if (notFound) {
    return (
      <div>
        <Link to="/workflows" className="inline-flex items-center gap-1 text-[13px] text-ink-soft hover:text-ink mb-3">
          <ArrowLeft size={14} /> {t('nav.workflows')}
        </Link>
        <Card className="p-10 text-center text-[14px]">{t('editor.notFound')}</Card>
      </div>
    )
  }

  return (
    <div>
      <Link to="/workflows" onClick={(e) => !dirtyGuard.confirmLeave() && e.preventDefault()} className="inline-flex items-center gap-1 text-[13px] text-ink-soft hover:text-ink mb-3">
        <ArrowLeft size={14} /> {t('nav.workflows')}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {isNew ? t('editor.newTitle') : t('editor.editTitle')}
          {dirty && <span className="ml-3 text-[12px] font-normal text-status-cancelled">{t('editor.unsaved')}</span>}
        </h1>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={saving} onClick={() => void save()}>
            {t('common.save')}
          </button>
          <button
            className="btn-primary"
            disabled={saving}
            onClick={async () => {
              const saved = await save()
              if (saved) setRunTarget(saved)
            }}
          >
            <Play size={14} /> {t('editor.saveAndRun')}
          </button>
        </div>
      </div>
      <ErrorBanner message={error} onClose={() => setError(null)} />
      {agents.length === 0 && (
        <InfoBanner tone="warn">
          {t('editor.noAgents')}{' '}
          <Link to="/agents" className="underline underline-offset-2 font-medium">
            {t('overview.addAgent')}
          </Link>
        </InfoBanner>
      )}
      {warnings.length > 0 && (
        <InfoBanner tone="warn">
          <div className="font-medium mb-1">{t('editor.warnings')}</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </InfoBanner>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h2 className="text-[14px] font-semibold">{t('editor.basic')}</h2>
            <Field label={t('common.name')} required>
              <input className="input" value={def.name} onChange={(e) => update({ name: e.target.value })} autoFocus={isNew} />
            </Field>
            <Field label={t('common.description')}>
              <input className="input" value={def.description} onChange={(e) => update({ description: e.target.value })} />
            </Field>
            <Field label={t('editor.settings.maxCost')} hint={t('editor.settings.maxCostHint')}>
              <input
                className="input max-w-[200px]"
                type="number"
                min={0}
                step={0.5}
                placeholder="—"
                value={def.settings?.maxCostUsd ?? ''}
                onChange={(e) => update({ settings: { ...def.settings, maxCostUsd: e.target.value ? Math.max(0, Number(e.target.value)) || undefined : undefined } })}
              />
            </Field>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[14px] font-semibold">{t('editor.inputs')}</h2>
              <button className="btn-secondary btn-sm" onClick={() => update({ inputs: [...def.inputs, { key: ensureId(`input${def.inputs.length + 1}`, def.inputs.map((i) => i.key)), label: '', default: '', required: false }] })}>
                <Plus size={13} /> {t('editor.inputs.add')}
              </button>
            </div>
            <p className="text-[12px] text-ink-muted mb-3">{t('editor.inputs.desc')}</p>
            {def.inputs.length > 0 && (
              <div className="space-y-2">
                {def.inputs.map((input, i) => (
                  <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center">
                    <input className="input mono" placeholder={t('editor.inputs.key')} value={input.key} onChange={(e) => update({ inputs: def.inputs.map((x, j) => (j === i ? { ...x, key: e.target.value.replace(/[^\w-]/g, '') } : x)) })} />
                    <input className="input" placeholder={t('editor.inputs.label')} value={input.label ?? ''} onChange={(e) => update({ inputs: def.inputs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <input className="input" placeholder={t('editor.inputs.default')} value={input.default ?? ''} onChange={(e) => update({ inputs: def.inputs.map((x, j) => (j === i ? { ...x, default: e.target.value } : x)) })} />
                    <Toggle checked={!!input.required} onChange={(v) => update({ inputs: def.inputs.map((x, j) => (j === i ? { ...x, required: v } : x)) })} label={t('common.required')} />
                    <button className="btn-ghost btn-sm !px-2 hover:!text-status-failed" onClick={() => update({ inputs: def.inputs.filter((_, j) => j !== i) })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[14px] font-semibold">{t('editor.steps')}</h2>
              <button className="btn-primary btn-sm" onClick={addStep}>
                <Plus size={13} /> {t('editor.steps.add')}
              </button>
            </div>
            <p className="text-[12px] text-ink-muted mb-3">{t('editor.steps.desc')}</p>
            <div className="space-y-3">
              {def.steps.map((step, index) => (
                <StepCard
                  key={uids[index] ?? step.id}
                  index={index}
                  step={step}
                  steps={def.steps}
                  inputs={def.inputs}
                  agents={agents}
                  efforts={system?.efforts ?? ['low', 'medium', 'high', 'max']}
                  expanded={expanded[step.id] !== false}
                  onToggle={() => setExpanded((e) => ({ ...e, [step.id]: e[step.id] === false }))}
                  onChange={(patch) => updateStep(step.id, patch)}
                  onRemove={() => removeStep(index)}
                  onMove={(dir) => moveStep(index, dir)}
                />
              ))}
              {def.steps.length === 0 && (
                <Card className="p-8 text-center text-[13px] text-ink-muted">
                  <button className="btn-primary" onClick={addStep}>
                    <Plus size={14} /> {t('editor.steps.add')}
                  </button>
                </Card>
              )}
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-6 self-start space-y-4">
          {!isNew && (
            <Card className="p-4">
              <h2 className="text-[13px] font-semibold mb-1">{t('editor.hook.title')}</h2>
              <p className="text-[12px] text-ink-muted mb-3">{t('editor.hook.desc')}</p>
              {hookToken ? (
                <>
                  <pre className="mono text-[11px] whitespace-pre-wrap break-all bg-[#f7f7f9] rounded-xl p-3 text-ink-soft">{`curl -X POST ${hookUrl} \\\n  -H 'Content-Type: application/json' \\\n  -d '{"inputs":{}}'`}</pre>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button className="btn-secondary btn-sm" onClick={async () => setHookCopied(await copyText(hookUrl))}>
                      {hookCopied ? t('common.copied') : t('common.copy')}
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => api.createHook(id!, true).then((h) => setHookToken(h.token)).catch((e) => setError(e.message))}>
                      {t('editor.hook.rotate')}
                    </button>
                    <button className="btn-ghost btn-sm hover:!text-status-failed" onClick={() => api.deleteHook(id!).then(() => setHookToken(null)).catch((e) => setError(e.message))}>
                      {t('editor.hook.revoke')}
                    </button>
                  </div>
                </>
              ) : (
                <button className="btn-secondary btn-sm" onClick={() => api.createHook(id!).then((h) => setHookToken(h.token)).catch((e) => setError(e.message))}>
                  {t('editor.hook.create')}
                </button>
              )}
            </Card>
          )}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-semibold">{t('editor.preview')}</h2>
              <span className="text-[11px] text-ink-muted">{t('editor.preview.stages', { n: stages.length })}</span>
            </div>
            <div className="rounded-xl bg-[#f7f7f9] p-2">
              <PipelineGraph compact nodes={def.steps.map((s) => ({ id: s.id, name: s.name || s.id, agentName: agentName(s), dependsOn: s.dependsOn }))} />
            </div>
            {stages.length > 0 && (
              <ol className="mt-3 space-y-1 text-[12px]">
                {stages.map((stage, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-ink-muted w-5 shrink-0">{i + 1}.</span>
                    <span className="text-ink-soft">{stage.map((sid) => def.steps.find((s) => s.id === sid)?.name || sid).join(' · ')}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <RunDialog
        open={!!runTarget}
        name={runTarget?.name ?? ''}
        inputs={runTarget?.inputs ?? []}
        onClose={() => setRunTarget(null)}
        onStart={async (values, name) => {
          const run = await api.runWorkflow(runTarget!.id, values, name)
          navigate(`/runs/${run.id}`)
        }}
      />
    </div>
  )
}

function StepCard({
  index,
  step,
  steps,
  inputs,
  agents,
  efforts,
  expanded,
  onToggle,
  onChange,
  onRemove,
  onMove,
}: {
  index: number
  step: WorkflowStep
  steps: WorkflowStep[]
  inputs: WorkflowInput[]
  agents: Agent[]
  efforts: Effort[]
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<WorkflowStep>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const { t } = useT()
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const [advanced, setAdvanced] = useState(!!(step.timeoutSec || step.retries || step.continueOnError || step.model || step.effort || step.workDir || step.check || step.when || step.assertOutput))
  const agent = agents.find((a) => a.id === step.agentId)
  const approval = step.type === 'approval'
  const others = steps.filter((s) => s.id !== step.id)
  // steps that (transitively) depend on this one cannot also be its dependencies
  const descendants = new Set<string>()
  let frontier = [step.id]
  while (frontier.length) {
    const next = steps.filter((s) => !descendants.has(s.id) && s.dependsOn.some((d) => frontier.includes(d))).map((s) => s.id)
    next.forEach((id) => descendants.add(id))
    frontier = next
  }
  const candidates = others.filter((s) => !descendants.has(s.id))

  const insert = (text: string) => {
    const el = promptRef.current
    if (!el) return onChange({ prompt: `${step.prompt}${text}` })
    const start = el.selectionStart ?? step.prompt.length
    const end = el.selectionEnd ?? start
    const next = `${step.prompt.slice(0, start)}${text}${step.prompt.slice(end)}`
    onChange({ prompt: next })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const variables = [...inputs.map((i) => `{{inputs.${i.key}}}`), ...step.dependsOn.map((d) => `{{steps.${d}.output}}`)]

  return (
    <Card className="p-0 overflow-hidden fade-in">
      <div className="flex items-center gap-3 px-4 py-3 bg-white/60">
        <span className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{index + 1}</span>
        <button className="flex-1 text-left min-w-0" onClick={onToggle}>
          <span className="font-medium truncate">{step.name || step.id}</span>
          <span className="text-[12px] text-ink-muted ml-2">
            {approval ? t('editor.step.type.approval') : (agent?.name ?? '—')}
            {step.dependsOn.length ? ` · ← ${step.dependsOn.join(', ')}` : ''}
          </span>
        </button>
        <div className="flex items-center gap-0.5">
          <button className="btn-ghost btn-sm !px-1.5" onClick={() => onMove(-1)} disabled={index === 0}>
            <ChevronUp size={14} />
          </button>
          <button className="btn-ghost btn-sm !px-1.5" onClick={() => onMove(1)} disabled={index === steps.length - 1}>
            <ChevronDown size={14} />
          </button>
          <button className="btn-ghost btn-sm !px-1.5 hover:!text-status-failed" onClick={onRemove} title={t('editor.step.remove')}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-line">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_1fr] gap-3">
            <Field label={t('editor.step.name')} required>
              <input
                className="input"
                value={step.name}
                onChange={(e) => onChange({ name: e.target.value })}
                onBlur={() => {
                  // derive a readable id from the name once, while the id is still the generated default
                  if (/^step-\d+$/.test(step.id) && step.name.trim() && slugify(step.name) !== 'step') {
                    onChange({ id: ensureId(slugify(step.name), others.map((s) => s.id)) })
                  }
                }}
              />
            </Field>
            <Field label={t('editor.step.id')}>
              <input className="input mono" value={step.id} onChange={(e) => onChange({ id: ensureId(e.target.value.replace(/[^\w-]/g, ''), others.map((s) => s.id)) })} />
            </Field>
            <Field label={t('editor.step.type')}>
              <select className="select" value={approval ? 'approval' : 'agent'} onChange={(e) => onChange({ type: e.target.value === 'approval' ? 'approval' : undefined })}>
                <option value="agent">{t('editor.step.type.agent')}</option>
                <option value="approval">{t('editor.step.type.approval')}</option>
              </select>
            </Field>
          </div>
          {!approval && (
            <Field label={t('editor.step.agent')} required>
              <select className="select" value={step.agentId} onChange={(e) => onChange({ agentId: e.target.value })}>
                <option value="">—</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.model || a.provider}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label={t('editor.step.dependsOn')}>
            {candidates.length === 0 ? (
              <span className="text-[12px] text-ink-muted">{t('editor.step.noDeps')}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {candidates.map((o) => {
                  const on = step.dependsOn.includes(o.id)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onChange({ dependsOn: on ? step.dependsOn.filter((d) => d !== o.id) : [...step.dependsOn, o.id] })}
                      className={`chip !h-7 border transition ${on ? '!bg-ink !text-white border-ink' : '!bg-white border-line hover:border-ink-muted'}`}
                    >
                      {o.name || o.id}
                    </button>
                  )
                })}
              </div>
            )}
          </Field>

          <Field label={approval ? t('editor.step.approvalMessage') : t('editor.step.prompt')} required>
            <textarea ref={promptRef} className="textarea min-h-[120px]" placeholder={approval ? t('editor.step.approvalPlaceholder') : t('editor.step.promptPlaceholder')} value={step.prompt} onChange={(e) => onChange({ prompt: e.target.value })} />
            {variables.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[11px] text-ink-muted">{t('editor.step.insert')}:</span>
                {variables.map((v) => (
                  <button key={v} type="button" className="chip mono hover:bg-accent-soft hover:text-accent" onClick={() => insert(v)}>
                    {v}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {approval ? (
            <Toggle checked={!!step.continueOnError} onChange={(v) => onChange({ continueOnError: v })} label={t('editor.step.continueOnError')} />
          ) : (
            <Field label={t('editor.step.expected')}>
              <input className="input" placeholder={t('editor.step.expectedPlaceholder')} value={step.expectedOutput ?? ''} onChange={(e) => onChange({ expectedOutput: e.target.value })} />
            </Field>
          )}

          {!approval && (
            <button type="button" className="text-[12px] text-ink-soft hover:text-ink underline underline-offset-2" onClick={() => setAdvanced((v) => !v)}>
              {advanced ? '−' : '+'} {t('agents.form.advanced')}
            </button>
          )}
          {advanced && !approval && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl bg-[#f7f7f9] p-3 items-end">
              <Field label={t('common.model')}>
                <input className="input" placeholder={t('editor.step.inherit')} value={step.model ?? ''} onChange={(e) => onChange({ model: e.target.value })} />
              </Field>
              <Field label={t('common.effort')}>
                <select className="select" value={step.effort ?? ''} onChange={(e) => onChange({ effort: (e.target.value || undefined) as Effort | undefined })}>
                  <option value="">{t('editor.step.inherit')}</option>
                  {efforts.map((e) => (
                    <option key={e} value={e}>
                      {t(`effort.${e}` as never)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('editor.step.timeout')}>
                <input className="input" type="number" min={0} placeholder={t('editor.step.inherit')} value={step.timeoutSec ?? ''} onChange={(e) => onChange({ timeoutSec: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
              <Field label={t('editor.step.retries')}>
                <input className="input" type="number" min={0} max={5} value={step.retries ?? 0} onChange={(e) => onChange({ retries: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })} />
              </Field>
              <div className="col-span-2 md:col-span-3">
                <Field label={t('editor.step.workDir')}>
                  <input className="input mono" placeholder={t('editor.step.workDirPlaceholder')} value={step.workDir ?? ''} onChange={(e) => onChange({ workDir: e.target.value || undefined })} />
                </Field>
              </div>
              <div className="col-span-2 md:col-span-1 pb-2">
                <Toggle checked={!!step.continueOnError} onChange={(v) => onChange({ continueOnError: v })} label={t('editor.step.continueOnError')} />
              </div>
              <div className="col-span-2 md:col-span-4">
                <Field label={t('editor.step.check')} hint={t('editor.step.checkPlaceholder')}>
                  <input className="input mono" placeholder="npm test" value={step.check ?? ''} onChange={(e) => onChange({ check: e.target.value || undefined })} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label={t('editor.step.when')} hint={t('editor.step.whenPlaceholder')}>
                  <input className="input mono" placeholder="{{steps.review.output}} contains 'LGTM'" value={step.when ?? ''} onChange={(e) => onChange({ when: e.target.value || undefined })} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label={t('editor.step.assertOutput')} hint={t('editor.step.assertOutputPlaceholder')}>
                  <input className="input mono" placeholder="contains 'FINAL'" value={step.assertOutput ?? ''} onChange={(e) => onChange({ assertOutput: e.target.value || undefined })} />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
