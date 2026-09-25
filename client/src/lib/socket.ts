import { io, type Socket } from 'socket.io-client'
import { useEffect } from 'react'
import { getToken } from './api'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/ui', { transports: ['websocket'], auth: { token: getToken() }, autoConnect: true })
  }
  return socket
}

export function resetSocket() {
  socket?.disconnect()
  socket = null
}

/** Subscribe to one or more socket events for the lifetime of the component. */
export function useSocketEvent(events: string | string[], handler: (payload: unknown, event: string) => void) {
  useEffect(() => {
    const s = getSocket()
    const list = Array.isArray(events) ? events : [events]
    const bound = list.map((event) => {
      const fn = (payload: unknown) => handler(payload, event)
      s.on(event, fn)
      return [event, fn] as const
    })
    return () => bound.forEach(([event, fn]) => s.off(event, fn))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(events) ? events.join('|') : events, handler])
}
