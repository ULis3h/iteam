/**
 * iTeam Standard MCP Server
 *
 * 基于 Anthropic 官方 SDK 实现的标准 MCP Server
 * 允许 Claude Desktop 等标准 MCP 客户端访问 iTeam 功能
 *
 * 使用方式:
 *   npx tsx src/mcp/standard-mcp-server.ts
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 创建 MCP Server 实例
const server = new McpServer({
    name: 'iteam-mcp-server',
    version: '1.0.0',
})

// ============== Tools ==============

// Tool: 列出所有设备
server.tool(
    'list_devices',
    '获取 iTeam 中所有注册的设备列表，包括状态信息',
    {},
    async () => {
        try {
            const devices = await prisma.device.findMany({
                orderBy: { lastSeen: 'desc' },
            })

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            devices.map((d) => ({
                                id: d.id,
                                name: d.name,
                                type: d.type,
                                status: d.status,
                                os: d.os,
                                currentProject: d.currentProject,
                                lastSeen: d.lastSeen,
                            })),
                            null,
                            2
                        ),
                    },
                ],
            }
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
)

// Tool: 获取设备详情
server.tool(
    'get_device',
    '获取指定设备的详细信息',
    {
        deviceId: z.string().describe('设备ID'),
    },
    async ({ deviceId }) => {
        try {
            const device = await prisma.device.findUnique({
                where: { id: deviceId },
            })

            if (!device) {
                return {
                    content: [{ type: 'text', text: `Device not found: ${deviceId}` }],
                    isError: true,
                }
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(device, null, 2),
                    },
                ],
            }
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
)

// Tool: 列出所有项目
server.tool('list_projects', '获取 iTeam 中所有项目列表', {}, async () => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { updatedAt: 'desc' },
        })

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(
                        projects.map((p) => ({
                            id: p.id,
                            name: p.name,
                            status: p.status,
                            description: p.description,
                        })),
                        null,
                        2
                    ),
                },
            ],
        }
    } catch (error: any) {
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        }
    }
})

// Tool: 搜索文档
server.tool(
    'search_documents',
    '在 iTeam 知识库中搜索文档',
    {
        query: z.string().describe('搜索关键词'),
        category: z
            .string()
            .optional()
            .describe('文档分类: standard, tech-note, bug-fix'),
    },
    async ({ query, category }) => {
        try {
            const documents = await prisma.document.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { title: { contains: query } },
                                { content: { contains: query } },
                            ],
                        },
                        category ? { category } : {},
                    ],
                },
                take: 10,
                orderBy: { updatedAt: 'desc' },
            })

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            documents.map((d) => ({
                                id: d.id,
                                title: d.title,
                                category: d.category,
                                updatedAt: d.updatedAt,
                            })),
                            null,
                            2
                        ),
                    },
                ],
            }
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
)

// Tool: 创建任务
server.tool(
    'create_task',
    '创建一个新任务并分配给指定设备',
    {
        title: z.string().describe('任务标题'),
        description: z.string().describe('任务描述'),
        deviceId: z.string().describe('目标设备ID'),
        projectId: z.string().describe('所属项目ID'),
        type: z
            .enum([
                'code_generation',
                'code_review',
                'bug_fix',
                'test_generation',
                'refactor',
                'custom',
            ])
            .default('custom')
            .describe('任务类型'),
        workDir: z.string().optional().describe('工作目录'),
    },
    async ({ title, description, deviceId, projectId, type, workDir }) => {
        try {
            // 检查设备是否存在且在线
            const device = await prisma.device.findUnique({
                where: { id: deviceId },
            })

            if (!device) {
                return {
                    content: [{ type: 'text', text: `Device not found: ${deviceId}` }],
                    isError: true,
                }
            }

            if (device.status === 'offline') {
                return {
                    content: [
                        { type: 'text', text: `Device is offline: ${device.name}` },
                    ],
                    isError: true,
                }
            }

            // 检查项目是否存在
            const project = await prisma.project.findUnique({
                where: { id: projectId },
            })

            if (!project) {
                return {
                    content: [{ type: 'text', text: `Project not found: ${projectId}` }],
                    isError: true,
                }
            }

            // 创建任务记录
            // Dispatch via REST API (which handles WebSocket emit)
            const serverUrl = process.env.SERVER_URL || 'http://localhost:3000'
            const apiKey = process.env.DEVICE_API_KEY || 'iteam-device-key'

            const response = await fetch(`${serverUrl}/api/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                },
                body: JSON.stringify({ title, description, deviceId, projectId, type, workDir }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                return {
                    content: [{ type: 'text', text: `Failed to create task: ${(errorData as any).error || response.statusText}` }],
                    isError: true,
                }
            }

            const result = await response.json() as any

            return {
                content: [
                    {
                        type: 'text',
                        text: `Task created and dispatched!\n\nTask ID: ${result.id}\nTitle: ${title}\nProject: ${project.name}\nAssigned to: ${device.name}\nDispatched: ${result.dispatched ? '✅ Yes' : '⚠️ Agent offline, will dispatch on reconnect'}\n\n${result.message}`,
                    },
                ],
            }
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
)

// Tool: 列出任务
server.tool(
    'list_tasks',
    '获取 iTeam 中的任务列表，可按设备、项目、状态筛选',
    {
        deviceId: z.string().optional().describe('按设备ID筛选'),
        projectId: z.string().optional().describe('按项目ID筛选'),
        status: z.string().optional().describe('按状态筛选: pending, active, completed, paused'),
        limit: z.number().optional().default(20).describe('返回数量限制'),
    },
    async ({ deviceId, projectId, status, limit }) => {
        try {
            const where: any = {}
            if (deviceId) where.deviceId = deviceId
            if (projectId) where.projectId = projectId
            if (status) where.status = status

            const tasks = await prisma.task.findMany({
                where,
                include: {
                    device: { select: { id: true, name: true, status: true } },
                    project: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            })

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            tasks.map((t) => ({
                                id: t.id,
                                module: t.module,
                                status: t.status,
                                device: t.device.name,
                                project: t.project.name,
                                createdAt: t.createdAt,
                                description: (() => {
                                    try { return JSON.parse(t.description) } catch { return t.description }
                                })(),
                            })),
                            null,
                            2
                        ),
                    },
                ],
            }
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
)

// Tool: 获取任务详情
server.tool(
    'get_task',
    '获取指定任务的详细信息，包括执行结果',
    {
        taskId: z.string().describe('任务ID'),
    },
    async ({ taskId }) => {
        try {
            const task = await prisma.task.findUnique({
                where: { id: taskId },
                include: {
                    device: { select: { id: true, name: true, status: true } },
                    project: { select: { id: true, name: true } },
                },
            })

            if (!task) {
                return {
                    content: [{ type: 'text', text: `Task not found: ${taskId}` }],
                    isError: true,
                }
            }

            let parsedDescription = task.description
            try { parsedDescription = JSON.parse(task.description) } catch { }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                id: task.id,
                                module: task.module,
                                status: task.status,
                                device: task.device,
                                project: task.project,
                                description: parsedDescription,
                                createdAt: task.createdAt,
                                updatedAt: task.updatedAt,
                            },
                            null,
                            2
                        ),
                    },
                ],
            }
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
)

// Tool: 获取系统统计
server.tool(
    'get_stats',
    '获取 iTeam 系统的统计概览',
    {},
    async () => {
        try {
            const [deviceCount, onlineCount, projectCount, documentCount] =
                await Promise.all([
                    prisma.device.count(),
                    prisma.device.count({ where: { status: 'online' } }),
                    prisma.project.count(),
                    prisma.document.count(),
                ])

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                总设备数: deviceCount,
                                在线设备数: onlineCount,
                                项目数: projectCount,
                                文档数: documentCount,
                            },
                            null,
                            2
                        ),
                    },
                ],
            }
        } catch (error: any) {
            return {
                content: [{ type: 'text', text: `Error: ${error.message}` }],
                isError: true,
            }
        }
    }
)

// ============== Resources ==============

// Resource: 文档内容
server.resource(
    'document',
    'document://{id}',
    async (uri) => {
        const match = uri.href.match(/document:\/\/(.+)/)
        if (!match) {
            return {
                contents: [{ uri: uri.href, text: 'Invalid document URI', mimeType: 'text/plain' }],
            }
        }

        const docId = match[1]
        const document = await prisma.document.findUnique({
            where: { id: docId },
        })

        if (!document) {
            return {
                contents: [{ uri: uri.href, text: 'Document not found', mimeType: 'text/plain' }],
            }
        }

        return {
            contents: [
                {
                    uri: uri.href,
                    text: `# ${document.title}\n\n${document.content}`,
                    mimeType: 'text/markdown',
                },
            ],
        }
    }
)

// ============== 启动服务器 ==============

async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('iTeam MCP Server started')
}

main().catch((error) => {
    console.error('Failed to start MCP server:', error)
    process.exit(1)
})
