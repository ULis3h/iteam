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
                                    │        local executor ──▶ claude / codex / gemini / custom
                                    └──────────────┬───────────────┘
                                                   │ /runner namespace (job:run / job:log / job:done)
                                          ┌────────▼────────┐
                                          │ Runner (runner/) │ ──▶ claude / codex / gemini / custom
                                          └─────────────────┘
```

## 组件

| 目录 | 技术 | 职责 |
|---|---|---|
| `server/` | Node 20, Express, Prisma (SQLite), Socket.IO, zod, yaml | REST API、工作流校验与导入导出、DAG 调度、本地执行器、远程 Runner 注册表、日志持久化与广播 |
| `client/` | React 18, Vite, Tailwind, socket.io-client | 界面：Agent、工作流编辑器、运行视图（流水线 / 路线图 / 日志）、导入导出、设置 |
| `runner/` | Node 18+, socket.io-client | 远程执行：接收 job、spawn 进程、回传日志与结果 |

## 一次运行的过程

1. `POST /workflows/:id/run` 创建 `Run`，冻结工作流定义为 `snapshot`，为每个步骤创建 `RunStep`。
2. 调度器（`server/src/engine/run-manager.ts`）循环：所有依赖已满足的 `pending` 步骤在并行上限内启动；上游硬失败则下游标记 `skipped`。
3. 启动步骤时：读取 Agent 当前配置 + 步骤覆盖 → 渲染提示词模板 → `adapters.ts` 生成命令 → 本地 `spawn` 或通过 Socket 发给 Runner。
4. 进程 stdout / stderr 按行进入 `LogWriter`：批量写库，并实时推送给订阅该运行的界面。
5. 进程退出：exit 0 → `succeeded`（输出 = stdout 或 output 文件）；否则按 `retries` 重试或 `failed`。所有步骤终态后计算 Run 状态。

## 各 CLI 的调用方式

| Provider | 命令 |
|---|---|
| claude-code | `claude -p --output-format text [--model M] [--effort E] --dangerously-skip-permissions`，提示词从 stdin 读取 |
| codex | `codex exec --skip-git-repo-check -o <outputFile> [-m M] [-c model_reasoning_effort="E"] --dangerously-bypass-approvals-and-sandbox -`，提示词从 stdin 读取 |
| gemini | `gemini [-m M] --yolo`，提示词从 stdin 读取 |
| custom | 用户模板，通过 shell 执行 |

参数与写作时的 CLI 版本对应；如果你的 CLI 版本不同，用 Agent 的「额外参数」或自定义命令调整。

## 数据模型

`Runner` ─< `Agent` ─< `RunStep` >─ `Run` >─ `Workflow`，`RunStep` ─< `RunLog`。定义见 `server/prisma/schema.prisma`。

## 安全边界

- 可选的共享令牌 `ITEAM_TOKEN` 保护 API、界面与 Runner 接入。
- Agent 以「自动批准」模式执行，拥有运行机器上该用户的全部权限；请只在可信机器上运行，并为 Agent 设置合适的工作目录。
