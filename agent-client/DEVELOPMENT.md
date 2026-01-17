# Agent Client 开发文档

## 项目概述

iTeam Agent Client 是一个基于Electron的桌面应用，集成Claude Code CLI，能够自动接收来自iTeam服务器的任务并执行。

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────┐
│           iTeam Agent Client (Electron)          │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐         ┌──────────────┐     │
│  │   Renderer   │ ◄─IPC──►│     Main     │     │
│  │   Process    │         │   Process    │     │
│  │   (UI)       │         │  (Business)  │     │
│  └──────────────┘         └──────┬───────┘     │
│                                   │              │
│                          ┌────────▼────────┐    │
│                          │    Services     │    │
│                          ├─────────────────┤    │
│                          │ Socket Service  │    │
│                          │ Claude Service  │    │
│                          └────────┬────────┘    │
│                                   │              │
└───────────────────────────────────┼─────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────▼──────┐              ┌────────▼────────┐
            │ iTeam Server │              │ Claude Code CLI │
            │  (WebSocket) │              │   (Child Proc)  │
            └──────────────┘              └─────────────────┘
```

### 主要组件

#### 1. Main Process (主进程)
- **文件**: `src/main/main.js`
- **职责**:
  - 创建和管理应用窗口
  - 处理IPC通信
  - 管理任务队列
  - 协调服务调用
  - 生命周期管理

#### 2. Renderer Process (渲染进程)
- **文件**:
  - `src/renderer/index.html` - UI结构
  - `src/renderer/styles.css` - 样式
  - `src/renderer/renderer.js` - UI逻辑
- **职责**:
  - 用户界面展示
  - 用户交互处理
  - 状态可视化
  - 配置管理

#### 3. Preload Script (预加载脚本)
- **文件**: `src/preload/preload.js`
- **职责**:
  - 主进程与渲染进程的安全桥梁
  - 暴露受限的API到渲染进程

#### 4. Socket Service (WebSocket服务)
- **文件**: `src/services/socket-service.js`
- **职责**:
  - 连接到iTeam服务器
  - 设备注册和认证
  - 接收任务分配
  - 发送状态更新
  - 心跳保持

#### 5. Claude Service (Claude Code服务)
- **文件**: `src/services/claude-service.js`
- **职责**:
  - 执行Claude Code CLI
  - 任务类型解析
  - 进程管理
  - 输出捕获

## 通信流程

### 1. 设备注册流程

```
Agent Client                 iTeam Server
     │                            │
     ├──WebSocket Connect────────►│
     │                            │
     │◄───Connection Ack──────────┤
     │                            │
     ├──device:register──────────►│
     │  (deviceInfo)              │
     │                            │
     │◄──device:registered────────┤
     │  (deviceId)                │
     │                            │
     ├──device:heartbeat─────────►│
     │  (every 30s)               │
```

### 2. 任务执行流程

```
iTeam Server          Agent Client          Claude Code CLI
     │                     │                        │
     ├──task:assigned─────►│                        │
     │                     │                        │
     │                     ├──Start Task Queue──────┤
     │                     │                        │
     │                     ├──task:status(running)─►│
     │                     │                        │
     │                     ├──Execute Task─────────►│
     │                     │                        │
     │                     │◄──Output Stream────────┤
     │                     │                        │
     │◄──task:status(done)─┤                        │
     │  (result)           │                        │
```

### 3. IPC通信流程

```
Renderer Process          Main Process
     │                         │
     ├──connect-to-server─────►│
     │  (config)                │
     │                          ├──SocketService.connect()
     │                          │
     │◄──{success:true}─────────┤
     │                          │
     │                          ├──task-received───►│
     │                          │  (task)           │
     │◄──────────────────────────┘                  │
```

## 关键功能实现

### 任务队列管理

```javascript
// 在main.js中
let taskQueue = [];
let currentTask = null;

async function processNextTask() {
  if (taskQueue.length === 0) {
    currentTask = null;
    socketService.updateStatus('idle');
    return;
  }

  currentTask = taskQueue.shift();
  await claudeService.executeTask(currentTask);
}
```

### Claude Code任务类型映射

支持的任务类型：
- `code_generation` - 生成新代码
- `code_review` - 代码审查
- `bug_fix` - 修复Bug
- `test_generation` - 生成测试
- `refactor` - 重构代码
- `custom` - 自定义任务

### 心跳机制

```javascript
// 每30秒发送一次心跳
setInterval(() => {
  socketService.sendHeartbeat();
}, 30000);
```

## 安全考虑

### Electron安全最佳实践

1. **Context Isolation**: 启用上下文隔离
2. **Node Integration**: 禁用渲染进程中的Node集成
3. **Preload Scripts**: 使用预加载脚本暴露有限API
4. **CSP**: 配置内容安全策略
5. **Remote Module**: 禁用remote模块

### API Key保护

- API Key存储在localStorage中
- 使用password类型输入框
- 不在日志中输出敏感信息

## 扩展开发

### 添加新的任务类型

1. 在`claude-service.js`的`buildClaudeCommand`中添加case:

```javascript
case 'your_new_type':
  args.push('--your-flag');
  args.push(task.yourParam);
  break;
```

2. 在服务器端定义对应的任务类型

### 添加新的UI组件

1. 在`src/renderer/index.html`中添加HTML结构
2. 在`src/renderer/styles.css`中添加样式
3. 在`src/renderer/renderer.js`中添加交互逻辑

### 添加新的服务

1. 在`src/services/`下创建新的服务文件
2. 在`src/main/main.js`中引入并初始化
3. 通过IPC暴露必要的接口

## 调试技巧

### 开发模式

```bash
npm run dev
```

自动打开开发者工具，可以查看：
- Console日志
- Network请求
- IPC通信
- 应用状态

### 日志级别

在代码中使用console日志：
```javascript
console.log('info:', data);
console.error('error:', error);
console.warn('warning:', message);
```

### 常见问题调试

1. **WebSocket连接失败**: 检查服务器地址和API Key
2. **Claude Code执行失败**: 检查环境变量和命令路径
3. **任务不执行**: 检查任务队列和日志输出

## 性能优化

### 任务队列优化

- 限制队列长度，防止内存溢出
- 添加任务优先级支持
- 实现任务取消机制

### 日志优化

- 限制日志条目数量（当前100条）
- 使用虚拟滚动显示大量日志
- 添加日志过滤功能

### 内存管理

- 及时清理完成的任务
- 使用WeakMap存储临时数据
- 监控内存使用情况

## 测试

### 单元测试（待实现）

```bash
npm test
```

### 集成测试

1. 启动iTeam服务器
2. 启动Agent客户端
3. 创建测试任务
4. 验证任务执行结果

### E2E测试（待实现）

使用Spectron进行端到端测试

## 部署

### 打包应用

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### 生成安装包

构建后的安装包位于`dist/`目录：
- Windows: `.exe` 安装程序
- macOS: `.dmg` 磁盘镜像
- Linux: `.AppImage` 应用镜像

## 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交改动
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License

---

**维护者**: iTeam Team
**最后更新**: 2026-01-17
