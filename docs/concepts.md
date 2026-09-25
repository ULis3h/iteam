# 核心概念 / Concepts

iTeam 只有三个概念：**Agent**、**工作流（Workflow）**、**运行（Run）**。

## Agent

一个 Agent = 角色 + CLI 运行时 + 运行位置。

| 字段 | 说明 |
|---|---|
| 名称 | 唯一。工作流文件通过名称引用 Agent。 |
| 角色 / 系统指令 | 可选。自动放在每个任务提示词的最前面，用来固定 Agent 的身份与工作方式。 |
| CLI / 提供方 | `claude-code`、`codex`、`gemini` 或 `custom`（自定义命令）。 |
| 模型 | 传给 CLI 的模型名；留空用 CLI 默认值。 |
| 思考强度 | `low / medium / high / max`。Claude Code 映射为 `--effort`，Codex 映射为 `model_reasoning_effort`（`max` → `xhigh`），Gemini 无此设置（忽略）。 |
| 运行位置 | `local`：在 iTeam 服务器上执行；`remote`：在指定的 Runner 机器上执行。 |
| 工作目录 | 执行命令时的 cwd。留空 = 服务器默认目录（远程则为 Runner 启动时的目录）。 |
| 自动批准 | 默认开启，让 CLI 无人值守地执行工具调用（Claude Code `--dangerously-skip-permissions`，Codex `--dangerously-bypass-approvals-and-sandbox`，Gemini `--yolo`）。关闭后使用各 CLI 的「自动接受编辑」模式。 |
| 额外参数 / 环境变量 / 超时 | 追加到命令行的参数；注入到进程的环境变量；单步最长执行时间（秒）。 |

Agent 状态：**就绪**（可执行）、**执行中**、**离线**（远程 Runner 未连接）、**未安装 CLI**（机器上找不到对应命令）。

### 提示词是怎么组装的

```
<角色 / 系统指令>
---
<渲染后的步骤提示词>
---
Expected output:
<期望输出>
```

提示词通过 stdin 传给 CLI；步骤输出取自 CLI 的标准输出（Codex 取 `--output-last-message` 文件）。

### 自定义命令

`custom` 提供方用一条命令模板接入任何 Agent：

```
my-agent --model {{model}} --effort {{effort}} --file {{promptFile}} > {{outputFile}}
```

| 占位符 | 含义 |
|---|---|
| `{{prompt}}` | 提示词（已做 shell 转义） |
| `{{promptFile}}` | 写有提示词的临时文件路径 |
| `{{outputFile}}` | 若使用，步骤输出从该文件读取，否则取标准输出 |
| `{{model}}` `{{effort}}` `{{workDir}}` | Agent 配置 |

命令通过 shell 执行，提示词同时写入 stdin。

## 工作流（Workflow）

工作流 = 输入参数 + 步骤列表。步骤之间用 `dependsOn` 声明依赖，构成 DAG：

- 没有未完成依赖的步骤立即开始，互不依赖的步骤**并行**执行（上限 `ITEAM_MAX_PARALLEL`）。
- 步骤提示词里可以引用 `{{inputs.键名}}`、`{{steps.步骤ID.output}}`、`{{run.name}}`、`{{workflow.name}}`。
- 每个步骤可覆盖模型、思考强度、超时；可设置失败重试次数；`continueOnError` 让下游在它失败时照常执行（输出为空）。
- 上游步骤失败（且未设 `continueOnError`）时，下游步骤标记为**已跳过**。

工作流可以在界面编辑器里创建，也可以导入 YAML / JSON 文件（见 [workflow-format.md](./workflow-format.md)），并随时导出。

## 运行（Run）

运行是工作流的一次执行。运行时会**冻结**工作流定义，之后修改工作流不影响历史记录。

| 状态 | 含义 |
|---|---|
| `queued` → `running` | 已创建 → 正在执行 |
| `succeeded` | 所有步骤成功（或失败但 `continueOnError`） |
| `failed` | 至少一个步骤失败 |
| `cancelled` | 被用户取消 |

步骤状态：`pending` / `running` / `succeeded` / `failed` / `skipped` / `cancelled`。

操作：

- **取消**：终止所有正在执行的进程（本地进程树 / 远程 Runner 上的进程）。
- **重试失败步骤**：失败、跳过、取消的步骤重置后继续执行；成功的步骤保留输出。
- **重新运行**：用同样的定义和输入新建一次运行。

**快速任务** 是只有一个步骤、不保存工作流的运行。

## 日志

每个步骤的 stdout / stderr 以及系统事件（开始、重试、超时、退出码）实时推送到界面，并持久化在数据库中。

---

## English summary

- **Agent** = role instructions + CLI runtime (`claude-code` / `codex` / `gemini` / `custom`, model, effort `low…max`, auto-approve, extra args, env, timeout) + location (`local` on the server, `remote` on a runner). The prompt sent to the CLI is `role --- rendered prompt --- Expected output`.
- **Workflow** = inputs + steps forming a DAG via `dependsOn`. Independent steps run in parallel. Prompts can reference `{{inputs.key}}` and `{{steps.id.output}}`. Per-step overrides: model, effort, timeout, retries, `continueOnError`.
- **Run** = one execution with a frozen copy of the workflow. Statuses `queued / running / succeeded / failed / cancelled`; steps add `pending / skipped`. Cancel kills running processes; retry re-runs only failed/skipped/cancelled steps; rerun starts a fresh run. A **quick task** is a one-step run without a saved workflow.
- Custom commands use placeholders `{{prompt}} {{promptFile}} {{outputFile}} {{model}} {{effort}} {{workDir}}`.
