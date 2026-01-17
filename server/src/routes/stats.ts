import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get overall statistics
router.get('/', async (req, res) => {
  try {
    const [totalDevices, onlineDevices, activeProjects, totalCommits, totalDocs] =
      await Promise.all([
        prisma.device.count(),
        prisma.device.count({
          where: { status: { in: ['online', 'working', 'idle'] } },
        }),
        prisma.project.count({
          where: { status: 'active' },
        }),
        prisma.contribution.aggregate({
          _sum: { commits: true },
        }),
        prisma.document.count(),
      ])

    res.json({
      totalDevices,
      onlineDevices,
      activeProjects,
      totalCommits: totalCommits._sum.commits || 0,
      totalDocs,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

// Get device statistics
router.get('/devices', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      include: {
        contributions: true,
        tasks: {
          where: { status: 'active' },
        },
      },
    })

    const stats = devices.map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.status,
      totalCommits: device.contributions.reduce((sum, c) => sum + c.commits, 0),
      totalLinesAdded: device.contributions.reduce((sum, c) => sum + c.linesAdded, 0),
      totalLinesDeleted: device.contributions.reduce((sum, c) => sum + c.linesDeleted, 0),
      activeTasks: device.tasks.length,
    }))

    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device statistics' })
  }
})

// Get project statistics
router.get('/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        contributions: true,
        tasks: {
          where: { status: 'active' },
        },
      },
    })

    const stats = projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      totalCommits: project.contributions.reduce((sum, c) => sum + c.commits, 0),
      totalLinesAdded: project.contributions.reduce((sum, c) => sum + c.linesAdded, 0),
      totalLinesDeleted: project.contributions.reduce((sum, c) => sum + c.linesDeleted, 0),
      contributors: project.contributions.length,
      activeTasks: project.tasks.length,
    }))

    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project statistics' })
  }
})

export default router
