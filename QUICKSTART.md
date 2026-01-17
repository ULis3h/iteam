# iTeam 快速启动指南

## 前置要求

由于您的系统Node.js版本较旧(v12.22.9)，建议先升级Node.js：

```bash
# 安装nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重启终端后安装Node.js 20
nvm install 20
nvm use 20
```

## 安装依赖

### 1. 后端依赖

```bash
cd server
npm install
```

### 2. 初始化数据库

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
```

### 3. 前端依赖

```bash
cd ../client
npm install
```

## 运行项目

### 方式一：分别启动（推荐用于开发）

终端1 - 启动后端服务：
```bash
cd server
npm run dev
# 服务将运行在 http://localhost:3000
```

终端2 - 启动前端服务：
```bash
cd client
npm run dev
# 应用将运行在 http://localhost:5173
```

### 方式二：一键启动脚本

创建启动脚本 `start-dev.sh`:
```bash
#!/bin/bash

# 启动后端
cd server
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
cd ../client
npm run dev &
FRONTEND_PID=$!

# 等待用户终止
echo "服务已启动："
echo "后端 PID: $BACKEND_PID (http://localhost:3000)"
echo "前端 PID: $FRONTEND_PID (http://localhost:5173)"
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
```

使脚本可执行并运行：
```bash
chmod +x start-dev.sh
./start-dev.sh
```

## 访问应用

打开浏览器访问：http://localhost:5173

## API端点

- Health Check: `GET http://localhost:3000/api/health`
- 设备管理: `http://localhost:3000/api/devices`
- 项目管理: `http://localhost:3000/api/projects`
- 文档管理: `http://localhost:3000/api/documents`
- 统计数据: `http://localhost:3000/api/stats`

## WebSocket连接

WebSocket服务运行在 `http://localhost:3000`

### 设备注册示例

```javascript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')

// 注册设备
socket.emit('device:register', {
  name: 'My MacBook Pro',
  type: 'vscode',
  os: 'macOS 14.0',
  ip: '192.168.1.100',
  metadata: {
    cpu: 'M2 Pro',
    memory: '16GB'
  }
})

// 监听注册结果
socket.on('device:registered', (device) => {
  console.log('设备已注册:', device)
})

// 更新设备状态
socket.emit('device:status', {
  deviceId: device.id,
  status: 'working',
  currentProject: 'iTeam项目',
  currentModule: '前端开发'
})

// 心跳保活
setInterval(() => {
  socket.emit('ping')
}, 30000)
```

## 下一步

### 实现MCP协议支持

创建MCP服务器以支持各类IDE集成，参考 `server/src/mcp/` 目录。

### 添加IDE客户端

为每个IDE（VS Code, Windsurf, Antigravity, Claude Code）创建客户端插件，实现：
1. 自动设备注册
2. 实时状态同步
3. 任务分发接收
4. 代码贡献统计

### 增强功能

- [ ] 用户认证系统
- [ ] 数据持久化备份
- [ ] 实时代码协作
- [ ] Git集成自动统计
- [ ] 性能监控Dashboard
- [ ] 通知系统

## 故障排查

### 端口被占用

```bash
# 查看端口占用
lsof -i :3000
lsof -i :5173

# 杀死进程
kill -9 <PID>
```

### 数据库问题

```bash
# 重置数据库
cd server
rm -f prisma/dev.db
npx prisma migrate reset
```

### 依赖问题

```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

## 技术支持

如遇问题，请查看：
- 后端日志：控制台输出
- 前端日志：浏览器开发者工具控制台
- WebSocket连接：浏览器Network标签 -> WS
