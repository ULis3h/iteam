import { describe, expect, it, vi } from 'vitest'
import { RunnerRegistry } from '../src/engine/runner-registry.js'
import type { JobSpec } from '../src/engine/types.js'

const fakeSocket = (id: string) => ({ id, emit: vi.fn(), disconnect: vi.fn() }) as unknown as import('socket.io').Socket
const job = (id: string): JobSpec => ({ id, cmd: 'x', args: [], shell: false, stdin: '', cwd: '', env: {}, timeoutSec: 10, useOutputFile: false, parser: 'none' })

describe('RunnerRegistry', () => {
  it('fails in-flight jobs when the runner reconnects with a new socket', () => {
    const reg = new RunnerRegistry()
    const s1 = fakeSocket('s1')
    reg.attach('r1', s1)
    const done = vi.fn()
    reg.dispatch('r1', job('j1'), { onLog: vi.fn(), onDone: done })
    expect(reg.activeJobs('r1')).toBe(1)
    const s2 = fakeSocket('s2')
    reg.attach('r1', s2)
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/reconnected/) }))
    expect(reg.activeJobs('r1')).toBe(0)
    expect(reg.isOnline('r1')).toBe(true)
    // the old socket's disconnect must not mark the runner offline
    reg.detach('r1', 's1')
    expect(reg.isOnline('r1')).toBe(true)
    reg.detach('r1', 's2')
    expect(reg.isOnline('r1')).toBe(false)
  })

  it('only accepts job events from the socket the job was dispatched to', () => {
    const reg = new RunnerRegistry()
    reg.attach('r1', fakeSocket('s1'))
    const onLog = vi.fn()
    const onDone = vi.fn()
    reg.dispatch('r1', job('j2'), { onLog, onDone })
    reg.handleLog('impostor', 'j2', 'stdout', 'hi')
    reg.handleDone('impostor', 'j2', { exitCode: 0, output: 'stolen' })
    expect(onLog).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
    reg.handleLog('s1', 'j2', 'stdout', 'hi')
    reg.handleDone('s1', 'j2', { exitCode: 0, output: 'ok' })
    expect(onLog).toHaveBeenCalledWith('stdout', 'hi')
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ output: 'ok' }))
  })

  it('reports offline runners immediately', async () => {
    const reg = new RunnerRegistry()
    const onDone = vi.fn()
    reg.dispatch('nobody', job('j3'), { onLog: vi.fn(), onDone })
    await new Promise((r) => setTimeout(r, 0))
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ error: 'runner is offline' }))
  })
})
