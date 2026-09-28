import { PrismaClient } from '@prisma/client'
import { config } from './config.js'

export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
})

/** SQLite settings that keep a single-process server responsive: WAL for concurrent readers, a busy timeout instead of immediate SQLITE_BUSY. */
export async function initDb() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL')
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000')
  } catch {
    /* not SQLite or a read-only volume: keep the defaults */
  }
}

export const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
