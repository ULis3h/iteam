import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import logger from '../utils/logger.js'

/**
 * MCP (Model Context Protocol) 服务器实现
 * 用于与各类IDE客户端进行通信
 */

interface MCPMessage {
  jsonrpc: '2.0'
  method: string
  params?: any
  id?: number | string
}

interface MCPResponse {
  jsonrpc: '2.0'
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
  id?: number | string
}

export class MCPServer {
  private io: SocketIOServer
  private prisma: PrismaClient

  constructor(io: SocketIOServer, prisma: PrismaClient) {
    this.io = io
    this.prisma = prisma
  }

  /**
   * 初始化MCP服务器
   */
  initialize() {
    logger.info('Initializing MCP server...')

    this.io.on('connection', (socket) => {
      logger.info(`MCP client connected: ${socket.id}`)

      socket.on('mcp:message', async (message: MCPMessage) => {
        const response = await this.handleMessage(socket.id, message)
        socket.emit('mcp:response', response)
      })

      socket.on('disconnect', () => {
        logger.info(`MCP client disconnected: ${socket.id}`)
      })
    })
  }

  /**
   * 处理MCP消息
   */
  private async handleMessage(
    socketId: string,
    message: MCPMessage
  ): Promise<MCPResponse> {
    try {
      logger.info(`MCP message received: ${message.method}`)

      switch (message.method) {
        case 'device/register':
          return await this.handleDeviceRegister(socketId, message)

        case 'device/status':
          return await this.handleDeviceStatus(message)

        case 'task/update':
          return await this.handleTaskUpdate(message)

        case 'contribution/report':
          return await this.handleContributionReport(message)

        case 'ping':
          return this.handlePing(message)

        default:
          return this.createErrorResponse(
            message.id,
            -32601,
            `Method not found: ${message.method}`
          )
      }
    } catch (error: any) {
      logger.error('Error handling MCP message:', error)
      return this.createErrorResponse(
        message.id,
        -32603,
        'Internal error',
        error.message
      )
    }
  }

  /**
   * 处理设备注册
   */
  private async handleDeviceRegister(
    socketId: string,
    message: MCPMessage
  ): Promise<MCPResponse> {
    const { name, type, os, ip, metadata } = message.params

    const device = await this.prisma.device.upsert({
      where: { name },
      update: {
        status: 'online',
        lastSeen: new Date(),
        ip,
        os,
      },
      create: {
        name,
        type,
        os,
        ip,
        status: 'online',
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    // 广播设备上线事件
    this.io.emit('device:status', {
      deviceId: device.id,
      name: device.name,
      status: 'online',
    })

    logger.info(`Device registered via MCP: ${name} (${device.id})`)

    return this.createSuccessResponse(message.id, {
      deviceId: device.id,
      status: 'registered',
    })
  }

  /**
   * 处理设备状态更新
   */
  private async handleDeviceStatus(message: MCPMessage): Promise<MCPResponse> {
    const { deviceId, status, currentProject, currentModule } = message.params

    const device = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status,
        currentProject,
        currentModule,
        lastSeen: new Date(),
      },
    })

    // 广播状态变化
    this.io.emit('device:status', {
      deviceId: device.id,
      name: device.name,
      status: device.status,
      currentProject: device.currentProject,
      currentModule: device.currentModule,
    })

    logger.info(`Device status updated via MCP: ${device.name} - ${status}`)

    return this.createSuccessResponse(message.id, { success: true })
  }

  /**
   * 处理任务更新
   */
  private async handleTaskUpdate(message: MCPMessage): Promise<MCPResponse> {
    const { deviceId, projectId, module, description } = message.params

    const task = await this.prisma.task.create({
      data: {
        deviceId,
        projectId,
        module,
        description,
        status: 'active',
      },
    })

    // 更新设备状态
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        currentProject: projectId,
        currentModule: module,
        status: 'working',
        lastSeen: new Date(),
      },
    })

    // 广播任务更新
    this.io.emit('task:update', task)

    logger.info(`Task created via MCP: ${module}`)

    return this.createSuccessResponse(message.id, { taskId: task.id })
  }

  /**
   * 处理代码贡献报告
   */
  private async handleContributionReport(
    message: MCPMessage
  ): Promise<MCPResponse> {
    const { deviceId, projectId, commits, linesAdded, linesDeleted } =
      message.params

    const contribution = await this.prisma.contribution.upsert({
      where: {
        deviceId_projectId: {
          deviceId,
          projectId,
        },
      },
      update: {
        commits: { increment: commits || 0 },
        linesAdded: { increment: linesAdded || 0 },
        linesDeleted: { increment: linesDeleted || 0 },
      },
      create: {
        deviceId,
        projectId,
        commits: commits || 0,
        linesAdded: linesAdded || 0,
        linesDeleted: linesDeleted || 0,
      },
    })

    logger.info(`Contribution reported via MCP: ${commits} commits`)

    return this.createSuccessResponse(message.id, {
      contributionId: contribution.id,
    })
  }

  /**
   * 处理ping
   */
  private handlePing(message: MCPMessage): MCPResponse {
    return this.createSuccessResponse(message.id, { pong: true })
  }

  /**
   * 创建成功响应
   */
  private createSuccessResponse(id: any, result: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      result,
      id,
    }
  }

  /**
   * 创建错误响应
   */
  private createErrorResponse(
    id: any,
    code: number,
    message: string,
    data?: any
  ): MCPResponse {
    return {
      jsonrpc: '2.0',
      error: {
        code,
        message,
        data,
      },
      id,
    }
  }
}

/**
 * 初始化MCP服务器
 */
export function initializeMCP(io: SocketIOServer, prisma: PrismaClient) {
  const mcpServer = new MCPServer(io, prisma)
  mcpServer.initialize()
  return mcpServer
}
