import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface CardProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: ReactNode
  gradient?: string
  className?: string
}

export default function Card({ title, subtitle, icon: Icon, children, gradient = 'from-blue-400 to-purple-500', className = '' }: CardProps) {
  return (
    <div className={`gradient-card rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* 标题栏 */}
      <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className={`p-2 bg-gradient-to-br ${gradient} rounded-lg`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-white/60">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
