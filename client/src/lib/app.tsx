import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError, getToken, setToken, setUnauthorizedHandler } from './api'
import { onSocketAuthFailure, resetSocket } from './socket'
import type { SystemInfo } from '../types'

interface AppState {
  system: SystemInfo | null
  reloadSystem: (refresh?: boolean) => Promise<void>
  needsToken: boolean
  submitToken: (token: string, remember?: boolean) => Promise<boolean>
  clearToken: () => void
  error: string | null
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState<SystemInfo | null>(null)
  const [needsToken, setNeedsToken] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reloadSystem = useCallback(async (refresh = false) => {
    try {
      const info = refresh ? await api.refreshSystem() : await api.system()
      setSystem(info)
      setError(null)
      if (info.authRequired) {
        if (!getToken()) return setNeedsToken(true)
        try {
          await api.verifyToken()
          setNeedsToken(false)
          // /system returns more once authenticated (capabilities, paths)
          setSystem(await api.system())
        } catch (err) {
          // only a real 401 means the token is wrong; network errors keep the current state
          if (err instanceof ApiError && err.status === 401) setNeedsToken(true)
          else setError((err as Error).message)
        }
      } else {
        setNeedsToken(false)
      }
    } catch (err) {
      setError((err as Error).message || 'server unreachable')
    }
  }, [])

  useEffect(() => {
    void reloadSystem()
    setUnauthorizedHandler(() => setNeedsToken(true))
    const off = onSocketAuthFailure(() => setNeedsToken(true))
    return () => {
      off()
    }
  }, [reloadSystem])

  const value = useMemo<AppState>(
    () => ({
      system,
      reloadSystem,
      needsToken,
      error,
      submitToken: async (token, remember = false) => {
        try {
          await api.verifyToken(token) // verify before persisting so a typo cannot evict a working token
        } catch (err) {
          if (err instanceof ApiError && err.status !== 401) setError(err.message)
          return false
        }
        setToken(token, remember)
        resetSocket()
        setNeedsToken(false)
        void reloadSystem()
        return true
      },
      clearToken: () => {
        setToken('')
        resetSocket()
        setNeedsToken(!!system?.authRequired)
      },
    }),
    [system, reloadSystem, needsToken, error],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
