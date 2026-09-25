import { useEffect, useState } from 'react'
import { useT } from '../lib/i18n'
import type { WorkflowInput } from '../types'
import { ErrorBanner, Field, Modal } from './ui'

export function RunDialog({ open, name, inputs, onClose, onStart }: { open: boolean; name: string; inputs: WorkflowInput[]; onClose: () => void; onStart: (values: Record<string, string>, runName?: string) => Promise<void> }) {
  const { t } = useT()
  const [values, setValues] = useState<Record<string, string>>({})
  const [runName, setRunName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(Object.fromEntries(inputs.map((i) => [i.key, i.default ?? ''])))
      setRunName('')
      setError(null)
    }
  }, [open, inputs])

  const missing = inputs.some((i) => i.required && !values[i.key]?.trim())

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      await onStart(values, runName.trim() || undefined)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('run.dialog.title', { name })}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" disabled={busy || missing} onClick={start}>
            {t('run.dialog.start')}
          </button>
        </>
      }
    >
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <div className="space-y-4">
        {inputs.length === 0 && <p className="text-[13px] text-ink-soft">{t('run.dialog.noInputs')}</p>}
        {inputs.map((input) => (
          <Field key={input.key} label={input.label || input.key} hint={input.description} required={input.required}>
            {(input.default ?? '').length > 60 ? (
              <textarea className="textarea" value={values[input.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [input.key]: e.target.value }))} />
            ) : (
              <input className="input" value={values[input.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [input.key]: e.target.value }))} />
            )}
          </Field>
        ))}
        <Field label={t('run.dialog.name')}>
          <input className="input" value={runName} onChange={(e) => setRunName(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
