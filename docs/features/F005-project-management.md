# F005 - 项目管理

## 基本信息

| 属性 | 值 |
|------|-----|
| 功能编号 | F005 |
| 功能名称 | 项目管理 |
| 所属模块 | 项目管理 |
| 实现版本 | 0.1.0 |
| 实现日期 | 2026-01-17 |
| 状态 | 🚧 基础实现 |

## 功能概述

管理团队正在进行的项目，展示项目列表、进度状态、参与设备等信息。

## 用户故事

1. 作为用户，我希望查看所有项目列表，以便了解团队工作内容
2. 作为用户，我希望创建新项目，以便开始新的开发任务
3. 作为用户，我希望查看项目详情，以便了解项目进度

## 当前实现

### 已完成
- [x] 项目列表页面基础 UI
- [x] 项目数据模型
- [x] 项目 API 端点

### 待完成
- [ ] 创建项目功能
- [ ] 编辑项目功能
- [ ] 项目详情页
- [ ] 设备分配到项目
- [ ] 项目进度跟踪

## 数据模型

```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  repository  String?
  status      String   @default("active") // active, paused, completed
  startDate   DateTime @default(now())
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contributions Contribution[]
  tasks         Task[]
}

model Contribution {
  id           String   @id @default(uuid())
  deviceId     String
  projectId    String
  commits      Int      @default(0)
  linesAdded   Int      @default(0)
  linesDeleted Int      @default(0)
  device       Device   @relation(fields: [deviceId], references: [id])
  project      Project  @relation(fields: [projectId], references: [id])
}

model Task {
  id          String   @id @default(uuid())
  deviceId    String
  projectId   String
  module      String
  description String
  status      String   @default("pending") // pending, in-progress, completed
  device      Device   @relation(fields: [deviceId], references: [id])
  project     Project  @relation(fields: [projectId], references: [id])
}
```

## API 端点

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| GET | `/api/projects` | 获取所有项目 | ✅ |
| GET | `/api/projects/:id` | 获取项目详情 | ✅ |
| POST | `/api/projects` | 创建项目 | ✅ |
| PUT | `/api/projects/:id` | 更新项目 | ✅ |
| DELETE | `/api/projects/:id` | 删除项目 | ✅ |

## 后续规划

### Phase 1: 基础功能
- 项目 CRUD 完整 UI
- 项目状态管理

### Phase 2: 设备关联
- 将设备分配到项目
- 查看项目关联的设备

### Phase 3: 进度追踪
- 任务分解和追踪
- 代码提交统计
- 项目时间线
