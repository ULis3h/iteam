# 设备 API

## 认证方式

设备 API 支持两种认证：

1. **JWT Token**: `Authorization: Bearer <token>`
2. **API Key**: `X-API-Key: iteam-device-key`

---

## 获取所有设备

```http
GET /api/devices
```

### 成功响应

```json
[
  {
    "id": "uuid",
    "name": "MacBook Pro M2",
    "type": "vscode",
    "role": "frontend",
    "status": "working",
    "os": "macOS 14.2",
    "ip": "192.168.1.100",
    "currentProject": "iTeam 项目",
    "currentModule": "前端 Dashboard 开发",
    "metadata": "{\"cpu\":\"Apple M3 Max\",...}",
    "lastSeen": "2026-01-17T07:30:00.000Z",
    "createdAt": "2026-01-17T03:00:00.000Z",
    "updatedAt": "2026-01-17T07:30:00.000Z"
  }
]
```

---

## 获取设备详情

```http
GET /api/devices/:id
```

### 路径参数

| 参数 | 说明 |
|------|------|
| id | 设备 UUID |

### 成功响应

```json
{
  "id": "uuid",
  "name": "MacBook Pro M2",
  "type": "vscode",
  "role": "frontend",
  "status": "working",
  "os": "macOS 14.2",
  "ip": "192.168.1.100",
  "currentProject": "iTeam 项目",
  "currentModule": "前端 Dashboard 开发",
  "metadata": "{...}",
  "lastSeen": "2026-01-17T07:30:00.000Z",
  "createdAt": "2026-01-17T03:00:00.000Z",
  "updatedAt": "2026-01-17T07:30:00.000Z",
  "contributions": [],
  "tasks": []
}
```

---

## 创建设备

```http
POST /api/devices
```

### 请求体

```json
{
  "name": "新设备",
  "type": "vscode",
  "os": "macOS 14.2",
  "ip": "192.168.1.101",
  "role": "backend",
  "status": "online",
  "currentProject": "项目名称",
  "currentModule": "模块名称",
  "metadata": {
    "cpu": "Apple M3",
    "memory": "32GB"
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 设备名称 |
| type | string | ✅ | 设备类型 |
| os | string | ✅ | 操作系统 |
| ip | string | ✅ | IP 地址 |
| role | string | ❌ | 团队角色 |
| status | string | ❌ | 状态，默认 offline |
| currentProject | string | ❌ | 当前项目 |
| currentModule | string | ❌ | 当前模块 |
| metadata | object | ❌ | 硬件信息 |

### 成功响应

```json
{
  "id": "new-uuid",
  "name": "新设备",
  ...
}
```

---

## 更新设备（心跳）

设备 Agent 使用此接口上报状态。

```http
PUT /api/devices/:id
```

### 请求头（使用 API Key）

```http
Content-Type: application/json
X-API-Key: iteam-device-key
```

### 请求体

```json
{
  "status": "working",
  "role": "frontend",
  "currentProject": "iTeam 项目",
  "currentModule": "API 开发",
  "metadata": {
    "cpu": "Apple M3 Max",
    "cpuCores": 16,
    "cpuUsage": 45,
    "memory": "64GB",
    "memoryUsage": 62,
    "gpu": "Apple M3 Max GPU",
    "gpuUsage": 30,
    "disk": "2TB SSD",
    "diskUsage": 65,
    "hostname": "MacBook-Pro",
    "uptime": 345600,
    "version": "1.2.0"
  }
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | ❌ | 设备状态 |
| role | string | ❌ | 团队角色 |
| currentProject | string | ❌ | 当前项目 |
| currentModule | string | ❌ | 当前模块 |
| metadata | object | ❌ | 硬件信息 |

### 成功响应

返回更新后的设备对象。

---

## 删除设备

```http
DELETE /api/devices/:id
```

### 路径参数

| 参数 | 说明 |
|------|------|
| id | 设备 UUID |

### 成功响应

```json
{
  "id": "deleted-uuid",
  ...
}
```

---

## Metadata 结构

```json
{
  "cpu": "Apple M3 Max",
  "cpuCores": 16,
  "cpuUsage": 45,
  "memory": "64GB Unified Memory",
  "memoryUsage": 62,
  "gpu": "Apple M3 Max (40-core GPU)",
  "gpuMemory": "64GB (共享)",
  "gpuUsage": 30,
  "disk": "Apple SSD 2TB",
  "diskTotal": "2TB",
  "diskUsed": "1.3TB",
  "diskUsage": 65,
  "hostname": "Macbook-Pro-Developer",
  "uptime": 345600,
  "version": "1.2.0"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| cpu | string | CPU 型号 |
| cpuCores | number | CPU 核心数 |
| cpuUsage | number | CPU 使用率 (%) |
| memory | string | 内存规格 |
| memoryUsage | number | 内存使用率 (%) |
| gpu | string | GPU 型号 |
| gpuMemory | string | 显存规格 |
| gpuUsage | number | GPU 使用率 (%) |
| disk | string | 磁盘型号 |
| diskTotal | string | 磁盘总容量 |
| diskUsed | string | 已用空间 |
| diskUsage | number | 磁盘使用率 (%) |
| hostname | string | 主机名 |
| uptime | number | 运行时间 (秒) |
| version | string | Agent 版本 |

---

## 设备类型枚举

| 值 | 说明 |
|------|------|
| vscode | VS Code |
| windsurf | Windsurf |
| antigravity | Antigravity |
| claude-code | Claude Code |
| other | 其他 |

## 设备状态枚举

| 值 | 说明 |
|------|------|
| online | 在线 |
| offline | 离线 |
| idle | 空闲 |
| working | 工作中 |

## 团队角色枚举

| 值 | 说明 |
|------|------|
| frontend | 前端开发 |
| backend | 后端开发 |
| fullstack | 全栈开发 |
| devops | DevOps |
| qa | 测试工程师 |
| architect | 架构师 |
| pm | 项目经理 |
| designer | UI/UX设计 |
