import { PrismaClient } from '@prisma/client'
import { MemoryClient } from 'mem0ai'
import logger from '../utils/logger.js'

// mem0 SDK 消息类型
interface Mem0Message {
    role: 'user' | 'assistant'
    content: string
}

// 搜索结果类型
export interface MemorySearchResult {
    id: string
    memory: string
    score?: number
    user_id?: string
    categories?: string[]
    created_at?: Date
    updated_at?: Date
}

// 记忆历史类型
export interface MemoryHistoryEntry {
    id: string
    memory_id: string
    old_memory: string | null
    new_memory: string | null
    event: string
    created_at: Date
    updated_at: Date
}

export class MemoryService {
    private client: MemoryClient | null = null
    private prisma: PrismaClient
    private initialized = false

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
        this.initialize()
    }

    private initialize() {
        const apiKey = process.env.MEM0_API_KEY
        if (!apiKey) {
            logger.warn('[MemoryService] MEM0_API_KEY 未配置，记忆服务将以降级模式运行（仅本地存储）')
            return
        }

        try {
            this.client = new MemoryClient({ apiKey })
            this.initialized = true
            logger.info('[MemoryService] mem0 客户端初始化成功')
        } catch (error) {
            logger.error('[MemoryService] mem0 客户端初始化失败:', error)
        }
    }

    /**
     * 从对话上下文中提取并保存记忆
     */
    async add(
        messages: Mem0Message[],
        deviceId: string,
        metadata?: Record<string, any>
    ): Promise<any[]> {
        // 构造 mem0 user_id：使用 deviceId
        const mem0UserId = `device_${deviceId}`

        if (!this.client) {
            // 降级模式：仅本地存储
            logger.warn('[MemoryService] mem0 未配置，跳过云端记忆提取')
            const localMemory = await this.prisma.memory.create({
                data: {
                    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    deviceId,
                    summary: messages.map(m => m.content).join(' | '),
                    category: metadata?.category || null,
                    mem0UserId,
                },
            })
            return [localMemory]
        }

        try {
            // 调用 mem0 提取记忆
            const memories = await this.client.add(messages, {
                user_id: mem0UserId,
                metadata: { deviceId, ...metadata },
            })

            // 同步到本地 Prisma
            const savedMemories = []
            for (const mem of memories) {
                if (mem.id && (mem.memory || mem.data?.memory)) {
                    const saved = await this.prisma.memory.upsert({
                        where: { id: mem.id },
                        update: {
                            summary: mem.memory || mem.data?.memory || '',
                            category: mem.categories?.[0] || null,
                            updatedAt: new Date(),
                        },
                        create: {
                            id: mem.id,
                            deviceId,
                            summary: mem.memory || mem.data?.memory || '',
                            category: mem.categories?.[0] || null,
                            mem0UserId,
                        },
                    })
                    savedMemories.push(saved)
                }
            }

            logger.info(`[MemoryService] 提取并保存 ${savedMemories.length} 条记忆 (device: ${deviceId})`)
            return savedMemories
        } catch (error) {
            logger.error('[MemoryService] 添加记忆失败:', error)
            throw error
        }
    }

    /**
     * 语义搜索记忆
     */
    async search(
        query: string,
        deviceId?: string,
        options?: { limit?: number }
    ): Promise<MemorySearchResult[]> {
        if (!this.client) {
            // 降级模式：本地关键词搜索
            const where: any = {
                summary: { contains: query },
            }
            if (deviceId) where.deviceId = deviceId

            const localResults = await this.prisma.memory.findMany({
                where,
                take: options?.limit || 20,
                orderBy: { updatedAt: 'desc' },
            })

            return localResults.map(m => ({
                id: m.id,
                memory: m.summary,
                user_id: m.mem0UserId,
                categories: m.category ? [m.category] : [],
                created_at: m.createdAt,
                updated_at: m.updatedAt,
            }))
        }

        try {
            const searchOptions: any = {
                limit: options?.limit || 20,
            }
            if (deviceId) {
                searchOptions.user_id = `device_${deviceId}`
            }

            const results = await this.client.search(query, searchOptions)

            return results.map(r => ({
                id: r.id,
                memory: r.memory || '',
                score: r.score,
                user_id: r.user_id,
                categories: r.categories || [],
                created_at: r.created_at,
                updated_at: r.updated_at,
            }))
        } catch (error) {
            logger.error('[MemoryService] 搜索记忆失败:', error)
            throw error
        }
    }

    /**
     * 列出设备的所有记忆
     */
    async getAll(
        deviceId?: string,
        category?: string
    ): Promise<any[]> {
        if (!this.client) {
            // 降级模式：从本地 Prisma 读取
            const where: any = {}
            if (deviceId) where.deviceId = deviceId
            if (category) where.category = category

            return this.prisma.memory.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                include: { device: { select: { name: true, type: true } } },
            })
        }

        try {
            const options: any = {}
            if (deviceId) options.user_id = `device_${deviceId}`

            const memories = await this.client.getAll(options)

            // 同步到本地（确保 Prisma 索引最新）
            if (deviceId) {
                for (const mem of memories) {
                    if (mem.id) {
                        await this.prisma.memory.upsert({
                            where: { id: mem.id },
                            update: {
                                summary: mem.memory || '',
                                category: mem.categories?.[0] || null,
                            },
                            create: {
                                id: mem.id,
                                deviceId,
                                summary: mem.memory || '',
                                category: mem.categories?.[0] || null,
                                mem0UserId: `device_${deviceId}`,
                            },
                        })
                    }
                }
            }

            return memories.map(m => ({
                id: m.id,
                memory: m.memory || '',
                user_id: m.user_id,
                categories: m.categories || [],
                created_at: m.created_at,
                updated_at: m.updated_at,
            }))
        } catch (error) {
            logger.error('[MemoryService] 获取记忆列表失败:', error)
            throw error
        }
    }

    /**
     * 获取单条记忆详情
     */
    async get(memoryId: string): Promise<any> {
        if (!this.client) {
            return this.prisma.memory.findUnique({
                where: { id: memoryId },
                include: { device: { select: { name: true, type: true } } },
            })
        }

        try {
            return await this.client.get(memoryId)
        } catch (error) {
            logger.error('[MemoryService] 获取记忆详情失败:', error)
            throw error
        }
    }

    /**
     * 删除记忆
     */
    async delete(memoryId: string): Promise<void> {
        // 删除本地索引
        try {
            await this.prisma.memory.delete({ where: { id: memoryId } })
        } catch (error) {
            // 本地可能不存在，忽略
        }

        if (!this.client) return

        try {
            await this.client.delete(memoryId)
            logger.info(`[MemoryService] 已删除记忆: ${memoryId}`)
        } catch (error) {
            logger.error('[MemoryService] 删除记忆失败:', error)
            throw error
        }
    }

    /**
     * 获取记忆修改历史
     */
    async getHistory(memoryId: string): Promise<MemoryHistoryEntry[]> {
        if (!this.client) {
            return []
        }

        try {
            const history = await this.client.history(memoryId)
            return history.map(h => ({
                id: h.id,
                memory_id: h.memory_id,
                old_memory: h.old_memory,
                new_memory: h.new_memory,
                event: String(h.event),
                created_at: h.created_at,
                updated_at: h.updated_at,
            }))
        } catch (error) {
            logger.error('[MemoryService] 获取记忆历史失败:', error)
            throw error
        }
    }

    /**
     * 检查服务是否可用
     */
    isAvailable(): boolean {
        return this.initialized
    }
}

// 单例
let memoryServiceInstance: MemoryService | null = null

export function getMemoryService(prisma: PrismaClient): MemoryService {
    if (!memoryServiceInstance) {
        memoryServiceInstance = new MemoryService(prisma)
    }
    return memoryServiceInstance
}

export default MemoryService
