# iTeam MCP Server 使用指南

让 Claude Desktop 等 AI 应用能够访问 iTeam 的功能。

## 快速开始

### 1. 配置 Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iteam": {
      "command": "npx",
      "args": ["tsx", "/Users/0x1a/codes/iteam/server/src/mcp/standard-mcp-server.ts"],
      "env": {
        "DATABASE_URL": "file:/Users/0x1a/codes/iteam/server/prisma/dev.db"
      }
    }
  }
}
```

### 2. 重启 Claude Desktop

### 3. 开始使用

在 Claude 中尝试:
- "列出 iTeam 中的所有设备"
- "查看项目列表"
- "搜索包含'架构'的文档"

## 可用工具

| 工具 | 描述 |
|------|------|
| `list_devices` | 获取所有设备列表和状态 |
| `get_device` | 获取指定设备详情 |
| `list_projects` | 获取所有项目列表 |
| `search_documents` | 搜索知识库文档 |
| `create_task` | 创建任务并分配给设备 |
| `get_stats` | 获取系统统计概览 |

## 可用资源

| URI | 描述 |
|-----|------|
| `document://{id}` | 获取指定文档内容 |

## 独立运行

```bash
cd server
npm run mcp:start
```

## 使用 MCP Inspector 测试

```bash
npx @modelcontextprotocol/inspector node --import tsx src/mcp/standard-mcp-server.ts
```
