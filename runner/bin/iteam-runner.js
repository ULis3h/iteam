#!/usr/bin/env node
import { start } from '../src/index.js'

const args = process.argv.slice(2)
const opts = {
  server: process.env.ITEAM_SERVER || 'http://localhost:3000',
  token: process.env.ITEAM_TOKEN || '',
  name: process.env.ITEAM_RUNNER_NAME || '',
}
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  const next = () => args[++i]
  if (a === '--server' || a === '-s') opts.server = next()
  else if (a === '--token' || a === '-t') opts.token = next()
  else if (a === '--name' || a === '-n') opts.name = next()
  else if (a === '--help' || a === '-h') {
    console.log(`iteam-runner — run agents on this machine for an iTeam server

Usage:
  iteam-runner --server http://SERVER:3000 [--token TOKEN] [--name NAME]

Options:
  -s, --server   iTeam server URL           (env ITEAM_SERVER, default http://localhost:3000)
  -t, --token    access token if configured (env ITEAM_TOKEN)
  -n, --name     runner name shown in the UI (env ITEAM_RUNNER_NAME, default: hostname)
`)
    process.exit(0)
  }
}
start(opts)
