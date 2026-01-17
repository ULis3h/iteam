import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import Projects from './pages/Projects'
import Documents from './pages/Documents'
import Test from './pages/Test'
import Login from './pages/Login'
import Register from './pages/Register'
import Topology from './pages/Topology';
import DeviceHUD from './pages/DeviceHUD';
import Layout from './components/Layout'

function App() {
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
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/documents" element={<Documents />} />
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

export default App

