import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../lib/app'
import { useT } from '../lib/i18n'
import type { Agent, AgentInput, Effort, Location, Provider, Runner } from '../types'
import { ErrorBanner, Field, Modal, Toggle } from './ui'

const empty: AgentInput = {
  name: '',
  description: '',
  role: '',
  location: 'local',
  runnerId: null,
  provider: 'claude-code',
  model: '',
  effort: 'medium',
  workDir: '',
  command: '',
  extraArgs: [],
  env: {},
  autoApprove: true,
  timeoutSec: 1800,
  color: '',
}

const toAgentInput = (a: Agent): AgentInput => ({
  name: a.name,
  description: a.description,
  role: a.role,
  location: a.location,
  runnerId: a.runnerId,
  provider: a.provider,
  model: a.model,
  effort: a.effort,
  workDir: a.workDir,
  command: a.command,
  extraArgs: a.extraArgs,
  env: a.env,
  autoApprove: a.autoApprove,
  timeoutSec: a.timeoutSec,
  color: a.color,
})

export function AgentForm({ open, agent, runners, onClose, onSubmit }: { open: boolean; agent: Agent | null; runners: Runner[]; onClose: () => void; onSubmit: (data: AgentInput) => Promise<void> }) {
  const { t } = useT()
  const { system } = useApp()
  const [form, setForm] = useState<AgentInput>(empty)
  const [extraArgsText, setExtraArgsText] = useState('')
  const [envText, setEnvText] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const initial = agent ? toAgentInput(agent) : empty
    setForm(initial)
    setExtraArgsText(initial.extraArgs.join('\n'))
    setEnvText(Object.entries(initial.env).map(([k, v]) => `${k}=${v}`).join('\n'))
    setAdvanced(!!(initial.workDir || initial.extraArgs.length || Object.keys(initial.env).length || !initial.autoApprove))
    setError(null)
  }, [open, agent])

  const providers = system?.providers ?? []
  const spec = providers.find((p) => p.id === form.provider)
  const onlineRunners = runners.filter((r) => r.status === 'online')
  const localCli = system?.capabilities.providers[form.provider]?.available ?? true
  const update = (patch: Partial<AgentInput>) => setForm((f) => ({ ...f, ...patch }))

  const modelOptions = useMemo(() => spec?.models ?? [], [spec])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const env: Record<string, string> = {}
      for (const line of envText.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const idx = trimmed.indexOf('=')
        if (idx <= 0) throw new Error(`invalid env line: ${trimmed}`)
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1)
      }
      await onSubmit({
        ...form,
        name: form.name.trim(),
        extraArgs: extraArgsText.split('\n').map((s) => s.trim()).filter(Boolean),
        env,
        runnerId: form.location === 'remote' ? form.runnerId : null,
      })
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
      title={agent ? t('common.edit') : t('agents.new')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" disabled={busy || !form.name.trim() || (form.location === 'remote' && !form.runnerId) || (form.provider === 'custom' && !form.command.trim())} onClick={submit}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('agents.form.name')} required>
            <input className="input" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. 架构师 / Reviewer" autoFocus />
          </Field>
          <Field label={t('agents.form.description')}>
            <input className="input" value={form.description} onChange={(e) => update({ description: e.target.value })} />
          </Field>
        </div>

        <Field label={t('agents.form.role')}>
          <textarea className="textarea" rows={3} value={form.role} onChange={(e) => update({ role: e.target.value })} placeholder={t('agents.form.rolePlaceholder')} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('agents.form.location')}>
            <div className="flex rounded-xl border border-line p-0.5 bg-white">
              {(['local', 'remote'] as Location[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => update({ location: loc, runnerId: loc === 'remote' ? form.runnerId ?? onlineRunners[0]?.id ?? null : null })}
                  className={`flex-1 h-8 rounded-[10px] text-[13px] font-medium transition ${form.location === loc ? 'bg-ink text-white' : 'text-ink-soft hover:bg-black/5'}`}
                >
                  {loc === 'local' ? t('common.local') : t('common.remote')}
                </button>
              ))}
            </div>
          </Field>
          {form.location === 'remote' && (
            <Field label={t('agents.form.runner')} required hint={runners.length === 0 ? t('agents.form.noRunner') : undefined}>
              <select className="select" value={form.runnerId ?? ''} onChange={(e) => update({ runnerId: e.target.value || null })}>
                <option value="">—</option>
                {runners.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.status === 'online' ? '●' : '○'}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label={t('agents.form.provider')} hint={form.location === 'local' && !localCli ? t('agents.cliMissing') : undefined}>
            <select className="select" value={form.provider} onChange={(e) => update({ provider: e.target.value as Provider })}>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('agents.form.model')}>
            <input className="input" list="model-options" value={form.model} onChange={(e) => update({ model: e.target.value })} placeholder={t('agents.form.modelPlaceholder')} />
            <datalist id="model-options">
              {modelOptions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          <Field label={t('agents.form.effort')} hint={spec && !spec.supportsEffort ? t('agents.form.effortHint') : undefined}>
            <select className="select" value={form.effort} onChange={(e) => update({ effort: e.target.value as Effort })}>
              {(system?.efforts ?? ['low', 'medium', 'high', 'max']).map((e) => (
                <option key={e} value={e}>
                  {t(`effort.${e}` as never)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {form.provider === 'custom' && (
          <Field label={t('agents.form.command')} required hint={t('agents.form.commandHint')}>
            <input className="input mono" value={form.command} onChange={(e) => update({ command: e.target.value })} placeholder={t('agents.form.commandPlaceholder')} />
          </Field>
        )}

        <button type="button" className="text-[12px] text-ink-soft hover:text-ink underline underline-offset-2" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? '−' : '+'} {t('agents.form.advanced')}
        </button>

        {advanced && (
          <div className="space-y-4 rounded-xl bg-[#f7f7f9] p-4">
            <Field label={t('agents.form.workDir')}>
              <input className="input mono" value={form.workDir} onChange={(e) => update({ workDir: e.target.value })} placeholder={t('agents.form.workDirPlaceholder')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('agents.form.extraArgs')}>
                <textarea className="textarea mono min-h-[64px]" rows={2} value={extraArgsText} onChange={(e) => setExtraArgsText(e.target.value)} placeholder={t('agents.form.extraArgsPlaceholder')} />
              </Field>
              <Field label={t('agents.form.env')}>
                <textarea className="textarea mono min-h-[64px]" rows={2} value={envText} onChange={(e) => setEnvText(e.target.value)} placeholder={t('agents.form.envPlaceholder')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <Field label={t('agents.form.timeout')}>
                <input className="input" type="number" min={30} value={form.timeoutSec} onChange={(e) => update({ timeoutSec: Number(e.target.value) || 1800 })} />
              </Field>
              <div className="pb-2">
                <Toggle checked={form.autoApprove} onChange={(v) => update({ autoApprove: v })} label={t('agents.form.autoApprove')} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
