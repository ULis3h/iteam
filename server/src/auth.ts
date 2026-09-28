import { timingSafeEqual } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { config } from './config.js'

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** Tokens travel in headers only (never in URLs, which end up in logs and history). */
export const tokenFromRequest = (req: Request): string => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7).trim()
  const custom = req.headers['x-iteam-token']
  if (typeof custom === 'string') return custom.trim()
  return ''
}

export const tokenIsValid = (token: string | undefined, expected: string = config.token): boolean =>
  !expected || (!!token && safeEqual(token, expected))

// Small in-memory brake on token guessing: after too many failures an address must wait.
const WINDOW_MS = 60_000
const MAX_FAILURES = 20
const failures = new Map<string, { count: number; resetAt: number }>()

export const recordAuthFailure = (ip: string) => {
  const now = Date.now()
  const entry = failures.get(ip)
  if (!entry || entry.resetAt < now) failures.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  else entry.count++
}

export const isAuthLimited = (ip: string): boolean => {
  const entry = failures.get(ip)
  if (!entry) return false
  if (entry.resetAt < Date.now()) {
    failures.delete(ip)
    return false
  }
  return entry.count >= MAX_FAILURES
}

export const requireToken = (req: Request, res: Response, next: NextFunction) => {
  if (!config.token) return next()
  const ip = req.ip ?? 'unknown'
  if (isAuthLimited(ip)) return res.status(429).json({ error: 'too many failed authentication attempts; try again later' })
  if (tokenIsValid(tokenFromRequest(req))) {
    failures.delete(ip)
    return next()
  }
  recordAuthFailure(ip)
  res.status(401).json({ error: 'invalid or missing access token' })
}
