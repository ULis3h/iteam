#!/usr/bin/env node
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { start } from '../src/index.js'

const pkg = createRequire(import.meta.url)('../package.json')

const usage = `iteam-runner v${pkg.version} — run agents on this machine for an iTeam server

Usage:
  iteam-runner --server http://SERVER:3000 [--token TOKEN] [--name NAME] [options]

Options:
  -s, --server <url>     iTeam server URL           (env ITEAM_SERVER, default http://localhost:3000)
  -t, --token <token>    access token if configured (env ITEAM_TOKEN or ITEAM_RUNNER_TOKEN; prefer the env var)
  -n, --name <name>      runner name shown in the UI (env ITEAM_RUNNER_NAME, default: hostname)
  -j, --max-jobs <n>     concurrent jobs this machine accepts (env ITEAM_MAX_JOBS, default 2)
      --root <dir>       only run jobs whose working directory is inside <dir>
      --no-custom        refuse custom shell commands (only claude / codex / gemini)
  -v, --version          print the version
  -h, --help             show this help
`

let values
try {
  ;({ values } = parseArgs({
    options: {
      server: { type: 'string', short: 's' },
      token: { type: 'string', short: 't' },
      name: { type: 'string', short: 'n' },
      'max-jobs': { type: 'string', short: 'j' },
      root: { type: 'string' },
      'no-custom': { type: 'boolean' },
      version: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
  }))
} catch (err) {
  console.error(`error: ${err.message}\n`)
  console.error(usage)
  process.exit(2)
}

if (values.help) {
  console.log(usage)
  process.exit(0)
}
if (values.version) {
  console.log(pkg.version)
  process.exit(0)
}

const maxJobs = Number(values['max-jobs'] ?? process.env.ITEAM_MAX_JOBS ?? 2)
if (!Number.isInteger(maxJobs) || maxJobs < 1 || maxJobs > 32) {
  console.error('error: --max-jobs must be an integer between 1 and 32')
  process.exit(2)
}

start({
  server: values.server || process.env.ITEAM_SERVER || 'http://localhost:3000',
  token: values.token || process.env.ITEAM_RUNNER_TOKEN || process.env.ITEAM_TOKEN || '',
  name: values.name || process.env.ITEAM_RUNNER_NAME || '',
  maxJobs,
  root: values.root || process.env.ITEAM_ROOT || '',
  allowCustom: !values['no-custom'],
  version: pkg.version,
})
