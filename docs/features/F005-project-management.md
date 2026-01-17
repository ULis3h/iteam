# F005 - 项目管理

## 基本信息

| 属性 | 值 |
|------|-----|
| 功能编号 | F005 |
| 功能名称 | 项目管理 |
| 所属模块 | 项目管理 |
| 实现版本 | 0.1.0 |
| 实现日期 | 2026-01-17 |
| 状态 | ✅ 完成 |
| 最后更新 | 2026-01-17 |

## 功能概述

项目管理模块是 iTeam 系统的核心功能之一，用于管理团队正在进行的开发项目。系统支持项目的完整生命周期管理，包括项目创建、信息编辑、状态跟踪、设备贡献统计、任务管理等功能。

### 核心价值

1. **全局视野**: 一目了然地查看所有项目的进展情况
2. **贡献追踪**: 实时统计每个设备对项目的代码贡献
3. **任务管理**: 查看各设备当前正在执行的任务
4. **状态管理**: 清晰标识项目状态（进行中/暂停/已完成）

## 用户故事

### US-005-01: 查看项目列表
**作为** 用户
**我希望** 查看所有项目列表
**以便** 了解团队当前的工作内容和各项目状态

**验收标准**:
- 显示所有项目的卡片列表
- 每个项目卡片包含：名称、描述、仓库地址、状态、统计数据
- 项目按创建时间倒序排列
- 支持查看项目的实时统计（提交数、贡献者、代码行数）

### US-005-02: 创建新项目
**作为** 用户
**我希望** 创建新项目
**以便** 开始追踪新的开发任务

**验收标准**:
- 点击"新建项目"按钮打开创建表单
- 必填字段：项目名称
- 可选字段：描述、仓库地址、开始时间、状态
- 表单验证通过后创建项目
- 创建成功后自动刷新列表并显示新项目

### US-005-03: 编辑项目信息
**作为** 用户
**我希望** 编辑项目信息
**以便** 更新项目的描述、状态或其他元信息

**验收标准**:
- 点击项目卡片的编辑按钮打开编辑表单
- 表单预填充当前项目信息
- 支持修改所有项目字段
- 保存后更新项目信息并刷新显示

### US-005-04: 删除项目
**作为** 用户
**我希望** 删除不再需要的项目
**以便** 保持项目列表的整洁

**验收标准**:
- 点击删除按钮显示确认对话框
- 确认后删除项目及其关联的贡献和任务数据
- 删除成功后从列表中移除

### US-005-05: 查看项目统计
**作为** 用户
**我希望** 查看项目的详细统计数据
**以便** 了解项目的代码贡献情况

**验收标准**:
- 显示总提交数（所有设备的提交总和）
- 显示贡献者数量（参与该项目的设备数）
- 显示新增代码行数（绿色）
- 显示删除代码行数（红色）
- 显示净增代码行数

### US-005-06: 查看当前任务
**作为** 用户
**我希望** 查看项目的当前任务列表
**以便** 了解各设备正在进行的工作

**验收标准**:
- 在项目卡片中显示活跃任务列表
- 每个任务显示：模块名称、描述、执行设备
- 活跃任务有脉动动画指示器
- 无任务时不显示任务区域

## 功能需求

### FR-005-01: 项目列表展示

**描述**: 以卡片形式展示所有项目

**输入**: 无（页面加载时自动获取）

**处理逻辑**:
1. 页面加载时调用 `GET /api/projects`
2. 获取包含贡献和任务的完整项目数据
3. 计算每个项目的统计数据
4. 按创建时间倒序渲染项目卡片

**输出**: 项目卡片列表

**UI元素**:
- 页面标题："项目管理"
- 副标题："追踪和管理所有开发项目"
- "新建项目"按钮（右上角）
- 项目卡片网格（每行1个，响应式）

**项目卡片内容**:
- 项目图标（FolderGit2）
- 项目名称（大号粗体）
- 项目描述
- 仓库链接（可点击，新窗口打开）
- 状态徽章（进行中/暂停/已完成）
- 统计面板（4格）：
  - 提交数（GitBranch 图标）
  - 贡献者数（Users 图标）
  - 新增代码行数（TrendingUp 图标，绿色）
  - 删除代码行数（TrendingUp 旋转180度，红色）
- 当前任务列表（如果有）
- 项目时间线（开始时间、结束时间）

### FR-005-02: 创建项目

**描述**: 通过模态框表单创建新项目

**触发**: 点击"新建项目"按钮

**表单字段**:
| 字段 | 类型 | 必填 | 默认值 | 验证规则 |
|------|------|------|--------|---------|
| name | text | 是 | - | 长度 1-100 字符 |
| description | textarea | 否 | - | 长度 0-500 字符 |
| repository | text | 否 | - | 必须是有效的 Git 仓库 URL |
| status | select | 是 | active | active/paused/completed |
| startDate | date | 否 | 今天 | 不能晚于结束时间 |
| endDate | date | 否 | null | 不能早于开始时间 |

**处理逻辑**:
1. 用户填写表单
2. 客户端验证字段
3. 调用 `POST /api/projects`
4. 成功后关闭模态框
5. 刷新项目列表
6. 显示成功提示

**输出**: 新建的项目对象

**错误处理**:
- 名称为空：显示"请输入项目名称"
- 仓库 URL 格式错误：显示"请输入有效的仓库地址"
- API 错误：显示具体错误信息

### FR-005-03: 编辑项目

**描述**: 通过模态框表单编辑现有项目

**触发**: 点击项目卡片的"编辑"按钮

**表单字段**: 与创建项目相同，但预填充现有数据

**处理逻辑**:
1. 点击编辑按钮
2. 打开模态框，预填充项目数据
3. 用户修改字段
4. 客户端验证
5. 调用 `PUT /api/projects/:id`
6. 成功后关闭模态框
7. 刷新项目列表
8. 显示成功提示

**输出**: 更新后的项目对象

### FR-005-04: 删除项目

**描述**: 删除项目及其关联数据

**触发**: 点击项目卡片的"删除"按钮

**处理逻辑**:
1. 点击删除按钮
2. 显示确认对话框："确定要删除项目 {name} 吗？此操作将同时删除相关的贡献和任务数据，且不可恢复。"
3. 用户确认后调用 `DELETE /api/projects/:id`
4. 成功后从列表中移除该项目
5. 显示成功提示

**输出**: 无（204 No Content）

**级联删除**:
- 自动删除关联的 Contribution 记录
- 自动删除关联的 Task 记录

### FR-005-05: 贡献统计计算

**描述**: 实时计算和显示项目的代码贡献统计

**数据来源**: Contribution 表

**统计指标**:
1. **总提交数**: `SUM(contributions.commits)`
2. **贡献者数**: `COUNT(DISTINCT contributions.deviceId)`
3. **新增代码行数**: `SUM(contributions.linesAdded)`
4. **删除代码行数**: `SUM(contributions.linesDeleted)`
5. **净增代码行数**: `新增 - 删除`

**显示格式**:
- 数字使用千位分隔符（如：5,420）
- 新增代码显示为绿色 `+5,420`
- 删除代码显示为红色 `-1,230`

## 技术实现

### 数据模型

```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String
  repository  String
  status      String   @default("active") // active, paused, completed
  startDate   DateTime @default(now())
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 关系
  contributions Contribution[]
  tasks         Task[]

  @@map("projects")
}

model Contribution {
  id           String   @id @default(uuid())
  deviceId     String
  projectId    String
  commits      Int      @default(0)
  linesAdded   Int      @default(0)
  linesDeleted Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  device  Device  @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([deviceId, projectId])
  @@map("contributions")
}

model Task {
  id          String   @id @default(uuid())
  deviceId    String
  projectId   String
  module      String
  description String
  status      String   @default("active") // active, completed, paused
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  device  Device  @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("tasks")
}
```

### 后端实现

**文件**: `server/src/routes/projects.ts`

**API 端点**:

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| GET | `/api/projects` | 获取所有项目（含贡献和任务） | ✅ |
| GET | `/api/projects/:id` | 获取项目详情 | ✅ |
| POST | `/api/projects` | 创建项目 | ✅ |
| PUT | `/api/projects/:id` | 更新项目 | ✅ |
| DELETE | `/api/projects/:id` | 删除项目 | ✅ |
| POST | `/api/projects/:id/contributions` | 添加/更新贡献 | ✅ |

**关键实现细节**:
- 使用 Prisma 的 `include` 加载关联数据
- 贡献使用 `upsert` 实现增量更新
- 删除项目时级联删除关联数据（Prisma onDelete: Cascade）

### 前端实现

**文件**: `client/src/pages/Projects.tsx`

**状态管理**:
```typescript
const [projects, setProjects] = useState<Project[]>([])
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
const [editingProject, setEditingProject] = useState<Project | null>(null)
const [isLoading, setIsLoading] = useState(false)
```

**核心功能**:
1. `fetchProjects()` - 获取项目列表
2. `createProject(data)` - 创建新项目
3. `updateProject(id, data)` - 更新项目
4. `deleteProject(id)` - 删除项目
5. `getTotalCommits(project)` - 计算总提交数
6. `getTotalLines(project)` - 计算代码行数统计

**组件**:
- `ProjectCard` - 项目卡片（可内联或抽取）
- `ProjectModal` - 创建/编辑模态框（待实现）
- `ConfirmDialog` - 删除确认对话框（待实现）

### 类型定义

**文件**: `client/src/types/index.ts`

```typescript
export interface Project {
  id: string
  name: string
  description: string
  repository: string
  status: 'active' | 'paused' | 'completed'
  startDate: Date
  endDate?: Date
  createdAt: Date
  updatedAt: Date
  contributions: Contribution[]
  tasks: Task[]
}

export interface Contribution {
  id: string
  deviceId: string
  projectId: string
  commits: number
  linesAdded: number
  linesDeleted: number
  device?: Device
}

export interface Task {
  id: string
  deviceId: string
  projectId: string
  module: string
  description: string
  status: 'active' | 'completed' | 'paused'
  device?: Device
}
```

## UI/UX 设计

### 项目状态样式

| 状态 | 徽章颜色 | 中文标签 | 说明 |
|------|---------|---------|------|
| active | 绿色 | 进行中 | 项目正在开发 |
| paused | 黄色 | 暂停 | 项目暂时中止 |
| completed | 蓝色 | 已完成 | 项目开发完成 |

### 响应式设计

- **桌面端**: 项目卡片全宽，统计面板 4 列
- **平板端**: 统计面板 2 列
- **移动端**: 统计面板 1 列，堆叠显示

### 交互反馈

- **创建成功**: Toast 提示"项目创建成功"
- **更新成功**: Toast 提示"项目更新成功"
- **删除成功**: Toast 提示"项目已删除"
- **操作失败**: Toast 显示具体错误信息
- **加载状态**: 按钮显示 loading 图标

## 测试用例

### TC-005-01: 查看项目列表
**前置条件**: 数据库中有 3 个项目
**步骤**:
1. 访问 `/projects` 页面
2. 等待数据加载

**预期结果**:
- 显示 3 个项目卡片
- 每个卡片显示完整信息
- 统计数据正确计算

### TC-005-02: 创建项目
**步骤**:
1. 点击"新建项目"按钮
2. 填写表单：名称="测试项目"，描述="测试描述"
3. 点击"创建"按钮

**预期结果**:
- 模态框关闭
- 列表中出现新项目
- 显示成功提示

### TC-005-03: 创建项目 - 验证失败
**步骤**:
1. 点击"新建项目"按钮
2. 不填写名称，直接点击"创建"

**预期结果**:
- 显示错误提示："请输入项目名称"
- 模态框不关闭
- 未创建项目

### TC-005-04: 编辑项目
**步骤**:
1. 点击某个项目的"编辑"按钮
2. 修改描述为"新的描述"
3. 点击"保存"

**预期结果**:
- 模态框关闭
- 项目描述更新为"新的描述"
- 显示成功提示

### TC-005-05: 删除项目
**步骤**:
1. 点击某个项目的"删除"按钮
2. 在确认对话框中点击"确定"

**预期结果**:
- 确认对话框关闭
- 项目从列表中移除
- 显示成功提示

### TC-005-06: 删除项目 - 取消操作
**步骤**:
1. 点击某个项目的"删除"按钮
2. 在确认对话框中点击"取消"

**预期结果**:
- 确认对话框关闭
- 项目仍在列表中
- 无任何变化

### TC-005-07: 统计数据计算
**前置条件**: 项目有 2 个设备贡献
- 设备 A: 10 commits, +100 lines, -20 lines
- 设备 B: 5 commits, +50 lines, -10 lines

**预期结果**:
- 总提交数: 15
- 贡献者数: 2
- 新增代码: +150
- 删除代码: -30
- 净增代码: 120

## 依赖关系

### 前置功能
- F001 - 用户认证（API 需要 JWT 认证）
- F002 - 设备管理（贡献和任务关联设备）

### 被依赖功能
- F004 - 仪表盘（显示项目概览）
- MCP 协议（设备自动上报贡献数据）

## 后续规划

### Phase 2: 高级功能
- [ ] 项目详情页（独立路由）
- [ ] 项目成员管理（分配设备角色）
- [ ] 项目标签/分类
- [ ] 项目搜索和过滤
- [ ] 项目排序（按名称、时间、活跃度等）

### Phase 3: 数据可视化
- [ ] 项目进度甘特图
- [ ] 代码贡献趋势图
- [ ] 设备工作量饼图
- [ ] 提交时间线

### Phase 4: Git 集成
- [ ] 自动从 Git 仓库同步提交数据
- [ ] 显示最新提交信息
- [ ] 分支管理追踪
- [ ] Pull Request 统计

## 变更日志

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-01-17 | 1.0 | 初始版本，完整功能设计文档 | Claude |
| 2026-01-17 | 0.1 | 基础实现，后端 API 完成 | - |

## 相关文档

- [API 文档 - 项目管理](../api/projects.md)
- [数据库设计](../database/README.md)
- [F002 - 设备管理](./F002-device-management.md)
- [F004 - 仪表盘](./F004-dashboard.md)
