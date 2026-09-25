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
  const zh = locale === 'zh-CN'
  if (m < 1) return zh ? '刚刚' : 'just now'
  if (m < 60) return zh ? `${m} 分钟前` : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return zh ? `${h} 小时前` : `${h}h ago`
  const d = Math.floor(h / 24)
  return zh ? `${d} 天前` : `${d}d ago`
}

export const statusColor = (status: RunStatus | StepStatus): string => {
  switch (status) {
    case 'running':
      return '#3b6cf6'
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
