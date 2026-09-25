# API

Base URL: `http://localhost:3000/api`。所有响应为 JSON。

**认证**：服务器设置了 `ITEAM_TOKEN` 时，除 `/health` 与 `/system` 外的请求都需要 `Authorization: Bearer <token>`（也接受 `X-Iteam-Token` 头或 `?token=`）。未设置令牌时无需认证。

## 系统

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/system` | 版本、是否需要令牌、提供方列表、本机 CLI 检测（`?refresh=1` 重新检测） |
| POST | `/auth/verify` | 验证令牌（200 / 401） |
| GET | `/stats` | 概览计数 |

## Agent

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/agents` | 列表，含 `state`（ready / busy / offline / missing-cli） |
| POST | `/agents` | 创建。字段见下 |
| GET / PUT / DELETE | `/agents/:id` | 详情 / 更新 / 删除（执行中不可删除） |

Agent 字段：`name` `description` `role` `location`(local\|remote) `runnerId` `provider`(claude-code\|codex\|gemini\|custom) `model` `effort`(low\|medium\|high\|max) `workDir` `command` `extraArgs[]` `env{}` `autoApprove` `timeoutSec`。

## Runner

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/runners` | 列表（状态、CLI 能力、绑定的 Agent 数） |
| DELETE | `/runners/:id` | 删除离线 Runner |

## 工作流

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/workflows` | 列表（含运行次数与最近一次运行） |
| POST | `/workflows` | 创建：`{ name, description, inputs[], steps[] }`（步骤用 `agentId`） |
| GET / PUT / DELETE | `/workflows/:id` | 详情 / 更新 / 删除 |
| POST | `/workflows/validate` | 校验定义，返回执行阶段 |
| POST | `/workflows/preview` | `{ content }` 预览导入文件（不落库） |
| POST | `/workflows/import` | `{ content, run?, inputs?, name? }` 导入，可立即运行 |
| GET | `/workflows/:id/export?format=yaml\|json` | 导出 |
| POST | `/workflows/:id/run` | `{ inputs?, name? }` 开始运行 |

## 运行

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/runs?status=&workflowId=&limit=` | 列表（`status` 可逗号分隔） |
| POST | `/runs/quick` | `{ agentId, prompt, name?, workDir? }` 单步快速任务 |
| GET | `/runs/:id` | 详情，含步骤 |
| GET | `/runs/:id/logs?stepId=&after=` | 日志行 `{ stepId, seq, ts, stream, line }` |
| GET | `/runs/:id/steps/:stepId` | 单个步骤 |
| POST | `/runs/:id/cancel` | 取消 |
| POST | `/runs/:id/retry` | 重试失败 / 跳过 / 取消的步骤 |
| POST | `/runs/:id/rerun` | 用相同定义与输入新建运行 |
| DELETE | `/runs/:id` | 删除（需先取消） |

## WebSocket（Socket.IO）

命名空间 `/ui`，连接时 `auth: { token }`。

| 事件 | 载荷 |
|---|---|
| `agent:changed` / `agent:deleted` | Agent |
| `runner:changed` / `runner:deleted` | Runner |
| `workflow:changed` / `workflow:deleted` | Workflow |
| `run:changed` | Run（不含步骤） |
| `step:changed` | RunStep |
| `run:log` | 日志行；需先 `emit('run:subscribe', runId)` |

命名空间 `/runner` 供 Runner 使用：`job:run` → `job:log` / `job:done`，`job:cancel`。

## curl 示例

```bash
T="Authorization: Bearer $ITEAM_TOKEN"
curl -H "$T" -H 'Content-Type: application/json' -X POST localhost:3000/api/agents \
  -d '{"name":"Reviewer","provider":"claude-code","model":"sonnet","effort":"high"}'
curl -H "$T" -H 'Content-Type: application/json' -X POST localhost:3000/api/workflows/import \
  --data-binary @<(python3 -c 'import json,sys;print(json.dumps({"content":open("examples/code-review.yaml").read(),"run":True,"inputs":{"repo":"/path/to/repo"}}))')
```
