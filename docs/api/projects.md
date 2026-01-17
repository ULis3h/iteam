# 项目管理 API

## 概述

项目管理 API 提供了管理开发项目的完整接口，包括项目的增删改查、贡献统计、任务管理等功能。

**Base URL**: `http://localhost:3000/api/projects`

**认证方式**: JWT Token（Bearer Token）

## 端点列表

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/projects` | 获取所有项目 | 必需 |
| GET | `/api/projects/:id` | 获取单个项目详情 | 必需 |
| POST | `/api/projects` | 创建新项目 | 必需 |
| PUT | `/api/projects/:id` | 更新项目信息 | 必需 |
| DELETE | `/api/projects/:id` | 删除项目 | 必需 |
| POST | `/api/projects/:id/contributions` | 添加/更新项目贡献 | 必需 |

---

## 1. 获取所有项目

获取系统中所有项目的列表，包含每个项目的贡献统计和活跃任务。

### 请求

```http
GET /api/projects
Authorization: Bearer <token>
```

### 响应

**成功响应** (200 OK):

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "iTeam项目",
    "description": "一人即团队协作管理系统",
    "repository": "https://github.com/user/iteam",
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-17T00:00:00.000Z",
    "contributions": [
      {
        "id": "contrib-1",
        "deviceId": "device-1",
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "commits": 85,
        "linesAdded": 5420,
        "linesDeleted": 1230,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-17T00:00:00.000Z",
        "device": {
          "id": "device-1",
          "name": "MacBook Pro",
          "type": "vscode",
          "status": "online"
        }
      }
    ],
    "tasks": [
      {
        "id": "task-1",
        "deviceId": "device-1",
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "module": "前端开发",
        "description": "实现Dashboard页面",
        "status": "active",
        "createdAt": "2024-01-15T00:00:00.000Z",
        "updatedAt": "2024-01-15T00:00:00.000Z",
        "device": {
          "id": "device-1",
          "name": "MacBook Pro"
        }
      }
    ]
  }
]
```

**特性**:
- 项目按创建时间倒序排列
- 包含所有贡献记录（含设备信息）
- 仅包含活跃状态的任务（`status = 'active'`）
- 任务包含执行设备的基本信息

### 示例

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects
```

---

## 2. 获取单个项目

获取指定项目的详细信息，包括所有贡献记录和任务（不限于活跃任务）。

### 请求

```http
GET /api/projects/:id
Authorization: Bearer <token>
```

**路径参数**:
- `id` (string, 必需): 项目的 UUID

### 响应

**成功响应** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "iTeam项目",
  "description": "一人即团队协作管理系统",
  "repository": "https://github.com/user/iteam",
  "status": "active",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-17T00:00:00.000Z",
  "contributions": [...],
  "tasks": [...]
}
```

**错误响应** (404 Not Found):

```json
{
  "error": "Project not found"
}
```

### 示例

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects/550e8400-e29b-41d4-a716-446655440000
```

---

## 3. 创建项目

创建一个新的开发项目。

### 请求

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:

```json
{
  "name": "新项目名称",
  "description": "项目描述信息",
  "repository": "https://github.com/user/repo",
  "status": "active",
  "startDate": "2024-01-17T00:00:00.000Z",
  "endDate": null
}
```

**字段说明**:

| 字段 | 类型 | 必需 | 说明 | 默认值 |
|------|------|------|------|--------|
| name | string | 是 | 项目名称，1-100字符 | - |
| description | string | 否 | 项目描述，0-500字符 | "" |
| repository | string | 否 | Git仓库地址 | "" |
| status | string | 否 | 项目状态：active/paused/completed | "active" |
| startDate | string | 否 | 开始时间（ISO 8601格式） | 当前时间 |
| endDate | string | 否 | 结束时间（ISO 8601格式） | null |

### 响应

**成功响应** (201 Created):

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "新项目名称",
  "description": "项目描述信息",
  "repository": "https://github.com/user/repo",
  "status": "active",
  "startDate": "2024-01-17T00:00:00.000Z",
  "endDate": null,
  "createdAt": "2024-01-17T08:00:00.000Z",
  "updatedAt": "2024-01-17T08:00:00.000Z"
}
```

**错误响应** (400 Bad Request):

```json
{
  "error": "Failed to create project"
}
```

### 示例

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"新项目","description":"测试项目"}' \
  http://localhost:3000/api/projects
```

---

## 4. 更新项目

更新现有项目的信息。

### 请求

```http
PUT /api/projects/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**路径参数**:
- `id` (string, 必需): 项目的 UUID

**请求体**:

```json
{
  "name": "更新后的项目名称",
  "description": "更新后的描述",
  "repository": "https://github.com/user/new-repo",
  "status": "paused",
  "endDate": "2024-12-31T00:00:00.000Z"
}
```

**字段说明**:
- 所有字段都是可选的
- 只需要包含要更新的字段
- `startDate` 不可修改（创建后固定）

### 响应

**成功响应** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "更新后的项目名称",
  "description": "更新后的描述",
  "repository": "https://github.com/user/new-repo",
  "status": "paused",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-17T08:30:00.000Z"
}
```

**错误响应** (404 Not Found):

```json
{
  "error": "Project not found"
}
```

**错误响应** (400 Bad Request):

```json
{
  "error": "Failed to update project"
}
```

### 示例

```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","endDate":"2024-12-31T00:00:00.000Z"}' \
  http://localhost:3000/api/projects/550e8400-e29b-41d4-a716-446655440000
```

---

## 5. 删除项目

删除指定项目及其所有关联数据。

### 请求

```http
DELETE /api/projects/:id
Authorization: Bearer <token>
```

**路径参数**:
- `id` (string, 必需): 项目的 UUID

### 响应

**成功响应** (204 No Content):

无响应体（项目已成功删除）

**错误响应** (404 Not Found):

```json
{
  "error": "Project not found"
}
```

**错误响应** (500 Internal Server Error):

```json
{
  "error": "Failed to delete project"
}
```

### 级联删除

删除项目时会自动删除：
- 所有关联的 `Contribution` 记录
- 所有关联的 `Task` 记录

这通过 Prisma 的 `onDelete: Cascade` 自动处理。

### 示例

```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/projects/550e8400-e29b-41d4-a716-446655440000
```

---

## 6. 添加/更新项目贡献

为项目添加或更新设备的代码贡献统计。使用 `upsert` 逻辑：
- 如果该设备尚未为该项目贡献，创建新记录
- 如果已存在，增量更新贡献数据

### 请求

```http
POST /api/projects/:id/contributions
Authorization: Bearer <token>
Content-Type: application/json
```

**路径参数**:
- `id` (string, 必需): 项目的 UUID

**请求体**:

```json
{
  "deviceId": "device-uuid-here",
  "commits": 5,
  "linesAdded": 120,
  "linesDeleted": 30
}
```

**字段说明**:

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| deviceId | string | 是 | 设备的 UUID |
| commits | number | 否 | 本次提交的 commit 数量 |
| linesAdded | number | 否 | 本次新增的代码行数 |
| linesDeleted | number | 否 | 本次删除的代码行数 |

### 响应

**成功响应** (201 Created):

```json
{
  "id": "contrib-uuid-here",
  "deviceId": "device-uuid-here",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "commits": 90,
  "linesAdded": 5540,
  "linesDeleted": 1260,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-17T09:00:00.000Z"
}
```

**注意**:
- `commits`, `linesAdded`, `linesDeleted` 是累计值
- 如果是首次贡献，值等于请求值
- 如果已有贡献，值是原值 + 请求值（增量更新）

**错误响应** (400 Bad Request):

```json
{
  "error": "Invalid device or project ID"
}
```

**错误响应** (500 Internal Server Error):

```json
{
  "error": "Failed to add contribution"
}
```

### 示例

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"device-123","commits":5,"linesAdded":120,"linesDeleted":30}' \
  http://localhost:3000/api/projects/550e8400-e29b-41d4-a716-446655440000/contributions
```

---

## 数据模型

### Project

```typescript
interface Project {
  id: string              // UUID
  name: string           // 项目名称
  description: string    // 项目描述
  repository: string     // Git 仓库地址
  status: string         // 状态: active, paused, completed
  startDate: Date        // 开始时间
  endDate?: Date         // 结束时间（可选）
  createdAt: Date        // 创建时间
  updatedAt: Date        // 更新时间

  // 关联数据
  contributions: Contribution[]  // 贡献记录
  tasks: Task[]                  // 任务列表
}
```

### Contribution

```typescript
interface Contribution {
  id: string              // UUID
  deviceId: string       // 设备 ID
  projectId: string      // 项目 ID
  commits: number        // 提交数
  linesAdded: number     // 新增代码行数
  linesDeleted: number   // 删除代码行数
  createdAt: Date        // 创建时间
  updatedAt: Date        // 更新时间

  // 关联数据
  device?: Device        // 设备信息
  project?: Project      // 项目信息
}
```

### Task

```typescript
interface Task {
  id: string              // UUID
  deviceId: string       // 执行设备 ID
  projectId: string      // 所属项目 ID
  module: string         // 模块名称
  description: string    // 任务描述
  status: string         // 状态: active, completed, paused
  createdAt: Date        // 创建时间
  updatedAt: Date        // 更新时间

  // 关联数据
  device?: Device        // 设备信息
  project?: Project      // 项目信息
}
```

---

## 错误码参考

| HTTP 状态码 | 说明 | 常见原因 |
|------------|------|---------|
| 200 | 成功 | 请求成功处理 |
| 201 | 创建成功 | 资源创建成功 |
| 204 | 无内容 | 删除成功 |
| 400 | 请求错误 | 参数验证失败、数据格式错误 |
| 401 | 未授权 | 缺少或无效的 JWT Token |
| 404 | 未找到 | 资源不存在 |
| 500 | 服务器错误 | 数据库错误、未知异常 |

---

## 使用示例

### 完整工作流程

```bash
# 1. 创建新项目
PROJECT_ID=$(curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"新项目","description":"测试"}' \
  http://localhost:3000/api/projects | jq -r '.id')

# 2. 为项目添加贡献
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"deviceId\":\"$DEVICE_ID\",\"commits\":10,\"linesAdded\":500,\"linesDeleted\":100}" \
  http://localhost:3000/api/projects/$PROJECT_ID/contributions

# 3. 查看项目详情
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/projects/$PROJECT_ID

# 4. 更新项目状态
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}' \
  http://localhost:3000/api/projects/$PROJECT_ID

# 5. 删除项目
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/projects/$PROJECT_ID
```

---

## 相关文档

- [功能设计文档 - F005 项目管理](../features/F005-project-management.md)
- [API 概述](./README.md)
- [认证 API](./auth.md)
- [设备 API](./devices.md)
