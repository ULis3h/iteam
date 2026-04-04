# Agent 持久记忆层设计 (mem0 Integration)

## 背景与目标

当前 iTeam 中的 Agent 执行任务后，所有经验和上下文随会话结束即丢失。集成 mem0 持久记忆层，使每个 Agent 设备拥有跨会话记忆能力：

- **经验积累**：Agent 自动从任务执行中提取关键经验（如"该项目使用 pnpm 而非 npm"）
- **知识检索**：新任务开始前，自动检索相关历史记忆作为上下文
- **团队共享**：跨设备搜索记忆，实现团队知识沉淀

## 设计决策

- ✅ **记忆引擎**：mem0 Platform SDK（`mem0ai` npm 包，云端向量存储 + 语义搜索）
- ✅ **本地索引**：Prisma `Memory` 模型仅存元数据（ID、摘要、来源），内容由 mem0 管理
- ✅ **身份映射**：`deviceId` → mem0 `user_id`（每个 Agent 设备 = 一个记忆用户）
- ✅ **触发方式**：任务完成时自动提取 + Agent 主动上报 + REST API 手动创建

## 技术方案

### 数据模型

```prisma
model Memory {
  id          String   @id              // 使用 mem0 返回的 ID
  deviceId    String                    // 来源设备
  summary     String                    // 记忆内容摘要（同步自 mem0）
  category    String?                   // 分类标签
  mem0UserId  String                    // mem0 中的 user_id
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  device      Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  
  @@index([deviceId])
  @@index([category])
  @@map("memories")
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
│  │ │ Memory      │ │ ──────────▶  │  │  记忆管理面板     │  │   │
│  │ │ Cache       │ │  memory:save │  │ (搜索/浏览/删除)  │  │   │
│  │ └─────────────┘ │              │  └───────────────────┘  │   │
│  │        │        │              │           ▲             │   │
│  │        ▼        │              │    REST   │             │   │
│  │  任务完成时自动  │              └───────────┼─────────────┘   │
│  │  提取上下文     │                          │                 │
│  └─────────────────┘              ┌───────────┴─────────────┐   │
│                                   │      iTeam Server       │   │
│                                   │                         │   │
│                                   │  ┌───────────────────┐  │   │
│                                   │  │  MemoryService    │  │   │
│                                   │  │   ├─ mem0 API     │  │   │
│                                   │  │   └─ Prisma 索引  │  │   │
│                                   │  └───────────────────┘  │   │
│                                   │                         │   │
│                                   │  ┌───────────────────┐  │   │
│                                   │  │ MCP Server        │  │   │
│                                   │  │ (search_memories) │  │   │
│                                   │  └───────────────────┘  │   │
│                                   └─────────────────────────┘   │
│                                              │                   │
│                                              ▼                   │
│                                   ┌─────────────────────┐       │
│                                   │  mem0 Platform API  │       │
│                                   │  (向量存储+语义搜索) │       │
│                                   └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 核心服务 (MemoryService)

```typescript
class MemoryService {
  // 从对话上下文提取记忆（调用 mem0 add → 同步 Prisma）
  async add(messages: Message[], deviceId: string, metadata?: object): Promise<Memory[]>
  
  // 语义搜索（调用 mem0 search → 按 score 排序返回）
  async search(query: string, deviceId?: string): Promise<MemoryResult[]>
  
  // 列出设备全部记忆（Prisma 查询 + mem0 同步）
  async getAll(deviceId?: string): Promise<Memory[]>
  
  // 删除记忆（mem0 delete + Prisma 删除）
  async delete(memoryId: string): Promise<void>
  
  // 获取记忆修改历史
  async getHistory(memoryId: string): Promise<MemoryHistory[]>
}
```

### API 接口

| Method | Path | 说明 |
|--------|------|------|
| `POST` | `/api/memories` | 提交对话消息，提取记忆 |
| `GET` | `/api/memories` | 列出记忆 (`?deviceId=`, `?category=`) |
| `GET` | `/api/memories/search` | 语义搜索 (`?q=`, `?deviceId=`) |
| `GET` | `/api/memories/:id` | 单条记忆详情 |
| `GET` | `/api/memories/:id/history` | 记忆修改历史 |
| `DELETE` | `/api/memories/:id` | 删除记忆 |

### WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| `memory:save` | Agent → Server | Agent 提交对话上下文触发记忆提取 |
| `memory:update` | Server → Agent | 广播记忆变更通知 |

### MCP 工具

| Tool | 说明 | 参数 |
|------|------|------|
| `search_memories` | 语义搜索 Agent 记忆 | `query`, `deviceId?` |
| `add_memory` | 从对话提取记忆 | `messages`, `deviceId` |
| `list_memories` | 列出设备记忆 | `deviceId?`, `category?` |

## 需要修改的文件

### 服务端 (server)

| 文件 | 操作 | 说明 |
|------|------|------|
| `prisma/schema.prisma` | 修改 | 添加 Memory 模型，Device 添加反向关联 |
| `src/services/memory.service.ts` | 新建 | MemoryService 核心服务 |
| `src/routes/memories.ts` | 新建 | 记忆 REST API |
| `src/websocket/index.ts` | 修改 | 添加 memory:save / memory:update 事件 |
| `src/mcp/standard-mcp-server.ts` | 修改 | 添加 3 个记忆 MCP 工具 |
| `src/index.ts` | 修改 | 注册记忆路由 |

### Agent Client (agent-client)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/services/memory-cache.ts` | 新建 | 本地记忆缓存服务 |
| `src/services/socket-service.js` | 修改 | 添加 memory 事件处理 |

### Web Console (client)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/Memories.tsx` | 新建 | 记忆管理页面 |
| `src/App.tsx` | 修改 | 添加 /memories 路由 |
| `src/components/Layout.tsx` | 修改 | 添加导航入口 |

### 环境配置

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/.env` | 修改 | 添加 `MEM0_API_KEY` |
| `package.json` | 修改 | 添加 `mem0ai` 依赖 |

## 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| mem0 API 不可用 | 中 | MemoryService 捕获异常，降级为仅本地 Prisma 操作 |
| API Key 泄露 | 高 | 仅保存在 server 端 .env，不暴露给前端或 Agent |
| 记忆数据量膨胀 | 低 | mem0 云端管理存储，本地仅存轻量元数据 |
| 网络延迟影响任务完成速度 | 中 | 记忆写入异步执行，不阻塞任务完成响应 |

## 实施计划

### Phase 1: 数据层
- [ ] 安装 `mem0ai` 依赖
- [ ] Prisma Schema 添加 Memory 模型
- [ ] 创建 MemoryService 核心服务
- [ ] 创建 REST API 路由

### Phase 2: 实时集成
- [ ] WebSocket memory:save / memory:update 事件
- [ ] MCP Server 记忆工具
- [ ] 服务端入口注册

### Phase 3: 客户端
- [ ] Agent Client 本地记忆缓存
- [ ] Web Console 记忆管理页面
- [ ] 导航入口和路由

### Phase 4: 文档
- [ ] 使用文档 `docs/memory/README.md`
