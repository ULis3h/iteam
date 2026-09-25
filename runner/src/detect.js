import { spawn } from 'node:child_process'

const BINARIES = { 'claude-code': 'claude', codex: 'codex', gemini: 'gemini' }

const which = (bin) =>
  new Promise((resolve) => {
    const isWin = process.platform === 'win32'
    const child = spawn(isWin ? 'where' : 'sh', isWin ? [bin] : ['-c', `command -v ${bin}`], { stdio: ['ignore', 'pipe', 'ignore'] })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })

/** Return the provider ids whose CLI is installed here (custom commands are always allowed). */
export async function detectProviders() {
  const found = ['custom']
  for (const [id, bin] of Object.entries(BINARIES)) {
    if (await which(bin)) found.push(id)
  }
  return found
}
