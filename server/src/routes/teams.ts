import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Helper to parse JSON fields
const parseTeam = (team: any) => ({
  ...team,
  defaultWorkflows: team.defaultWorkflows ? JSON.parse(team.defaultWorkflows) : null
})

// Get all teams
router.get('/', async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        members: {
          include: {
            device: {
              select: {
                id: true,
                name: true,
                type: true,
                status: true,
                role: true,
                agentTemplate: {
                  select: {
                    code: true,
                    name: true,
                    title: true,
                    icon: true
                  }
                }
              }
            }
          },
          orderBy: { priority: 'asc' }
        }
      }
    })

    res.json(teams.map(parseTeam))
  } catch (error) {
    console.error('Failed to fetch teams:', error)
    res.status(500).json({ error: 'Failed to fetch teams' })
  }
})

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            device: {
              include: {
                agentTemplate: true
              }
            }
          },
          orderBy: { priority: 'asc' }
        }
      }
    })

    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    res.json(parseTeam(team))
  } catch (error) {
    console.error('Failed to fetch team:', error)
    res.status(500).json({ error: 'Failed to fetch team' })
  }
})

// Create team
router.post('/', async (req, res) => {
  try {
    const team = await prisma.team.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        mode: req.body.mode || 'sequential',
        defaultWorkflows: req.body.defaultWorkflows
          ? JSON.stringify(req.body.defaultWorkflows)
          : null,
        isBuiltIn: false
      }
    })

    res.status(201).json(parseTeam(team))
  } catch (error) {
    console.error('Failed to create team:', error)
    res.status(500).json({ error: 'Failed to create team' })
  }
})

// Update team
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.team.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Team not found' })
    }

    if (existing.isBuiltIn) {
      return res.status(403).json({ error: 'Cannot modify built-in teams' })
    }

    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        mode: req.body.mode,
        defaultWorkflows: req.body.defaultWorkflows
          ? JSON.stringify(req.body.defaultWorkflows)
          : undefined
      },
      include: {
        members: {
          include: {
            device: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    })

    res.json(parseTeam(team))
  } catch (error) {
    console.error('Failed to update team:', error)
    res.status(500).json({ error: 'Failed to update team' })
  }
})

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.team.findUnique({
      where: { id: req.params.id }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Team not found' })
    }

    if (existing.isBuiltIn) {
      return res.status(403).json({ error: 'Cannot delete built-in teams' })
    }

    await prisma.team.delete({
      where: { id: req.params.id }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Failed to delete team:', error)
    res.status(500).json({ error: 'Failed to delete team' })
  }
})

// ==================== Team Members ====================

// Add member to team
router.post('/:id/members', async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id }
    })

    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    const { deviceId, role, priority } = req.body

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' })
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId: req.params.id,
        deviceId,
        role,
        priority: priority || 0
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            agentTemplate: {
              select: {
                code: true,
                name: true,
                icon: true
              }
            }
          }
        }
      }
    })

    res.status(201).json(member)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Device is already a member of this team' })
    }
    console.error('Failed to add team member:', error)
    res.status(500).json({ error: 'Failed to add team member' })
  }
})

// Update member in team
router.put('/:id/members/:memberId', async (req, res) => {
  try {
    const member = await prisma.teamMember.update({
      where: { id: req.params.memberId },
      data: {
        role: req.body.role,
        priority: req.body.priority
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    res.json(member)
  } catch (error) {
    console.error('Failed to update team member:', error)
    res.status(500).json({ error: 'Failed to update team member' })
  }
})

// Remove member from team
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    await prisma.teamMember.delete({
      where: { id: req.params.memberId }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Failed to remove team member:', error)
    res.status(500).json({ error: 'Failed to remove team member' })
  }
})

// Get team availability (which members are online/idle)
router.get('/:id/availability', async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            device: {
              select: {
                id: true,
                name: true,
                status: true,
                currentProject: true,
                agentTemplate: {
                  select: {
                    code: true,
                    name: true,
                    icon: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    const availability = {
      teamId: team.id,
      teamName: team.name,
      totalMembers: team.members.length,
      online: team.members.filter(m => m.device.status === 'online' || m.device.status === 'idle').length,
      working: team.members.filter(m => m.device.status === 'working').length,
      offline: team.members.filter(m => m.device.status === 'offline').length,
      members: team.members.map(m => ({
        memberId: m.id,
        deviceId: m.device.id,
        deviceName: m.device.name,
        status: m.device.status,
        currentProject: m.device.currentProject,
        role: m.role,
        agent: m.device.agentTemplate
      }))
    }

    res.json(availability)
  } catch (error) {
    console.error('Failed to get team availability:', error)
    res.status(500).json({ error: 'Failed to get team availability' })
  }
})

export default router
