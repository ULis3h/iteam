import { ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Monitor,
  FolderGit2,
  FileText,
  Sparkles,
  LogOut,
  ChevronDown
} from 'lucide-react'
import TeamLogo from './TeamLogo'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: '仪表盘', href: '/', icon: LayoutDashboard, gradient: 'from-blue-400 to-purple-500' },
    { name: '设备管理', href: '/devices', icon: Monitor, gradient: 'from-green-400 to-cyan-500' },
    { name: '项目管理', href: '/projects', icon: FolderGit2, gradient: 'from-orange-400 to-pink-500' },
    { name: '文档中心', href: '/documents', icon: FileText, gradient: 'from-purple-400 to-indigo-500' },
  ]

  const isActive = (href: string) => location.pathname === href

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 动态背景 */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient bg-[length:400%_400%]" />

      {/* 背景装饰 */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-float" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* 顶部导航栏 - 玻璃态效果 */}
      <nav className="sticky top-0 z-50 glass border-b border-white/20 backdrop-blur-xl">
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
                  <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>iTeam</span>
                    <span className="text-lg opacity-60">×</span>
                    <span className="text-sm bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent font-extrabold">∞</span>
                  </h1>
                  <p className="text-xs text-white/70 tracking-wide">一人 · 多设备 · 全协作</p>
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
                        : 'text-white/80 hover:text-white'
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

                    {/* 图标和文字 */}
                    <item.icon className="relative h-4 w-4 mr-2 z-10" />
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
            <div className="flex items-center space-x-4">
              {/* 用户信息 */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-white/90 hidden md:block">
                    {user?.username}
                  </span>
                  <ChevronDown className="h-4 w-4 text-white/70" />
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

              {/* 系统状态 */}
              <div className="hidden md:flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="relative">
                  <div className="h-2.5 w-2.5 bg-green-400 rounded-full animate-ping absolute" />
                  <div className="h-2.5 w-2.5 bg-green-400 rounded-full relative" />
                </div>
                <span className="text-sm font-medium text-white/90">
                  系统运行中
                </span>
              </div>

              {/* 装饰性元素 */}
              <div className="hidden lg:block">
                <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区域 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
        <div className="min-h-[calc(100vh-8rem)]">
          {children}
        </div>
      </main>

      {/* 底部装饰 */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-50" />
    </div>
  )
}
