import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Get all agent templates
router.get('/', async (req, res) => {
  try {
    const templates = await prisma.agentTemplate.findMany({
      orderBy: { code: 'asc' },
      include: {
        devices: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    // Parse JSON fields
    const parsed = templates.map(t => ({
      ...t,
      expertise: JSON.parse(t.expertise),
      principles: JSON.parse(t.principles),
      workflows: JSON.parse(t.workflows)
    }))

    res.json(parsed)
  } catch (error) {
    console.error('Failed to fetch agent templates:', error)
    res.status(500).json({ error: 'Failed to fetch agent templates' })
  }
})

// Get agent template by code
router.get('/:code', async (req, res) => {
  try {
    const template = await prisma.agentTemplate.findUnique({
      where: { code: req.params.code },
      include: {
        devices: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            skillLevel: true
          }
        }
      }
    })

    if (!template) {
      return res.status(404).json({ error: 'Agent template not found' })
    }

    // Parse JSON fields
    const parsed = {
      ...template,
      expertise: JSON.parse(template.expertise),
      principles: JSON.parse(template.principles),
      workflows: JSON.parse(template.workflows)
    }

    res.json(parsed)
  } catch (error) {
    console.error('Failed to fetch agent template:', error)
    res.status(500).json({ error: 'Failed to fetch agent template' })
  }
})

// Create custom agent template
router.post('/', async (req, res) => {
  try {
    const template = await prisma.agentTemplate.create({
      data: {
        code: req.body.code,
        name: req.body.name,
        title: req.body.title,
        icon: req.body.icon,
        role: req.body.role,
        experience: req.body.experience,
        expertise: JSON.stringify(req.body.expertise || []),
        communication: req.body.communication,
        principles: JSON.stringify(req.body.principles || []),
        workflows: JSON.stringify(req.body.workflows || []),
        isBuiltIn: false
      }
    })

    res.status(201).json({
      ...template,
      expertise: JSON.parse(template.expertise),
      principles: JSON.parse(template.principles),
      workflows: JSON.parse(template.workflows)
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Agent code already exists' })
    }
    console.error('Failed to create agent template:', error)
    res.status(500).json({ error: 'Failed to create agent template' })
  }
})

// Update agent template (only custom ones)
router.put('/:code', async (req, res) => {
  try {
    const existing = await prisma.agentTemplate.findUnique({
      where: { code: req.params.code }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Agent template not found' })
    }

    if (existing.isBuiltIn) {
      return res.status(403).json({ error: 'Cannot modify built-in agent templates' })
    }

    const template = await prisma.agentTemplate.update({
      where: { code: req.params.code },
      data: {
        name: req.body.name,
        title: req.body.title,
        icon: req.body.icon,
        role: req.body.role,
        experience: req.body.experience,
        expertise: req.body.expertise ? JSON.stringify(req.body.expertise) : undefined,
        communication: req.body.communication,
        principles: req.body.principles ? JSON.stringify(req.body.principles) : undefined,
        workflows: req.body.workflows ? JSON.stringify(req.body.workflows) : undefined
      }
    })

    res.json({
      ...template,
      expertise: JSON.parse(template.expertise),
      principles: JSON.parse(template.principles),
      workflows: JSON.parse(template.workflows)
    })
  } catch (error) {
    console.error('Failed to update agent template:', error)
    res.status(500).json({ error: 'Failed to update agent template' })
  }
})

// Delete custom agent template
router.delete('/:code', async (req, res) => {
  try {
    const existing = await prisma.agentTemplate.findUnique({
      where: { code: req.params.code }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Agent template not found' })
    }

    if (existing.isBuiltIn) {
      return res.status(403).json({ error: 'Cannot delete built-in agent templates' })
    }

    await prisma.agentTemplate.delete({
      where: { code: req.params.code }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Failed to delete agent template:', error)
    res.status(500).json({ error: 'Failed to delete agent template' })
  }
})

// Assign agent template to device
router.post('/:code/assign/:deviceId', async (req, res) => {
  try {
    const template = await prisma.agentTemplate.findUnique({
      where: { code: req.params.code }
    })

    if (!template) {
      return res.status(404).json({ error: 'Agent template not found' })
    }

    const device = await prisma.device.update({
      where: { id: req.params.deviceId },
      data: {
        agentTemplateId: template.id,
        role: template.code,  // Also update role field for backward compatibility
        agentConfig: req.body.config ? JSON.stringify(req.body.config) : null,
        skillLevel: req.body.skillLevel || 'intermediate'
      },
      include: {
        agentTemplate: true
      }
    })

    res.json(device)
  } catch (error) {
    console.error('Failed to assign agent template:', error)
    res.status(500).json({ error: 'Failed to assign agent template' })
  }
})

// Unassign agent template from device
router.delete('/:code/assign/:deviceId', async (req, res) => {
  try {
    const device = await prisma.device.update({
      where: { id: req.params.deviceId },
      data: {
        agentTemplateId: null,
        agentConfig: null
      }
    })

    res.json(device)
  } catch (error) {
    console.error('Failed to unassign agent template:', error)
    res.status(500).json({ error: 'Failed to unassign agent template' })
  }
})

export default router
