import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface DirtyState {
  dirty: boolean
  setDirty: (v: boolean) => void
  /** Ask before leaving when there are unsaved changes. Returns true when navigation may proceed. */
  confirmLeave: () => boolean
}

const DirtyContext = createContext<DirtyState | null>(null)

export function DirtyProvider({ children, message }: { children: ReactNode; message: string }) {
  const [dirty, setDirtyState] = useState(false)
  const dirtyRef = useRef(false)
  const setDirty = useCallback((v: boolean) => {
    dirtyRef.current = v
    setDirtyState(v)
  }, [])
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])
  const value = useMemo<DirtyState>(
    () => ({
      dirty,
      setDirty,
      confirmLeave: () => {
        if (!dirtyRef.current) return true
        const ok = window.confirm(message)
        if (ok) setDirty(false)
        return ok
      },
    }),
    [dirty, setDirty, message],
  )
  return <DirtyContext.Provider value={value}>{children}</DirtyContext.Provider>
}

export function useDirty(): DirtyState {
  const ctx = useContext(DirtyContext)
  if (!ctx) throw new Error('useDirty must be used inside DirtyProvider')
  return ctx
}
