import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runJob } from '../src/exec.js'

const run = (job) =>
  new Promise((resolve) => {
    const logs = []
    runJob({ args: [], shell: false, stdin: '', cwd: process.cwd(), env: {}, timeoutSec: 10, useOutputFile: false, ...job }, {
      onLog: (stream, line) => logs.push({ stream, line }),
      onDone: (result) => resolve({ result, logs }),
    })
  })

test('runs a command, captures stdout and passes stdin', async () => {
  const { result, logs } = await run({ id: 't1', cmd: 'sh', args: ['-c', 'printf "IN:"; cat'], stdin: 'hello' })
  assert.equal(result.exitCode, 0)
  assert.equal(result.output, 'IN:hello')
  assert.ok(logs.some((l) => l.stream === 'stdout' && l.line === 'IN:hello'))
})

test('reads the answer from {{outputFile}} and quotes it for the shell', async () => {
  const { result } = await run({ id: 't2', cmd: 'cat > /dev/null; echo final > {{outputFile}}', shell: true, useOutputFile: true })
  assert.equal(result.exitCode, 0)
  assert.equal(result.output, 'final')
})

test('strips runner secrets and protected variables from the child env', async () => {
  process.env.ITEAM_TOKEN = 'secret'
  const { result } = await run({ id: 't3', cmd: 'sh', args: ['-c', 'echo "[$ITEAM_TOKEN][$MY][$PATH_OK]"'], env: { MY: 'v', PATH: '/nowhere', PATH_OK: 'yes' } })
  delete process.env.ITEAM_TOKEN
  assert.equal(result.exitCode, 0)
  assert.equal(result.output, '[][v][yes]')
})

test('reports timeouts and missing working directories without throwing', async () => {
  const slow = await run({ id: 't4', cmd: 'sh', args: ['-c', 'sleep 5'], timeoutSec: 1 })
  assert.equal(slow.result.timedOut, true)
  assert.match(slow.result.error, /timed out/)
  const missing = await run({ id: 't5', cmd: 'true', cwd: '/definitely/not/here' })
  assert.match(missing.result.error, /does not exist/)
})

test('runs the check command after a successful exit and fails the job when it exits non-zero', async () => {
  const ok = await run({ id: 't6', cmd: 'sh', args: ['-c', 'echo out'], check: 'true' })
  assert.equal(ok.result.exitCode, 0)
  assert.equal(ok.result.output, 'out')
  assert.ok(ok.logs.some((l) => l.line === '$ check: true'))
  assert.ok(ok.logs.some((l) => l.line === '✓ check passed'))
  const bad = await run({ id: 't7', cmd: 'sh', args: ['-c', 'echo out'], check: 'echo nope >&2; exit 4' })
  assert.equal(bad.result.exitCode, 4)
  assert.match(bad.result.error, /check failed \(exit 4\)/)
  assert.equal(bad.result.output, 'out')
  assert.ok(bad.logs.some((l) => l.stream === 'stderr' && l.line === 'nope'))
  const skipped = await run({ id: 't8', cmd: 'sh', args: ['-c', 'exit 1'], check: 'exit 0' })
  assert.equal(skipped.result.exitCode, 1)
  assert.ok(!skipped.logs.some((l) => l.line.startsWith('$ check')))
})
