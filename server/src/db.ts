import { PrismaClient } from '@prisma/client'
import { config } from './config.js'

export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
})

export const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
