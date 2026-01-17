import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        contributions: {
          include: {
            device: true,
          },
        },
        tasks: {
          where: {
            status: 'active',
          },
          include: {
            device: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(projects)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        contributions: {
          include: {
            device: true,
          },
        },
        tasks: {
          include: {
            device: true,
          },
        },
      },
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(project)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// Create project
router.post('/', async (req, res) => {
  try {
    const project = await prisma.project.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        repository: req.body.repository,
        status: req.body.status || 'active',
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      },
    })
    res.status(201).json(project)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Update project
router.put('/:id', async (req, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        repository: req.body.repository,
        status: req.body.status,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      },
    })
    res.json(project)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    await prisma.project.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// Add contribution to project
router.post('/:id/contributions', async (req, res) => {
  try {
    const contribution = await prisma.contribution.upsert({
      where: {
        deviceId_projectId: {
          deviceId: req.body.deviceId,
          projectId: req.params.id,
        },
      },
      update: {
        commits: { increment: req.body.commits || 0 },
        linesAdded: { increment: req.body.linesAdded || 0 },
        linesDeleted: { increment: req.body.linesDeleted || 0 },
      },
      create: {
        deviceId: req.body.deviceId,
        projectId: req.params.id,
        commits: req.body.commits || 0,
        linesAdded: req.body.linesAdded || 0,
        linesDeleted: req.body.linesDeleted || 0,
      },
    })
    res.status(201).json(contribution)
  } catch (error) {
    res.status(500).json({ error: 'Failed to add contribution' })
  }
})

export default router
