import type { RunStatus, StepStatus } from '../types'

export const formatDuration = (start?: string | null, end?: string | null, now = Date.now()): string => {
  if (!start) return '—'
  const ms = (end ? new Date(end).getTime() : now) - new Date(start).getTime()
  if (ms < 0) return '0s'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export const formatTime = (iso?: string | null, locale = 'zh-CN'): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay
    ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : d.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const relativeTime = (iso: string, locale: 'zh-CN' | 'en'): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (m < 1) return rtf.format(0, 'minute')
  if (m < 60) return rtf.format(-m, 'minute')
  const h = Math.floor(m / 60)
  if (h < 24) return rtf.format(-h, 'hour')
  return rtf.format(-Math.floor(h / 24), 'day')
}

export const statusColor = (status: RunStatus | StepStatus): string => {
  switch (status) {
    case 'running':
      return '#3b6cf6'
    case 'waiting':
      return '#7c4dff'
    case 'succeeded':
      return '#1f9d61'
    case 'failed':
      return '#d93a3a'
    case 'cancelled':
      return '#c9820a'
    case 'skipped':
      return '#b0b4bb'
    default:
      return '#9aa0a6'
  }
}

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9_\-一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[一-龥]/g, '')
    .replace(/^-+|-+$/g, '') || 'step'

export const ensureId = (base: string, taken: string[]): string => {
  let id = /^[A-Za-z_]/.test(base) ? base : `s_${base}`
  if (!id || id === 's_') id = 'step'
  let candidate = id
  let n = 2
  while (taken.includes(candidate)) candidate = `${id}-${n++}`
  return candidate
}

export const isTerminal = (status: RunStatus | StepStatus) => ['succeeded', 'failed', 'cancelled', 'skipped'].includes(status)

/** Runs that still need the server (executing) or a person (waiting for approval). */
export const isActive = (status: RunStatus) => status === 'running' || status === 'queued' || status === 'waiting'

/** Darker variants of the status colours that stay legible as small text on a light tint. */
export const statusTextColor = (status: RunStatus | StepStatus): string => {
  switch (status) {
    case 'running':
      return '#2a55c9'
    case 'waiting':
      return '#5b35c7'
    case 'succeeded':
      return '#157a4a'
    case 'failed':
      return '#b83232'
    case 'cancelled':
      return '#8f5a00'
    default:
      return '#5f6368'
  }
}

/** Copy text with a fallback for non-secure (plain http) origins where navigator.clipboard is absent. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
