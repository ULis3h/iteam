# Agent Client 故障排查指南

## 问题：Agent连接成功但Web界面看不到设备

### 问题原因

Agent-client发送的设备注册信息字段与Server端期望的字段不匹配，导致设备注册失败。

**Agent-client原先发送的字段**:
```javascript
{
  name: "设备名",
  role: "fullstack",
  skills: ["react", "nodejs"],
  type: "agent",
  platform: "linux",  // ❌ Server不识别
  arch: "x64",
  hostname: "myhost",
  // ❌ 缺少必需的 os 和 ip 字段
}
```

**Server期望接收的字段**:
```javascript
{
  name: "设备名",
  type: "类型",
  os: "操作系统",     // ✅ 必需
  ip: "IP地址",       // ✅ 必需
  metadata: { ... }   // 可选的额外信息
}
```

### 解决方案

已修复以下文件：

#### 1. `/agent-client/src/services/socket-service.js`

**修改前**:
```javascript
const deviceInfo = {
  name: agentConfig.name,
  role: agentConfig.role,
  skills: agentConfig.skills,
  type: 'agent',
  platform: os.platform(),  // ❌ 错误字段名
  // ... 缺少 os 和 ip
};
```

**修改后**:
```javascript
const deviceInfo = {
  name: agentConfig.name,
  type: 'claude-code',
  os: os.platform(),        // ✅ 正确的字段名
  ip: '127.0.0.1',          // ✅ 添加了 ip 字段
  metadata: {               // ✅ 其他信息放在 metadata 中
    role: agentConfig.role,
    skills: agentConfig.skills,
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem()
  }
};
```

#### 2. `/server/src/websocket/index.ts`

**修改**: Server端现在会从metadata中提取role和skills，并保存到数据库的对应字段中。

```typescript
const role = data.metadata?.role || null
const skills = data.metadata?.skills ? JSON.stringify(data.metadata.skills) : null

await prisma.device.upsert({
  // ... 保存 role 和 skills 到数据库字段
})
```

### 重启服务

修复后需要重启两个服务：

#### 1. 重启Server

```bash
# 如果server在终端运行，按 Ctrl+C 停止，然后：
cd /home/ulis/codes/iteam/server
npm run dev
```

#### 2. 重启Agent-client

```bash
# 停止当前运行的agent-client
pkill -f "electron \."

# 重新启动
cd /home/ulis/codes/iteam/agent-client
npm start
```

### 验证步骤

1. **启动Server**
   ```bash
   cd server
   npm run dev
   ```
   等待看到：`Server running on port 3000`

2. **测试Server健康检查**
   ```bash
   curl http://localhost:3000/api/health
   ```
   应该返回：`{"status":"ok","timestamp":"..."}`

3. **启动Agent-client**
   ```bash
   cd agent-client
   npm start
   ```

4. **在Agent-client界面中配置**:
   - 服务器地址: `http://localhost:3000`
   - API Key: `iteam-device-key`
   - 设备名称: 例如 `我的开发机`
   - 角色: 选择一个角色（如 `Full Stack Developer`）
   - 技能: 例如 `react,nodejs,typescript`

5. **点击"保存配置"**，然后**点击"连接服务器"**

6. **查看日志**:
   - Agent-client的日志终端应该显示：
     ```
     [时间] INFO 已连接到iTeam服务器
     ```
   - Server的终端应该显示：
     ```
     Device registered: 我的开发机 (uuid)
     ```

7. **打开Web界面**:
   ```bash
   # 在另一个终端启动Web客户端（如果还没运行）
   cd client
   npm run dev
   ```
   访问 `http://localhost:5173`，登录后进入"设备管理"页面

8. **等待最多10秒**（Web界面每10秒刷新一次），应该能看到您的设备出现在列表中

### 调试技巧

#### 查看Agent-client的console日志

在Electron应用中按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具，查看Console标签。

应该能看到：
```
WebSocket connected
Registering device: { name: '...', type: 'claude-code', os: 'linux', ip: '127.0.0.1', metadata: {...} }
Device registered: { id: '...', name: '...', ... }
```

#### 查看Server日志

Server终端应该显示：
```
Client connected: <socket-id>
Device registered: 我的开发机 (<uuid>)
```

#### 检查数据库

如果安装了sqlite3：
```bash
sqlite3 /home/ulis/codes/iteam/server/prisma/dev.db
SELECT id, name, type, role, status, lastSeen FROM devices;
.exit
```

或使用Prisma Studio：
```bash
cd server
npx prisma studio
```
在浏览器中打开 `http://localhost:5555`，查看Device表

#### 常见问题

**1. "连接失败"**
- 检查Server是否在运行（`http://localhost:3000/api/health`）
- 检查API Key是否正确（默认：`iteam-device-key`）
- 查看Server的`.env`文件中的`DEVICE_API_KEY`

**2. "连接成功但Web界面看不到"**
- 等待10秒（Web界面轮询间隔）
- 刷新Web页面
- 检查Server日志是否有"Device registered"消息
- 检查数据库中是否有设备记录

**3. "设备显示为离线"**
- Agent-client是否还在运行
- 检查心跳机制（每30秒发送一次）
- Server会自动标记5分钟无响应的设备为离线

### 数据流向

```
Agent Client                Server                 Web Client
    │                         │                         │
    ├──WebSocket连接─────────►│                         │
    │                         │                         │
    ├──device:register───────►│                         │
    │  {name, type, os, ip}   │                         │
    │                         ├──保存到数据库            │
    │                         │                         │
    │◄─device:registered──────┤                         │
    │  {id, name, ...}        │                         │
    │                         │                         │
    │                         ├──广播device:status────►│
    │                         │  {deviceId, name,...}   │
    │                         │                         │
    │                         │◄──HTTP GET /api/devices─┤
    │                         │                         │
    │                         ├──返回设备列表──────────►│
    │                         │                         │
    │                         │                    显示设备列表
```

### 成功标志

✅ Agent-client日志显示 "已连接到iTeam服务器"
✅ Server日志显示 "Device registered: ..."
✅ Web界面的"设备管理"页面显示设备，状态为"在线"（绿色圆点）
✅ 设备信息包含名称、角色、技能等

---

**如果问题仍然存在**，请检查：
1. Server和Agent-client的代码是否是最新的（已包含修复）
2. 所有服务是否已重启
3. 浏览器缓存是否已清除
4. 检查浏览器控制台是否有JavaScript错误

---

**文档版本**: 1.0
**最后更新**: 2026-01-17
**相关文件**:
- `/agent-client/src/services/socket-service.js`
- `/server/src/websocket/index.ts`
