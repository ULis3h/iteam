import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { Server as SocketIOServer } from 'socket.io'

const prisma = new PrismaClient()

// 创建路由工厂函数，接收 Socket.IO 实例
export function createDeviceRouter(io?: SocketIOServer) {
  const router = Router()

  // Get all devices
  router.get('/', async (req, res) => {
    try {
      const devices = await prisma.device.findMany({
        orderBy: { createdAt: 'desc' },
      })
      res.json(devices)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch devices' })
    }
  })

  // Get device by ID
  router.get('/:id', async (req, res) => {
    try {
      const device = await prisma.device.findUnique({
        where: { id: req.params.id },
        include: {
          contributions: {
            include: {
              project: true,
            },
          },
          tasks: {
            include: {
              project: true,
            },
            where: {
              status: 'active',
            },
          },
        },
      })

      if (!device) {
        return res.status(404).json({ error: 'Device not found' })
      }

      res.json(device)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch device' })
    }
  })

  // Create device
  router.post('/', async (req, res) => {
    try {
      const device = await prisma.device.create({
        data: {
          name: req.body.name,
          type: req.body.type,
          role: req.body.role,
          skills: req.body.skills ? JSON.stringify(req.body.skills) : null,
          documentIds: req.body.documentIds ? JSON.stringify(req.body.documentIds) : null,
          os: req.body.os,
          ip: req.body.ip,
          metadata: req.body.metadata ? JSON.stringify(req.body.metadata) : null,
        },
      })
      res.status(201).json(device)
    } catch (error) {
      res.status(500).json({ error: 'Failed to create device' })
    }
  })

  // Update device
  router.put('/:id', async (req, res) => {
    try {
      // 获取更新前的设备信息
      const oldDevice = await prisma.device.findUnique({
        where: { id: req.params.id },
      })

      const device = await prisma.device.update({
        where: { id: req.params.id },
        data: {
          name: req.body.name,
          type: req.body.type,
          role: req.body.role,
          skills: req.body.skills ? JSON.stringify(req.body.skills) : undefined,
          documentIds: req.body.documentIds ? JSON.stringify(req.body.documentIds) : undefined,
          os: req.body.os,
          ip: req.body.ip,
          status: req.body.status,
          currentProject: req.body.currentProject,
          currentModule: req.body.currentModule,
          metadata: req.body.metadata ? JSON.stringify(req.body.metadata) : undefined,
          lastSeen: new Date(), // 自动更新最后活跃时间
        },
      })

      // 广播设备配置更新事件
      if (io) {
        const eventData = {
          deviceId: device.id,
          name: device.name,
          role: device.role,
          skills: device.skills,
          oldRole: oldDevice?.role,
          updatedAt: new Date().toISOString(),
        }
        io.emit('device:config-updated', eventData)
      }

      res.json(device)
    } catch (error) {
      res.status(500).json({ error: 'Failed to update device' })
    }
  })


  // Delete device
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.device.delete({
        where: { id: req.params.id },
      })
      res.status(204).send()
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete device' })
    }
  })

  return router
}

// 保持向后兼容的默认导出
const defaultRouter = createDeviceRouter()
export default defaultRouter

