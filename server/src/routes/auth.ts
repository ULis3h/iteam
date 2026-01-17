import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthRequest, JWT_SECRET, authMiddleware } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// 注册
router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body

        // 验证必填字段
        if (!email || !username || !password) {
            return res.status(400).json({ error: '请填写所有必填字段' })
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: '邮箱格式不正确' })
        }

        // 验证密码长度
        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度至少6位' })
        }

        // 检查邮箱是否已存在
        const existingEmail = await prisma.user.findUnique({
            where: { email },
        })
        if (existingEmail) {
            return res.status(400).json({ error: '该邮箱已被注册' })
        }

        // 检查用户名是否已存在
        const existingUsername = await prisma.user.findUnique({
            where: { username },
        })
        if (existingUsername) {
            return res.status(400).json({ error: '该用户名已被使用' })
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10)

        // 创建用户
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
        })

        // 生成 token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.status(201).json({
            message: '注册成功',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                role: user.role,
            },
        })
    } catch (error) {
        console.error('Register error:', error)
        res.status(500).json({ error: '注册失败，请稍后重试' })
    }
})

// 登录
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        // 验证必填字段
        if (!email || !password) {
            return res.status(400).json({ error: '请填写邮箱和密码' })
        }

        // 查找用户（支持邮箱或用户名登录）
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username: email }],
            },
        })

        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' })
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            return res.status(401).json({ error: '用户名或密码错误' })
        }

        // 生成 token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        )

        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar: user.avatar,
                role: user.role,
            },
        })
    } catch (error) {
        console.error('Login error:', error)
        res.status(500).json({ error: '登录失败，请稍后重试' })
    }
})

// 获取当前用户信息
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                role: true,
                createdAt: true,
            },
        })

        if (!user) {
            return res.status(404).json({ error: '用户不存在' })
        }

        res.json(user)
    } catch (error) {
        console.error('Get user error:', error)
        res.status(500).json({ error: '获取用户信息失败' })
    }
})

// 登出（客户端清除 token 即可，这里只是一个确认端点）
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
    res.json({ message: '登出成功' })
})

export default router
