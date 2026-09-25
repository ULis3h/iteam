import type { Request, Response, NextFunction } from 'express'
import { config } from './config.js'

export const tokenFromRequest = (req: Request): string => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7).trim()
  const custom = req.headers['x-iteam-token']
  if (typeof custom === 'string') return custom.trim()
  if (typeof req.query.token === 'string') return req.query.token.trim()
  return ''
}

export const tokenIsValid = (token: string | undefined): boolean =>
  !config.token || token === config.token

export const requireToken = (req: Request, res: Response, next: NextFunction) => {
  if (tokenIsValid(tokenFromRequest(req))) return next()
  res.status(401).json({ error: 'invalid or missing access token' })
}
