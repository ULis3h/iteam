import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User, AuthResponse } from '../types'

const API_URL = 'http://localhost:3000/api'

interface AuthContextType {
    user: User | null
    token: string | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, username: string, password: string) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // 初始化时从 localStorage 恢复登录状态
    useEffect(() => {
        const storedToken = localStorage.getItem('token')
        if (storedToken) {
            setToken(storedToken)
            // 验证 token 并获取用户信息
            fetchUser(storedToken)
        } else {
            setIsLoading(false)
        }
    }, [])

    const fetchUser = async (authToken: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            })

            if (response.ok) {
                const userData = await response.json()
                setUser(userData)
                setToken(authToken)
            } else {
                // Token 无效，清除
                localStorage.removeItem('token')
                setToken(null)
                setUser(null)
            }
        } catch (error) {
            console.error('Failed to fetch user:', error)
            localStorage.removeItem('token')
            setToken(null)
            setUser(null)
        } finally {
            setIsLoading(false)
        }
    }

    const login = async (email: string, password: string) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || '登录失败')
        }

        const authData = data as AuthResponse
        localStorage.setItem('token', authData.token)
        setToken(authData.token)
        setUser(authData.user)
    }

    const register = async (email: string, username: string, password: string) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, username, password }),
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || '注册失败')
        }

        const authData = data as AuthResponse
        localStorage.setItem('token', authData.token)
        setToken(authData.token)
        setUser(authData.user)
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// 导出用于 API 请求的 helper 函数
export function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token')
    return token
        ? {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
        : {
            'Content-Type': 'application/json',
        }
}
