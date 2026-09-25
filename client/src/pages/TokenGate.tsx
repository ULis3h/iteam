import { useState } from 'react'
import { AuroraBackground } from '../components/AuroraBackground'
import { Logo } from '../components/Logo'
import { useApp } from '../lib/app'
import { useT } from '../lib/i18n'

export function TokenGate() {
  const { t } = useT()
  const { submitToken } = useApp()
  const [token, setToken] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    const ok = await submitToken(token.trim())
    setBusy(false)
    setInvalid(!ok)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuroraBackground />
      <form
        className="card relative z-10 w-full max-w-sm p-8 bg-white fade-in"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="flex items-center gap-2.5 mb-5">
          <Logo />
          <span className="text-[15px] font-semibold">iTeam</span>
        </div>
        <h1 className="text-[18px] font-semibold mb-1">{t('token.title')}</h1>
        <p className="text-ink-soft text-[13px] mb-5">{t('token.desc')}</p>
        <input className="input mb-3" type="password" autoFocus placeholder={t('token.placeholder')} value={token} onChange={(e) => setToken(e.target.value)} />
        {invalid && <p className="text-status-failed text-[12px] mb-3">{t('token.invalid')}</p>}
        <button className="btn-primary w-full" disabled={!token.trim() || busy} type="submit">
          {t('token.submit')}
        </button>
      </form>
    </div>
  )
}
