import { spawn } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { killStaleProcess } from '../src/engine/local-executor.js'

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('killStaleProcess', () => {
  it('kills a detached process group only when its command line matches the hint', async () => {
    const child = spawn('sleep', ['30'], { detached: true, stdio: 'ignore' })
    child.unref()
    const pid = child.pid!
    await new Promise((r) => setTimeout(r, 100))
    expect(alive(pid)).toBe(true)
    expect(await killStaleProcess(pid, 'definitely-not-this')).toBe(false)
    expect(alive(pid)).toBe(true)
    expect(await killStaleProcess(pid, 'sleep')).toBe(true)
    await new Promise((r) => setTimeout(r, 200))
    expect(alive(pid)).toBe(false)
    expect(await killStaleProcess(pid, 'sleep')).toBe(false) // already gone
    expect(await killStaleProcess(0, 'sleep')).toBe(false)
  })
})
