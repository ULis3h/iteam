# Agent 任务执行追踪系统设计

## 背景与目标

在 Agent 客户端执行任务时，需要完整记录执行过程以实现：
- **可视化**：实时查看任务执行进度和详情
- **可追溯**：回溯任务执行的每个步骤
- **可分析**：分析 AI 决策和思考过程

## 需要记录的内容

| 类型 | 说明 | 示例 |
|------|------|------|
| 任务接收 | 接收到的任务详情 | 任务ID、标题、描述、分配时间 |
| 模型讨论 | 与其他模型/Agent 的对话 | MCP 工具调用、多 Agent 协作消息 |
| 思考流程 | AI 的推理和决策过程 | Claude 的 thinking 输出 |
| 执行步骤 | 每个具体操作 | 文件编辑、命令执行、API 调用 |
| 执行结果 | 最终结果和输出 | 成功/失败、输出内容、错误信息 |

## 设计决策

- ✅ **存储方案**：数据库（服务端 + Agent 端本地）
- ✅ **查看方式**：管理端「设备 → 工作台」+ Agent 本地
- ✅ **优先级**：数据记录 = UI 可视化（同时实现）

## 技术方案

### 数据模型

```prisma
// 任务执行会话
model TaskSession {
  id          String   @id @default(uuid())
  taskId      String
  deviceId    String
  status      String   @default("running")  // running, completed, failed
  startTime   DateTime @default(now())
  endTime     DateTime?
  
  device      Device   @relation(fields: [deviceId], references: [id])
  entries     TraceEntry[]
}

// 追踪条目
model TraceEntry {
  id          String   @id @default(uuid())
  sessionId   String
  timestamp   DateTime @default(now())
  type        String   // task_received, thinking, discussion, step, result
  title       String
  content     String   // 大文本内容
  metadata    String?  // JSON 元数据
  
  session     TaskSession @relation(fields: [sessionId], references: [id])
}
```

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         iTeam 系统                               │
│                                                                  │
│  ┌─────────────────┐              ┌─────────────────────────┐   │
│  │  Agent Client   │              │     Web Console         │   │
│  │                 │              │                         │   │
│  │ ┌─────────────┐ │   WebSocket  │  ┌───────────────────┐  │   │
│  │ │ Trace       │ │ ──────────▶  │  │ 设备 → 工作台     │  │   │
│  │ │ Service     │ │   同步追踪   │  │ (任务执行时间线)   │  │   │
│  │ └─────────────┘ │              │  └───────────────────┘  │   │
│  │        │        │              │           ▲             │   │
│  │        ▼        │              │           │             │   │
│  │ ┌─────────────┐ │              └───────────┼─────────────┘   │
│  │ │ 本地 SQLite │ │                          │                 │
│  │ └─────────────┘ │                          │                 │
│  └─────────────────┘              ┌───────────┴─────────────┐   │
│                                   │      iTeam Server       │   │
│                                   │                         │   │
│                                   │  ┌───────────────────┐  │   │
│                                   │  │ 主数据库 (SQLite) │  │   │
│                                   │  │ TaskSession       │  │   │
│                                   │  │ TraceEntry        │  │   │
│                                   │  └───────────────────┘  │   │
│                                   └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 需要修改的文件

### 服务端 (server)

| 文件 | 操作 | 说明 |
|------|------|------|
| `prisma/schema.prisma` | 修改 | 添加 TaskSession、TraceEntry 模型 |
| `src/routes/traces.ts` | 新建 | 追踪数据 REST API |
| `src/websocket/index.ts` | 修改 | 添加追踪实时同步事件 |
| `src/index.ts` | 修改 | 注册新路由 |

### Agent Client (agent-client)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/services/trace-service.js` | 新建 | 追踪服务核心 |
| `src/services/trace-store.js` | 新建 | 本地 SQLite 存储 |
| `src/services/claude-service.js` | 修改 | 添加追踪钩子 |
| `src/services/socket-service.js` | 修改 | 同步追踪到服务器 |
| `src/services/mcp-service.js` | 修改 | 记录 MCP 调用 |
| `src/main/main.js` | 修改 | 添加追踪 IPC |
| `src/preload/preload.js` | 修改 | 暴露追踪 API |
| `src/renderer/` | 修改 | 添加本地追踪视图 |

### Web Console (client)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/DeviceWorkbench.tsx` | 新建 | 设备工作台页面 |
| `src/components/TraceTimeline.tsx` | 新建 | 时间线组件 |
| `src/components/TraceEntry.tsx` | 新建 | 单条追踪展示 |
| `src/api/traces.ts` | 新建 | 追踪 API 调用 |
| `src/pages/Devices.tsx` | 修改 | 添加工作台入口 |

## 实施计划

### Phase 1: 数据层
- [ ] 服务端数据库模型
- [ ] 服务端 REST API
- [ ] Agent 本地 SQLite 存储
- [ ] WebSocket 实时同步

### Phase 2: Agent 端集成
- [ ] trace-service.js 核心服务
- [ ] 集成到 claude-service.js
- [ ] 集成到 socket/mcp-service.js
- [ ] IPC 和 preload API

### Phase 3: 可视化界面
- [ ] Web 端设备工作台
- [ ] 时间线组件
- [ ] Agent 本地追踪视图

### Phase 4: 文档
- [ ] 使用文档
