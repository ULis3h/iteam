# API

Base URL: `http://localhost:3000/api`。所有响应为 JSON。

**认证**：服务器设置了 `ITEAM_TOKEN` 时，除 `/health` 与 `/system` 外的请求都需要 `Authorization: Bearer <token>`（或 `X-Iteam-Token` 头）。**不接受 URL 参数中的令牌。** 连续失败过多会返回 429。未设置令牌时无需认证（此时服务只监听本机）。

## 系统

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/system` | 版本、是否需要令牌、提供方列表；带有效令牌时还返回监听地址、并行上限、默认目录、本机 CLI 检测（`?refresh=1` 重新检测） |
| POST | `/auth/verify` | 验证令牌（200 / 401） |
| GET | `/stats` | 概览计数 |
| GET | `/templates` | 内置模板（`examples/` 下的文件，含内容） |

## Agent

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/agents` | 列表，含 `state`（ready / busy / offline / missing-cli） |
| POST | `/agents` | 创建 |
| GET / PUT / DELETE | `/agents/:id` | 详情 / 更新 / 删除。删除被工作流引用的 Agent 返回 409，加 `?force=1` 强制 |
| GET | `/agents/:id/usage` | 引用该 Agent 的工作流与待执行步骤数 |

Agent 字段：`name` `description` `role` `location`(local\|remote) `runnerId` `provider`(claude-code\|codex\|gemini\|custom) `model` `effort`(low\|medium\|high\|max) `workDir` `command` `extraArgs[]` `env{}` `autoApprove` `timeoutSec` `maxConcurrent`。

响应中的 `env` 值一律为掩码 `••••••••`；更新时原样传回掩码值即保留原值，传新值即替换。

## Runner

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/runners` | 列表（在线状态来自实时连接、CLI 能力、`maxJobs`、活动任务数） |
| DELETE | `/runners/:id` | 删除离线 Runner |

## 工作流

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/workflows` | 列表（含运行次数与最近一次运行） |
| POST | `/workflows` | 创建：`{ name, description, inputs[], steps[] }`（步骤用 `agentId`；Agent 必须存在） |
| GET / PUT / DELETE | `/workflows/:id` | 详情 / 更新 / 删除 |
| POST | `/workflows/validate` | 校验定义，返回执行阶段与模板引用提示 `warnings` |
| POST | `/workflows/preview` | `{ content }` 预览导入文件：步骤、阶段、将创建的 Agent 及其 CLI/命令、提示 |
| POST | `/workflows/import` | `{ content, run?, inputs?, name? }` 导入（事务），可立即运行；返回 `createdAgents`、`warnings` |
| GET | `/workflows/:id/export?format=yaml\|json&includeEnv=1` | 导出（默认不含 Agent 环境变量） |
| POST | `/workflows/:id/run` | `{ inputs?, name? }` 开始运行 |

## 运行

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/runs?status=&workflowId=&limit=&before=` | 列表（`status` 可逗号分隔；`before` 为 ISO 时间游标，`limit` ≤ 200） |
| POST | `/runs/quick` | `{ agentId, prompt, name?, workDir? }` 单步快速任务 |
| POST | `/runs/prune` | `{ days }` 删除 N 天前完成的运行 |
| GET | `/runs/:id` | 详情，含步骤（`costUsd` `inputTokens` `outputTokens` `turns` `sessionId`） |
| GET | `/runs/:id/logs?stepId=&after=&limit=` | 日志行 `{ stepId, seq, ts, stream, line }`，`stream` ∈ stdout / stderr / system / event；响应头 `X-Has-More` |
| GET | `/runs/:id/steps/:stepId` | 单个步骤 |
| POST | `/runs/:id/steps/:stepId/followup` | `{ prompt }` 在同一 CLI 会话里追问（Claude Code），返回新运行 |
| POST | `/runs/:id/cancel` | 取消 |
| POST | `/runs/:id/retry` | 重试失败 / 跳过 / 取消的步骤 |
| POST | `/runs/:id/rerun` | `{ inputs?, name? }` 用相同定义新建运行 |
| DELETE | `/runs/:id` | 删除（需先取消） |

## WebSocket（Socket.IO）

命名空间 `/ui`，连接时 `auth: { token }`。

| 事件 | 载荷 |
|---|---|
| `agent:changed` / `agent:deleted` | Agent |
| `runner:changed` / `runner:deleted` | Runner |
| `workflow:changed` / `workflow:deleted` | Workflow |
| `run:changed` / `run:deleted` | Run（不含步骤） |
| `step:changed` | RunStep；全局广播不含 `prompt` / `output`，订阅了该运行的客户端会收到完整版本 |
| `run:log` | 日志行；需先 `emit('run:subscribe', runId)`（重连后需重新订阅） |

命名空间 `/runner` 供 Runner 使用（凭证 `ITEAM_RUNNER_TOKEN`）：握手携带 `name`、`capabilities`、`maxJobs`、`activeJobs`；事件 `job:run` → `job:log` / `job:done`，`job:cancel`，`runner:error`。

## curl 示例

```bash
T="Authorization: Bearer $ITEAM_TOKEN"
curl -H "$T" -H 'Content-Type: application/json' -X POST localhost:3000/api/agents \
  -d '{"name":"Reviewer","provider":"claude-code","model":"sonnet","effort":"high"}'
python3 - <<'PY' | curl -H "$T" -H 'Content-Type: application/json' -X POST localhost:3000/api/workflows/import --data-binary @-
import json; print(json.dumps({"content": open("examples/code-review.yaml").read(), "run": True, "inputs": {"repo": "/path/to/repo"}}))
PY
```
