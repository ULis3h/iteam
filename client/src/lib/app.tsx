import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api'
import { resetSocket } from './socket'
import type { SystemInfo } from '../types'

interface AppState {
  system: SystemInfo | null
  reloadSystem: (refresh?: boolean) => Promise<void>
  needsToken: boolean
  submitToken: (token: string) => Promise<boolean>
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
        } catch {
          setNeedsToken(true)
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
  }, [reloadSystem])

  const value = useMemo<AppState>(
    () => ({
      system,
      reloadSystem,
      needsToken,
      error,
      submitToken: async (token) => {
        setToken(token)
        try {
          await api.verifyToken()
          resetSocket()
          setNeedsToken(false)
          return true
        } catch {
          setToken('')
          return false
        }
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
