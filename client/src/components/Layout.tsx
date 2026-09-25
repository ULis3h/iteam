import { Bot, LayoutGrid, ListChecks, Settings, Workflow } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../lib/app'
import { useT } from '../lib/i18n'
import { AuroraBackground } from './AuroraBackground'
import { Logo } from './Logo'

export function Layout() {
  const { t, locale, setLocale } = useT()
  const { system } = useApp()
  const nav = [
    { to: '/', label: t('nav.overview'), icon: LayoutGrid, end: true },
    { to: '/agents', label: t('nav.agents'), icon: Bot },
    { to: '/workflows', label: t('nav.workflows'), icon: Workflow },
    { to: '/runs', label: t('nav.runs'), icon: ListChecks },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <div className="min-h-screen relative">
      <AuroraBackground />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden md:flex w-[232px] shrink-0 flex-col px-4 py-5 sticky top-0 h-screen">
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <Logo />
            <div>
              <div className="text-[15px] font-semibold leading-tight">iTeam</div>
              <div className="text-[11px] text-ink-muted leading-tight">{t('app.tagline')}</div>
            </div>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <item.icon size={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto px-2 text-[11px] text-ink-muted flex items-center justify-between">
            <span>v{system?.version ?? '—'}</span>
            <button className="hover:text-ink" onClick={() => setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')}>
              {locale === 'zh-CN' ? 'English' : '中文'}
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="md:hidden sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-line px-4 py-2.5 flex items-center gap-3 overflow-x-auto">
            <Logo size={24} />
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `text-[13px] whitespace-nowrap px-2.5 h-8 inline-flex items-center rounded-full ${isActive ? 'bg-ink text-white' : 'text-ink-soft'}`}>
                {item.label}
              </NavLink>
            ))}
          </header>
          <main className="max-w-[1180px] mx-auto px-4 md:px-8 py-6 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
