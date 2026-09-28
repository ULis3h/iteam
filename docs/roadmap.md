# 路线图 / Roadmap

来源：2026-09 的一次系统性差距分析（代码审计 + 对照 LangGraph、Dify、Flowise、n8n、CrewAI、AutoGen、OpenHands、vibe-kanban、Crystal、claude-squad 等项目，并经交叉验证）。已经落地的能力见 [CHANGELOG](../CHANGELOG.md)；下面只列**尚未完成**的部分，按优先级排列。欢迎认领。

## P0

- **Gemini CLI 对等**：解析 `--output-format stream-json`（事件、会话 ID、Token、干净的最终回答），避免横幅文本流入下游提示词；追问（续会话）扩展到 Codex（`codex exec resume`）、Gemini（`--resume`）与自定义命令。

## P1

- **权限策略**：用「全开 / 工作区 / 仅编辑」三档 + Claude 工具白名单 / 黑名单 + Codex sandbox 等级取代二元的自动批准开关。
- **步骤硬上限与停止原因**：把最大轮次 / 费用传给 CLI（`--max-turns`、`--max-budget-usd`），运行时长上限，运行与步骤带机器可读的 `stopReason`。
- **结构化活动与真正的 diff 查看器**：工具调用、改动文件、命令、被拒权限、API 重试的结构化记录；按文件导航、补丁下载、git 分支 / 提交溯源。
- **运行控制**：从某步重跑时可编辑提示词；手动重试可附审阅备注（保留上下文，可选续会话）；暂停 / 恢复；工作流漂移后可用当前定义重跑。
- **可操作的通知**：按工作流配置、Slack / Discord 消息带费用与失败步骤、HMAC 签名与重试、测试按钮、审批超时默认决定、一键通过 / 驳回链接、等待审批角标。
- **Runner 发布到 npm**：`npx iteam-runner` 一行启动；Runner 握手上报 CLI 版本，版本敏感的参数按版本开关。
- **收尾项**：导入预览显示 `check` / `when`；Windows 下孤儿进程清理的说明；打 `v1.2.0` 标签触发镜像发布。

## P2

- 空闲输出看门狗（卡住的 CLI）与步骤卡片上的排队原因。
- 定时触发（按工作流的 cron + 保存的输入 + 防重叠）与运行的 `trigger` 来源字段。
- 并行编码步骤的 git worktree 隔离。
- 机器接口：单次运行的 SSE 事件流、stdio MCP 服务器（列出 / 运行工作流、等待、审批）。
- 编辑器 YAML 模式、步骤输出的 Markdown 渲染、JSON schema 类型化输出。
- 英文文档完整镜像、英文模板；`/api/metrics` 与在线备份。

---

## English summary

Remaining work from the September 2026 gap analysis, by priority. **P0**: Gemini stream-json parity and follow-ups for every provider. **P1**: per-agent permission policy (tool allow/deny lists, Codex sandbox levels), per-step turn/budget caps with a machine-readable stop reason, structured step activity and a real diff viewer, richer run controls (edit prompt on rerun, retry with a note, pause/resume), actionable notifications (per-workflow, signed, approval links and timeouts), `npx iteam-runner`, and small close-outs. **P2**: idle watchdog, cron triggers, worktree isolation, SSE/MCP interfaces, YAML editing and Markdown rendering, English docs parity, metrics and backup.
