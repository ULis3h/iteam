import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import DeviceWorkbench from './pages/DeviceWorkbench'
import Projects from './pages/Projects'
import Documents from './pages/Documents'
import DocumentDetail from './pages/DocumentDetail'
import DocumentEditor from './pages/DocumentEditor'
import Agents from './pages/Agents'
import Workflows from './pages/Workflows'
import Analytics from './pages/Analytics'
import Tasks from './pages/Tasks'
import Test from './pages/Test'
import Login from './pages/Login'
import Register from './pages/Register'
import Topology from './pages/Topology';
import DeviceHUD from './pages/DeviceHUD';
import Layout from './components/Layout'
import { useEffect } from 'react'

function AppContent() {
  const { theme } = useTheme()

  useEffect(() => {
    // Apply theme class to body
    if (theme === 'kanban') {
      document.body.classList.add('theme-kanban')
    } else {
      document.body.classList.remove('theme-kanban')
    }
  }, [theme])

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 受保护路由 */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/devices" element={<Devices />} />
                    <Route path="/device/:deviceId/workbench" element={<DeviceWorkbench />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/documents/new" element={<DocumentEditor />} />
                    <Route path="/documents/:id" element={<DocumentDetail />} />
                    <Route path="/agents" element={<Agents />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/workflows" element={<Workflows />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/topology" element={<Topology />} />
                    <Route path="/device/:id/hud" element={<DeviceHUD />} />
                    <Route path="/test" element={<Test />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
