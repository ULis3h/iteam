/**
 * Session Memory Service
 *
 * 参考 claude-code/src/services/SessionMemory/ 设计模式。
 * 为每个 TaskSession 维护结构化 markdown 笔记，自动从 TraceEntry 中
 * 提取关键信息（当前状态、文件、错误、经验等）。
 *
 * 核心设计（来自 claude-code）：
 * - 结构化模板：固定 section 格式，AI 只更新 section 内容
 * - 阈值触发：基于 TraceEntry 数量决定何时触发更新
 * - Section 大小控制：每个 section 有字符上限
 * - 增量更新：只替换变化的 section
 */

import { PrismaClient, type TaskSession, type TraceEntry } from '@prisma/client'
import logger from '../utils/logger.js'

// ============================================================================
// Constants & Template
// ============================================================================

/** 触发会话记忆更新的最少新 entry 数 */
const MIN_ENTRIES_FOR_UPDATE = 5

/** 每个 section 的最大字符数 */
const MAX_SECTION_CHARS = 4000

/** 总笔记最大字符数 */
const MAX_TOTAL_CHARS = 20000

/**
 * 会话记忆模板
 * 参考 claude-code SessionMemory/prompts.ts 的 DEFAULT_SESSION_MEMORY_TEMPLATE
 * 适配为 iTeam 的任务执行场景
 */
export const TASK_SESSION_MEMORY_TEMPLATE = `# Session Title
_任务简述_

# Current State
_当前进展、正在执行什么、下一步_

# Task Specification
_用户要求做什么？设计决策和说明性上下文_

# Key Files
_涉及的重要文件，简述内容和相关性_

# Commands & Workflow
_执行了什么命令，输出如何解读_

# Errors & Fixes
_遇到的错误及修复方法，失败的尝试（不要再尝试的方案）_

# Learnings
_成功经验、需要避免的坑。不要与其他 section 重复_

# Work Log
_逐步记录尝试和完成的工作，每步用极简摘要_
`

// ============================================================================
// Section Parser
// ============================================================================

interface Section {
    header: string
    description: string  // italic description line
    content: string
}

/**
 * 解析 markdown 会话笔记为 section 数组
 */
export function parseSections(markdown: string): Section[] {
    const lines = markdown.split('\n')
    const sections: Section[] = []
    let currentHeader = ''
    let currentDescription = ''
    let currentContent: string[] = []
    let headerSeen = false

    for (const line of lines) {
        if (line.startsWith('# ')) {
            // Flush previous section
            if (headerSeen) {
                sections.push({
                    header: currentHeader,
                    description: currentDescription,
                    content: currentContent.join('\n').trim(),
                })
            }
            currentHeader = line
            currentDescription = ''
            currentContent = []
            headerSeen = true
        } else if (headerSeen && !currentDescription && line.startsWith('_') && line.endsWith('_')) {
            currentDescription = line
        } else {
            currentContent.push(line)
        }
    }

    // Flush last section
    if (headerSeen) {
        sections.push({
            header: currentHeader,
            description: currentDescription,
            content: currentContent.join('\n').trim(),
        })
    }

    return sections
}

/**
 * 将 section 数组重新组合为 markdown 字符串
 */
export function renderSections(sections: Section[]): string {
    return sections
        .map((s) => {
            const parts = [s.header]
            if (s.description) parts.push(s.description)
            if (s.content) parts.push(s.content)
            return parts.join('\n')
        })
        .join('\n\n')
}

// ============================================================================
// Section Size Control (from claude-code SessionMemory/prompts.ts)
// ============================================================================

/**
 * 截断超过字符限制的 section
 * 参考 claude-code 的 truncateSessionMemoryForCompact
 */
export function truncateSections(sections: Section[]): { sections: Section[]; wasTruncated: boolean } {
    let wasTruncated = false

    const result = sections.map((section) => {
        if (section.content.length <= MAX_SECTION_CHARS) {
            return section
        }

        wasTruncated = true
        const lines = section.content.split('\n')
        let charCount = 0
        const keptLines: string[] = []

        for (const line of lines) {
            if (charCount + line.length + 1 > MAX_SECTION_CHARS) break
            keptLines.push(line)
            charCount += line.length + 1
        }

        keptLines.push('\n[... section truncated for length ...]')

        return {
            ...section,
            content: keptLines.join('\n'),
        }
    })

    return { sections: result, wasTruncated }
}

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * 构建会话记忆更新 prompt
 * 参考 claude-code SessionMemory/prompts.ts 的 buildSessionMemoryUpdatePrompt
 */
export function buildSessionMemoryUpdatePrompt(
    currentMemory: string,
    traceEntries: TraceEntry[],
): string {
    // 将 TraceEntry 转换为对话摘要
    const entrySummary = traceEntries
        .map((e) => `[${e.type}] ${e.title}: ${e.content.substring(0, 500)}`)
        .join('\n\n')

    // 分析 section 大小
    const sections = parseSections(currentMemory)
    const oversizedWarnings = sections
        .filter((s) => s.content.length > MAX_SECTION_CHARS)
        .map((s) => `- "${s.header}" 当前 ${s.content.length} 字符（限制: ${MAX_SECTION_CHARS}）`)
        .join('\n')

    const totalChars = currentMemory.length
    const budgetWarning =
        totalChars > MAX_TOTAL_CHARS
            ? `\n\n⚠️ 会话笔记总长度 ${totalChars} 字符，超过限制 ${MAX_TOTAL_CHARS}。请压缩较旧的内容。`
            : ''

    return `基于以下任务执行记录，更新会话笔记。

## 当前笔记内容
<current_notes>
${currentMemory}
</current_notes>

## 新的执行记录
<trace_entries>
${entrySummary}
</trace_entries>

## 更新规则
1. 保持所有 section 标题（# 开头的行）和斜体描述行（_开头结尾的行）不变
2. 只更新 section 内容，不添加新 section
3. "Current State" 必须反映最新进展
4. 写具体内容：文件路径、命令、错误信息等
5. 每个 section 不超过 ${MAX_SECTION_CHARS} 字符
6. 如无新信息可加，跳过该 section${oversizedWarnings ? `\n\n需要压缩的超长 section：\n${oversizedWarnings}` : ''}${budgetWarning}

请直接返回更新后的完整 markdown 笔记内容，不要包含任何其他说明。`
}

// ============================================================================
// Service
// ============================================================================

export class SessionMemoryService {
    private prisma: PrismaClient
    /** 每个 session 上次处理到的 entry ID（游标追踪，来自 claude-code） */
    private cursors = new Map<string, string>()

    constructor(prisma: PrismaClient) {
        this.prisma = prisma
    }

    /**
     * 初始化 session 的会话记忆（首次创建时调用）
     */
    async initializeMemory(sessionId: string): Promise<void> {
        const session = await this.prisma.taskSession.findUnique({
            where: { id: sessionId },
        })

        if (!session) return
        if (session.sessionMemory) return  // 已经初始化

        await this.prisma.taskSession.update({
            where: { id: sessionId },
            data: {
                sessionMemory: TASK_SESSION_MEMORY_TEMPLATE,
                memoryVersion: 1,
            },
        })

        logger.info(`[SessionMemory] Initialized memory for session ${sessionId}`)
    }

    /**
     * 检查是否需要更新会话记忆
     * 参考 claude-code 的 shouldExtractMemory：基于新 entry 数量判断
     */
    shouldUpdate(entries: TraceEntry[], sessionId: string): boolean {
        const cursor = this.cursors.get(sessionId)

        if (!cursor) {
            // 从未更新过，只要 entry 够多就更新
            return entries.length >= MIN_ENTRIES_FOR_UPDATE
        }

        // 计算游标之后的新 entry 数
        const cursorIdx = entries.findIndex((e) => e.id === cursor)
        if (cursorIdx === -1) {
            // 游标 entry 已被清理，重新计算
            return entries.length >= MIN_ENTRIES_FOR_UPDATE
        }

        const newCount = entries.length - cursorIdx - 1
        return newCount >= MIN_ENTRIES_FOR_UPDATE
    }

    /**
     * 获取自上次更新以来的新 entries
     */
    getNewEntries(entries: TraceEntry[], sessionId: string): TraceEntry[] {
        const cursor = this.cursors.get(sessionId)
        if (!cursor) return entries

        const cursorIdx = entries.findIndex((e) => e.id === cursor)
        if (cursorIdx === -1) return entries

        return entries.slice(cursorIdx + 1)
    }

    /**
     * 用 AI 返回的内容更新会话记忆
     * 执行更新并推进游标
     */
    async updateMemory(
        sessionId: string,
        updatedContent: string,
        entries: TraceEntry[],
    ): Promise<void> {
        // 截断超长 section
        const sections = parseSections(updatedContent)
        const { sections: truncated, wasTruncated } = truncateSections(sections)
        const finalContent = wasTruncated ? renderSections(truncated) : updatedContent

        // 总长度控制
        const content = finalContent.length > MAX_TOTAL_CHARS
            ? finalContent.substring(0, MAX_TOTAL_CHARS) + '\n\n[... truncated ...]'
            : finalContent

        await this.prisma.taskSession.update({
            where: { id: sessionId },
            data: {
                sessionMemory: content,
                memoryVersion: { increment: 1 },
            },
        })

        // 推进游标
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
            this.cursors.set(sessionId, lastEntry.id)
        }

        logger.info(`[SessionMemory] Updated memory for session ${sessionId} (${content.length} chars, truncated=${wasTruncated})`)
    }

    /**
     * 获取会话的当前记忆内容
     */
    async getMemory(sessionId: string): Promise<string | null> {
        const session = await this.prisma.taskSession.findUnique({
            where: { id: sessionId },
            select: { sessionMemory: true },
        })
        return session?.sessionMemory || null
    }

    /**
     * 构建更新 prompt（供外部 AI 调用使用）
     */
    async buildUpdatePrompt(sessionId: string): Promise<{ prompt: string; entries: TraceEntry[] } | null> {
        const session = await this.prisma.taskSession.findUnique({
            where: { id: sessionId },
            include: { entries: { orderBy: { timestamp: 'asc' } } },
        })

        if (!session) return null

        const currentMemory = session.sessionMemory || TASK_SESSION_MEMORY_TEMPLATE
        const newEntries = this.getNewEntries(session.entries, sessionId)

        if (newEntries.length === 0) return null

        return {
            prompt: buildSessionMemoryUpdatePrompt(currentMemory, newEntries),
            entries: session.entries,
        }
    }
}

// ============================================================================
// Singleton
// ============================================================================

let sessionMemoryServiceInstance: SessionMemoryService | null = null

export function getSessionMemoryService(prisma: PrismaClient): SessionMemoryService {
    if (!sessionMemoryServiceInstance) {
        sessionMemoryServiceInstance = new SessionMemoryService(prisma)
    }
    return sessionMemoryServiceInstance
}
