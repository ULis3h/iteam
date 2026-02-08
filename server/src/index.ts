import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import logger from './utils/logger.js'
import { syncRoleDocuments } from './utils/syncRoleDocs.js'
import { setupWebSocket } from './websocket/index.js'
import authRoutes from './routes/auth.js'
import { createDeviceRouter } from './routes/devices.js'
import { createTaskRouter } from './routes/tasks.js'
import projectRoutes from './routes/projects.js'
import documentRoutes from './routes/documents.js'
import statsRoutes from './routes/stats.js'
import rolesRoutes from './routes/roles.js'
import agentRoutes from './routes/agents.js'
import workflowRoutes from './routes/workflows.js'
import teamRoutes from './routes/teams.js'
import tracesRoutes from './routes/traces.js'
import { authMiddleware } from './middleware/auth.js'

// Load environment variables
dotenv.config()

const app = express()
const httpServer = createServer(app)
const prisma = new PrismaClient()

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
})

// Middleware
app.use(cors({
  origin: [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// API Routes
// 公开路由 - 无需认证
app.use('/api/auth', authRoutes)
app.use('/api/roles', rolesRoutes)

// 设备心跳路由 - 使用 API Key 或用户认证
// 支持设备 Agent 使用 X-API-Key 头进行认证
const deviceApiKeyMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key']
  const expectedKey = process.env.DEVICE_API_KEY || 'iteam-device-key'

  if (apiKey === expectedKey) {
    return next()
  }

  // 如果没有 API Key，尝试使用 JWT 认证
  authMiddleware(req, res, next)
}
app.use('/api/devices', deviceApiKeyMiddleware, createDeviceRouter(io))
app.use('/api/tasks', deviceApiKeyMiddleware, createTaskRouter(io))

// 保护路由 - 需要登录
app.use('/api/projects', authMiddleware, projectRoutes)
app.use('/api/documents', authMiddleware, documentRoutes)
app.use('/api/stats', authMiddleware, statsRoutes)

// BMAD 路由 - Agent模板、工作流、团队
app.use('/api/agents', authMiddleware, agentRoutes)
app.use('/api/workflows', authMiddleware, workflowRoutes)
app.use('/api/teams', authMiddleware, teamRoutes)

// 任务执行追踪路由
app.use('/api/traces', authMiddleware, tracesRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// WebSocket setup
setupWebSocket(io, prisma)

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
const PORT = process.env.PORT || 3000

httpServer.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)

  // 同步角色技能文档到文档中心
  await syncRoleDocuments(prisma)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  httpServer.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  httpServer.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})
