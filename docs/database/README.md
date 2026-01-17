# 数据库设计

## 概述

iTeam 使用 SQLite 作为开发数据库，通过 Prisma ORM 进行数据库操作。

## 数据库配置

| 属性 | 值 |
|------|-----|
| 数据库类型 | SQLite |
| 文件位置 | `server/prisma/dev.db` |
| ORM | Prisma |
| Schema | `server/prisma/schema.prisma` |

## 数据模型

### User（用户）

存储系统用户信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 用户 ID |
| email | String | Unique | 邮箱地址 |
| username | String | Unique | 用户名 |
| password | String | - | 密码哈希 |
| avatar | String? | - | 头像 URL |
| role | String | Default: "user" | 角色 |
| createdAt | DateTime | - | 创建时间 |
| updatedAt | DateTime | - | 更新时间 |

### Device（设备）

存储 AI 开发设备信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 设备 ID |
| name | String | - | 设备名称 |
| type | String | - | 设备类型 |
| role | String? | - | 团队角色 |
| status | String | Default: "offline" | 状态 |
| os | String | - | 操作系统 |
| ip | String | - | IP 地址 |
| currentProject | String? | - | 当前项目 |
| currentModule | String? | - | 当前模块 |
| metadata | String? | - | 硬件信息 (JSON) |
| lastSeen | DateTime | - | 最后活跃时间 |
| createdAt | DateTime | - | 创建时间 |
| updatedAt | DateTime | - | 更新时间 |

**关联**:
- contributions → Contribution[]
- tasks → Task[]

### Project（项目）

存储项目信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 项目 ID |
| name | String | - | 项目名称 |
| description | String? | - | 项目描述 |
| repository | String? | - | 仓库地址 |
| status | String | Default: "active" | 状态 |
| startDate | DateTime | - | 开始日期 |
| endDate | DateTime? | - | 结束日期 |
| createdAt | DateTime | - | 创建时间 |
| updatedAt | DateTime | - | 更新时间 |

**关联**:
- contributions → Contribution[]
- tasks → Task[]

### Document（文档）

存储知识库文档。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 文档 ID |
| title | String | - | 标题 |
| content | String | - | 内容 |
| category | String | Default: "other" | 分类 |
| tags | String | Default: "[]" | 标签 (JSON) |
| author | String | - | 作者 |
| createdAt | DateTime | - | 创建时间 |
| updatedAt | DateTime | - | 更新时间 |

### Contribution（贡献）

记录设备对项目的贡献。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 贡献 ID |
| deviceId | String | FK → Device | 设备 ID |
| projectId | String | FK → Project | 项目 ID |
| commits | Int | Default: 0 | 提交数 |
| linesAdded | Int | Default: 0 | 添加行数 |
| linesDeleted | Int | Default: 0 | 删除行数 |

### Task（任务）

记录设备执行的任务。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String | PK, UUID | 任务 ID |
| deviceId | String | FK → Device | 设备 ID |
| projectId | String | FK → Project | 项目 ID |
| module | String | - | 模块名称 |
| description | String | - | 任务描述 |
| status | String | Default: "pending" | 状态 |

## 数据库操作

### 初始化/迁移

```bash
cd server
npx prisma db push
```

### 查看数据

```bash
npx prisma studio
```

### 重置数据库

```bash
npx prisma db push --force-reset
```

## 种子数据

初始设备数据在 `server/prisma/seed.ts` 中定义。

运行种子：
```bash
npx prisma db seed
```
