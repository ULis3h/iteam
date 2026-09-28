# 工作流文件格式 / Workflow file format

工作流文件是 YAML 或 JSON，可从 **工作流 → 导入** 粘贴或选择文件导入，也可以从任意工作流导出得到。

## 完整示例

```yaml
name: 新功能开发流水线            # 必填
description: 从需求到评审         # 可选

settings:                         # 可选
  maxCostUsd: 5                   # 费用上限（美元）：步骤上报费用之和超过即停止运行

inputs:                           # 可选，运行时填写
  - key: repo                     # 必填，字母开头，可含数字 _ -
    label: 仓库路径               # 界面显示名
    description: 本地绝对路径     # 说明
    default: /home/me/project     # 默认值
    required: true                # 是否必填

agents:                           # 可选。只在同名 Agent 不存在时用于创建
  - name: 架构师                  # 必填，与 steps[].agent 对应
    role: 你是资深架构师……         # 角色 / 系统指令
    provider: claude-code         # claude-code | codex | gemini | custom | demo（内置演示）
    model: opus
    effort: high                  # low | medium | high | max
    location: local               # local | remote
    runner: my-mac                # location=remote 时的 Runner 名称
    workDir: /home/me/project
    command: "my-agent {{promptFile}}"   # provider=custom 时必填
    extraArgs: ["--max-turns", "30"]
    env: { MY_FLAG: "1" }
    autoApprove: true
    timeoutSec: 1800
    maxConcurrent: 1              # 该 Agent 同时执行的步骤数

steps:                            # 必填，至少一个
  - id: design                    # 必填，唯一，字母开头
    name: 方案设计                # 必填
    agent: 架构师                 # 必填，Agent 名称
    prompt: |                     # 必填，支持模板变量
      仓库位于 {{inputs.repo}}，请设计……
    dependsOn: []                 # 依赖的步骤 ID 列表
    expectedOutput: Markdown 方案 # 附加到提示词末尾
    model: sonnet                 # 覆盖 Agent 模型
    effort: medium                # 覆盖 Agent 思考强度
    timeoutSec: 600               # 覆盖超时
    retries: 1                    # 失败重试次数（0–5，指数退避）
    continueOnError: false        # 失败时不阻塞下游
    workDir: "{{inputs.repo}}"    # 覆盖工作目录，可用模板变量
    check: npm test               # 验证命令：Agent 完成后在工作目录执行，退出码非 0 则步骤失败
    when: "{{inputs.mode}} == 'full'"      # 执行条件：为假时跳过本步骤及其下游（见下文）
    assertOutput: "contains 'FINAL'"     # 输出断言：不满足则视为失败并带着原因重试

  - id: approve                   # 人工审批步骤：不需要 agent
    name: 方案确认
    type: approval
    dependsOn: [design]
    prompt: |                     # 展示给审批人的说明，可引用上游输出
      请确认以下方案是否可以实施：
      {{steps.design.output}}

  - id: implement
    name: 实现
    agent: 开发者
    dependsOn: [approve]
    prompt: |
      根据方案实现（审批备注：{{steps.approve.output}}）：
      {{steps.design.output}}
```

步骤 `type` 为 `agent`（默认）或 `approval`。审批步骤轮到时运行进入「待审批」，在运行页通过或驳回；备注作为该步骤的输出，驳回等同于失败（可加 `continueOnError` 让下游照常执行）。

## 模板变量

| 变量 | 说明 |
|---|---|
| `{{inputs.key}}` | 运行时填写的输入参数 |
| `{{steps.ID.output}}` | 上游步骤的输出（应在 `dependsOn` 中声明） |
| `{{steps.ID.status}}` | 上游步骤状态 |
| `{{run.name}}` `{{run.id}}` | 本次运行 |
| `{{workflow.name}}` | 工作流名称 |

未定义的变量渲染为空字符串，并在该步骤日志中给出警告；保存与导入时会提前检查引用（未声明的输入、引用了未依赖的步骤）。工作目录里的模板变量必须能解析，否则该步骤失败。

## 条件与断言

`when` 与 `assertOutput` 使用同一套简单表达式，不需要 LLM 参与：

| 写法 | 含义 |
|---|---|
| `{{inputs.deploy}}` | 真值判断：非空且不是 `false / 0 / no / off` |
| `{{inputs.mode}} == 'full'` / `!= 'full'` | 相等 / 不等（两侧去空白） |
| `{{steps.review.output}} contains 'LGTM'` / `!contains` | 包含 / 不包含 |
| `{{steps.plan.output}} matches /^## /i` / `!matches` | 正则匹配 |
| `{{steps.x.output}} startsWith 'ok'` / `endsWith '.'` | 前缀 / 后缀 |

- `when` 的左侧是模板文本（可引用 `inputs`、`steps.ID.output`、`steps.ID.status`）。条件为假时步骤标记为**已跳过**，其下游同样跳过，运行仍可成功——这就是分支。
- `assertOutput` 的左侧隐含为本步骤的输出，只写操作符和值：`contains 'FINAL'`、`/^## /`（等于 `matches`）、`'ok'`（等于 `contains`）。断言不通过时步骤失败；若设置了 `retries`，重试的提示词会附上失败原因与上一次输出。

## 触发 URL

在编辑器右侧为已保存的工作流生成触发 URL：`POST /api/hooks/<workflowId>/<token>`，请求体可为 `{ "inputs": {...}, "name": "..." }`，返回新运行的 `id`。该地址不需要访问令牌（密钥在 URL 里），可用于 CI / GitHub Actions；可随时更换或撤销密钥。

## 导入规则

- 步骤引用的 Agent **已存在**：直接使用现有配置（文件里的 `agents` 定义不会覆盖它）。
- **不存在但在 `agents` 中定义**：按定义创建。
- **不存在且未定义**：以默认配置创建（本地、Claude Code、medium），导入预览会标出。
- 校验：步骤 ID 唯一、依赖存在、无循环依赖；不通过的文件不会导入。

## JSON

同样的结构，例如：

```json
{
  "name": "Quick review",
  "steps": [
    { "id": "review", "name": "Review", "agent": "Reviewer", "prompt": "Review the latest commit." }
  ]
}
```

---

## English summary

A workflow file has `name`, optional `description`, optional `settings` (`maxCostUsd`), optional `inputs` (`key`, `label`, `description`, `default`, `required`), optional `agents` (used only to create agents that do not exist yet: `name`, `role`, `provider`, `model`, `effort`, `location`, `runner`, `workDir`, `command`, `extraArgs`, `env`, `autoApprove`, `timeoutSec`, `maxConcurrent`) and required `steps` (`id`, `name`, `type` = `agent` | `approval`, `agent`, `prompt`, `dependsOn`, `expectedOutput`, `model`, `effort`, `timeoutSec`, `retries`, `continueOnError`, `workDir`, `check`, `when`, `assertOutput`). `when` skips a step (and its descendants) unless a predicate on inputs / upstream results holds (`{{inputs.mode}} == 'full'`, `{{steps.review.output}} contains 'LGTM'`, `matches /re/`, bare template = truthy); `assertOutput` applies the same predicate language to the step's own output and fails the step (retries get the reason) when it does not hold. A saved workflow can expose a trigger URL (`POST /api/hooks/:id/:token`) that starts a run without a session token. An approval step needs no agent: the run waits until a person approves or rejects it in the UI, and the reviewer's note becomes the step output. Prompts and `workDir` can use `{{inputs.key}}`, `{{steps.ID.output}}`, `{{steps.ID.status}}`, `{{run.name}}`, `{{workflow.name}}`. Files are validated (unique ids and input keys, existing dependencies, no cycles, template references) before import; the preview shows what each created agent will execute. Exports omit agent env values unless `includeEnv=1`.
