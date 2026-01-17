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

    // Heartbeat
    socket.on('ping', async () => {
      if (socket.data.deviceId) {
        await prisma.device.update({
          where: { id: socket.data.deviceId },
          data: { lastSeen: new Date() },
        })
      }
      socket.emit('pong')
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
