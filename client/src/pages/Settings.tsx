import { Check, Copy, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Card, Field, PageHeader, Section } from '../components/ui'
import { useApp } from '../lib/app'
import { getToken } from '../lib/api'
import { useT } from '../lib/i18n'

export function SettingsPage() {
  const { t, locale, setLocale } = useT()
  const { system, reloadSystem, submitToken, clearToken } = useApp()
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)

  const origin = window.location.origin.replace(/:5173$/, ':3000')
  const runnerCmd = `git clone https://github.com/ULis3h/iteam.git && cd iteam/runner && npm install\nnode bin/iteam-runner.js --server ${origin}${system?.authRequired ? ' --token <ITEAM_TOKEN>' : ''} --name my-machine`

  const copy = async () => {
    await navigator.clipboard.writeText(runnerCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <PageHeader title={t('settings.title')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t('settings.server')}>
          <Card className="p-5 space-y-3 text-[13px]">
            <Row label={t('settings.version')} value={system?.version ?? '—'} />
            <Row label={t('settings.auth')} value={system?.authRequired ? t('settings.auth.on') : t('settings.auth.off')} />
            <Row label={t('settings.maxParallel')} value={String(system?.maxParallel ?? '—')} />
            <Row label={t('settings.workDir')} value={<span className="mono break-all">{system?.defaultWorkDir ?? '—'}</span>} />
            <Row
              label={t('settings.language')}
              value={
                <select className="select w-auto" value={locale} onChange={(e) => setLocale(e.target.value as 'zh-CN' | 'en')}>
                  <option value="zh-CN">中文</option>
                  <option value="en">English</option>
                </select>
              }
            />
          </Card>
        </Section>

        <Section
          title={t('settings.cli')}
          actions={
            <button
              className="btn-secondary btn-sm"
              disabled={checking}
              onClick={async () => {
                setChecking(true)
                await reloadSystem(true)
                setChecking(false)
              }}
            >
              <RefreshCw size={13} className={checking ? 'animate-spin' : ''} /> {t('settings.cli.recheck')}
            </button>
          }
        >
          <Card className="p-5 space-y-2.5 text-[13px]">
            {system?.providers
              .filter((p) => p.bin)
              .map((p) => {
                const cap = system.capabilities.providers[p.id]
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-medium">{p.label}</span>
                      <span className="text-ink-muted ml-2 mono">{p.bin}</span>
                    </div>
                    <span className={`chip ${cap?.available ? '!bg-green-50 !text-status-success' : '!bg-amber-50 !text-status-cancelled'}`}>
                      {cap?.available ? t('settings.cli.available') : t('settings.cli.missing')}
                    </span>
                  </div>
                )
              })}
          </Card>
        </Section>

        <Section title={t('settings.runner')} description={t('settings.runner.desc')}>
          <Card className="p-5">
            <pre className="mono whitespace-pre-wrap break-all bg-[#f7f7f9] rounded-xl p-3 text-ink-soft">{runnerCmd}</pre>
            <button className="btn-secondary btn-sm mt-3" onClick={copy}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t('common.copied') : t('common.copy')}
            </button>
          </Card>
        </Section>

        {system?.authRequired && (
          <Section title={t('settings.token.title')}>
            <Card className="p-5 space-y-3">
              <Field label={t('settings.auth')}>
                <input className="input" type="password" placeholder={getToken() ? '••••••••' : t('token.placeholder')} value={token} onChange={(e) => setToken(e.target.value)} />
              </Field>
              <div className="flex gap-2">
                <button className="btn-primary btn-sm" disabled={!token.trim()} onClick={() => void submitToken(token.trim()).then(() => setToken(''))}>
                  {t('settings.token.update')}
                </button>
                <button className="btn-secondary btn-sm" onClick={clearToken}>
                  {t('settings.token.clear')}
                </button>
              </div>
            </Card>
          </Section>
        )}

        <Section title={t('settings.docs')}>
          <Card className="p-5 text-[13px] space-y-1.5">
            <a className="text-accent hover:underline block" href="https://github.com/ULis3h/iteam/blob/master/docs/quickstart.md" target="_blank" rel="noreferrer">
              docs/quickstart.md
            </a>
            <a className="text-accent hover:underline block" href="https://github.com/ULis3h/iteam/blob/master/docs/workflow-format.md" target="_blank" rel="noreferrer">
              docs/workflow-format.md
            </a>
            <a className="text-accent hover:underline block" href="https://github.com/ULis3h/iteam/blob/master/docs/runner.md" target="_blank" rel="noreferrer">
              docs/runner.md
            </a>
          </Card>
        </Section>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-ink-soft shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
