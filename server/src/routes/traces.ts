import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import logger from '../utils/logger.js'

const router = Router()
const prisma = new PrismaClient()

/**
 * 任务执行追踪 API
 */

// 获取设备的所有会话
router.get('/device/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params
        const { limit = 20, offset = 0 } = req.query

        const sessions = await prisma.taskSession.findMany({
            where: { deviceId },
            orderBy: { startTime: 'desc' },
            take: Number(limit),
            skip: Number(offset),
            include: {
                _count: {
                    select: { entries: true }
                }
            }
        })

        const total = await prisma.taskSession.count({
            where: { deviceId }
        })

        res.json({ sessions, total })
    } catch (error: any) {
        logger.error('获取会话列表失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 获取单个会话详情（含所有条目）
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params

        const session = await prisma.taskSession.findUnique({
            where: { id: sessionId },
            include: {
                entries: {
                    orderBy: { timestamp: 'asc' }
                },
                device: {
                    select: { id: true, name: true }
                }
            }
        })

        if (!session) {
            return res.status(404).json({ error: '会话不存在' })
        }

        res.json(session)
    } catch (error: any) {
        logger.error('获取会话详情失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 创建新会话
router.post('/session', async (req, res) => {
    try {
        const { deviceId, taskId, title } = req.body

        const session = await prisma.taskSession.create({
            data: {
                deviceId,
                taskId,
                title,
                status: 'running'
            }
        })

        logger.info(`创建追踪会话: ${session.id}`)
        res.json(session)
    } catch (error: any) {
        logger.error('创建会话失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 更新会话状态
router.patch('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params
        const { status, endTime } = req.body

        const session = await prisma.taskSession.update({
            where: { id: sessionId },
            data: {
                status,
                endTime: endTime ? new Date(endTime) : undefined
            }
        })

        res.json(session)
    } catch (error: any) {
        logger.error('更新会话失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 添加追踪条目
router.post('/entry', async (req, res) => {
    try {
        const { sessionId, type, title, content, metadata, duration } = req.body

        const entry = await prisma.traceEntry.create({
            data: {
                sessionId,
                type,
                title,
                content,
                metadata: metadata ? JSON.stringify(metadata) : null,
                duration
            }
        })

        res.json(entry)
    } catch (error: any) {
        logger.error('添加追踪条目失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 批量添加追踪条目
router.post('/entries', async (req, res) => {
    try {
        const { entries } = req.body

        const created = await prisma.traceEntry.createMany({
            data: entries.map((e: any) => ({
                sessionId: e.sessionId,
                type: e.type,
                title: e.title,
                content: e.content,
                metadata: e.metadata ? JSON.stringify(e.metadata) : null,
                duration: e.duration,
                timestamp: e.timestamp ? new Date(e.timestamp) : undefined
            }))
        })

        res.json({ count: created.count })
    } catch (error: any) {
        logger.error('批量添加条目失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 获取会话统计
router.get('/stats/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params

        const [total, running, completed, failed] = await Promise.all([
            prisma.taskSession.count({ where: { deviceId } }),
            prisma.taskSession.count({ where: { deviceId, status: 'running' } }),
            prisma.taskSession.count({ where: { deviceId, status: 'completed' } }),
            prisma.taskSession.count({ where: { deviceId, status: 'failed' } })
        ])

        res.json({ total, running, completed, failed })
    } catch (error: any) {
        logger.error('获取统计失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 删除会话
router.delete('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params

        await prisma.taskSession.delete({
            where: { id: sessionId }
        })

        res.json({ success: true })
    } catch (error: any) {
        logger.error('删除会话失败:', error)
        res.status(500).json({ error: error.message })
    }
})

export default router
