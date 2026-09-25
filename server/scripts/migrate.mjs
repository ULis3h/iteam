// Apply pending Prisma migrations before the server starts (zero-config default DB).
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { config as loadEnv } from 'dotenv'

if (existsSync('.env')) loadEnv()
process.env.DATABASE_URL ||= 'file:./iteam.db'

execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env })
