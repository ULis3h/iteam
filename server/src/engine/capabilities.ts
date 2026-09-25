import { spawn } from 'node:child_process'
import { PROVIDERS } from './adapters.js'

const which = (bin: string): Promise<string | null> =>
  new Promise((resolve) => {
    const isWin = process.platform === 'win32'
    const child = spawn(isWin ? 'where' : 'sh', isWin ? [bin] : ['-c', `command -v ${bin}`], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    child.stdout.on('data', (c) => (out += c.toString()))
    child.on('error', () => resolve(null))
    child.on('close', (code) => resolve(code === 0 ? out.trim().split('\n')[0] : null))
  })

export interface Capabilities {
  checkedAt: string
  providers: Record<string, { available: boolean; path: string | null }>
}

let cached: Capabilities | null = null

/** Detect which agent CLIs are installed on this machine (used for local agents). */
export async function detectCapabilities(force = false): Promise<Capabilities> {
  if (cached && !force) return cached
  const providers: Capabilities['providers'] = {}
  for (const p of PROVIDERS) {
    if (!p.bin) {
      providers[p.id] = { available: true, path: null }
      continue
    }
    const found = await which(p.bin)
    providers[p.id] = { available: !!found, path: found }
  }
  cached = { checkedAt: new Date().toISOString(), providers }
  return cached
}

export const availableProviderIds = (caps: Capabilities): string[] =>
  Object.entries(caps.providers).filter(([, v]) => v.available).map(([k]) => k)
