import { useState, useEffect } from 'react'
import { FileText, Plus, Search, Tag, Calendar, Book, Bug, Code, FileCode, Users } from 'lucide-react'
import Card from '../components/Card'
import type { Document } from '../types'
import { getAuthHeaders } from '../contexts/AuthContext'

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetch('http://localhost:3000/api/documents', {
      headers: getAuthHeaders(),
    })
      .then(res => {
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setDocuments(data)
        }
      })
      .catch(console.error)
  }, [])

  const categories = [
    { id: 'all', label: '全部', icon: Book, gradient: 'from-gray-400 to-gray-600' },
    { id: 'standard', label: '开发规范', icon: Code, gradient: 'from-blue-400 to-blue-600' },
    { id: 'tech', label: '技术积累', icon: FileCode, gradient: 'from-purple-400 to-purple-600' },
    { id: 'bug', label: 'Bug修复', icon: Bug, gradient: 'from-red-400 to-red-600' },
    { id: 'role-skill', label: 'Agent技能', icon: Users, gradient: 'from-orange-400 to-orange-600' },
    { id: 'other', label: '其他', icon: FileText, gradient: 'from-green-400 to-green-600' },
  ]

  const getCategoryInfo = (category: string) => {
    return categories.find((c) => c.id === category) || categories[0]
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      searchQuery === '' ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getCategoryCount = (category: string) => {
    if (category === 'all') return documents.length
    return documents.filter((doc) => doc.category === category).length
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            文档中心
          </h1>
          <p className="text-white/70 text-lg">
            团队知识库和文档管理
          </p>
        </div>
        <button className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-shine bg-[length:200%_100%] group-hover:animate-shine" />
          <div className="relative flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>新建文档</span>
          </div>
        </button>
      </div>

      {/* 搜索框 */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            type="text"
            placeholder="搜索文档标题、内容或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 gradient-card rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {categories.map((category) => {
          const Icon = category.icon
          const isActive = selectedCategory === category.id
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                group relative overflow-hidden px-5 py-2.5 rounded-xl font-medium transition-all duration-300
                ${isActive
                  ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg scale-105`
                  : 'text-white/70 hover:text-white glass hover:scale-105'
                }
              `}
            >
              <div className="relative flex items-center space-x-2">
                <Icon className="h-4 w-4" />
                <span>{category.label}</span>
                <span className="text-xs opacity-75">
                  ({getCategoryCount(category.id)})
                </span>
              </div>
              {isActive && (
                <div className="absolute inset-0 bg-gradient-shine bg-[length:200%_100%] animate-shine" />
              )}
            </button>
          )
        })}
      </div>

      {/* 文档列表 */}
      <div className="grid grid-cols-1 gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        {filteredDocuments.length === 0 ? (
          <Card title="暂无文档" icon={FileText} gradient="from-gray-400 to-gray-600">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">
                {searchQuery ? '未找到匹配的文档' : '暂无文档'}
              </p>
            </div>
          </Card>
        ) : (
          filteredDocuments.map((doc, index) => {
            const categoryInfo = getCategoryInfo(doc.category)
            const CategoryIcon = categoryInfo.icon
            return (
              <div
                key={doc.id}
                className="group gradient-card rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer overflow-hidden"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* 分类指示条 */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${categoryInfo.gradient}`} />

                {/* 文档头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 bg-gradient-to-br ${categoryInfo.gradient} rounded-lg`}>
                        <CategoryIcon className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {doc.title}
                      </h3>
                    </div>
                    <p className="text-white/60 line-clamp-2 leading-relaxed">
                      {doc.content}
                    </p>
                  </div>
                </div>

                {/* 标签 */}
                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {doc.tags.map((tag: string, tagIndex: number) => (
                      <span
                        key={tagIndex}
                        className="inline-flex items-center px-3 py-1 text-xs bg-white/10 text-white/80 rounded-full border border-white/10"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 文档元信息 */}
                <div className="flex items-center justify-between text-sm text-white/50 border-t border-white/10 pt-4">
                  <div className="flex items-center space-x-4">
                    <span>作者: {doc.author}</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(doc.createdAt).toLocaleDateString('zh-CN')}</span>
                    </span>
                  </div>
                  {new Date(doc.updatedAt).getTime() !== new Date(doc.createdAt).getTime() && (
                    <span className="text-xs">
                      更新: {new Date(doc.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>

                {/* 悬停光泽效果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
