# 架构 / Architecture

```
┌────────────┐   HTTP + WebSocket   ┌──────────────────────────────┐
│  Web UI    │ ───────────────────▶ │  Server (Express + Socket.IO) │
│  client/   │ ◀─── live events ─── │  server/                      │
└────────────┘                      │  ┌────────────┐ ┌──────────┐ │
                                    │  │ REST API   │ │ Scheduler│ │
                                    │  └────────────┘ └────┬─────┘ │
                                    │  ┌──────────────┐    │        │
                                    │  │ Prisma/SQLite│    │        │
                                    │  └──────────────┘    ▼        │
                                    │   local executor + parsers ──▶ claude / codex / gemini / custom
                                    └──────────────┬───────────────┘
                                                   │ /runner namespace (job:run / job:log / job:done / job:cancel)
                                          ┌────────▼────────┐
                                          │ Runner (runner/) │ ──▶ claude / codex / gemini / custom
                                          └─────────────────┘
```

## 组件

| 目录 | 技术 | 职责 |
|---|---|---|
| `server/` | Node 20, Express, Prisma (SQLite), Socket.IO, zod, yaml | REST API、工作流校验与导入导出、DAG 调度、本地执行器、CLI 事件流解析、远程 Runner 注册表、日志持久化与广播、保留策略 |
| `client/` | React 18, Vite, Tailwind, socket.io-client | 界面：Agent、工作流编辑器、运行视图（流水线 / 路线图 / 日志）、模板与导入导出、设置；中英双语 |
| `runner/` | Node 18+, socket.io-client | 远程执行：接收 job、spawn 进程、回传日志与结果；断线保活与重连接回 |

## 一次运行的过程

1. `POST /workflows/:id/run` 创建 `Run`，冻结工作流定义为 `snapshot`，为每个步骤创建 `RunStep` 并冻结其 Agent 运行时配置（`runtime`）。
2. 调度器（`server/src/engine/run-manager.ts`）：所有依赖已满足的 `pending` 步骤在全局并行上限、Agent 并行上限、Runner 容量内启动；上游硬失败则下游标记 `skipped`。被容量挡住的运行会在任何步骤完成时重新调度。
3. 启动步骤时：渲染提示词与工作目录模板 → `adapters.ts` 生成命令 → 本地 `spawn` 或通过 Socket 发给 Runner。每个任务有唯一 `jobId`，迟到的旧结果（取消后又重试）会被忽略。
4. 进程 stdout / stderr 按行进入 `parsers.ts`（Claude `stream-json`、Codex `--json` 被整理成可读事件并提取最终答案、费用、Token、会话 ID），再进入 `LogWriter`：批量写库并实时推送给订阅该运行的界面。
5. 进程退出：exit 0 且 CLI 未报告错误 → `succeeded`；否则按 `retries` 退避重试或 `failed`。所有步骤终态后计算 Run 状态。

## 数据模型

`Runner` ─< `Agent` ─< `RunStep` >─ `Run` >─ `Workflow`，`RunStep` ─< `RunLog`。定义见 `server/prisma/schema.prisma`；迁移随代码提交。

## 安全边界

见 [SECURITY.md](../SECURITY.md)：可选的共享令牌保护 API 与界面，Runner 可用独立凭证；Agent 以「自动批准」模式执行，拥有运行机器上该用户的全部权限；Agent 进程不继承服务的密钥。

## 测试

- `server/test/`：vitest。引擎集成测试用临时 SQLite 与 shell 命令充当 Agent（并行上限、Agent 串行、取消后重试、退避重试、超时、UTF-8、环境变量清理、Claude 事件流解析、Runner 注册表）。
- `runner/test/`：node:test，直接驱动 `exec.js`。
- CI（GitHub Actions）在 Node 20 / 22 上执行类型检查、测试与构建。
