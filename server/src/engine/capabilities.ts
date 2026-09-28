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

const version = (bin: string): Promise<string | null> =>
  new Promise((resolve) => {
    let out = ''
    let child
    try {
      child = spawn(bin, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
    } catch {
      return resolve(null)
    }
    const timer = setTimeout(() => child.kill('SIGKILL'), 8000)
    child.stdout.on('data', (c) => (out += c.toString()))
    child.stderr.on('data', (c) => (out += c.toString()))
    child.on('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
    child.on('close', () => {
      clearTimeout(timer)
      const line = out.trim().split('\n').find((l) => /\d+\.\d+/.test(l)) ?? out.trim().split('\n')[0]
      resolve(line ? line.trim().slice(0, 80) : null)
    })
  })

export interface Capabilities {
  checkedAt: string
  providers: Record<string, { available: boolean; path: string | null; version?: string | null }>
}

let cached: Capabilities | null = null

/** Detect which agent CLIs are installed on this machine (used for local agents). */
export async function detectCapabilities(force = false): Promise<Capabilities> {
  if (cached && !force) return cached
  const providers: Capabilities['providers'] = {}
  await Promise.all(
    PROVIDERS.map(async (p) => {
      if (!p.bin) {
        providers[p.id] = { available: true, path: null }
        return
      }
      const found = await which(p.bin)
      providers[p.id] = { available: !!found, path: found, version: found ? await version(p.bin) : null }
    }),
  )
  cached = { checkedAt: new Date().toISOString(), providers }
  return cached
}

export const availableProviderIds = (caps: Capabilities): string[] =>
  Object.entries(caps.providers).filter(([, v]) => v.available).map(([k]) => k)
