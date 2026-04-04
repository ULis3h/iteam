import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { getMemoryService } from '../services/memory.service.js'
import logger from '../utils/logger.js'

const prisma = new PrismaClient()

export function createMemoryRouter() {
    const router = Router()
    const memoryService = getMemoryService(prisma)

    /**
     * POST /api/memories
     * 从对话消息中提取并保存记忆
     * Body: { messages: [{role, content}], deviceId: string, metadata?: object }
     */
    router.post('/', async (req, res) => {
        try {
            const { messages, deviceId, metadata } = req.body

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                return res.status(400).json({ error: '缺少 messages 参数' })
            }
            if (!deviceId) {
                return res.status(400).json({ error: '缺少 deviceId 参数' })
            }

            // 验证设备存在
            const device = await prisma.device.findUnique({ where: { id: deviceId } })
            if (!device) {
                return res.status(404).json({ error: '设备不存在' })
            }

            const memories = await memoryService.add(messages, deviceId, metadata)
            res.json({ success: true, data: memories, count: memories.length })
        } catch (error: any) {
            logger.error('POST /api/memories error:', error)
            res.status(500).json({ error: error.message || '添加记忆失败' })
        }
    })

    /**
     * GET /api/memories
     * 列出记忆
     * Query: deviceId?, category?
     */
    router.get('/', async (req, res) => {
        try {
            const { deviceId, category } = req.query
            const memories = await memoryService.getAll(
                deviceId as string | undefined,
                category as string | undefined
            )
            res.json({ success: true, data: memories })
        } catch (error: any) {
            logger.error('GET /api/memories error:', error)
            res.status(500).json({ error: error.message || '获取记忆列表失败' })
        }
    })

    /**
     * GET /api/memories/search
     * 语义搜索记忆
     * Query: q (必填), deviceId?, limit?
     */
    router.get('/search', async (req, res) => {
        try {
            const { q, deviceId, limit } = req.query

            if (!q) {
                return res.status(400).json({ error: '缺少搜索关键词 q' })
            }

            const results = await memoryService.search(
                q as string,
                deviceId as string | undefined,
                { limit: limit ? parseInt(limit as string) : undefined }
            )
            res.json({ success: true, data: results })
        } catch (error: any) {
            logger.error('GET /api/memories/search error:', error)
            res.status(500).json({ error: error.message || '搜索记忆失败' })
        }
    })

    /**
     * GET /api/memories/:id
     * 获取单条记忆详情
     */
    router.get('/:id', async (req, res) => {
        try {
            const memory = await memoryService.get(req.params.id)
            if (!memory) {
                return res.status(404).json({ error: '记忆不存在' })
            }
            res.json({ success: true, data: memory })
        } catch (error: any) {
            logger.error('GET /api/memories/:id error:', error)
            res.status(500).json({ error: error.message || '获取记忆失败' })
        }
    })

    /**
     * GET /api/memories/:id/history
     * 获取记忆修改历史
     */
    router.get('/:id/history', async (req, res) => {
        try {
            const history = await memoryService.getHistory(req.params.id)
            res.json({ success: true, data: history })
        } catch (error: any) {
            logger.error('GET /api/memories/:id/history error:', error)
            res.status(500).json({ error: error.message || '获取记忆历史失败' })
        }
    })

    /**
     * DELETE /api/memories/:id
     * 删除记忆
     */
    router.delete('/:id', async (req, res) => {
        try {
            await memoryService.delete(req.params.id)
            res.json({ success: true, message: '记忆已删除' })
        } catch (error: any) {
            logger.error('DELETE /api/memories/:id error:', error)
            res.status(500).json({ error: error.message || '删除记忆失败' })
        }
    })

    return router
}

export default createMemoryRouter
