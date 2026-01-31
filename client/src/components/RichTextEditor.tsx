import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, Code, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Minus } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface RichTextEditorProps {
    content: string
    onChange: (content: string) => void
    placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder = '开始输入...' }: RichTextEditorProps) {
    const { theme } = useTheme()
    const isDark = theme === 'kanban'

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4 ${isDark
                    ? 'prose-invert text-gray-200'
                    : 'text-gray-800'
                    }`,
            },
        },
    })

    if (!editor) return null

    const ToolbarButton = ({ onClick, isActive, children, title }: { onClick: () => void, isActive?: boolean, children: React.ReactNode, title: string }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-2 rounded-lg transition-colors ${isActive
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : isDark
                    ? 'text-gray-400 hover:bg-gray-600 hover:text-white'
                    : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                }`}
        >
            {children}
        </button>
    )

    return (
        <div>
            {/* Toolbar */}
            <div className={`flex flex-wrap items-center gap-1 p-3 border-b ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="标题 1"
                >
                    <Heading1 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="标题 2"
                >
                    <Heading2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="标题 3"
                >
                    <Heading3 className="h-4 w-4" />
                </ToolbarButton>

                <div className={`w-px h-6 mx-2 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="粗体"
                >
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="斜体"
                >
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive('code')}
                    title="行内代码"
                >
                    <Code className="h-4 w-4" />
                </ToolbarButton>

                <div className={`w-px h-6 mx-2 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="无序列表"
                >
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="有序列表"
                >
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="引用"
                >
                    <Quote className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    title="分隔线"
                >
                    <Minus className="h-4 w-4" />
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />
        </div>
    )
}
