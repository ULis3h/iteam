# iTeam API 参考

## 概述

iTeam 后端提供 RESTful API，所有接口返回 JSON 格式数据。

## 基础信息

| 属性 | 值 |
|------|-----|
| Base URL | `http://localhost:3000/api` |
| 协议 | HTTP (开发环境) |
| 数据格式 | JSON |

## 认证方式

### 1. JWT Token（用户认证）

适用于前端应用的用户认证。

**获取方式**: 通过 `/api/auth/login` 登录获取

**使用方式**:
```http
Authorization: Bearer <token>
```

**示例**:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  http://localhost:3000/api/devices
```

### 2. API Key（设备认证）

适用于设备 Agent 的机器间通信。

**配置**: 环境变量 `DEVICE_API_KEY`，默认值 `iteam-device-key`

**使用方式**:
```http
X-API-Key: <api-key>
```

**示例**:
```bash
curl -H "X-API-Key: iteam-device-key" \
  -X PUT http://localhost:3000/api/devices/xxx \
  -d '{"status": "working"}'
```

## 路由权限

| 路由前缀 | 认证方式 | 说明 |
|---------|---------|------|
| `/api/auth` | 无 | 公开路由 |
| `/api/devices` | JWT 或 API-Key | 支持两种认证 |
| `/api/projects` | JWT | 仅用户认证 |
| `/api/documents` | JWT | 仅用户认证 |
| `/api/stats` | JWT | 仅用户认证 |

## 通用响应格式

### 成功响应

```json
{
  "data": { ... },
  "message": "操作成功"
}
```

或直接返回数据：

```json
{ "id": "xxx", "name": "xxx", ... }
```

### 错误响应

```json
{
  "error": "错误信息"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（需要登录） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## API 文档索引

- [认证 API](./auth.md) - 注册、登录、登出
- [设备 API](./devices.md) - 设备 CRUD 和心跳
- [项目 API](./projects.md) - 项目管理
- [文档 API](./documents.md) - 文档管理
- [统计 API](./stats.md) - 统计数据
