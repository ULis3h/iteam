# F003 - 团队角色

## 基本信息

| 属性 | 值 |
|------|-----|
| 功能编号 | F003 |
| 功能名称 | 团队角色 |
| 所属模块 | 设备管理 |
| 实现版本 | 0.1.0 |
| 实现日期 | 2026-01-17 |
| 状态 | ✅ 完成 |

## 功能概述

为每个设备分配团队角色，模拟专业软件开发团队的分工，如前端开发、后端开发、DevOps 等。

## 用户故事

1. 作为管理员，我希望为每个设备分配角色，以便明确设备职责
2. 作为管理员，我希望在设备列表中看到角色标签，以便快速识别设备定位

## 功能需求

### FR-003-01: 角色分配

**描述**: 为设备分配团队角色

**输入**:
- 设备 ID
- 角色代码

**处理**:
1. 更新设备的 role 字段
2. 刷新设备列表

### FR-003-02: 角色展示

**描述**: 在设备列表中展示角色标签

**显示**:
- 彩色标签显示角色
- 不同角色使用不同颜色

## 角色定义

| 角色代码 | 显示名称 | 标签颜色 | 说明 |
|---------|---------|---------|------|
| frontend | 前端开发 | 🔵 蓝色 | 负责前端界面开发 |
| backend | 后端开发 | 🟢 绿色 | 负责后端服务开发 |
| fullstack | 全栈开发 | 🟣 紫色 | 负责全栈开发 |
| devops | DevOps | 🟠 橙色 | 负责 CI/CD 和运维 |
| qa | 测试工程师 | 🔴 红色 | 负责测试和质量保证 |
| architect | 架构师 | 🟤 棕色 | 负责系统架构设计 |
| pm | 项目经理 | 🟣 靛蓝色 | 负责项目管理 |
| designer | UI/UX设计 | 🩷 粉色 | 负责界面设计 |
| (空) | 未分配 | ⚪ 灰色 | 尚未分配角色 |

## 技术实现

### 数据模型

```prisma
model Device {
  // ...
  role String?  // frontend, backend, fullstack, devops, qa, architect, pm, designer
  // ...
}
```

### TypeScript 类型

```typescript
type DeviceRole = 'frontend' | 'backend' | 'fullstack' | 'devops' | 'qa' | 'architect' | 'pm' | 'designer'
```

### 角色信息函数

```typescript
const getRoleInfo = (role?: string) => {
  switch (role) {
    case 'frontend':
      return { text: '前端开发', color: 'text-blue-700', bgColor: 'bg-blue-100' }
    case 'backend':
      return { text: '后端开发', color: 'text-green-700', bgColor: 'bg-green-100' }
    case 'fullstack':
      return { text: '全栈开发', color: 'text-purple-700', bgColor: 'bg-purple-100' }
    case 'devops':
      return { text: 'DevOps', color: 'text-orange-700', bgColor: 'bg-orange-100' }
    case 'qa':
      return { text: '测试工程师', color: 'text-red-700', bgColor: 'bg-red-100' }
    case 'architect':
      return { text: '架构师', color: 'text-amber-700', bgColor: 'bg-amber-100' }
    case 'pm':
      return { text: '项目经理', color: 'text-indigo-700', bgColor: 'bg-indigo-100' }
    case 'designer':
      return { text: 'UI/UX设计', color: 'text-pink-700', bgColor: 'bg-pink-100' }
    default:
      return { text: '未分配', color: 'text-gray-700', bgColor: 'bg-gray-100' }
  }
}
```

## 使用场景

### 典型团队配置

| 设备 | 角色 | 职责 |
|------|------|------|
| MacBook Pro | 前端开发 | React/Vue 界面开发 |
| Ubuntu 工作站 | 后端开发 | Node.js/Python 服务开发 |
| Windows 服务器 | DevOps | CI/CD、Docker、部署 |
| Mac Mini | 项目经理 | 项目规划、文档整理 |

### 设备模拟脚本配置

```bash
# simulate-devices.sh 中的角色分配
curl -X PUT "$API_URL/$MACBOOK_PRO" -d '{"role": "frontend", ...}'
curl -X PUT "$API_URL/$UBUNTU_DEV" -d '{"role": "backend", ...}'
curl -X PUT "$API_URL/$WIN_WORKSTATION" -d '{"role": "devops", ...}'
curl -X PUT "$API_URL/$MAC_MINI" -d '{"role": "pm", ...}'
```

## 后续规划

- [ ] 角色编辑 UI（在设备编辑对话框中）
- [ ] 按角色筛选设备
- [ ] 角色工作量统计
- [ ] 角色任务分配建议
