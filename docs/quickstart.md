# 快速开始 / Quick start

## 1. 安装并启动

```bash
git clone https://github.com/ULis3h/iteam.git
cd iteam
npm install        # 安装 server / client / runner 三个包
npm run dev        # 服务端 :3000 + 界面 :5173
```

首次启动会自动创建 SQLite 数据库（`server/prisma/iteam.db`）。打开 <http://localhost:5173>。

默认只监听本机（`127.0.0.1`）。要从其他机器访问，请先设置访问令牌：复制 `server/.env.example` 为 `server/.env`，填写 `ITEAM_TOKEN`，服务会改为监听 `0.0.0.0`，界面首次打开时输入该令牌即可。

| 变量 | 说明 | 默认 |
|---|---|---|
| `PORT` | 服务端口（开发时 Vite 代理会读取它） | `3000` |
| `HOST` | 监听地址 | 有令牌 `0.0.0.0`，否则 `127.0.0.1` |
| `ITEAM_TOKEN` | 访问令牌。设置后界面和 runner 都必须携带（HTTP 头，不接受 URL 参数） | 空 |
| `ITEAM_RUNNER_TOKEN` | 给远程 runner 的独立凭证，不能调用管理 API | 同 `ITEAM_TOKEN` |
| `ITEAM_CORS_ORIGINS` | 允许跨域调用 API 的浏览器来源（逗号分隔） | 空（内置界面同源） |
| `ITEAM_MAX_PARALLEL` | 同时执行的最大步骤数 | `4` |
| `ITEAM_WORK_DIR` | 本地 Agent 的默认工作目录 | 用户主目录 |
| `ITEAM_RETENTION_DAYS` | 已完成运行的保留天数，0 = 永久 | `0` |
| `DATABASE_URL` | SQLite 文件位置 | `file:./iteam.db` |

## 2. 准备 Agent CLI

在运行 Agent 的机器上安装并登录至少一个 CLI：

| Provider | 命令 | 安装 |
|---|---|---|
| Claude Code | `claude` | `npm i -g @anthropic-ai/claude-code` |
| Codex CLI | `codex` | `npm i -g @openai/codex` |
| Gemini CLI | `gemini` | `npm i -g @google/gemini-cli` |
| 自定义 | 任意命令 | 见 [概念 › 自定义命令](./concepts.md#自定义命令) |

「设置」页会显示本机检测到的 CLI。

## 3. 创建第一个 Agent

**Agent → 新建 Agent**：选一个角色预设（架构师 / 开发者 / 评审员…）或自己填写，选择 CLI、模型和思考强度。角色指令会自动加在每个任务的提示词前面。

## 4. 运行第一个任务

最快的方式是「概览」页的 **快速任务**：选一个 Agent，输入要做的事，填上工作目录（默认是你的主目录，不是 iTeam 自己的目录），立即执行。

或者导入一个完整流水线：**工作流 → 导入 → 选择内置模板**（例如「新功能开发流水线」），填写仓库路径等参数，点「导入并运行」。缺失的 Agent 会按文件里的定义自动创建，预览里会列出它们将使用的 CLI 和命令。

## 5. 查看运行

每次运行都有三个视图：

- **流水线**：步骤 DAG，颜色即状态；点击步骤查看输出、实际提示词、错误、费用与 Token；Claude Code 步骤可以「追问」，在同一会话里继续。
- **路线图**：执行阶段（同阶段并行）+ 每个步骤的时间线。
- **日志**：Claude Code / Codex 的工具调用与结果会被整理成可读事件；可按步骤过滤、搜索、自动滚动。

失败的运行可以「重试失败步骤」（成功的步骤保留输出，不会重跑），也可以「重新运行」（可修改输入）。

## 6. 接入远程机器（可选）

见 [runner.md](./runner.md)。

## 生产模式

```bash
npm run build     # 构建界面与服务端
npm start         # 单端口 :3000 同时提供界面与 API
```

### Docker

```bash
cp server/.env.example .env   # 至少设置 ITEAM_TOKEN 和 CLI 的 API Key
mkdir -p workspace            # 挂载到容器的 /workspace，Agent 在这里工作
docker compose up -d
```

镜像内已安装三个 CLI，以非 root 用户运行（Claude Code 的无人值守模式不允许 root）。凭证通过 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` 传入。

## 常见问题

- **Agent 显示「未安装 CLI」**：服务进程的 `PATH` 里找不到该命令。用 systemd / pm2 启动时请在其环境里补全 `PATH`，或在 Agent 的「环境变量」里设置。
- **步骤成功但什么也没改**：检查步骤详情里的「实际提示词」和工作目录；关闭「自动批准」时 CLI 只允许文件编辑，需要确认的命令会被拒绝。
- **远程步骤失败「runner 离线」**：runner 断线时会等待 90 秒重连并自动接回正在执行的任务；超过后步骤失败，可直接重试。
- **端口被占用 / 改了 PORT 界面打不开**：`server/.env` 里的 `PORT` 同时作用于服务和开发代理，改完重启 `npm run dev`。

---

## English summary

1. `npm install && npm run dev`, open <http://localhost:5173>. The server binds to `127.0.0.1` until you set `ITEAM_TOKEN` in `server/.env` (see the table above for all variables).
2. Install and log in to at least one agent CLI (`claude`, `codex`, `gemini`) or use a custom command.
3. **Agents → New agent**: pick a role preset or fill in CLI, model, effort and role instructions.
4. Run a **Quick task** from the overview (set the working directory; the default is your home directory), or **Workflows → Import** a built-in template and start it with your inputs.
5. Every run has **Pipeline**, **Roadmap** and **Logs** views with readable agent events, cost/tokens per step and follow-ups for Claude Code steps. Retry failed steps or run again with edited inputs.
6. Remote machines: [runner.md](./runner.md). Production: `npm run build && npm start`, or `docker compose up -d` (set `ITEAM_TOKEN` and the CLI API keys in `.env`).
