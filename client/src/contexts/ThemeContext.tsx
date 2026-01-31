import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ThemeType = 'default' | 'kanban'

interface ThemeContextType {
    theme: ThemeType
    setTheme: (theme: ThemeType) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeType>(() => {
        // 从 localStorage 读取保存的主题
        const savedTheme = localStorage.getItem('app-theme')
        return (savedTheme as ThemeType) || 'default'
    })

    useEffect(() => {
        // 保存主题到 localStorage
        localStorage.setItem('app-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'default' ? 'kanban' : 'default')
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
