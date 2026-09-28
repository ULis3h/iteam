# 核心概念 / Concepts

iTeam 只有三个概念：**Agent**、**工作流（Workflow）**、**运行（Run）**。

## Agent

一个 Agent = 角色 + CLI 运行时 + 运行位置。

| 字段 | 说明 |
|---|---|
| 名称 | 唯一（不区分大小写）。工作流文件通过名称引用 Agent。 |
| 角色 / 系统指令 | 可选。自动放在每个任务提示词的最前面，用来固定 Agent 的身份与工作方式。 |
| CLI / 提供方 | `claude-code`、`codex`、`gemini`、`custom`（自定义命令）或 `demo`（内置演示 Agent：不调用任何模型，只在服务器上模拟事件与输出，用于体验产品）。 |
| 模型 | 传给 CLI 的模型名；留空用 CLI 默认值。 |
| 思考强度 | `low / medium / high / max`。Claude Code 映射为 `--effort`，Codex 映射为 `model_reasoning_effort`（`max` → `xhigh`），Gemini 无此设置（忽略）。 |
| 运行位置 | `local`：在 iTeam 服务器上执行；`remote`：在指定的 Runner 机器上执行。 |
| 工作目录 | 执行命令时的 cwd。留空 = 服务器默认目录（`ITEAM_WORK_DIR`，默认用户主目录；远程则为 Runner 启动时的目录）。步骤可以覆盖它，并且可以使用模板，如 `{{inputs.repo}}`。 |
| 并行上限 | 该 Agent 同时执行的步骤数，默认 1。多个步骤共用一个工作目录时保持 1，避免互相覆盖改动。 |
| 自动批准 | 默认开启：CLI 无人值守执行全部工具调用。关闭时只允许文件编辑，需要确认的命令会被自动拒绝（各 CLI 在无人值守模式下无法弹出确认）。 |
| 额外参数 / 环境变量 / 超时 | 追加到命令行的参数；注入到进程的环境变量（`PATH`、`NODE_OPTIONS`、`HOME`、`LD_*` 等不可覆盖）；单步最长执行时间（秒）。环境变量的值在界面和导出文件中都会被掩码。 |

Agent 状态：**就绪**、**执行中**、**离线**（远程 Runner 未连接）、**未安装 CLI**。

### 各 CLI 的调用方式

| Provider | 自动批准开启 | 关闭时 | 输出来源 |
|---|---|---|---|
| claude-code | `claude -p --output-format stream-json --verbose [--resume ID] [--model M] [--effort E] --dangerously-skip-permissions` | `--permission-mode acceptEdits` | `result` 事件的文本；同时记录费用、Token、轮次、会话 ID |
| codex | `codex exec --json --skip-git-repo-check -o <文件> [-m M] [-c model_reasoning_effort="E"] --dangerously-bypass-approvals-and-sandbox -` | `--sandbox workspace-write` | `-o` 文件（最后一条消息）；记录 Token |
| gemini | `gemini [-m M] --yolo` | `--approval-mode auto_edit` | 标准输出 |
| custom | 你的命令模板（shell 执行） | 同上 | `{{outputFile}}`（若使用）否则标准输出 |

提示词一律通过 stdin 传入，组装方式：

```
<角色 / 系统指令>          （追问/续会话时省略）
---
<渲染后的步骤提示词>
---
Expected output:
<期望输出>
```

参数对应写作时的 CLI 版本；若你的版本不同，用「额外参数」或自定义命令调整。设置页会显示检测到的 CLI 版本，Agent 表单会实时显示「将执行」的完整命令。

### 自定义命令

`custom` 提供方用一条命令模板接入任何 Agent：

```
my-agent --model {{model}} --effort {{effort}} --file {{promptFile}} > {{outputFile}}
```

| 占位符 | 含义 |
|---|---|
| `{{prompt}}` | 提示词（已做 shell 转义；超过 64KB 请改用 `{{promptFile}}`） |
| `{{promptFile}}` | 写有提示词的临时文件路径 |
| `{{outputFile}}` | 若使用，步骤输出从该文件读取，否则取标准输出 |
| `{{model}}` `{{effort}}` `{{workDir}}` | Agent 配置（已转义） |

命令通过 shell 执行，提示词同时写入 stdin。

## 工作流（Workflow）

工作流 = 输入参数 + 步骤列表。步骤之间用 `dependsOn` 声明依赖，构成 DAG：

- 没有未完成依赖的步骤立即开始，互不依赖的步骤**并行**执行（受全局 `ITEAM_MAX_PARALLEL`、Agent 并行上限、Runner `--max-jobs` 约束）。
- 步骤提示词和工作目录里可以引用 `{{inputs.键名}}`、`{{steps.步骤ID.output}}`、`{{steps.步骤ID.status}}`、`{{run.name}}`、`{{workflow.name}}`。保存和导入时会检查引用（未声明的输入、未依赖的步骤）并给出提示。
- 每个步骤可覆盖模型、思考强度、超时、工作目录；可设置失败重试次数；`continueOnError` 让下游在它失败时照常执行（其输出为空）。
- **验证命令**（`check`）：Agent 退出后在同一工作目录执行的 shell 命令（如 `npm test`），退出码非 0 则该步骤失败——「成功」不再只是「CLI 退出码为 0」。
- 上游步骤失败（且未设 `continueOnError`）时，下游步骤标记为**已跳过**。
- **人工审批步骤**（`type: approval`）不执行任何命令：轮到它时运行进入 `waiting`，界面显示审批说明（可引用上游输出），由人**通过**或**驳回**。备注会成为该步骤的输出，供下游 `{{steps.ID.output}}` 引用；驳回等同于步骤失败（可重试再次审批）。等待中的运行不占用并行槽位，服务重启后依然保留。
- **费用上限**（`settings.maxCostUsd`）：所有步骤上报的费用之和超过上限时，运行以失败结束，未开始的步骤取消。费用来自 CLI 自己的统计（目前 Claude Code 报告费用）。

工作流可以在界面编辑器里创建，也可以从内置模板或 YAML / JSON 文件导入（见 [workflow-format.md](./workflow-format.md)），并随时导出。

## 运行（Run）

运行是工作流的一次执行。创建时会**冻结**工作流定义和每个步骤的 Agent 配置，之后修改工作流或 Agent 都不影响这次运行（包括重试）。

| 状态 | 含义 |
|---|---|
| `queued` → `running` | 已创建 → 正在执行 |
| `waiting` | 没有步骤在执行，只等一个人工审批 |
| `succeeded` | 所有步骤成功（或失败但 `continueOnError`） |
| `failed` | 至少一个步骤失败 |
| `cancelled` | 被用户取消或服务停止 |

步骤状态：`pending` / `waiting` / `running` / `succeeded` / `failed` / `skipped` / `cancelled`。

操作：

- **取消**：终止所有正在执行的进程（本地进程树 / 远程 Runner 上的进程）。
- **重试失败步骤**：失败、跳过、取消的步骤重置后继续执行；成功的步骤保留输出。
- **从此步骤重跑**：运行结束后，重新执行某个步骤及其全部下游，其余结果保留（上游必须已成功）。适合改了提示词或想换个结果时不用从头跑。
- **重新运行**：用同样的定义新建一次运行，可以修改输入。
- **追问**：Claude Code 步骤完成后，在同一个 CLI 会话里继续对话（保留上下文），记录为一次新的运行。

**快速任务** 是只有一个步骤、不保存工作流的运行。

### 运行时行为

- **重试**：失败后按 1s、2s、4s…（最多 30s）退避重试；Runner 离线等基础设施故障同样消耗一次尝试。重试的提示词会附上上一次的失败原因与输出末尾，让 Agent 修正而不是重复同样的错误；工作目录可能已被上一次尝试改动过一半——编码类步骤请谨慎设置重试。
- **排队原因**：就绪但未开始的步骤会在日志里说明原因（全局并行上限、Agent 并行上限、Runner 满载）。
- **输出**：每步最多保留 512KB 输出（保留末尾），日志每步最多 20,000 行；超出会在系统日志中标注。`{{steps.x.output}}` 引用的就是步骤详情里显示的输出。
- **费用与 Token**：来自 CLI 自己的统计（Claude Code 报告费用、Token、轮次；Codex 报告 Token）。
- **工作区变更**：步骤结束后，如果工作目录是 git 仓库，会记录 `git diff`（统计 + 内容，最多 200KB）和未跟踪文件，显示在步骤详情里。
- **通知**：设置页可开启浏览器通知（运行结束 / 等待审批）；服务端设置 `ITEAM_WEBHOOK_URL` 后，同样的事件会以 JSON POST 到该地址（`{ event, run, url }`，链接用 `ITEAM_PUBLIC_URL` 拼接）。
- **服务重启**：正在执行的步骤会被标记为失败（说明为 server restarted），可以重试；服务正常停止时会先终止所有 Agent 进程；异常崩溃后重新启动时，会按记录的进程 ID 清理仍在运行的本地 Agent 进程，Runner 重连时也会终止服务器已不认识的任务，避免重试造成重复执行。
- **Runner 断线**：正在执行的远程步骤会等待 90 秒，Runner 重连后自动接回；超时则失败。

## 日志

每个步骤的 stdout / stderr、CLI 事件（工具调用、结果、费用）以及系统事件（开始、重试、超时、退出码）实时推送到界面，并持久化在数据库中。

---

## English summary

- **Agent** = role instructions + CLI runtime (`claude-code` / `codex` / `gemini` / `custom` / `demo` for a built-in simulated agent, model, effort `low…max`, auto-approve, extra args, env, timeout, `maxConcurrent`) + location (`local` on the server, `remote` on a runner). Prompts go to the CLI via stdin as `role --- rendered prompt --- Expected output`; the exact argv per provider is in the table above.
- **Workflow** = inputs + steps forming a DAG via `dependsOn`. Independent steps run in parallel within the global, per-agent and per-runner limits. Prompts and working directories can reference `{{inputs.key}}`, `{{steps.id.output}}`, `{{steps.id.status}}`, `{{run.name}}`, `{{workflow.name}}`; references are validated on save/import.
- **Run** = one execution with the workflow *and* each step's agent configuration frozen. Cancel kills processes; retry re-runs only failed/skipped/cancelled steps with exponential backoff; *rerun from step* re-executes one step and its descendants; rerun starts fresh with editable inputs; follow-up continues a Claude Code session. Output is capped at 512 KB per step and 20,000 log lines; cost/tokens come from the CLI's own report; the git diff of the working tree is stored per step.
- **Check commands** (`check: npm test`) run in the step's working directory after the agent exits; a non-zero exit fails the step. Retried prompts include the previous failure. Orphaned agent processes are killed when the server restarts after a crash.
- **Approval steps** (`type: approval`) park the run in `waiting` until a person approves or rejects in the UI (the note becomes the step output). `settings.maxCostUsd` fails the run once the summed reported cost exceeds the limit. Browser notifications and an optional webhook (`ITEAM_WEBHOOK_URL`) announce finished and waiting runs.
