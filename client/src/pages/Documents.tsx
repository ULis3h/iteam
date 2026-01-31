import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, Tag, Calendar, Book, Bug, Code, FileCode, Users } from 'lucide-react'
import Card from '../components/Card'
import type { Document } from '../types'
import { getAuthHeaders } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Documents() {
  const { theme } = useTheme()
  const navigate = useNavigate()
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
          <h1 className={`text-4xl font-bold mb-2 tracking-tight ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-800'
            }`}>
            文档中心
          </h1>
          <p className={`text-lg ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
            }`}>
            团队知识库和文档管理
          </p>
        </div>
        <button
          onClick={() => navigate('/documents/new')}
          className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
        >
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
          <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'kanban' ? 'text-gray-500' : 'text-gray-400'
            }`} />
          <input
            type="text"
            placeholder="搜索文档标题、内容或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${theme === 'kanban'
              ? 'bg-gray-700 text-gray-100 placeholder-gray-500 border border-gray-600'
              : 'gradient-card text-gray-800 placeholder-gray-400'
              }`}
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
                  : theme === 'kanban'
                    ? 'text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 hover:scale-105'
                    : 'text-gray-600 hover:text-gray-800 glass hover:scale-105'
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
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">
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
                onClick={() => navigate(`/documents/${doc.id}`)}
                className={`group relative rounded-2xl p-6 pl-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer overflow-hidden ${theme === 'kanban'
                  ? 'bg-gray-800 border border-gray-700'
                  : 'gradient-card'
                  }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* 分类指示条 */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${categoryInfo.gradient} ${theme === 'kanban' ? 'opacity-80' : 'opacity-100'
                  }`} />

                {/* 文档头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 bg-gradient-to-br ${categoryInfo.gradient} rounded-lg`}>
                        <CategoryIcon className="h-4 w-4 text-white" />
                      </div>
                      <h3 className={`text-xl font-semibold transition-colors ${theme === 'kanban'
                        ? 'text-gray-100 group-hover:text-purple-400'
                        : 'text-gray-800 group-hover:text-purple-600'
                        }`}>
                        {doc.title}
                      </h3>
                    </div>
                    <p className={`line-clamp-2 leading-relaxed ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
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
                        className={`inline-flex items-center px-3 py-1 text-xs rounded-full border ${theme === 'kanban'
                          ? 'bg-gray-700 text-gray-300 border-gray-600'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 文档元信息 */}
                <div className={`flex items-center justify-between text-sm border-t pt-4 ${theme === 'kanban'
                  ? 'text-gray-500 border-gray-700'
                  : 'text-gray-500 border-gray-200'
                  }`}>
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
