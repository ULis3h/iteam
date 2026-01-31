import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Monitor,
  FolderGit2,
  FileText,
  LogOut,
  ChevronDown,
  Network,
  Palette,
  Bot,
  Workflow
} from 'lucide-react'
import TeamLogo from './TeamLogo'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import ParticleBackground from './ParticleBackground'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: '仪表盘', href: '/', icon: LayoutDashboard, gradient: 'from-blue-400 to-purple-500' },
    { name: '设备', href: '/devices', icon: Monitor, gradient: 'from-green-400 to-cyan-500' },
    { name: 'Agent', href: '/agents', icon: Bot, gradient: 'from-yellow-400 to-orange-500' },
    { name: '工作流', href: '/workflows', icon: Workflow, gradient: 'from-pink-400 to-rose-500' },
    { name: '项目', href: '/projects', icon: FolderGit2, gradient: 'from-orange-400 to-pink-500' },
    { name: '文档', href: '/documents', icon: FileText, gradient: 'from-purple-400 to-indigo-500' },
    { name: '拓扑', href: '/topology', icon: Network, gradient: 'from-cyan-400 to-blue-500' },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 动态背景 - 根据主题切换 */}
      {theme === 'default' ? (
        <ParticleBackground />
      ) : (
        <div className="fixed inset-0 bg-gray-800" />
      )}

      {/* 顶部导航栏 - 根据主题切换样式 */}
      <nav className={`sticky top-0 z-50 backdrop-blur-xl border-b shadow-sm ${theme === 'kanban'
        ? 'bg-gray-900/90 border-gray-700'
        : 'bg-white/80 border-gray-200/50'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex items-center space-x-3 animate-scale-in">
                <div className="relative group">
                  {/* 发光背景 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Logo容器 */}
                  <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 p-3 rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <TeamLogo className="h-8 w-8 text-white" />
                  </div>

                  {/* 装饰性圆点 */}
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white shadow-lg animate-pulse" />
                </div>

                <div>
                  <h1 className={`text-2xl font-bold tracking-tight flex items-center space-x-2 ${theme === 'kanban' ? 'text-white' : 'text-gray-800'
                    }`}>
                    <span>iTeam</span>
                    <span className="text-lg opacity-60">×</span>
                    <span className="text-sm bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent font-extrabold">∞</span>
                  </h1>
                  <p className={`text-xs tracking-wide ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-500'
                    }`}>一人 · 多设备 · 全协作</p>
                </div>
              </div>

              {/* 导航链接 */}
              <div className="hidden lg:ml-12 lg:flex lg:space-x-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      group relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl
                      transition-all duration-300 overflow-hidden
                      ${isActive(item.href)
                        ? 'text-white'
                        : theme === 'kanban'
                          ? 'text-gray-300 hover:text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }
                    `}
                  >
                    {/* 激活状态的背景 */}
                    {isActive(item.href) && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-90 rounded-xl`} />
                    )}

                    {/* 悬停效果 */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0
                      group-hover:opacity-70 transition-opacity duration-300 rounded-xl
                    `} />

                    {/* 文字 */}
                    <span className="relative z-10">{item.name}</span>

                    {/* 光泽效果 */}
                    {isActive(item.href) && (
                      <div className="absolute inset-0 bg-gradient-shine bg-[length:200%_100%] animate-shine rounded-xl" />
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* 右侧状态 */}
            <div className="flex items-center space-x-4 ml-auto">

              {/* 主题切换按钮 */}
              <button
                onClick={toggleTheme}
                className={`hidden lg:flex items-center justify-center h-10 w-10 rounded-full transition-colors ${theme === 'kanban'
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                title={theme === 'kanban' ? '切换到默认主题' : '切换到看板主题'}
              >
                <Palette className="h-5 w-5 text-yellow-500" />
              </button>

              {/* 系统状态 */}
              <div className={`hidden md:flex items-center space-x-2 px-4 py-2 rounded-full ${theme === 'kanban' ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                <div className="relative">
                  <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-ping absolute" />
                  <div className="h-2.5 w-2.5 bg-green-500 rounded-full relative" />
                </div>
                <span className={`text-sm font-medium ${theme === 'kanban' ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                  系统运行中
                </span>
              </div>

              {/* 用户信息 */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-colors ${theme === 'kanban'
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className={`text-sm font-medium hidden md:block ${theme === 'kanban' ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                    {user?.username}
                  </span>
                  <ChevronDown className={`h-4 w-4 ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                </button>

                {/* 下拉菜单 */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav >

      {/* 主内容区域 */}
      < main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up" >
        <div className="min-h-[calc(100vh-8rem)]">
          {children}
        </div>
      </main >

      {/* 底部装饰 */}
      < div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-50" />
    </div >
  )
}
