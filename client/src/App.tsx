import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorBanner, ErrorBoundary, Spinner } from './components/ui'
import { AppProvider, useApp } from './lib/app'
import { DirtyProvider } from './lib/dirty'
import { I18nProvider, useT } from './lib/i18n'
import { AgentsPage } from './pages/Agents'
import { OverviewPage } from './pages/Overview'
import { RunDetailPage } from './pages/RunDetail'
import { RunsPage } from './pages/Runs'
import { SettingsPage } from './pages/Settings'
import { TokenGate } from './pages/TokenGate'
import { WorkflowEditorPage } from './pages/WorkflowEditor'
import { WorkflowsPage } from './pages/Workflows'

function NotFound() {
  const { t } = useT()
  return (
    <div className="card p-10 text-center">
      <p className="text-[15px] font-medium">{t('app.notFound')}</p>
    </div>
  )
}

function Shell() {
  const { system, needsToken, error, reloadSystem } = useApp()
  const { t } = useT()
  if (error && !system) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <ErrorBanner message={t('app.serverUnreachable', { error })} />
          <button className="btn-primary" onClick={() => void reloadSystem()}>
            {t('app.retry')}
          </button>
        </div>
      </div>
    )
  }
  if (!system) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={22} />
      </div>
    )
  }
  if (needsToken) return <TokenGate />
  return (
    <DirtyProvider message={t('app.unsavedConfirm')}>
      <ErrorBoundary label={t('app.renderError')} reload={t('app.retry')}>
      <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="workflows/new" element={<WorkflowEditorPage />} />
          <Route path="workflows/:id" element={<WorkflowEditorPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route path="runs/:id" element={<RunDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </BrowserRouter>
      </ErrorBoundary>
    </DirtyProvider>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </I18nProvider>
  )
}
