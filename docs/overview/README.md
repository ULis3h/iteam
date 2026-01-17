# iTeam 项目介绍

## 项目背景

随着 AI 编程助手的快速发展（如 GitHub Copilot、Claude Code、Cursor 等），单个开发者可以同时在多个设备上运行多个 AI Agent，每个 Agent 专注于不同的任务。这创造了一种新的工作模式：**一人即团队**。

## 核心理念

> **一人 · 多设备 · 全协作**

iTeam 将单个开发者的多个 AI 设备/Agent 视为一个虚拟团队来管理：

- 每个设备可以被赋予不同的"角色"（前端、后端、DevOps 等）
- 每个设备可以被分配不同的任务模块
- 系统实时监控所有设备的状态和工作进度
- 统一管理项目进度、代码提交、文档知识库

## 目标用户

- 使用多个 AI 编程助手的独立开发者
- 需要管理多台开发机的技术人员
- 希望提高 AI 协作效率的研发团队

## 核心价值

1. **可视化管理** - 一目了然地查看所有设备状态
2. **角色分工** - 为每个 AI Agent 分配明确职责
3. **进度追踪** - 跟踪每个设备的工作产出
4. **知识沉淀** - 统一管理团队文档和规范

## 技术栈

### 前端
- React 18 + TypeScript
- Tailwind CSS（现代 UI 设计）
- React Router（路由管理）
- Lucide Icons（图标库）

### 后端
- Node.js + Express
- Prisma ORM
- SQLite（开发阶段）
- WebSocket（实时通信）

### 认证
- JWT Token（用户认证）
- API Key（设备认证）

## 项目结构

```
iteam/
├── client/                 # 前端应用
│   ├── src/
│   │   ├── components/    # 可复用组件
│   │   ├── contexts/      # React Context
│   │   ├── pages/         # 页面组件
│   │   └── types/         # TypeScript 类型
│   └── package.json
├── server/                 # 后端服务
│   ├── src/
│   │   ├── middleware/    # Express 中间件
│   │   ├── routes/        # API 路由
│   │   ├── utils/         # 工具函数
│   │   └── websocket/     # WebSocket 处理
│   ├── prisma/            # 数据库 Schema
│   └── package.json
├── docs/                   # 项目文档
├── simulate-devices.sh     # 设备模拟脚本
└── start-dev.sh           # 开发启动脚本
```

## 版本信息

- 当前版本：0.1.0（开发中）
- 开始日期：2026-01-17
