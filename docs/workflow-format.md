# 工作流文件格式 / Workflow file format

工作流文件是 YAML 或 JSON，可从 **工作流 → 导入** 粘贴或选择文件导入，也可以从任意工作流导出得到。

## 完整示例

```yaml
name: 新功能开发流水线            # 必填
description: 从需求到评审         # 可选

inputs:                           # 可选，运行时填写
  - key: repo                     # 必填，字母开头，可含数字 _ -
    label: 仓库路径               # 界面显示名
    description: 本地绝对路径     # 说明
    default: /home/me/project     # 默认值
    required: true                # 是否必填

agents:                           # 可选。只在同名 Agent 不存在时用于创建
  - name: 架构师                  # 必填，与 steps[].agent 对应
    role: 你是资深架构师……         # 角色 / 系统指令
    provider: claude-code         # claude-code | codex | gemini | custom
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
    retries: 1                    # 失败重试次数（0–5）
    continueOnError: false        # 失败时不阻塞下游

  - id: implement
    name: 实现
    agent: 开发者
    dependsOn: [design]
    prompt: |
      根据方案实现：
      {{steps.design.output}}
```

## 模板变量

| 变量 | 说明 |
|---|---|
| `{{inputs.key}}` | 运行时填写的输入参数 |
| `{{steps.ID.output}}` | 上游步骤的输出（应在 `dependsOn` 中声明） |
| `{{steps.ID.status}}` | 上游步骤状态 |
| `{{run.name}}` `{{run.id}}` | 本次运行 |
| `{{workflow.name}}` | 工作流名称 |

未定义的变量渲染为空字符串，并在该步骤日志中给出警告。

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

A workflow file has `name`, optional `description`, optional `inputs` (`key`, `label`, `description`, `default`, `required`), optional `agents` (used only to create agents that do not exist yet: `name`, `role`, `provider`, `model`, `effort`, `location`, `runner`, `workDir`, `command`, `extraArgs`, `env`, `autoApprove`, `timeoutSec`) and required `steps` (`id`, `name`, `agent`, `prompt`, `dependsOn`, `expectedOutput`, `model`, `effort`, `timeoutSec`, `retries`, `continueOnError`). Prompts can use `{{inputs.key}}`, `{{steps.ID.output}}`, `{{steps.ID.status}}`, `{{run.name}}`, `{{workflow.name}}`. Files are validated (unique ids, existing dependencies, no cycles) before import.
