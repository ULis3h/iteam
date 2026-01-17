import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

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

export default router
