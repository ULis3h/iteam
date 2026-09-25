import { FileUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useT } from '../lib/i18n'
import type { ImportPreview, Run, Workflow } from '../types'
import { ErrorBanner, Modal } from './ui'

const FORMAT_DOC = 'https://github.com/ULis3h/iteam/blob/master/docs/workflow-format.md'

export function ImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: (workflow: Workflow, run: Run | null) => void }) {
  const { t } = useT()
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setContent('')
      setPreview(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!content.trim()) return setPreview(null)
    const handle = setTimeout(() => {
      api.previewImport(content).then(setPreview).catch((e) => setPreview({ ok: false, error: e.message }))
    }, 350)
    return () => clearTimeout(handle)
  }, [content])

  const submit = async (run: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const inputs = run ? Object.fromEntries((preview?.inputs ?? []).map((i) => [i.key, i.default ?? ''])) : undefined
      const result = await api.importWorkflow(content, run, inputs)
      onImported(result.workflow, result.run)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const canRun = !!preview?.ok && !(preview.inputs ?? []).some((i) => i.required && !i.default)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('import.title')}
      wide
      footer={
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
          <button className="btn-primary" disabled={busy || !canRun} onClick={() => submit(true)}>
            {t('import.submitRun')}
          </button>
        </>
      }
    >
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <p className="text-[13px] text-ink-soft mb-3">{t('import.desc')}</p>
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
                    <li key={a.name} className="flex items-center justify-between gap-2">
                      <span>{a.name}</span>
                      <span className={`text-[11px] ${a.status === 'existing' ? 'text-status-success' : a.status === 'create' ? 'text-accent' : 'text-status-cancelled'}`}>{t(`import.agent.${a.status}` as never)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {(preview.inputs?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[11px] text-ink-muted mb-1">{t('editor.inputs')}</div>
                  <ul className="space-y-0.5">
                    {preview.inputs?.map((i) => (
                      <li key={i.key} className="mono text-[12px]">
                        {i.key}
                        {i.required ? <span className="text-status-failed">*</span> : ''} {i.default ? <span className="text-ink-muted">= {i.default}</span> : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
