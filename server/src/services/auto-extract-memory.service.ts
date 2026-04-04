/**
 * Auto Extract Memory Service
 *
 * 参考 claude-code/src/services/extractMemories/ 设计模式。
 * 在任务完成后自动从执行记录（TraceEntry）中提取持久化记忆，
 * 写入既有的 MemoryService（mem0 + Prisma）。
 *
 * 核心设计（来自 claude-code）：
 * - 游标追踪（lastProcessedEntryId）：避免重复提取
 * - 并发保护（inProgress + pendingContext）：同时只运行一个提取
 * - 频率控制（MIN_ENTRIES_FOR_EXTRACTION）：entry 不够多则跳过
 * - trailing run：如果提取过程中又有新请求，结束后自动处理
 * - 秘密扫描：保存前检查是否包含敏感信息
 */

import { PrismaClient, type TraceEntry, type TaskSession } from '@prisma/client'
import logger from '../utils/logger.js'
import { getMemoryService, type MemoryService } from './memory.service.js'

// ============================================================================
// Constants
// ============================================================================

/** 触发记忆提取的最少新 entry 数 */
const MIN_ENTRIES_FOR_EXTRACTION = 3

/** 单次提取最多处理的 entry 数 */
const MAX_ENTRIES_PER_EXTRACTION = 50

// ============================================================================
// Secret Scanner (from claude-code teamMemorySync/secretScanner.ts)
// ============================================================================

/**
 * 敏感信息模式列表
 * 参考 claude-code 的 secretScanner.ts
 */
const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
    { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/i },
    { name: 'AWS Secret', regex: /(?:aws)?_?secret_?(?:access)?_?key.*?[=:]\s*['"]?([A-Za-z0-9/+=]{40})/i },
    { name: 'GitHub Token', regex: /gh[ps]_[A-Za-z0-9_]{36,}/i },
    { name: 'GitHub OAuth', regex: /gho_[A-Za-z0-9_]{36,}/i },
    { name: 'Slack Token', regex: /xox[bpors]-[A-Za-z0-9-]+/i },
    { name: 'Generic API Key', regex: /(?:api[_-]?key|apikey|api_secret|access[_-]?token|auth[_-]?token|secret[_-]?key)\s*[=:]\s*['"]?([A-Za-z0-9/+=_-]{20,})/i },
    { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/i },
    { name: 'JWT', regex: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/i },
    { name: 'Connection String', regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+:[^\s'"]+@/i },
    { name: 'Password', regex: /(?:password|passwd|pwd)\s*[=:]\s*['"]?([^\s'"]{8,})/i },
]

/**
 * 扫描文本中的敏感信息
 * @returns 检测到的秘密名称列表，空数组表示安全
 */
export function scanForSecrets(text: string): string[] {
    const found: string[] = []
    for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(text)) {
            found.push(pattern.name)
        }
    }
    return found
}

/**
 * 清洗文本中的敏感信息（用 [REDACTED] 替换）
 */
export function redactSecrets(text: string): string {
    let result = text
    for (const pattern of SECRET_PATTERNS) {
        result = result.replace(pattern.regex, `[REDACTED:${pattern.name}]`)
    }
    return result
}

// ============================================================================
// Extraction Context
// ============================================================================

interface ExtractionContext {
    session: TaskSession
    entries: TraceEntry[]
}

// ============================================================================
// Extraction Prompt
// ============================================================================

/**
 * 构建记忆提取 prompt
 * 参考 claude-code extractMemories/prompts.ts 的 buildExtractAutoOnlyPrompt
 */
export function buildExtractionPrompt(
    entries: TraceEntry[],
    existingMemories: string[],
): string {
    const entrySummary = entries
        .slice(-MAX_ENTRIES_PER_EXTRACTION)
        .map((e) => `[${e.type}] ${e.title}\n${e.content.substring(0, 300)}`)
        .join('\n---\n')

    const memoryList = existingMemories.length > 0
        ? `\n\n## 已有记忆\n${existingMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n先检查是否需要更新已有记忆，避免重复。`
        : ''

    return `分析以下任务执行记录，提取值得长期记忆的关键经验。${memoryList}

## 执行记录
<trace_entries>
${entrySummary}
</trace_entries>

## 提取规则

### 值得记忆的内容
- **项目偏好**：使用的包管理器、框架版本、代码规范等
- **环境配置**：特殊的环境变量、构建配置、部署要求
- **错误修复经验**：遇到的坑和解决方案，可以避免未来重蹈覆辙
- **架构决策**：为什么这样设计，有什么权衡
- **工作流程**：有效的命令序列、测试策略

### 不值得记忆的内容
- 一次性的临时操作
- 显而易见的常识
- 正在进行中、尚未确定的事情
- 敏感信息（API key、密码、token 等）

请以 JSON 数组格式返回提取的记忆，每条记忆包含：
\`\`\`json
[
  {
    "summary": "简洁的记忆描述（一两句话）",
    "category": "preference | environment | error_fix | architecture | workflow | other"
  }
]
\`\`\`

如果没有值得记忆的内容，返回空数组 \`[]\`。`
}

// ============================================================================
// Service
// ============================================================================

export class AutoExtractMemoryService {
    private prisma: PrismaClient
    private memoryService: MemoryService

    // 并发控制（来自 claude-code extractMemories.ts 的闭包状态模式）
    private inProgress = false
    private pendingContext: ExtractionContext | null = null

    // 游标追踪（来自 claude-code 的 lastMemoryMessageUuid 模式）
    private lastProcessedEntryId = new Map<string, string>()

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
        this.memoryService = getMemoryService(prisma)
    }

    /**
     * 任务会话完成时触发记忆提取
     * 这是主入口点，由 WebSocket trace:session 事件（status=completed）调用
     */
    async onSessionCompleted(sessionId: string): Promise<void> {
        try {
            const session = await this.prisma.taskSession.findUnique({
                where: { id: sessionId },
                include: {
                    entries: { orderBy: { timestamp: 'asc' } },
                },
            })

            if (!session || session.entries.length === 0) return

            // 频率检查：新 entry 够多才提取
            const newEntries = this.getNewEntries(session.entries, session.id)
            if (newEntries.length < MIN_ENTRIES_FOR_EXTRACTION) {
                logger.info(`[AutoExtract] Skipping session ${sessionId}: only ${newEntries.length} new entries (need ${MIN_ENTRIES_FOR_EXTRACTION})`)
                return
            }

            // 并发保护（来自 claude-code 的 stash-and-trailing-run 模式）
            if (this.inProgress) {
                logger.info(`[AutoExtract] Extraction in progress, stashing session ${sessionId} for trailing run`)
                this.pendingContext = { session, entries: session.entries }
                return
            }

            await this.runExtraction({ session, entries: session.entries })
        } catch (error) {
            logger.error(`[AutoExtract] Error processing session ${sessionId}:`, error)
        }
    }

    /**
     * 核心提取逻辑
     * 参考 claude-code extractMemories.ts 的 runExtraction
     */
    private async runExtraction(ctx: ExtractionContext): Promise<void> {
        this.inProgress = true
        const startTime = Date.now()
        const { session, entries } = ctx

        try {
            const newEntries = this.getNewEntries(entries, session.id)
            logger.info(`[AutoExtract] Starting extraction for session ${session.id}: ${newEntries.length} new entries`)

            // 获取该设备的已有记忆摘要（用于去重）
            const existingMemories = await this.prisma.memory.findMany({
                where: { deviceId: session.deviceId },
                select: { summary: true },
                take: 20,
                orderBy: { updatedAt: 'desc' },
            })

            // 构建提取 prompt
            const prompt = buildExtractionPrompt(
                newEntries.slice(-MAX_ENTRIES_PER_EXTRACTION),
                existingMemories.map((m) => m.summary),
            )

            // 解析执行记录，尝试本地提取
            // 注意：如果需要 AI 提取，调用方应使用 buildExtractionPrompt 并传递给 AI
            // 这里提供一个简化的本地规则提取作为 fallback
            const extractedMemories = this.localExtract(newEntries)

            // 秘密扫描 + 保存
            let savedCount = 0
            for (const mem of extractedMemories) {
                const secrets = scanForSecrets(mem.summary)
                if (secrets.length > 0) {
                    logger.warn(`[AutoExtract] Skipping memory with secrets: ${secrets.join(', ')}`)
                    continue
                }

                try {
                    await this.prisma.memory.create({
                        data: {
                            id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            deviceId: session.deviceId,
                            summary: mem.summary,
                            category: mem.category,
                            mem0UserId: `device_${session.deviceId}`,
                        },
                    })
                    savedCount++
                } catch (error) {
                    logger.error('[AutoExtract] Failed to save memory:', error)
                }
            }

            // 推进游标
            const lastEntry = entries[entries.length - 1]
            if (lastEntry) {
                this.lastProcessedEntryId.set(session.id, lastEntry.id)
            }

            logger.info(`[AutoExtract] Completed for session ${session.id}: ${savedCount} memories saved in ${Date.now() - startTime}ms`)
        } catch (error) {
            logger.error(`[AutoExtract] Extraction error for session ${session.id}:`, error)
        } finally {
            this.inProgress = false

            // trailing run：处理排队的请求（来自 claude-code）
            if (this.pendingContext) {
                const trailing = this.pendingContext
                this.pendingContext = null
                logger.info('[AutoExtract] Running trailing extraction for stashed context')
                await this.runExtraction(trailing)
            }
        }
    }

    /**
     * 本地规则提取（不依赖 AI API 的 fallback）
     * 从 TraceEntry 中基于模式匹配提取记忆
     */
    private localExtract(entries: TraceEntry[]): Array<{ summary: string; category: string }> {
        const memories: Array<{ summary: string; category: string }> = []

        for (const entry of entries) {
            // 提取错误修复经验
            if (entry.type === 'error' || entry.type === 'result') {
                if (entry.content.length > 50 && (
                    entry.content.includes('fix') ||
                    entry.content.includes('修复') ||
                    entry.content.includes('解决') ||
                    entry.content.includes('resolved')
                )) {
                    memories.push({
                        summary: `[${entry.title}] ${entry.content.substring(0, 200)}`,
                        category: 'error_fix',
                    })
                }
            }

            // 提取步骤中的关键发现
            if (entry.type === 'step' && entry.metadata) {
                try {
                    const meta = JSON.parse(entry.metadata)
                    if (meta.discovery || meta.learning || meta.important) {
                        memories.push({
                            summary: meta.discovery || meta.learning || meta.important,
                            category: 'workflow',
                        })
                    }
                } catch {
                    // metadata 非 JSON，忽略
                }
            }
        }

        // 去重：相同 category 只保留最新的 3 条
        const grouped = new Map<string, typeof memories>()
        for (const mem of memories) {
            const group = grouped.get(mem.category) || []
            group.push(mem)
            grouped.set(mem.category, group)
        }

        const result: typeof memories = []
        for (const [_, group] of grouped) {
            result.push(...group.slice(-3))
        }

        return result
    }

    /**
     * 获取游标之后的新 entries
     */
    private getNewEntries(entries: TraceEntry[], sessionId: string): TraceEntry[] {
        const cursor = this.lastProcessedEntryId.get(sessionId)
        if (!cursor) return entries

        const cursorIdx = entries.findIndex((e) => e.id === cursor)
        if (cursorIdx === -1) return entries  // 游标丢失，返回全部

        return entries.slice(cursorIdx + 1)
    }

    /**
     * 获取提取 prompt（供外部 AI 调用使用）
     * 当有 AI API 可用时，调用方可以用这个 prompt 让 AI 做更智能的提取
     */
    async getExtractionPrompt(sessionId: string): Promise<string | null> {
        const session = await this.prisma.taskSession.findUnique({
            where: { id: sessionId },
            include: { entries: { orderBy: { timestamp: 'asc' } } },
        })

        if (!session || session.entries.length === 0) return null

        const newEntries = this.getNewEntries(session.entries, session.id)
        if (newEntries.length === 0) return null

        const existingMemories = await this.prisma.memory.findMany({
            where: { deviceId: session.deviceId },
            select: { summary: true },
            take: 20,
            orderBy: { updatedAt: 'desc' },
        })

        return buildExtractionPrompt(
            newEntries.slice(-MAX_ENTRIES_PER_EXTRACTION),
            existingMemories.map((m) => m.summary),
        )
    }

    /**
     * 用 AI 返回的 JSON 结果保存记忆
     * @param sessionId 会话 ID
     * @param aiResult AI 返回的 JSON 数组字符串
     */
    async saveAIExtractedMemories(
        sessionId: string,
        aiResult: Array<{ summary: string; category: string }>,
    ): Promise<number> {
        const session = await this.prisma.taskSession.findUnique({
            where: { id: sessionId },
            include: { entries: { orderBy: { timestamp: 'asc' } } },
        })

        if (!session) return 0

        let savedCount = 0
        for (const mem of aiResult) {
            // 秘密扫描
            const secrets = scanForSecrets(mem.summary)
            if (secrets.length > 0) {
                logger.warn(`[AutoExtract] Skipping AI memory with secrets: ${secrets.join(', ')}`)
                continue
            }

            try {
                await this.prisma.memory.create({
                    data: {
                        id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        deviceId: session.deviceId,
                        summary: redactSecrets(mem.summary),
                        category: mem.category || 'other',
                        mem0UserId: `device_${session.deviceId}`,
                    },
                })
                savedCount++
            } catch (error) {
                logger.error('[AutoExtract] Failed to save AI memory:', error)
            }
        }

        // 推进游标
        const lastEntry = session.entries[session.entries.length - 1]
        if (lastEntry) {
            this.lastProcessedEntryId.set(sessionId, lastEntry.id)
        }

        logger.info(`[AutoExtract] Saved ${savedCount} AI-extracted memories for session ${sessionId}`)
        return savedCount
    }
}

// ============================================================================
// Singleton
// ============================================================================

let autoExtractInstance: AutoExtractMemoryService | null = null

export function getAutoExtractMemoryService(prisma: PrismaClient): AutoExtractMemoryService {
    if (!autoExtractInstance) {
        autoExtractInstance = new AutoExtractMemoryService(prisma)
    }
    return autoExtractInstance
}
