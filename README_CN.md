<p align="center">
  <img src="docs/images/logo-banner.png" alt="iTeam" width="420">
</p>

<p align="center">
  <strong>把本地和远程的编码 Agent 编排成自动化流水线。</strong><br>
  Claude Code · Codex CLI · Gemini CLI · 任意命令行 Agent
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./docs/quickstart.md">快速开始</a> ·
  <a href="./docs/concepts.md">核心概念</a> ·
  <a href="./docs/workflow-format.md">工作流文件格式</a> ·
  <a href="./docs/runner.md">远程 Runner</a> ·
  <a href="./docs/api.md">API</a>
</p>

---

## 它是什么

iTeam 把你已有的 Agent CLI 组成一个团队。你定义 **Agent**（角色 + CLI 运行时：模型、思考强度；运行在本机或远程机器），把它们组合成 **工作流**（带依赖关系的步骤），然后 **运行**。无依赖的步骤并行执行，每个步骤可以引用上游步骤的输出，整个过程在一个页面里看得清清楚楚：流水线图、路线图、实时日志。

| | |
|---|---|
| **Agent** | Claude Code、Codex CLI、Gemini CLI 或自定义命令。每个 Agent 单独设置模型、思考强度（`low / medium / high / max`）、角色指令、工作目录、超时。 |
| **本地或远程** | 本地 Agent 在服务器上执行；远程 Agent 在任何启动了 runner 的机器上执行。 |
| **工作流** | 步骤构成 DAG。`{{inputs.x}}`、`{{steps.id.output}}` 在步骤间传递数据。支持按步骤覆盖模型/思考强度、失败重试、超时、失败不阻塞下游。 |
| **运行记录** | 流水线视图、阶段路线图 + 时间线、按步骤的实时日志、实际提示词与输出、取消、重试失败步骤、重新运行。 |
| **导入 / 导出** | 工作流就是 YAML / JSON 文件。从界面导入（缺失的 Agent 按文件定义自动创建），任意工作流可导出。 |
| **快速任务** | 一个 Agent、一句话，直接执行，不用先建工作流。 |

## 快速开始

要求：Node.js 20+，以及至少一个已安装并登录的 Agent CLI（`claude`、`codex` 或 `gemini`）。

```bash
git clone https://github.com/ULis3h/iteam.git
cd iteam
npm install
npm run dev
```

打开 <http://localhost:5173>。

1. **Agent → 新建 Agent**：起个名字，选择 CLI、模型和思考强度。
2. **工作流 → 导入**：粘贴 [`examples/feature-development.yaml`](./examples/feature-development.yaml)（或在编辑器里手动创建）。
3. **运行**：填写输入参数，看着流水线跑起来。

生产单端口模式：`npm run build && npm start`，界面和 API 都在 3000 端口。

## 一个工作流文件

```yaml
name: Bug 修复
inputs:
  - key: repo
    required: true
  - key: bug
    required: true
agents:
  - name: 复现者
    provider: claude-code
    model: sonnet
    effort: high
  - name: 修复者
    provider: codex
    model: gpt-5-codex
    effort: medium
steps:
  - id: reproduce
    name: 复现问题
    agent: 复现者
    prompt: "仓库 {{inputs.repo}}。问题：{{inputs.bug}}。定位根因并添加一个失败的测试。"
  - id: fix
    name: 修复
    agent: 修复者
    dependsOn: [reproduce]
    retries: 1
    prompt: "仓库 {{inputs.repo}}。根据以下分析修复并让测试通过：\n{{steps.reproduce.output}}"
```

更多示例见 [`examples/`](./examples)，完整说明见 [docs/workflow-format.md](./docs/workflow-format.md)。

## 接入远程机器

```bash
cd runner && npm install
node bin/iteam-runner.js --server http://SERVER:3000 --token <ITEAM_TOKEN> --name my-mac
```

这台机器会出现在 **Agent → Runner** 中；新建 Agent 时选择「远程」并指定它即可。详见 [docs/runner.md](./docs/runner.md)。

## 目录结构

```
server/   Express + Prisma (SQLite) + Socket.IO —— API、调度器、执行器
client/   React + Vite + Tailwind —— Web 界面
runner/   Node CLI —— 在远程机器上执行步骤
docs/     文档
examples/ 可导入的工作流示例
```

## License

MIT © [ULis3h](https://github.com/ULis3h)
