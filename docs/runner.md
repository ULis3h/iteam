# 远程 Runner / Remote runners

Runner 是一个很小的 Node 进程，把一台机器接入 iTeam：它连接到服务器，报告本机安装了哪些 Agent CLI，并执行分配给它的步骤。

## 启动

在远程机器上（需要 Node.js 18+，以及已登录的 CLI）：

```bash
git clone https://github.com/ULis3h/iteam.git
cd iteam/runner && npm install
node bin/iteam-runner.js --server http://SERVER:3000 --token <ITEAM_TOKEN> --name my-mac
```

| 参数 | 环境变量 | 说明 |
|---|---|---|
| `--server` | `ITEAM_SERVER` | 服务器地址，默认 `http://localhost:3000` |
| `--token` | `ITEAM_TOKEN` | 服务器设置了令牌时必填 |
| `--name` | `ITEAM_RUNNER_NAME` | 界面中显示的名称，默认主机名 |

「设置」页提供了可直接复制的命令。

## 使用

1. Runner 上线后出现在 **Agent → Runner**，并列出检测到的 CLI。
2. 新建 Agent，运行位置选「远程」并指定该 Runner。
3. 分配给这个 Agent 的步骤会在该机器上执行；工作目录留空时使用 Runner 启动时所在的目录。

Runner 断线时，正在其上执行的步骤会失败；重连后即可重试。同名 Runner 重新连接会替换旧连接。

## 后台运行

```bash
# pm2
pm2 start bin/iteam-runner.js --name iteam-runner -- --server http://SERVER:3000 --token XXX
# 或 systemd / launchd / nohup
```

## 安全

- 设置 `ITEAM_TOKEN`：未携带令牌的界面和 Runner 都会被拒绝。
- Runner 会以 CLI 的「自动批准」模式执行任务，等同于在该机器上无人值守地运行 Agent；只在你信任的机器上运行。
- 服务器与 Runner 之间是普通 HTTP / WebSocket；跨公网请放在 HTTPS 反向代理之后。

---

## English summary

Start `node bin/iteam-runner.js --server http://SERVER:3000 --token <ITEAM_TOKEN> --name my-mac` on any machine with Node 18+ and a logged-in agent CLI. It appears under **Agents → Runners**; create a *remote* agent bound to it and steps assigned to that agent run there (cwd = the runner's start directory unless the agent sets one). If the runner disconnects, its running steps fail and can be retried. Set `ITEAM_TOKEN` on the server to require authentication; put the server behind HTTPS when crossing the public internet.
