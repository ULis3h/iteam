import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { getAuthHeaders } from '../contexts/AuthContext'
import RichTextEditor from '../components/RichTextEditor'

export default function DocumentEditor() {
    const navigate = useNavigate()
    const { theme } = useTheme()
    const isDark = theme === 'kanban'

    const [doc, setDoc] = useState({
        title: '',
        content: '',
        category: 'tech',
        tags: '',
        author: 'Admin'
    })
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!doc.title.trim() || !doc.content.trim()) return
        setSaving(true)
        try {
            const tagsArray = doc.tags.split(',').map(t => t.trim()).filter(t => t)
            const res = await fetch('http://localhost:3000/api/documents', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: doc.title,
                    content: doc.content,
                    category: doc.category,
                    tags: tagsArray,
                    author: doc.author,
                }),
            })
            if (!res.ok) throw new Error('Failed to create document')
            navigate('/documents')
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const categories = [
        { id: 'standard', label: '开发规范' },
        { id: 'tech', label: '技术积累' },
        { id: 'bug', label: 'Bug修复' },
        { id: 'role-skill', label: 'Agent技能' },
        { id: 'other', label: '其他' },
    ]

    return (
        <div className="space-y-6">
            {/* Page Header - matches other pages */}
            <div className="flex items-center justify-between animate-slide-up">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/documents')}
                        className={`p-2 rounded-xl transition-all duration-200 ${isDark
                                ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                            }`}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className={`text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent`}>
                            新建文档
                        </h1>
                        <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            创建技术文档、开发规范或问题记录
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || !doc.title.trim() || !doc.content.trim()}
                    className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <div className="absolute inset-0 bg-gradient-shine bg-[length:200%_100%] group-hover:animate-shine" />
                    <div className="relative flex items-center space-x-2">
                        <Save className="h-5 w-5" />
                        <span>{saving ? '保存中...' : '保存文档'}</span>
                    </div>
                </button>
            </div>

            {/* Main Content - using gradient-card like other pages */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className={`rounded-2xl p-6 ${isDark
                        ? 'bg-gray-800/50 backdrop-blur-xl border border-gray-700/50'
                        : 'gradient-card'
                    }`}>
                    {/* Title Input */}
                    <input
                        type="text"
                        value={doc.title}
                        onChange={(e) => setDoc(prev => ({ ...prev, title: e.target.value }))}
                        className={`w-full text-2xl font-bold bg-transparent border-0 focus:outline-none focus:ring-0 mb-6 ${isDark
                                ? 'text-gray-100 placeholder-gray-600'
                                : 'text-gray-900 placeholder-gray-400'
                            }`}
                        placeholder="输入文档标题..."
                    />

                    {/* Meta Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Category */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                分类
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setDoc(prev => ({ ...prev, category: cat.id }))}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${doc.category === cat.id
                                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                                                : isDark
                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                标签 (逗号分隔)
                            </label>
                            <input
                                type="text"
                                value={doc.tags}
                                onChange={(e) => setDoc(prev => ({ ...prev, tags: e.target.value }))}
                                className={`w-full px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all ${isDark
                                        ? 'bg-gray-700/50 text-gray-100 placeholder-gray-500 border border-gray-600'
                                        : 'bg-white/50 text-gray-900 placeholder-gray-400 border border-gray-200'
                                    }`}
                                placeholder="react, typescript, api"
                            />
                            {doc.tags && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {doc.tags.split(',').map((tag, idx) => tag.trim() && (
                                        <span
                                            key={idx}
                                            className={`px-2 py-0.5 rounded text-xs font-medium ${isDark
                                                    ? 'bg-purple-500/20 text-purple-300'
                                                    : 'bg-purple-100 text-purple-700'
                                                }`}
                                        >
                                            #{tag.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Editor */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            内容
                        </label>
                        <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-white/50'
                            }`}>
                            <RichTextEditor
                                content={doc.content}
                                onChange={(content) => setDoc(prev => ({ ...prev, content }))}
                                placeholder="开始编写文档内容..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
