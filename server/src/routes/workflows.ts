import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Helper to parse JSON fields
const parseWorkflow = (workflow: any) => ({
  ...workflow,
  steps: JSON.parse(workflow.steps),
  inputs: workflow.inputs ? JSON.parse(workflow.inputs) : null,
  outputs: workflow.outputs ? JSON.parse(workflow.outputs) : null,
  prerequisites: workflow.prerequisites ? JSON.parse(workflow.prerequisites) : null
})

// Get all workflows
router.get('/', async (req, res) => {
  try {
    const { phase, category, agentCode } = req.query

    const where: any = {}
    if (phase) where.phase = parseInt(phase as string)
    if (category) where.category = category
    if (agentCode) where.agentCode = agentCode

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: [{ phase: 'asc' }, { code: 'asc' }]
    })

    res.json(workflows.map(parseWorkflow))
  } catch (error) {
    console.error('Failed to fetch workflows:', error)
    res.status(500).json({ error: 'Failed to fetch workflows' })
  }
})

// Get workflow by code
router.get('/:code', async (req, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { code: req.params.code },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            project: { select: { id: true, name: true } },
            device: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    res.json(parseWorkflow(workflow))
  } catch (error) {
    console.error('Failed to fetch workflow:', error)
    res.status(500).json({ error: 'Failed to fetch workflow' })
  }
})

// Get quick-flow workflows
router.get('/category/quick-flow', async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { category: 'quick-flow' },
      orderBy: { code: 'asc' }
    })

    res.json(workflows.map(parseWorkflow))
  } catch (error) {
    console.error('Failed to fetch quick-flow workflows:', error)
    res.status(500).json({ error: 'Failed to fetch quick-flow workflows' })
  }
})

// Get workflows by phase
router.get('/phase/:phase', async (req, res) => {
  try {
    const phase = parseInt(req.params.phase)
    if (isNaN(phase) || phase < 1 || phase > 4) {
      return res.status(400).json({ error: 'Invalid phase (must be 1-4)' })
    }

    const workflows = await prisma.workflow.findMany({
      where: { phase },
      orderBy: { code: 'asc' }
    })

    res.json(workflows.map(parseWorkflow))
  } catch (error) {
    console.error('Failed to fetch workflows by phase:', error)
    res.status(500).json({ error: 'Failed to fetch workflows' })
  }
})

// Create custom workflow
router.post('/', async (req, res) => {
  try {
    const workflow = await prisma.workflow.create({
      data: {
        code: req.body.code,
        name: req.body.name,
        description: req.body.description,
        phase: req.body.phase,
        agentCode: req.body.agentCode,
        category: req.body.category || 'general',
        steps: JSON.stringify(req.body.steps || []),
        inputs: req.body.inputs ? JSON.stringify(req.body.inputs) : null,
        outputs: req.body.outputs ? JSON.stringify(req.body.outputs) : null,
        prerequisites: req.body.prerequisites ? JSON.stringify(req.body.prerequisites) : null,
        isBuiltIn: false
      }
    })

    res.status(201).json(parseWorkflow(workflow))
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Workflow code already exists' })
    }
    console.error('Failed to create workflow:', error)
    res.status(500).json({ error: 'Failed to create workflow' })
  }
})

// Update workflow
router.put('/:code', async (req, res) => {
  try {
    const existing = await prisma.workflow.findUnique({
      where: { code: req.params.code }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    if (existing.isBuiltIn) {
      return res.status(403).json({ error: 'Cannot modify built-in workflows' })
    }

    const workflow = await prisma.workflow.update({
      where: { code: req.params.code },
      data: {
        name: req.body.name,
        description: req.body.description,
        phase: req.body.phase,
        agentCode: req.body.agentCode,
        category: req.body.category,
        steps: req.body.steps ? JSON.stringify(req.body.steps) : undefined,
        inputs: req.body.inputs ? JSON.stringify(req.body.inputs) : undefined,
        outputs: req.body.outputs ? JSON.stringify(req.body.outputs) : undefined,
        prerequisites: req.body.prerequisites ? JSON.stringify(req.body.prerequisites) : undefined
      }
    })

    res.json(parseWorkflow(workflow))
  } catch (error) {
    console.error('Failed to update workflow:', error)
    res.status(500).json({ error: 'Failed to update workflow' })
  }
})

// Delete workflow
router.delete('/:code', async (req, res) => {
  try {
    const existing = await prisma.workflow.findUnique({
      where: { code: req.params.code }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    if (existing.isBuiltIn) {
      return res.status(403).json({ error: 'Cannot delete built-in workflows' })
    }

    await prisma.workflow.delete({
      where: { code: req.params.code }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Failed to delete workflow:', error)
    res.status(500).json({ error: 'Failed to delete workflow' })
  }
})

// ==================== Workflow Executions ====================

// Start workflow execution
router.post('/:code/execute', async (req, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { code: req.params.code }
    })

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const { projectId, deviceId, inputs } = req.body

    if (!projectId || !deviceId) {
      return res.status(400).json({ error: 'projectId and deviceId are required' })
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        projectId,
        deviceId,
        inputs: inputs ? JSON.stringify(inputs) : null,
        status: 'pending'
      },
      include: {
        workflow: true,
        project: { select: { id: true, name: true } },
        device: { select: { id: true, name: true } }
      }
    })

    res.status(201).json(execution)
  } catch (error) {
    console.error('Failed to start workflow execution:', error)
    res.status(500).json({ error: 'Failed to start workflow execution' })
  }
})

// Get all executions
router.get('/executions/all', async (req, res) => {
  try {
    const { status, projectId, deviceId, limit = '20' } = req.query

    const where: any = {}
    if (status) where.status = status
    if (projectId) where.projectId = projectId
    if (deviceId) where.deviceId = deviceId

    const executions = await prisma.workflowExecution.findMany({
      where,
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: { select: { code: true, name: true, phase: true } },
        project: { select: { id: true, name: true } },
        device: { select: { id: true, name: true } }
      }
    })

    res.json(executions)
  } catch (error) {
    console.error('Failed to fetch executions:', error)
    res.status(500).json({ error: 'Failed to fetch executions' })
  }
})

// Get execution by ID
router.get('/executions/:id', async (req, res) => {
  try {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: req.params.id },
      include: {
        workflow: true,
        project: true,
        device: true
      }
    })

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' })
    }

    res.json({
      ...execution,
      inputs: execution.inputs ? JSON.parse(execution.inputs) : null,
      outputs: execution.outputs ? JSON.parse(execution.outputs) : null,
      logs: execution.logs ? JSON.parse(execution.logs) : null
    })
  } catch (error) {
    console.error('Failed to fetch execution:', error)
    res.status(500).json({ error: 'Failed to fetch execution' })
  }
})

// Update execution status (for agent-client to report progress)
router.patch('/executions/:id', async (req, res) => {
  try {
    const { status, progress, currentStep, outputs, logs } = req.body

    const updateData: any = {}
    if (status) updateData.status = status
    if (progress !== undefined) updateData.progress = progress
    if (currentStep !== undefined) updateData.currentStep = currentStep
    if (outputs) updateData.outputs = JSON.stringify(outputs)
    if (logs) updateData.logs = JSON.stringify(logs)

    if (status === 'running' && !updateData.startedAt) {
      updateData.startedAt = new Date()
    }
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date()
    }

    const execution = await prisma.workflowExecution.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        workflow: { select: { code: true, name: true } },
        project: { select: { id: true, name: true } },
        device: { select: { id: true, name: true } }
      }
    })

    res.json(execution)
  } catch (error) {
    console.error('Failed to update execution:', error)
    res.status(500).json({ error: 'Failed to update execution' })
  }
})

export default router
