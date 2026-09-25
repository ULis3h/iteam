import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import path from 'node:path'

if (existsSync('.env')) loadEnv()

export const config = {
  version: '1.0.0',
  port: Number(process.env.PORT || 3000),
  token: (process.env.ITEAM_TOKEN || '').trim(),
  databaseUrl: process.env.DATABASE_URL || 'file:./iteam.db',
  maxParallel: Math.max(1, Number(process.env.ITEAM_MAX_PARALLEL || 4)),
  defaultWorkDir: process.env.ITEAM_WORK_DIR || process.cwd(),
  clientDist: path.resolve(process.cwd(), '../client/dist'),
}

process.env.DATABASE_URL = config.databaseUrl
