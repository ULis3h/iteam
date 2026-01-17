# F008 - 设备角色与技能分配及文档关联

## 基本信息

| 属性 | 值 |
|------|-----|
| 功能编号 | F008 |
| 功能名称 | 设备角色与技能分配及文档关联 |
| 所属模块 | 设备管理 |
| 实现版本 | 0.1.0 |
| 实现日期 | 2026-01-17 |
| 状态 | ✅ 完成 |

## 功能概述

允许管理员为每个设备分配具体的团队角色（如前端、后端等），并根据角色配置技能栈，同时关联相关的文档中心文档。

## 用户故事

1. **角色分配**: 作为管理员，我希望为我的 "MacBook Pro" 分配 "前端工程师" 角色，以便明确其职责。
2. **技能配置**: 作为管理员，我希望为设备勾选 "React" 和 "TypeScript" 技能，以便记录该设备的能力。
3. **文档关联**: 作为管理员，我希望将 "前端开发规范" 文档关联到该设备，以便 Agent 可以读取相关规范。

## 功能需求

### FR-008-01: 设备编辑

**描述**: 在设备管理页面提供编辑功能。

**输入**:
- 角色 (单选，8种预设)
- 技能 (多选，根据角色动态加载)
- 文档 (多选，来自文档中心)

**处理**:
1. 获取 `/api/roles` 获取角色列表和技能数据
2. 获取 `/api/documents` 获取可选文档
3. 保存时更新设备的 `role`, `skills`, `documentIds` 字段

### FR-008-02: 动态技能加载

**描述**: 当选择不同角色时，技能列表应自动更新。

**逻辑**:
- 选择 "Frontend" -> 显示 React, Vue, TS...
- 选择 "Backend" -> 显示 Node.js, Python, SQL...

## 技术实现

### 数据模型 (Device)

```prisma
model Device {
  // ...
  role        String?  // 角色ID
  skills      String?  // JSON字符串: ["React", "TS"]
  documentIds String?  // JSON字符串: ["doc1", "doc2"]
  // ...
}
```

### API 接口

- `PUT /api/devices/:id`: 接收 skills 和 documentIds 字段
- `GET /api/roles`: 提供角色和技能元数据

### UI 组件

- `DeviceEditModal`: 编辑模态框，包含 RoleSelector, SkillSelector, DocumentSelector

## 关联文档

- [角色配置 API](../api/roles.md)
- [F002 - 设备管理](./F002-device-management.md)
- [F006 - 文档中心](./F006-document-center.md)
