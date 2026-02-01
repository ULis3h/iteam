# 任务执行追踪系统

任务执行追踪系统可以完整记录 Agent 执行任务的全过程，实现可视化和可追溯。

## 功能特性

- **完整记录**：任务接收、AI思考、模型讨论、执行步骤、执行结果
- **本地存储**：Agent 端使用 SQLite 本地存储，支持离线追踪
- **服务器同步**：通过 WebSocket 实时同步到服务器
- **可视化界面**：在 Web 控制台查看任务执行时间线

## 数据结构

### TaskSession（任务会话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 会话ID |
| taskId | string? | 关联的任务ID |
| deviceId | string | 设备ID |
| status | string | 状态：running, completed, failed |
| title | string? | 会话标题 |
| startTime | datetime | 开始时间 |
| endTime | datetime? | 结束时间 |

### TraceEntry（追踪条目）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 条目ID |
| sessionId | string | 会话ID |
| type | string | 类型（见下表） |
| title | string | 标题 |
| content | string | 详细内容 |
| metadata | json? | 附加元数据 |
| duration | int? | 执行时长（毫秒） |
| timestamp | datetime | 时间戳 |

### 条目类型

| Type | 说明 | 图标 |
|------|------|------|
| task_received | 任务接收 | 📥 |
| thinking | AI思考过程 | 🧠 |
| discussion | 模型讨论（MCP调用等） | 💬 |
| step | 执行步骤 | ⚡ |
| result | 执行结果 | ✅ |
| error | 错误 | ❌ |

## API 接口

### REST API

```bash
# 获取设备的所有会话
GET /api/traces/device/:deviceId?limit=20&offset=0

# 获取会话详情（含所有条目）
GET /api/traces/session/:sessionId

# 获取设备统计
GET /api/traces/stats/:deviceId

# 创建会话
POST /api/traces/session
Body: { deviceId, taskId?, title? }

# 更新会话状态
PATCH /api/traces/session/:sessionId
Body: { status, endTime? }

# 添加追踪条目
POST /api/traces/entry
Body: { sessionId, type, title, content, metadata?, duration? }

# 批量添加条目
POST /api/traces/entries
Body: { entries: [...] }

# 删除会话
DELETE /api/traces/session/:sessionId
```

### WebSocket 事件

```javascript
// Agent 端同步会话
socket.emit('trace:session', {
  id, taskId, deviceId, status, title, startTime, endTime
})

// Agent 端同步条目
socket.emit('trace:entry', {
  id, sessionId, type, title, content, metadata, duration, timestamp
})

// 订阅设备追踪更新
socket.emit('trace:subscribe', deviceId)

// 服务器推送更新
socket.on('trace:session:update', session => { ... })
socket.on('trace:entry:update', entry => { ... })
```

## 使用方式

### 查看追踪记录

1. 登录 iTeam 控制台
2. 导航到「设备管理」页面
3. 点击设备操作菜单中的「工作台」
4. 在左侧选择追踪会话
5. 右侧显示执行时间线

### Agent 端 API

在渲染进程中使用：

```javascript
// 获取所有会话
const { sessions } = await electronAPI.trace.getSessions(50)

// 获取会话详情
const { session } = await electronAPI.trace.getSession(sessionId)

// 获取当前会话
const { session } = await electronAPI.trace.getCurrent()

// 清理旧数据（保留最近30天）
const { count } = await electronAPI.trace.cleanup(30)
```

## 文件结构

```
server/
├── prisma/schema.prisma      # TaskSession, TraceEntry 模型
├── src/routes/traces.ts      # REST API
└── src/websocket/index.ts    # WebSocket 同步事件

agent-client/
├── src/services/trace-service.js  # 追踪核心服务
├── src/main/main.js              # IPC 处理器
└── src/preload/preload.js        # 渲染进程 API

client/
├── src/services/traces.ts            # API 调用
├── src/components/TraceTimeline.tsx  # 时间线组件
└── src/pages/DeviceWorkbench.tsx     # 设备工作台页面
```

## 数据流

```
Agent 收到任务
     │
     ▼
创建 TaskSession
     │
     ├─ 保存到本地 SQLite
     │
     └─ WebSocket 同步到 Server
            │
            ▼
        保存到 PostgreSQL
            │
            ▼
        WebSocket 推送到 Web 端
            │
            ▼
        DeviceWorkbench 实时更新
```
