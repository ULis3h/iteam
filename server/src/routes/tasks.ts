import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { Server as SocketIOServer } from 'socket.io'
import logger from '../utils/logger.js'

const prisma = new PrismaClient()

export function createTaskRouter(io: SocketIOServer) {
    const router = Router()

    // List all tasks (with optional filters)
    router.get('/', async (req, res) => {
        try {
            const { deviceId, projectId, status, limit = '20' } = req.query

            const where: any = {}
            if (deviceId) where.deviceId = deviceId
            if (projectId) where.projectId = projectId
            if (status) where.status = status

            const tasks = await prisma.task.findMany({
                where,
                include: {
                    device: { select: { id: true, name: true, status: true } },
                    project: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit as string),
            })

            res.json(tasks)
        } catch (error) {
            logger.error('Failed to fetch tasks:', error)
            res.status(500).json({ error: 'Failed to fetch tasks' })
        }
    })

    // Get task by ID
    router.get('/:id', async (req, res) => {
        try {
            const task = await prisma.task.findUnique({
                where: { id: req.params.id },
                include: {
                    device: { select: { id: true, name: true, status: true } },
                    project: { select: { id: true, name: true } },
                },
            })

            if (!task) {
                return res.status(404).json({ error: 'Task not found' })
            }

            res.json(task)
        } catch (error) {
            logger.error('Failed to fetch task:', error)
            res.status(500).json({ error: 'Failed to fetch task' })
        }
    })

    // Create task AND dispatch to agent via WebSocket
    router.post('/', async (req, res) => {
        try {
            const { title, description, deviceId, projectId, type = 'custom', workDir } = req.body

            if (!title || !description || !deviceId || !projectId) {
                return res.status(400).json({ error: 'Missing required fields: title, description, deviceId, projectId' })
            }

            // Verify device exists
            const device = await prisma.device.findUnique({ where: { id: deviceId } })
            if (!device) {
                return res.status(404).json({ error: `Device not found: ${deviceId}` })
            }

            // Verify project exists
            const project = await prisma.project.findUnique({ where: { id: projectId } })
            if (!project) {
                return res.status(404).json({ error: `Project not found: ${projectId}` })
            }

            // Create task record
            const task = await prisma.task.create({
                data: {
                    deviceId,
                    projectId,
                    module: title,
                    description: JSON.stringify({ title, description, type, workDir: workDir || process.cwd() }),
                    status: 'pending',
                },
            })

            // === CRITICAL: Dispatch to agent via WebSocket ===
            const taskPayload = {
                id: task.id,
                title,
                description,
                type,
                workDir: workDir || process.cwd(),
                projectId,
                projectName: project.name,
                deviceId,
                deviceName: device.name,
            }

            // Find the target device's socket and send task:assigned
            let dispatched = false
            const connectedSockets = Array.from(io.sockets.sockets.entries())
            logger.info(`[Task Dispatch] Looking for deviceId=${deviceId} among ${connectedSockets.length} connected sockets`)

            for (const [socketId, socket] of connectedSockets) {
                logger.info(`[Task Dispatch]   socket=${socketId} deviceId=${socket.data.deviceId || '(not registered)'}`)
                if (socket.data.deviceId === deviceId) {
                    socket.emit('task:assigned', taskPayload)
                    dispatched = true
                    logger.info(`[Task Dispatch] ✅ task:assigned sent to ${device.name} (socket: ${socketId})`)
                    break
                }
            }

            if (!dispatched) {
                logger.warn(`[Task Dispatch] ❌ Device ${device.name} (${deviceId}) not found among connected sockets. Broadcasting to all clients as fallback.`)
                // Fallback: broadcast to all clients with deviceId, let client-side filter
                io.emit('task:assigned', taskPayload)
            }

            // Broadcast task creation event to all clients (for UI updates)
            io.emit('task:created', { ...taskPayload, dispatched })

            // Update task status based on dispatch result
            if (dispatched) {
                await prisma.task.update({
                    where: { id: task.id },
                    data: { status: 'active' },
                })
            }

            res.status(201).json({
                ...task,
                dispatched,
                message: dispatched
                    ? `Task created and dispatched to ${device.name}`
                    : `Task created but ${device.name} is not connected. Will dispatch when agent connects.`,
            })
        } catch (error) {
            logger.error('Failed to create task:', error)
            res.status(500).json({ error: 'Failed to create task' })
        }
    })

    // Re-dispatch an existing task to the agent
    router.post('/:id/redispatch', async (req, res) => {
        try {
            const task = await prisma.task.findUnique({
                where: { id: req.params.id },
                include: {
                    device: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                },
            })

            if (!task) {
                return res.status(404).json({ error: 'Task not found' })
            }

            if (!task.device || !task.project) {
                return res.status(400).json({ error: 'Task missing device or project assignment' })
            }

            // Parse stored description to recover original fields
            let parsed: any = {}
            try { parsed = JSON.parse(task.description) } catch { parsed = { description: task.description } }

            // Reset task status to pending
            await prisma.task.update({
                where: { id: task.id },
                data: { status: 'pending' },
            })

            // Build dispatch payload
            const taskPayload = {
                id: task.id,
                title: parsed.title || task.module,
                description: parsed.description || task.description,
                type: parsed.type || 'custom',
                workDir: parsed.workDir || process.cwd(),
                projectId: task.projectId,
                projectName: task.project.name,
                deviceId: task.deviceId,
                deviceName: task.device.name,
            }

            // Dispatch to target device
            let dispatched = false
            const connectedSockets = Array.from(io.sockets.sockets.entries())
            for (const [socketId, socket] of connectedSockets) {
                if (socket.data.deviceId === task.deviceId) {
                    socket.emit('task:assigned', taskPayload)
                    dispatched = true
                    logger.info(`[Task Redispatch] ✅ task:assigned re-sent to ${task.device.name} (socket: ${socketId})`)
                    break
                }
            }

            if (!dispatched) {
                logger.warn(`[Task Redispatch] ❌ Device ${task.device.name} not connected. Broadcasting as fallback.`)
                io.emit('task:assigned', taskPayload)
            }

            if (dispatched) {
                await prisma.task.update({
                    where: { id: task.id },
                    data: { status: 'active' },
                })
            }

            io.emit('task:redispatched', { taskId: task.id, dispatched })

            res.json({
                ...task,
                status: dispatched ? 'active' : 'pending',
                dispatched,
                message: dispatched
                    ? `Task re-dispatched to ${task.device.name}`
                    : `Device ${task.device.name} is offline. Will dispatch when connected.`,
            })
        } catch (error) {
            logger.error('Failed to redispatch task:', error)
            res.status(500).json({ error: 'Failed to redispatch task' })
        }
    })

    // Update task status
    router.patch('/:id', async (req, res) => {
        try {
            const { status, result } = req.body
            const task = await prisma.task.update({
                where: { id: req.params.id },
                data: {
                    status: status || undefined,
                    description: result ? JSON.stringify({ ...JSON.parse((await prisma.task.findUnique({ where: { id: req.params.id } }))?.description || '{}'), result }) : undefined,
                },
            })

            io.emit('task:status', { taskId: task.id, status: task.status })
            res.json(task)
        } catch (error) {
            logger.error('Failed to update task:', error)
            res.status(500).json({ error: 'Failed to update task' })
        }
    })

    return router
}
