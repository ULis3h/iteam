import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'iteam-secret-key-change-in-production'

export interface AuthRequest extends Request {
    user?: {
        userId: string
        email: string
        username: string
        role: string
    }
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '未授权访问，请先登录' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest['user']

        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Token 无效或已过期' })
    }
}

export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest['user']
            req.user = decoded
        }

        next()
    } catch (error) {
        // Token invalid, but continue without user
        next()
    }
}

export { JWT_SECRET }
