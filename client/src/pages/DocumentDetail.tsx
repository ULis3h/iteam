import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Tag, Calendar, User } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { getAuthHeaders } from '../contexts/AuthContext'
import type { Document } from '../types'

export default function DocumentDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { theme } = useTheme()
    const [document, setDocument] = useState<Document | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch(`http://localhost:3000/api/documents/${id}`, {
            headers: getAuthHeaders(),
        })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch document')
                return res.json()
            })
            .then(data => {
                setDocument(data)
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [id])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    if (error || !document) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-500 mb-4">Document Not Found</h2>
                <button
                    onClick={() => navigate('/documents')}
                    className="text-purple-500 hover:text-purple-600 font-medium"
                >
                    Return to Documents
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Back Button */}
            <button
                onClick={() => navigate('/documents')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${theme === 'kanban'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
            >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Documents</span>
            </button>

            {/* Document Content */}
            <div className={`rounded-2xl p-8 shadow-xl ${theme === 'kanban'
                ? 'bg-gray-800 border border-gray-700'
                : 'bg-white/80 backdrop-blur-md border border-white/20'
                }`}>
                {/* Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${theme === 'kanban'
                            ? 'bg-purple-900/30 text-purple-300 border border-purple-800'
                            : 'bg-purple-100 text-purple-700'
                            }`}>
                            {document.category}
                        </span>
                        {document.tags.map((tag, index) => (
                            <span key={index} className={`px-3 py-1 rounded-full text-xs ${theme === 'kanban'
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {tag}
                            </span>
                        ))}
                    </div>

                    <h1 className={`text-4xl font-bold mb-4 ${theme === 'kanban' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                        {document.title}
                    </h1>

                    <div className={`flex items-center space-x-6 text-sm ${theme === 'kanban' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{document.author}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className={`prose max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed ${theme === 'kanban'
                    ? 'prose-invert text-gray-300'
                    : 'text-gray-700'
                    }`}>
                    {document.content}
                </div>
            </div>
        </div>
    )
}
