import { storage } from './storage'

const KEY = 'iteam.notify'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

/** Enabled by the user in Settings and granted by the browser. */
export const notificationsEnabled = () => notificationsSupported() && storage.get(KEY) === '1' && Notification.permission === 'granted'

export async function enableNotifications(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  let permission = Notification.permission
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission()
    } catch {
      permission = 'denied'
    }
  }
  if (permission !== 'granted') return 'denied'
  storage.set(KEY, '1', true)
  return 'granted'
}

export const disableNotifications = () => storage.remove(KEY)

export function showNotification(title: string, body: string, tag: string, onClick?: () => void) {
  if (!notificationsEnabled()) return
  try {
    const n = new Notification(title, { body, tag, icon: '/icon-192.png' })
    n.onclick = () => {
      window.focus()
      onClick?.()
      n.close()
    }
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}
