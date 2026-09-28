import type { Run } from '@prisma/client'
import { config } from '../config.js'
import { log } from '../logger.js'

/**
 * Outbound notifications for run lifecycle events. Currently a single optional
 * webhook (ITEAM_WEBHOOK_URL) that receives a JSON POST; the web UI gets the
 * same events over the socket and can show browser notifications.
 */
export async function notifyRun(event: 'finished' | 'waiting', run: Run) {
  if (!config.webhookUrl) return
  const payload = {
    event,
    run: { id: run.id, name: run.name, status: run.status, error: run.error, startedAt: run.startedAt, finishedAt: run.finishedAt },
    url: `${config.publicUrl}/runs/${run.id}`,
    sentAt: new Date().toISOString(),
  }
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
