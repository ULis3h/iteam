# 快速开始 / Quick start

## 1. 安装并启动

```bash
git clone https://github.com/ULis3h/iteam.git
cd iteam
npm install        # 安装 server / client / runner 三个包
npm run dev        # 服务端 :3000 + 界面 :5173
```

首次启动会自动创建 SQLite 数据库（`server/prisma/iteam.db`）。打开 <http://localhost:5173>。

可选配置：复制 `server/.env.example` 为 `server/.env`。

| 变量 | 说明 | 默认 |
|---|---|---|
| `PORT` | 服务端口 | `3000` |
| `ITEAM_TOKEN` | 访问令牌。设置后界面和 runner 都必须携带 | 空（本机开放访问） |
| `ITEAM_MAX_PARALLEL` | 同时执行的最大步骤数 | `4` |
| `ITEAM_WORK_DIR` | 本地 Agent 的默认工作目录 | 服务进程所在目录 |
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

**Agent → 新建 Agent**：填写名称，选择 CLI、模型和思考强度，可以写一段角色指令（会自动加在每个任务的提示词前面）。

## 4. 运行第一个任务

最快的方式是「概览」页的 **快速任务**：选一个 Agent，输入要做的事，立即执行。

或者导入一个完整流水线：**工作流 → 导入**，粘贴 [`examples/feature-development.yaml`](../examples/feature-development.yaml)，点「导入并运行」。缺失的 Agent 会按文件里的定义自动创建。

## 5. 查看运行

每次运行都有三个视图：

- **流水线**：步骤 DAG，颜色即状态；点击步骤查看实际提示词、输出与错误。
- **路线图**：执行阶段（同阶段并行）+ 每个步骤的时间线。
- **日志**：按步骤过滤的实时输出，可搜索、自动滚动。

失败的运行可以「重试失败步骤」（成功的步骤保留输出，不会重跑），也可以「重新运行」。

## 6. 接入远程机器（可选）

见 [runner.md](./runner.md)。

## 生产模式

```bash
npm run build     # 构建界面与服务端
npm start         # 单端口 :3000 同时提供界面与 API
```

---

## English summary

1. `npm install && npm run dev`, open <http://localhost:5173>. Optional config lives in `server/.env` (see table above).
2. Install and log in to at least one agent CLI: `claude`, `codex`, `gemini`, or use a custom command.
3. **Agents → New agent**: choose CLI, model, effort, optional role instructions.
4. Run a **Quick task** from the overview, or **Workflows → Import** one of the files in `examples/`.
5. Every run has a **Pipeline** (DAG), **Roadmap** (stages + timeline) and **Logs** view; failed runs can be retried from the failed steps or run again.
6. Remote machines: see [runner.md](./runner.md). Production: `npm run build && npm start` (single port 3000).
