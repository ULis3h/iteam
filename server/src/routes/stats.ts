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

// Get contribution history for charts
router.get('/contributions', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Get all contributions within date range
    // Note: In a real production app, we would group by date in the database query
    // But for SQLite/Prisma simplicity, we'll fetch and process in JS
    const contributions = await prisma.contribution.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        device: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Group by date and device
    const groupedData: Record<string, any> = {}

    // Initialize dates
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      groupedData[dateStr] = { date: dateStr }
    }

    contributions.forEach(c => {
      const dateStr = new Date(c.createdAt).toISOString().split('T')[0]
      if (groupedData[dateStr]) {
        if (!groupedData[dateStr][c.device.name]) {
          groupedData[dateStr][c.device.name] = 0
        }
        // We use commits as the metric for the chart
        groupedData[dateStr][c.device.name] += c.commits
      }
    })

    const chartData = Object.values(groupedData)
    res.json(chartData)
  } catch (error) {
    console.error('Failed to fetch contributions:', error)
    res.status(500).json({ error: 'Failed to fetch contribution statistics' })
  }
})

// Get overview stats for radar/pie charts
router.get('/overview', async (req, res) => {
  try {
    const [devices, tasks] = await Promise.all([
      prisma.device.findMany(),
      prisma.task.findMany()
    ])

    // Role distribution
    const roleDistribution: Record<string, number> = {}
    devices.forEach(d => {
      const role = d.role || 'other'
      roleDistribution[role] = (roleDistribution[role] || 0) + 1
    })

    // Task status distribution
    const taskStatusDistribution: Record<string, number> = {}
    tasks.forEach(t => {
      taskStatusDistribution[t.status] = (taskStatusDistribution[t.status] || 0) + 1
    })

    // Format for Radar Chart (Roles)
    const roleData = Object.entries(roleDistribution).map(([role, count]) => ({
      subject: role,
      A: count, // Frequency
      fullMark: devices.length
    }))

    // Format for Pie Chart (Tasks)
    const taskData = Object.entries(taskStatusDistribution).map(([status, count]) => ({
      name: status,
      value: count
    }))

    res.json({
      roles: roleData,
      tasks: taskData
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview statistics' })
  }
})

export default router
