# MCP (Model Context Protocol) 集成

此目录包含MCP协议的实现，用于与各类IDE进行通信。

## MCP协议简介

Model Context Protocol (MCP) 是一个开放标准，允许AI助手和IDE之间进行标准化通信。

## 实现计划

### 1. MCP服务器 (`server.ts`)
- 实现MCP协议的服务器端
- 处理来自IDE客户端的连接
- 管理设备注册和状态同步

### 2. 消息处理 (`handlers.ts`)
- 设备注册处理
- 状态更新处理
- 任务分发处理
- 代码贡献统计

### 3. IDE适配器

#### VS Code适配器 (`adapters/vscode.ts`)
- VS Code扩展集成
- 自动设备信息收集
- Git状态监控

#### Windsurf适配器 (`adapters/windsurf.ts`)
- Windsurf客户端集成
- 项目同步

#### Antigravity适配器 (`adapters/antigravity.ts`)
- Antigravity集成
- 实时协作

#### Claude Code适配器 (`adapters/claude-code.ts`)
- Claude Code CLI集成
- 命令行工具集成

## 使用示例

### 设备注册
```typescript
// MCP客户端发送注册消息
{
  "jsonrpc": "2.0",
  "method": "device/register",
  "params": {
    "name": "MacBook Pro",
    "type": "vscode",
    "os": "macOS 14.0",
    "ip": "192.168.1.100",
    "metadata": {
      "version": "1.85.0",
      "extensions": ["..."]
    }
  },
  "id": 1
}

// 服务器响应
{
  "jsonrpc": "2.0",
  "result": {
    "deviceId": "uuid-here",
    "status": "registered"
  },
  "id": 1
}
```

### 状态更新
```typescript
{
  "jsonrpc": "2.0",
  "method": "device/status",
  "params": {
    "deviceId": "uuid-here",
    "status": "working",
    "currentProject": "iTeam",
    "currentModule": "frontend"
  }
}
```

### 任务分发
```typescript
{
  "jsonrpc": "2.0",
  "method": "task/assign",
  "params": {
    "taskId": "task-uuid",
    "deviceId": "device-uuid",
    "description": "实现Dashboard页面",
    "priority": "high"
  }
}
```

## 实现步骤

1. 创建基础MCP服务器
2. 实现消息路由和处理
3. 为每个IDE创建适配器
4. 创建客户端SDK
5. 测试和文档

## 相关资源

- [MCP规范](https://github.com/modelcontextprotocol/specification)
- [VS Code扩展API](https://code.visualstudio.com/api)
- [Socket.io文档](https://socket.io/docs/)
