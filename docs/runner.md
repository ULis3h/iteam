# 远程 Runner / Remote runners

Runner 是一个很小的 Node 进程，把一台机器接入 iTeam：它连接到服务器，报告本机安装了哪些 Agent CLI，并执行分配给它的步骤。

## 启动

在远程机器上（需要 Node.js 18+，以及已登录的 CLI）：

```bash
git clone https://github.com/ULis3h/iteam.git
cd iteam/runner && npm install
ITEAM_TOKEN=<令牌> node bin/iteam-runner.js --server http://SERVER:3000 --name my-mac --max-jobs 2
```

| 参数 | 环境变量 | 说明 |
|---|---|---|
| `--server` | `ITEAM_SERVER` | 服务器地址，默认 `http://localhost:3000` |
| `--token` | `ITEAM_RUNNER_TOKEN` / `ITEAM_TOKEN` | 服务器设置了令牌时必填；建议用环境变量而不是命令行参数（避免出现在 `ps` 里） |
| `--name` | `ITEAM_RUNNER_NAME` | 界面中显示的名称，默认主机名；两台机器同名会互相顶替 |
| `--max-jobs` | `ITEAM_MAX_JOBS` | 同时执行的任务数，默认 2；调度器会遵守 |
| `--root` | `ITEAM_ROOT` | 只允许在该目录之内的工作目录执行 |
| `--no-custom` | — | 拒绝自定义 shell 命令，只运行 claude / codex / gemini |
| `--version` / `--help` | — | 版本 / 帮助 |

未知参数或缺少值会直接报错退出；令牌被拒绝时以退出码 2 结束。「设置」页提供了可直接复制的命令。

## 使用

1. Runner 上线后出现在 **Agent → Runner**，并列出检测到的 CLI 与并行上限。
2. 新建 Agent，运行位置选「远程」并指定该 Runner。
3. 分配给这个 Agent 的步骤会在该机器上执行；工作目录留空时使用 Runner 启动时所在的目录（步骤也可以指定，例如 `{{inputs.repo}}`）。

## 断线与重连

- 网络抖动时 Runner **不会**中断正在执行的任务：它继续运行，日志暂存，重连后把仍在执行的任务 ID 告诉服务器，服务器自动接回（最多等待 90 秒）。
- 超过 90 秒未重连，服务器把该步骤标记为失败（可重试）；Runner 侧在 120 秒后终止孤立任务。
- Ctrl+C 停止 Runner 时会先终止子进程并等待最多 10 秒，把结果发回服务器后再退出。

## 后台运行

```bash
# pm2
ITEAM_TOKEN=xxx pm2 start bin/iteam-runner.js --name iteam-runner -- --server http://SERVER:3000 --max-jobs 2
# 或 systemd / launchd / nohup
```

## 安全

- Runner 会以 CLI 的「自动批准」模式执行任务，等同于在该机器上无人值守地运行 Agent；只在你信任的机器上运行，并考虑 `--root` 与 `--no-custom`。
- 在服务器上设置 `ITEAM_RUNNER_TOKEN`，Runner 使用它连接：这个凭证只能执行任务，不能调用管理 API。
- Agent 进程不会继承 Runner 的 `ITEAM_*` 变量；任务下发的环境变量不能覆盖 `PATH`、`NODE_OPTIONS`、`HOME`、`LD_*` 等。
- 服务器与 Runner 之间是普通 HTTP / WebSocket；跨公网请放在 HTTPS 反向代理之后。

---

## English summary

Start `ITEAM_TOKEN=<token> node bin/iteam-runner.js --server http://SERVER:3000 --name my-mac --max-jobs 2` on any machine with Node 18+ and a logged-in agent CLI (`--root DIR` and `--no-custom` restrict what it will execute). It appears under **Agents → Runners**; create a *remote* agent bound to it. Jobs survive transient disconnects: the runner keeps them running and the server re-attaches them on reconnect (90 s grace). Use `ITEAM_RUNNER_TOKEN` on the server to give runners a credential without API access.
