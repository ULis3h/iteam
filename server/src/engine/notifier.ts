import type { Run } from '@prisma/client'
import { config } from '../config.js'
import { log } from '../logger.js'

/**
 * Outbound notifications for run lifecycle events. Currently a single optional
 * webhook (ITEAM_WEBHOOK_URL) that receives a JSON POST; the web UI gets the
 * same events over the socket and can show browser notifications.
 */
const ICON: Record<string, string> = { succeeded: '✅', failed: '❌', cancelled: '⏹️', waiting: '⏸️' }

/** Payload shape depends on the destination: Slack and Discord incoming webhooks want a single text field. */
export function webhookPayload(event: 'finished' | 'waiting', run: Run, url: string, destination: string): unknown {
  const icon = ICON[run.status] ?? 'ℹ️'
  const headline = event === 'waiting' ? `${icon} ${run.name} is waiting for approval` : `${icon} ${run.name} ${run.status}${run.error ? `: ${run.error}` : ''}`
  const text = `${headline}\n${url}`
  if (/hooks\.slack\.com\//.test(destination)) return { text }
  if (/discord(app)?\.com\/api\/webhooks\//.test(destination)) return { content: text.slice(0, 1900) }
  return {
    event,
    text,
    run: { id: run.id, name: run.name, status: run.status, error: run.error, startedAt: run.startedAt, finishedAt: run.finishedAt },
    url,
    sentAt: new Date().toISOString(),
  }
}

export async function notifyRun(event: 'finished' | 'waiting', run: Run) {
  if (!config.webhookUrl) return
  const payload = webhookPayload(event, run, `${config.publicUrl}/runs/${run.id}`, config.webhookUrl)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(config.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) log.warn(`webhook ${config.webhookUrl} responded ${res.status}`)
  } catch (err) {
    log.warn(`webhook delivery failed: ${(err as Error).message}`)
  }
}
