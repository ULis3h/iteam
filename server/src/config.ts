import { config as loadEnv } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Paths are resolved from this file so `node dist/index.js` works from any cwd.
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.join(serverDir, '.env')
if (existsSync(envFile)) loadEnv({ path: envFile })

const pkg = JSON.parse(readFileSync(path.join(serverDir, 'package.json'), 'utf8')) as { version: string }

const intEnv = (name: string, fallback: number, min: number, max: number): number => {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n < min || n > max) {
    console.error(`invalid ${name}="${raw}" (expected an integer between ${min} and ${max})`)
    process.exit(1)
  }
  return n
}

const token = (process.env.ITEAM_TOKEN || '').trim()
const host = (process.env.HOST || '').trim() || (token ? '0.0.0.0' : '127.0.0.1')

let databaseUrl = process.env.DATABASE_URL || 'file:./iteam.db'
// SQLite handles one writer at a time; a single connection avoids SQLITE_BUSY under concurrent log writes.
if (databaseUrl.startsWith('file:') && !databaseUrl.includes('connection_limit')) {
  databaseUrl += `${databaseUrl.includes('?') ? '&' : '?'}connection_limit=1`
}

export const config = {
  version: pkg.version,
  serverDir,
  port: intEnv('PORT', 3000, 1, 65535),
  /** Bind address: loopback unless a token protects the API or HOST is set explicitly. */
  host,
  token,
  /** Runners authenticate with this token; defaults to ITEAM_TOKEN when not set separately. */
  runnerToken: (process.env.ITEAM_RUNNER_TOKEN || '').trim() || token,
  databaseUrl,
  maxParallel: intEnv('ITEAM_MAX_PARALLEL', 4, 1, 64),
  defaultWorkDir: process.env.ITEAM_WORK_DIR || process.cwd(),
  clientDist: path.resolve(serverDir, '../client/dist'),
  examplesDir: path.resolve(serverDir, '../examples'),
  /** Extra browser origins allowed to call the API (the bundled UI is same-origin and needs none). */
  corsOrigins: (process.env.ITEAM_CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  /** Finished runs older than this many days are deleted daily; 0 keeps everything. */
  retentionDays: intEnv('ITEAM_RETENTION_DAYS', 0, 0, 3650),
}

export const isLoopback = (h: string) => ['127.0.0.1', 'localhost', '::1'].includes(h)

process.env.DATABASE_URL = config.databaseUrl
