import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorBanner, Spinner } from './components/ui'
import { AppProvider, useApp } from './lib/app'
import { I18nProvider } from './lib/i18n'
import { AgentsPage } from './pages/Agents'
import { OverviewPage } from './pages/Overview'
import { RunDetailPage } from './pages/RunDetail'
import { RunsPage } from './pages/Runs'
import { SettingsPage } from './pages/Settings'
import { TokenGate } from './pages/TokenGate'
import { WorkflowEditorPage } from './pages/WorkflowEditor'
import { WorkflowsPage } from './pages/Workflows'

function Shell() {
  const { system, needsToken, error } = useApp()
  if (error && !system) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <ErrorBanner message={`${error} — is the server running on port 3000?`} />
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
        </Route>
      </Routes>
    </BrowserRouter>
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
