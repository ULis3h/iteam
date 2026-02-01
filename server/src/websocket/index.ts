import { Server as SocketIOServer, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import logger from '../utils/logger.js'

interface DeviceStatus {
  deviceId: string
  status: 'online' | 'offline' | 'idle' | 'working'
  currentProject?: string
  currentModule?: string
}

interface TaskUpdate {
  deviceId: string
  projectId: string
  module: string
  description: string
}

export function setupWebSocket(io: SocketIOServer, prisma: PrismaClient) {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`)

    // Device registration
    socket.on('device:register', async (data: {
      name: string
      type: string
      os: string
      ip: string
      metadata?: any
    }) => {
      try {
        // 从metadata中提取role和skills
        const role = data.metadata?.role || null
        const skills = data.metadata?.skills ? JSON.stringify(data.metadata.skills) : null

        const device = await prisma.device.upsert({
          where: { name: data.name },
          update: {
            status: 'online',
            lastSeen: new Date(),
            ip: data.ip,
            role: role,
            skills: skills,
          },
          create: {
            name: data.name,
            type: data.type,
            os: data.os,
            ip: data.ip,
            status: 'online',
            role: role,
            skills: skills,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          },
        })

        socket.data.deviceId = device.id
        socket.emit('device:registered', device)

        // Broadcast to all clients
        io.emit('device:status', {
          deviceId: device.id,
          name: device.name,
          status: 'online',
        })

        logger.info(`Device registered: ${data.name} (${device.id})`)
      } catch (error) {
        logger.error('Error registering device:', error)
        socket.emit('error', { message: 'Failed to register device' })
      }
    })

    // Device status update
    socket.on('device:status', async (data: DeviceStatus) => {
      try {
        const device = await prisma.device.update({
          where: { id: data.deviceId },
          data: {
            status: data.status,
            currentProject: data.currentProject,
            currentModule: data.currentModule,
            lastSeen: new Date(),
          },
        })

        // Broadcast to all clients
        io.emit('device:status', {
          deviceId: device.id,
          name: device.name,
          status: device.status,
          currentProject: device.currentProject,
          currentModule: device.currentModule,
        })

        logger.info(`Device status updated: ${device.name} - ${device.status}`)
      } catch (error) {
        logger.error('Error updating device status:', error)
        socket.emit('error', { message: 'Failed to update device status' })
      }
    })

    // Task update
    socket.on('task:update', async (data: TaskUpdate) => {
      try {
        const task = await prisma.task.create({
          data: {
            deviceId: data.deviceId,
            projectId: data.projectId,
            module: data.module,
            description: data.description,
            status: 'active',
          },
        })

        // Update device status
        await prisma.device.update({
          where: { id: data.deviceId },
          data: {
            currentProject: data.projectId,
            currentModule: data.module,
            status: 'working',
            lastSeen: new Date(),
          },
        })

        // Broadcast to all clients
        io.emit('task:update', task)

        logger.info(`Task created: ${data.module} for device ${data.deviceId}`)
      } catch (error) {
        logger.error('Error creating task:', error)
        socket.emit('error', { message: 'Failed to create task' })
      }
    })

    // Heartbeat (simple ping/pong)
    socket.on('ping', async () => {
      if (socket.data.deviceId) {
        await prisma.device.update({
          where: { id: socket.data.deviceId },
          data: { lastSeen: new Date() },
        })
      }
      socket.emit('pong')
    })

    // Device heartbeat (with metadata)
    socket.on('device:heartbeat', async (data: {
      deviceId?: string
      timestamp?: number
      cpuUsage?: any
      memoryUsage?: any
    }) => {
      const deviceId = data?.deviceId || socket.data.deviceId
      if (deviceId) {
        try {
          await prisma.device.update({
            where: { id: deviceId },
            data: { lastSeen: new Date() },
          })
          socket.emit('heartbeat:ack', { timestamp: Date.now() })
        } catch (error) {
          // Device might not exist, ignore silently
        }
      }
    })

    // Disconnection
    socket.on('disconnect', async () => {
      logger.info(`Client disconnected: ${socket.id}`)

      if (socket.data.deviceId) {
        try {
          const device = await prisma.device.update({
            where: { id: socket.data.deviceId },
            data: { status: 'offline' },
          })

          // Broadcast to all clients
          io.emit('device:status', {
            deviceId: device.id,
            name: device.name,
            status: 'offline',
          })

          logger.info(`Device offline: ${device.name}`)
        } catch (error) {
          logger.error('Error updating device on disconnect:', error)
        }
      }
    })

    // ============== 任务执行追踪实时同步 ==============

    // 同步追踪会话
    socket.on('trace:session', async (data: {
      id: string
      taskId?: string
      deviceId: string
      status: string
      title?: string
      startTime: string
      endTime?: string
    }) => {
      try {
        const session = await prisma.taskSession.upsert({
          where: { id: data.id },
          update: {
            status: data.status,
            title: data.title,
            endTime: data.endTime ? new Date(data.endTime) : undefined,
          },
          create: {
            id: data.id,
            taskId: data.taskId,
            deviceId: data.deviceId,
            status: data.status,
            title: data.title,
            startTime: new Date(data.startTime),
          },
        })

        // 广播给订阅此设备的客户端
        io.emit('trace:session:update', session)
        logger.info(`Trace session synced: ${session.id}`)
      } catch (error) {
        logger.error('Error syncing trace session:', error)
        socket.emit('error', { message: 'Failed to sync trace session' })
      }
    })

    // 同步追踪条目
    socket.on('trace:entry', async (data: {
      id: string
      sessionId: string
      type: string
      title: string
      content: string
      metadata?: any
      duration?: number
      timestamp: string
    }) => {
      try {
        const entry = await prisma.traceEntry.upsert({
          where: { id: data.id },
          update: {
            type: data.type,
            title: data.title,
            content: data.content,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            duration: data.duration,
          },
          create: {
            id: data.id,
            sessionId: data.sessionId,
            type: data.type,
            title: data.title,
            content: data.content,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            duration: data.duration,
            timestamp: new Date(data.timestamp),
          },
        })

        // 广播给订阅此会话的客户端
        io.emit('trace:entry:update', entry)
      } catch (error) {
        logger.error('Error syncing trace entry:', error)
        socket.emit('error', { message: 'Failed to sync trace entry' })
      }
    })

    // 订阅设备追踪更新
    socket.on('trace:subscribe', (deviceId: string) => {
      socket.join(`trace:${deviceId}`)
      logger.info(`Client subscribed to trace updates for device: ${deviceId}`)
    })

    // 取消订阅
    socket.on('trace:unsubscribe', (deviceId: string) => {
      socket.leave(`trace:${deviceId}`)
    })
  })

  // Periodic cleanup of stale devices
  setInterval(async () => {
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes
    try {
      const staleDevices = await prisma.device.findMany({
        where: {
          lastSeen: { lt: staleThreshold },
          status: { not: 'offline' },
        },
      })

      for (const device of staleDevices) {
        await prisma.device.update({
          where: { id: device.id },
          data: { status: 'offline' },
        })

        io.emit('device:status', {
          deviceId: device.id,
          name: device.name,
          status: 'offline',
        })

        logger.info(`Device marked as offline due to inactivity: ${device.name}`)
      }
    } catch (error) {
      logger.error('Error in cleanup task:', error)
    }
  }, 60000) // Run every minute
}
