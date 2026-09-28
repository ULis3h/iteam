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
