import { io, type Socket } from 'socket.io-client'
import { useEffect, useState } from 'react'
import { getToken } from './api'

let socket: Socket | null = null
const subscribedRuns = new Set<string>()
const reconnectListeners = new Set<() => void>()
const stateListeners = new Set<(connected: boolean) => void>()
const authFailureListeners = new Set<() => void>()

export const onSocketAuthFailure = (fn: () => void) => {
  authFailureListeners.add(fn)
  return () => authFailureListeners.delete(fn)
}
let hadConnection = false

export function getSocket(): Socket {
  if (!socket) {
    // auth is re-evaluated on every (re)connect so a token entered later is picked up
    socket = io('/ui', { auth: (cb) => cb({ token: getToken() }), autoConnect: true, reconnectionDelay: 1000, reconnectionDelayMax: 8000 })
    socket.on('connect', () => {
      // rooms do not survive a reconnect: re-join and let pages refetch what they missed
      for (const runId of subscribedRuns) socket?.emit('run:subscribe', runId)
      if (hadConnection) reconnectListeners.forEach((fn) => fn())
      hadConnection = true
      stateListeners.forEach((fn) => fn(true))
    })
    socket.on('disconnect', () => stateListeners.forEach((fn) => fn(false)))
    socket.on('connect_error', (err) => {
      stateListeners.forEach((fn) => fn(false))
      if (/token/i.test(err.message)) authFailureListeners.forEach((fn) => fn())
    })
  }
  return socket
}

export function resetSocket() {
  socket?.disconnect()
  socket = null
  hadConnection = false
}

export function subscribeRun(runId: string) {
  subscribedRuns.add(runId)
  const s = getSocket()
  if (s.connected) s.emit('run:subscribe', runId)
  return () => {
    subscribedRuns.delete(runId)
    s.emit('run:unsubscribe', runId)
  }
}

/**
 * Subscribe to one or more socket events for the lifetime of the component.
 * With `debounceMs`, bursts of events collapse into one trailing call (for list refetches).
 */
export function useSocketEvent(events: string | string[], handler: (payload: unknown, event: string) => void, debounceMs = 0) {
  useEffect(() => {
    const s = getSocket()
    const list = Array.isArray(events) ? events : [events]
    let timer: ReturnType<typeof setTimeout> | null = null
    const bound = list.map((event) => {
      const fn = (payload: unknown) => {
        if (!debounceMs) return handler(payload, event)
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          timer = null
          handler(payload, event)
        }, debounceMs)
      }
      s.on(event, fn)
      return [event, fn] as const
    })
    return () => {
      if (timer) clearTimeout(timer)
      bound.forEach(([event, fn]) => s.off(event, fn))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(events) ? events.join('|') : events, handler, debounceMs])
}

/** Runs the callback after the socket reconnects (data may have changed while offline). */
export function useReconnect(fn: () => void) {
  useEffect(() => {
    getSocket()
    reconnectListeners.add(fn)
    return () => {
      reconnectListeners.delete(fn)
    }
  }, [fn])
}

export function useConnectionState(): boolean {
  const [connected, setConnected] = useState(() => getSocket().connected)
  useEffect(() => {
    stateListeners.add(setConnected)
    setConnected(getSocket().connected)
    return () => {
      stateListeners.delete(setConnected)
    }
  }, [])
  return connected
}
