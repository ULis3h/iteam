import { FileUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useT } from '../lib/i18n'
import type { ImportPreview, Run, Workflow, WorkflowTemplate } from '../types'
import { ErrorBanner, Field, InfoBanner, Modal } from './ui'

const FORMAT_DOC = 'https://github.com/ULis3h/iteam/blob/master/docs/workflow-format.md'

export function ImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: (workflow: Workflow, run: Run | null) => void }) {
  const { t } = useT()
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ workflow: Workflow; run: Run | null; createdAgents: Array<{ id: string; name: string; defaulted: boolean }>; warnings: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setContent('')
      setPreview(null)
      setError(null)
      setResult(null)
      setInputs({})
      api.templates().then(setTemplates).catch(() => setTemplates([]))
    }
  }, [open])

  useEffect(() => {
    if (!content.trim()) return setPreview(null)
    let stale = false
    const handle = setTimeout(() => {
      api
        .previewImport(content)
        .then((p) => {
          if (stale) return
          setPreview(p)
          setInputs(Object.fromEntries((p.inputs ?? []).map((i) => [i.key, i.default ?? ''])))
        })
        .catch((e) => !stale && setPreview({ ok: false, error: e.message }))
    }, 350)
    return () => {
      stale = true
      clearTimeout(handle)
    }
  }, [content])

  const submit = async (run: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.importWorkflow(content, run, run ? inputs : undefined)
      const summary = { workflow: res.workflow, run: res.run, createdAgents: res.createdAgents, warnings: (res as { warnings?: string[] }).warnings ?? [] }
      if (summary.createdAgents.length || summary.warnings.length) setResult(summary)
      else {
        onImported(res.workflow, res.run)
        onClose()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const missingRequired = (preview?.inputs ?? []).filter((i) => i.required && !inputs[i.key]?.trim())
  const canRun = !!preview?.ok && missingRequired.length === 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('import.title')}
      wide
      footer={
        result ? (
          <>
            <button
              className="btn-secondary"
              onClick={() => {
                onImported(result.workflow, null)
                onClose()
              }}
            >
              {t('import.openWorkflow')}
            </button>
            {result.run && (
              <button
                className="btn-primary"
                onClick={() => {
                  onImported(result.workflow, result.run)
                  onClose()
                }}
              >
                {t('import.openRun')}
              </button>
            )}
          </>
        ) : (
          <>
            <a href={FORMAT_DOC} target="_blank" rel="noreferrer" className="text-[12px] text-ink-soft hover:text-ink mr-auto underline underline-offset-2">
              {t('import.format')}
            </a>
            <button className="btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button className="btn-secondary" disabled={busy || !preview?.ok} onClick={() => submit(false)}>
              {t('import.submit')}
            </button>
            <button className="btn-primary" disabled={busy || !canRun} onClick={() => submit(true)} title={missingRequired.length ? missingRequired.map((i) => i.label || i.key).join(', ') : undefined}>
              {t('import.submitRun')}
            </button>
          </>
        )
      }
    >
      <ErrorBanner message={error} onClose={() => setError(null)} />
      {result && (
        <div className="space-y-3 text-[13px]">
          <InfoBanner>
            <span className="font-medium">{t('import.done')}</span> · {result.workflow.name}
          </InfoBanner>
          {result.createdAgents.length > 0 && (
            <div>
              <div className="label">{t('import.createdAgents')}</div>
              <ul className="space-y-1">
                {result.createdAgents.map((a) => (
                  <li key={a.id}>
                    {a.name} {a.defaulted && <span className="text-status-cancelled">{t('import.defaultedAgent')}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div>
              <div className="label">{t('import.warnings')}</div>
              <ul className="list-disc pl-5 space-y-0.5 text-[#8f5a00]">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {!result && (
        <>
      <p className="text-[13px] text-ink-soft mb-3">{t('import.desc')}</p>
      {templates.length > 0 && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="label !mb-0">{t('import.templates')}</span>
            <span className="text-[11px] text-ink-muted">{t('import.templates.hint')}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setContent(tpl.content)}
                className={`text-left rounded-xl border p-3 bg-white hover:border-ink transition ${content === tpl.content ? 'border-ink' : 'border-line'}`}
              >
                <div className="font-medium text-[13px] truncate">{tpl.name}</div>
                <div className="text-[11px] text-ink-soft line-clamp-2 mt-0.5 min-h-[2.4em]">{tpl.description || '—'}</div>
                <div className="text-[11px] text-ink-muted mt-1.5">{t('import.templates.stats', { steps: tpl.steps, stages: tpl.stages, agents: tpl.agents.length })}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="label !mb-0">YAML / JSON</span>
            <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
              <FileUp size={13} /> {t('import.chooseFile')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".yaml,.yml,.json,.txt"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) setContent(await file.text())
                e.target.value = ''
              }}
            />
          </div>
          <textarea className="textarea mono min-h-[360px]" placeholder={t('import.placeholder')} value={content} onChange={(e) => setContent(e.target.value)} spellCheck={false} />
        </div>
        <div className="rounded-xl bg-[#f7f7f9] p-4 text-[13px] min-h-[200px]">
          <div className="font-medium mb-2">{t('import.preview')}</div>
          {!preview && <p className="text-ink-muted">—</p>}
          {preview && !preview.ok && <p className="text-status-failed break-words">{preview.error}</p>}
          {preview?.ok && (
            <div className="space-y-3">
              <div>
                <div className="font-semibold">{preview.name}</div>
                {preview.description && <div className="text-ink-soft text-[12px]">{preview.description}</div>}
              </div>
              <div>
                <div className="text-[11px] text-ink-muted mb-1">{t('common.steps')}</div>
                <ol className="space-y-1">
                  {preview.stages?.map((stage, i) => (
                    <li key={i} className="flex flex-wrap gap-1 items-center">
                      <span className="text-[11px] text-ink-muted w-5">{i + 1}.</span>
                      {stage.map((id) => {
                        const step = preview.steps?.find((s) => s.id === id)
                        return (
                          <span key={id} className="chip !bg-white border border-line">
                            {step?.name ?? id} <span className="text-ink-muted">· {step?.agent}</span>
                          </span>
                        )
                      })}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="text-[11px] text-ink-muted mb-1">{t('import.agents')}</div>
                <ul className="space-y-1">
                  {preview.agents?.map((a) => (
                    <li key={a.name}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{a.name}</span>
                        <span className={`text-[11px] ${a.status === 'existing' ? 'text-status-success' : a.status === 'create' ? 'text-accent' : 'text-status-cancelled'}`}>{t(`import.agent.${a.status}` as never)}</span>
                      </div>
                      {a.detail && (
                        <div className={`text-[11px] mono break-all ${a.detail.command ? 'text-status-cancelled' : 'text-ink-muted'}`}>
                          {a.detail.provider === 'custom' ? `${t('import.customCommand')}: ${a.detail.command}` : `${a.detail.provider}${a.detail.model ? ` / ${a.detail.model}` : ''}`}
                          {' · '}
                          {a.detail.autoApprove ? t('import.autoApprove') : t('import.manualApprove')}
                          {a.detail.workDir ? ` · ${a.detail.workDir}` : ''}
                          {a.detail.envKeys.length ? ` · env: ${a.detail.envKeys.join(', ')}` : ''}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              {(preview.inputs?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[11px] text-ink-muted mb-1">{t('import.inputs')}</div>
                  <div className="space-y-2">
                    {preview.inputs?.map((i) => (
                      <Field key={i.key} label={i.label || i.key} required={i.required} hint={i.description}>
                        <input className="input" value={inputs[i.key] ?? ''} onChange={(e) => setInputs((v) => ({ ...v, [i.key]: e.target.value }))} />
                      </Field>
                    ))}
                  </div>
                </div>
              )}
              {(preview.warnings?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[11px] text-ink-muted mb-1">{t('editor.warnings')}</div>
                  <ul className="list-disc pl-4 text-[12px] text-[#8f5a00] space-y-0.5">
                    {preview.warnings?.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </Modal>
  )
}
