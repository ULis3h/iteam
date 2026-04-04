import { PrismaClient } from '@prisma/client'
import { MemoryClient } from 'mem0ai'
import logger from '../utils/logger.js'

// ============================================================================
// Types
// ============================================================================

/** mem0 SDK 消息类型 */
interface Mem0Message {
    role: 'user' | 'assistant'
    content: string
}

/** 搜索结果类型 */
export interface MemorySearchResult {
    id: string
    memory: string
    score?: number
    user_id?: string
    categories?: string[]
    created_at?: Date
    updated_at?: Date
}

/** 记忆历史类型 */
export interface MemoryHistoryEntry {
    id: string
    memory_id: string
    old_memory: string | null
    new_memory: string | null
    event: string
    created_at: Date
    updated_at: Date
}

/** 运行模式 */
export type MemoryMode = 'cloud' | 'local' | 'fallback'

// ============================================================================
// Memory Backend Interface (Strategy Pattern)
// ============================================================================

interface MemoryBackend {
    mode: MemoryMode
    add(messages: Mem0Message[], userId: string, metadata?: Record<string, any>): Promise<any[]>
    search(query: string, userId?: string, limit?: number): Promise<MemorySearchResult[]>
    getAll(userId?: string): Promise<any[]>
    get(memoryId: string): Promise<any>
    delete(memoryId: string): Promise<void>
    history(memoryId: string): Promise<MemoryHistoryEntry[]>
}

// ============================================================================
// Cloud Backend (mem0 Platform API)
// ============================================================================

class CloudBackend implements MemoryBackend {
    mode: MemoryMode = 'cloud'
    private client: MemoryClient

    constructor(apiKey: string) {
        this.client = new MemoryClient({ apiKey })
        logger.info('[MemoryService] ☁️  Cloud 模式初始化成功 (mem0 Platform API)')
    }

    async add(messages: Mem0Message[], userId: string, metadata?: Record<string, any>): Promise<any[]> {
        const memories = await this.client.add(messages, {
            user_id: userId,
            metadata,
        })
        return Array.isArray(memories) ? memories : [memories]
    }

    async search(query: string, userId?: string, limit = 20): Promise<MemorySearchResult[]> {
        const options: any = { limit }
        if (userId) options.user_id = userId

        const results = await this.client.search(query, options)
        return results.map((r: any) => ({
            id: r.id,
            memory: r.memory || '',
            score: r.score,
            user_id: r.user_id,
            categories: r.categories || [],
            created_at: r.created_at,
            updated_at: r.updated_at,
        }))
    }

    async getAll(userId?: string): Promise<any[]> {
        const options: any = {}
        if (userId) options.user_id = userId
        return this.client.getAll(options)
    }

    async get(memoryId: string): Promise<any> {
        return this.client.get(memoryId)
    }

    async delete(memoryId: string): Promise<void> {
        await this.client.delete(memoryId)
    }

    async history(memoryId: string): Promise<MemoryHistoryEntry[]> {
        const history = await this.client.history(memoryId)
        return history.map((h: any) => ({
            id: h.id,
            memory_id: h.memory_id,
            old_memory: h.old_memory,
            new_memory: h.new_memory,
            event: String(h.event),
            created_at: h.created_at,
            updated_at: h.updated_at,
        }))
    }
}

// ============================================================================
// Local Backend (mem0 OSS - Ollama + MemoryVectorStore/Qdrant)
// ============================================================================

class LocalBackend implements MemoryBackend {
    mode: MemoryMode = 'local'
    private memory: any // Memory from mem0ai/oss
    private initialized = false

    constructor() {
        // Defer initialization to avoid blocking constructor
        this.initAsync()
    }

    private async initAsync() {
        try {
            // Dynamic import for mem0ai/oss (ESM)
            const { Memory } = await import('mem0ai/oss')

            const ollamaUrl = process.env.MEM0_OLLAMA_URL || 'http://localhost:11434'
            const llmModel = process.env.MEM0_LLM_MODEL || 'llama3.1:latest'
            const embedModel = process.env.MEM0_EMBED_MODEL || 'nomic-embed-text:latest'
            const vectorProvider = process.env.MEM0_VECTOR_PROVIDER || 'memory' // 'memory' | 'qdrant'
            const dbPath = process.env.MEM0_VECTOR_DB_PATH || './data/mem0-vectors.db'

            const config: any = {
                llm: {
                    provider: 'ollama',
                    config: {
                        model: llmModel,
                        baseURL: ollamaUrl,
                    },
                },
                embedder: {
                    provider: 'ollama',
                    config: {
                        model: embedModel,
                        baseURL: ollamaUrl,
                    },
                },
                historyDbPath: process.env.MEM0_HISTORY_DB_PATH || './data/mem0-history.db',
            }

            // Vector store configuration
            if (vectorProvider === 'qdrant') {
                config.vectorStore = {
                    provider: 'qdrant',
                    config: {
                        collectionName: process.env.MEM0_QDRANT_COLLECTION || 'iteam_memories',
                        host: process.env.MEM0_QDRANT_HOST || 'localhost',
                        port: parseInt(process.env.MEM0_QDRANT_PORT || '6333'),
                        embeddingModelDims: parseInt(process.env.MEM0_EMBED_DIMS || '768'),
                    },
                }
            } else {
                // Built-in SQLite vector store (zero external deps)
                config.vectorStore = {
                    provider: 'memory',
                    config: {
                        dbPath,
                    },
                }
            }

            this.memory = new Memory(config)
            this.initialized = true
            logger.info(`[MemoryService] 🏠 Local 模式初始化成功 (Ollama: ${ollamaUrl}, Vector: ${vectorProvider})`)
        } catch (error) {
            logger.error('[MemoryService] Local 模式初始化失败:', error)
            throw error
        }
    }

    private async ensureInitialized() {
        // Wait for async init (max 30s)
        const maxWait = 30_000
        const start = Date.now()
        while (!this.initialized && Date.now() - start < maxWait) {
            await new Promise(r => setTimeout(r, 100))
        }
        if (!this.initialized) {
            throw new Error('Local memory backend failed to initialize within 30s')
        }
    }

    async add(messages: Mem0Message[], userId: string, metadata?: Record<string, any>): Promise<any[]> {
        await this.ensureInitialized()
        const result = await this.memory.add(messages, { userId, metadata })
        return result?.results || []
    }

    async search(query: string, userId?: string, limit = 20): Promise<MemorySearchResult[]> {
        await this.ensureInitialized()
        const options: any = { limit }
        if (userId) options.userId = userId

        const result = await this.memory.search(query, options)
        const items = result?.results || []

        return items.map((r: any) => ({
            id: r.id,
            memory: r.memory || '',
            score: r.score,
            user_id: userId,
            categories: [],
            created_at: r.createdAt ? new Date(r.createdAt) : undefined,
            updated_at: r.updatedAt ? new Date(r.updatedAt) : undefined,
        }))
    }

    async getAll(userId?: string): Promise<any[]> {
        await this.ensureInitialized()
        const options: any = {}
        if (userId) options.userId = userId
        const result = await this.memory.getAll(options)
        return result?.results || []
    }

    async get(memoryId: string): Promise<any> {
        await this.ensureInitialized()
        return this.memory.get(memoryId)
    }

    async delete(memoryId: string): Promise<void> {
        await this.ensureInitialized()
        await this.memory.delete(memoryId)
    }

    async history(memoryId: string): Promise<MemoryHistoryEntry[]> {
        await this.ensureInitialized()
        const history = await this.memory.history(memoryId)
        return (history || []).map((h: any) => ({
            id: h.id || '',
            memory_id: memoryId,
            old_memory: h.old_memory || h.prevValue || null,
            new_memory: h.new_memory || h.newValue || null,
            event: String(h.event || h.action || 'unknown'),
            created_at: h.created_at ? new Date(h.created_at) : new Date(),
            updated_at: h.updated_at ? new Date(h.updated_at) : new Date(),
        }))
    }
}

// ============================================================================
// MemoryService (Unified Facade)
// ============================================================================

export class MemoryService {
    private backend: MemoryBackend | null = null
    private prisma: PrismaClient
    private mode: MemoryMode

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
        this.mode = (process.env.MEM0_MODE as MemoryMode) || 'fallback'
        this.initialize()
    }

    private initialize() {
        try {
            switch (this.mode) {
                case 'cloud': {
                    const apiKey = process.env.MEM0_API_KEY
                    if (!apiKey) {
                        logger.error('[MemoryService] MEM0_MODE=cloud 但 MEM0_API_KEY 未配置')
                        return
                    }
                    this.backend = new CloudBackend(apiKey)
                    break
                }

                case 'local': {
                    this.backend = new LocalBackend()
                    break
                }

                case 'fallback':
                default: {
                    // 自动检测：有 API Key → cloud，有 Ollama 配置 → local，否则仅 Prisma
                    const apiKey = process.env.MEM0_API_KEY
                    if (apiKey) {
                        this.backend = new CloudBackend(apiKey)
                        this.mode = 'cloud'
                    } else if (process.env.MEM0_OLLAMA_URL) {
                        this.backend = new LocalBackend()
                        this.mode = 'local'
                    } else {
                        logger.warn('[MemoryService] 📦 Fallback 模式：无 MEM0_API_KEY 或 MEM0_OLLAMA_URL，仅使用 Prisma 本地存储')
                    }
                    break
                }
            }
        } catch (error) {
            logger.error('[MemoryService] 初始化失败，降级为仅 Prisma 模式:', error)
            this.backend = null
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
        const mem0UserId = `device_${deviceId}`

        if (!this.backend) {
            // 纯 Prisma 降级
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
            const memories = await this.backend.add(messages, mem0UserId, { deviceId, ...metadata })

            // 同步到本地 Prisma
            const savedMemories = []
            for (const mem of memories) {
                const id = mem.id
                const summary = mem.memory || mem.data?.memory || ''
                if (id && summary) {
                    const saved = await this.prisma.memory.upsert({
                        where: { id },
                        update: {
                            summary,
                            category: mem.categories?.[0] || null,
                            updatedAt: new Date(),
                        },
                        create: {
                            id,
                            deviceId,
                            summary,
                            category: mem.categories?.[0] || null,
                            mem0UserId,
                        },
                    })
                    savedMemories.push(saved)
                }
            }

            logger.info(`[MemoryService] [${this.mode}] 提取并保存 ${savedMemories.length} 条记忆 (device: ${deviceId})`)
            return savedMemories
        } catch (error) {
            logger.error(`[MemoryService] [${this.mode}] 添加记忆失败:`, error)
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
        if (!this.backend) {
            // Prisma 降级：关键词搜索
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
            const userId = deviceId ? `device_${deviceId}` : undefined
            return await this.backend.search(query, userId, options?.limit)
        } catch (error) {
            logger.error(`[MemoryService] [${this.mode}] 搜索记忆失败:`, error)
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
        if (!this.backend) {
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
            const userId = deviceId ? `device_${deviceId}` : undefined
            const memories = await this.backend.getAll(userId)

            // 同步到 Prisma
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

            return memories.map((m: any) => ({
                id: m.id,
                memory: m.memory || '',
                user_id: m.user_id,
                categories: m.categories || [],
                created_at: m.created_at || m.createdAt,
                updated_at: m.updated_at || m.updatedAt,
            }))
        } catch (error) {
            logger.error(`[MemoryService] [${this.mode}] 获取记忆列表失败:`, error)
            throw error
        }
    }

    /**
     * 获取单条记忆详情
     */
    async get(memoryId: string): Promise<any> {
        if (!this.backend) {
            return this.prisma.memory.findUnique({
                where: { id: memoryId },
                include: { device: { select: { name: true, type: true } } },
            })
        }

        try {
            return await this.backend.get(memoryId)
        } catch (error) {
            logger.error(`[MemoryService] [${this.mode}] 获取记忆详情失败:`, error)
            throw error
        }
    }

    /**
     * 删除记忆
     */
    async delete(memoryId: string): Promise<void> {
        // 先删本地
        try {
            await this.prisma.memory.delete({ where: { id: memoryId } })
        } catch {
            // 本地可能不存在，忽略
        }

        if (!this.backend) return

        try {
            await this.backend.delete(memoryId)
            logger.info(`[MemoryService] [${this.mode}] 已删除记忆: ${memoryId}`)
        } catch (error) {
            logger.error(`[MemoryService] [${this.mode}] 删除记忆失败:`, error)
            throw error
        }
    }

    /**
     * 获取记忆修改历史
     */
    async getHistory(memoryId: string): Promise<MemoryHistoryEntry[]> {
        if (!this.backend) return []

        try {
            return await this.backend.history(memoryId)
        } catch (error) {
            logger.error(`[MemoryService] [${this.mode}] 获取记忆历史失败:`, error)
            throw error
        }
    }

    /**
     * 检查服务是否可用（有后端连接）
     */
    isAvailable(): boolean {
        return this.backend !== null
    }

    /**
     * 获取当前运行模式
     */
    getMode(): MemoryMode {
        return this.backend ? this.mode : 'fallback'
    }
}

// ============================================================================
// Singleton
// ============================================================================

let memoryServiceInstance: MemoryService | null = null

export function getMemoryService(prisma: PrismaClient): MemoryService {
    if (!memoryServiceInstance) {
        memoryServiceInstance = new MemoryService(prisma)
    }
    return memoryServiceInstance
}

export default MemoryService
