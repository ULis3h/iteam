# iTeam Server - 后端服务器

> iTeam系统的核心后端服务 - 数据管理、任务调度和实时通信中心

## 📋 概述

iTeam Server是整个系统的协调中心，负责：
- 📦 数据持久化存储
- 🔐 用户认证和授权
- 🔄 实时WebSocket通信
- 📊 统计数据聚合
- 🎯 任务分配和管理
- 📡 设备状态监控

---

## 🛠 技术栈

### 核心框架
- **Node.js** - 运行时环境
- **Express** - Web框架
- **TypeScript** - 类型安全
- **Socket.io** - WebSocket实时通信

### 数据库
- **Prisma ORM** - 数据库访问层
- **SQLite** (开发环境)
- **PostgreSQL** (生产环境，支持切换)

### 安全和工具
- **bcryptjs** - 密码加密
- **jsonwebtoken** - JWT认证
- **winston** - 日志系统
- **cors** - 跨域支持

---

## 📁 项目结构

```
server/
├── src/
│   ├── index.ts           # 应用入口点
│   ├── routes/            # API路由
│   │   ├── auth.ts        # 用户认证
│   │   ├── devices.ts     # 设备管理
│   │   ├── projects.ts    # 项目管理
│   │   ├── documents.ts   # 文档管理
│   │   ├── stats.ts       # 统计数据
│   │   └── roles.ts       # 角色管理
│   ├── websocket/         # WebSocket处理
│   │   └── index.ts       # Socket事件处理
│   ├── middleware/        # 中间件
│   │   └── auth.ts        # JWT认证中间件
│   └── utils/             # 工具函数
│       ├── logger.ts      # 日志工具
│       └── syncRoleDocs.ts # 角色文档同步
├── prisma/
│   ├── schema.prisma      # 数据库模型定义
│   ├── migrations/        # 数据库迁移
│   └── dev.db            # SQLite数据库文件
├── package.json
└── tsconfig.json
```

---

## 🗄️ 数据库模型

### User（用户）
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  password  String   // bcrypt加密
  avatar    String?  // 头像URL
  role      String   @default("user") // user, admin
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**用途**：Web控制台用户账号管理

### Device（设备/Agent）
```prisma
model Device {
  id             String   @id @default(uuid())
  name           String   @unique
  type           String   // vscode, windsurf, claude-code等
  role           String?  // frontend, backend, fullstack等
  skills         String?  // JSON数组：技能列表
  documentIds    String?  // JSON数组：关联文档ID
  status         String   @default("offline") // online/offline/idle/working
  os             String   // 操作系统
  ip             String   // IP地址
  currentProject String?  // 当前项目
  currentModule  String?  // 当前模块
  metadata       String?  // JSON：额外信息
  lastSeen       DateTime @default(now())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  contributions  Contribution[]
  tasks          Task[]
}
```

**用途**：管理所有注册的Agent设备

### Project（项目）
```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String
  repository  String   // Git仓库地址
  status      String   @default("active") // active/paused/completed
  startDate   DateTime @default(now())
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contributions Contribution[]
  tasks         Task[]
}
```

**用途**：项目管理和追踪

### Contribution（贡献）
```prisma
model Contribution {
  id           String   @id @default(uuid())
  deviceId     String
  projectId    String
  commits      Int      @default(0)
  linesAdded   Int      @default(0)
  linesDeleted Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  device  Device  @relation(...)
  project Project @relation(...)
}
```

**用途**：记录设备对项目的代码贡献

### Task（任务）
```prisma
model Task {
  id          String   @id @default(uuid())
  deviceId    String
  projectId   String
  module      String
  description String
  status      String   @default("active") // active/completed/paused
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  device  Device  @relation(...)
  project Project @relation(...)
}
```

**用途**：任务分配和追踪

### Document（文档）
```prisma
model Document {
  id        String   @id @default(uuid())
  title     String
  content   String
  category  String   // standard/tech/bug/other
  tags      String   // JSON数组
  author    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**用途**：知识库管理

---

## 🔌 API端点

### 认证相关 (`/api/auth`)

#### POST `/api/auth/register`
注册新用户

**请求体**:
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

**响应**:
```json
{
  "message": "注册成功",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "user"
  }
}
```

#### POST `/api/auth/login`
用户登录

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "message": "登录成功",
  "token": "jwt_token_here",
  "user": { ... }
}
```

#### GET `/api/auth/me`
获取当前用户信息（需要认证）

---

### 设备管理 (`/api/devices`)

#### GET `/api/devices`
获取所有设备列表

**认证**: JWT或API Key (`X-API-Key` header)

**响应**:
```json
[
  {
    "id": "uuid",
    "name": "我的开发机",
    "type": "claude-code",
    "role": "fullstack",
    "skills": "[\"react\",\"nodejs\"]",
    "status": "online",
    "os": "Linux",
    "lastSeen": "2026-01-17T10:00:00Z"
  }
]
```

#### GET `/api/devices/:id`
获取单个设备详情（包含贡献和任务）

#### POST `/api/devices`
注册新设备

#### PUT `/api/devices/:id`
更新设备信息

#### DELETE `/api/devices/:id`
删除设备

---

### 项目管理 (`/api/projects`)

#### GET `/api/projects`
获取所有项目

#### GET `/api/projects/:id`
获取项目详情

#### POST `/api/projects`
创建新项目

**请求体**:
```json
{
  "name": "项目名称",
  "description": "项目描述",
  "repository": "https://github.com/user/repo"
}
```

#### PUT `/api/projects/:id`
更新项目

#### DELETE `/api/projects/:id`
删除项目

---

### 文档管理 (`/api/documents`)

#### GET `/api/documents`
获取所有文档

**查询参数**:
- `category`: 过滤分类
- `search`: 搜索关键词

#### GET `/api/documents/:id`
获取文档详情

#### POST `/api/documents`
创建新文档

#### PUT `/api/documents/:id`
更新文档

#### DELETE `/api/documents/:id`
删除文档

---

### 统计数据 (`/api/stats`)

#### GET `/api/stats`
获取系统总体统计

**响应**:
```json
{
  "totalDevices": 5,
  "onlineDevices": 3,
  "activeProjects": 2,
  "totalCommits": 150,
  "totalDocs": 20
}
```

#### GET `/api/stats/devices`
获取各设备的统计数据

#### GET `/api/stats/projects`
获取各项目的统计数据

---

### 角色管理 (`/api/roles`)

#### GET `/api/roles`
获取所有可用角色及其技能要求

---

### 健康检查 (`/api/health`)

#### GET `/api/health`
服务器健康检查

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-17T10:00:00Z"
}
```

---

## 🔄 WebSocket事件

### 客户端 → 服务器

#### `device:register`
设备注册

**数据**:
```javascript
{
  name: "我的设备",
  type: "claude-code",
  os: "Linux",
  ip: "192.168.1.100",
  metadata: { cpus: 8, memory: 16000 }
}
```

#### `device:status`
设备状态更新

**数据**:
```javascript
{
  deviceId: "uuid",
  status: "working", // online/offline/idle/working
  currentProject: "project-id",
  currentModule: "module-name"
}
```

#### `task:update`
任务更新

**数据**:
```javascript
{
  deviceId: "uuid",
  projectId: "uuid",
  module: "auth-module",
  description: "实现用户登录功能"
}
```

#### `ping`
心跳检测

**响应**: `pong`

---

### 服务器 → 客户端

#### `device:registered`
设备注册成功确认

**数据**:
```javascript
{
  id: "uuid",
  name: "我的设备",
  status: "online",
  // ... 其他设备信息
}
```

#### `device:status`
设备状态广播（发送给所有连接的客户端）

**数据**:
```javascript
{
  deviceId: "uuid",
  name: "我的设备",
  status: "working",
  currentProject: "project-id",
  currentModule: "module-name"
}
```

#### `task:update`
任务更新广播

#### `task:assigned`
任务分配通知

**数据**:
```javascript
{
  id: "task-uuid",
  title: "任务标题",
  type: "code_generation",
  description: "任务描述",
  workDir: "/path/to/project"
}
```

#### `error`
错误消息

**数据**:
```javascript
{
  message: "错误描述"
}
```

---

## 🔐 认证机制

### JWT认证（用户）
用于Web控制台用户

**请求头**:
```
Authorization: Bearer <jwt_token>
```

**Token包含**:
```javascript
{
  userId: "uuid",
  email: "user@example.com",
  username: "username",
  role: "user"
}
```

### API Key认证（设备）
用于Agent设备

**请求头**:
```
X-API-Key: iteam-device-key
```

**配置**: 在`.env`文件中设置
```env
DEVICE_API_KEY=iteam-device-key
```

---

## ⚙️ 核心功能

### 1. 设备管理
- ✅ 设备注册和注销
- ✅ 实时状态监控
- ✅ 心跳检测（每60秒检查一次）
- ✅ 自动离线标记（5分钟无响应）
- ✅ 设备信息更新

### 2. 用户认证
- ✅ 注册和登录
- ✅ JWT Token生成和验证
- ✅ 密码bcrypt加密
- ✅ 用户信息管理

### 3. 项目管理
- ✅ 项目创建、更新、删除
- ✅ 项目状态追踪
- ✅ 代码贡献统计
- ✅ 任务关联

### 4. 任务调度
- ✅ 任务创建和分配
- ✅ 任务状态更新
- ✅ 任务执行追踪
- ✅ WebSocket实时推送

### 5. 实时通信
- ✅ WebSocket连接管理
- ✅ 实时状态广播
- ✅ 事件监听和分发
- ✅ 心跳保持

### 6. 数据统计
- ✅ 系统总体统计
- ✅ 设备贡献统计
- ✅ 项目进度统计
- ✅ 实时数据聚合

### 7. 文档管理
- ✅ 知识库存储
- ✅ 分类和标签
- ✅ 全文搜索
- ✅ 版本控制

### 8. 角色技能系统
- ✅ 角色定义和管理
- ✅ 技能要求配置
- ✅ 文档关联
- ✅ 自动同步到文档中心

---

## 🚀 启动和配置

### 环境变量配置

创建`.env`文件：

```env
# 数据库
DATABASE_URL="file:./prisma/dev.db"

# JWT密钥
JWT_SECRET="your-secret-key-here"

# 设备API Key
DEVICE_API_KEY="iteam-device-key"

# 服务器配置
PORT=3000
NODE_ENV=development

# CORS设置
CORS_ORIGIN="http://localhost:5173"
```

### 安装依赖

```bash
cd server
npm install
```

### 数据库设置

```bash
# 生成Prisma客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate
```

### 启动服务器

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

服务器将在 `http://localhost:3000` 启动。

---

## 📊 工作流程示例

### 设备注册流程

```
1. Agent客户端启动
2. 通过WebSocket连接到服务器
3. 发送 device:register 事件
4. 服务器创建/更新设备记录
5. 服务器返回 device:registered 确认
6. 服务器广播 device:status 给所有客户端
7. Web控制台实时显示新设备上线
```

### 任务执行流程

```
1. 用户在Web控制台创建任务
2. 服务器存储任务到数据库
3. 服务器通过WebSocket发送 task:assigned 给指定Agent
4. Agent接收任务并开始执行
5. Agent发送 device:status 更新状态为 working
6. 服务器广播状态更新
7. Web控制台实时显示Agent工作状态
8. Agent完成后发送 task:update
9. 服务器更新任务状态
10. 服务器广播任务完成
```

---

## 🔧 日志系统

使用Winston进行日志记录：

```typescript
import logger from './utils/logger.js'

logger.info('信息日志')
logger.error('错误日志')
logger.warn('警告日志')
```

日志级别：
- `error` - 错误信息
- `warn` - 警告信息
- `info` - 一般信息
- `debug` - 调试信息

---

## 🛡️ 安全特性

1. **密码加密**: 使用bcrypt加密，不存储明文密码
2. **JWT认证**: Token过期时间7天
3. **API Key认证**: 设备独立认证机制
4. **CORS保护**: 限制跨域请求来源
5. **输入验证**: 所有API输入验证
6. **SQL注入防护**: Prisma ORM参数化查询

---

## 📈 性能优化

1. **数据库索引**: 关键字段添加索引
2. **连接池**: Prisma自动连接池管理
3. **查询优化**: 使用`include`减少N+1查询
4. **定期清理**: 自动清理过期设备状态
5. **缓存策略**: 可添加Redis缓存（待实现）

---

## 🔍 故障排查

### 常见问题

#### 1. 数据库连接失败
```bash
# 重新生成Prisma客户端
npm run prisma:generate

# 检查DATABASE_URL配置
cat .env
```

#### 2. WebSocket连接失败
- 检查CORS配置
- 确认端口未被占用
- 查看服务器日志

#### 3. 认证失败
- 检查JWT_SECRET配置
- 验证Token是否过期
- 确认API Key正确

---

## 📝 API文档

完整API文档可通过Swagger生成（待实现）。

当前可用端点列表：
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
GET    /api/devices
GET    /api/devices/:id
POST   /api/devices
PUT    /api/devices/:id
DELETE /api/devices/:id
GET    /api/projects
GET    /api/projects/:id
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
GET    /api/documents
GET    /api/documents/:id
POST   /api/documents
PUT    /api/documents/:id
DELETE /api/documents/:id
GET    /api/stats
GET    /api/stats/devices
GET    /api/stats/projects
GET    /api/roles
GET    /api/health
```

---

## 🚧 待实现功能

- [ ] Swagger API文档
- [ ] Redis缓存层
- [ ] 任务优先级队列
- [ ] 实时通知系统
- [ ] 邮件通知
- [ ] Webhook支持
- [ ] 更细粒度的权限控制
- [ ] API速率限制
- [ ] 请求审计日志

---

## 📚 相关文档

- [系统架构](../ARCHITECTURE.md)
- [项目README](../README.md)
- [Agent客户端文档](../agent-client/README.md)
- [Prisma文档](https://www.prisma.io/docs)
- [Socket.io文档](https://socket.io/docs)

---

**维护者**: iTeam Team
**版本**: 0.1.0
**最后更新**: 2026-01-17
