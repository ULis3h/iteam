# 角色配置 API

## 概述

角色配置 API 提供了获取和管理设备角色及其 Agent Skills 的接口。每个角色包含详细的技能栈、职责范围、协作偏好和 Agent 指令模板。

**Base URL**: `http://localhost:3000/api/roles`

**认证方式**: JWT Token（可选，公开读取）

## 端点列表

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/roles` | 获取所有角色配置 | 可选 |
| GET | `/api/roles/:roleId` | 获取单个角色配置 | 可选 |

---

## 1. 获取所有角色配置

获取系统中所有预设角色的完整配置信息。

### 请求

```http
GET /api/roles
```

### 响应

**成功响应** (200 OK):

```json
[
  {
    "roleId": "frontend",
    "name": "前端工程师",
    "description": "负责用户界面开发、交互体验优化和前端架构设计",
    "color": "#3B82F6",
    "icon": "🎨",
    "techStack": {
      "primary": ["React", "Vue", "TypeScript", "JavaScript", "HTML", "CSS"],
      "secondary": ["Next.js", "Tailwind CSS", "Redux", "Zustand", "Vite"],
      "tools": ["VS Code", "Chrome DevTools", "Figma", "Git", "npm/yarn"]
    },
    "responsibilities": {
      "core": [
        "开发响应式用户界面",
        "实现交互逻辑和动画效果",
        "优化前端性能和加载速度",
        "确保跨浏览器兼容性",
        "编写前端单元测试"
      ],
      "support": [
        "参与UI/UX设计讨论",
        "协助API接口设计",
        "前端架构规划"
      ],
      "avoid": [
        "不负责后端API实现",
        "不负责数据库设计",
        "不负责服务器运维"
      ]
    },
    "capabilities": {
      "codeReview": true,
      "codeGen": true,
      "testing": true,
      "deployment": false,
      "design": false,
      "planning": false
    },
    "prompts": {
      "systemPrompt": "你是一名专业的前端工程师，擅长 React、TypeScript 和现代前端技术栈。专注于用户体验和代码质量。",
      "taskPrompt": "请以前端工程师的视角分析任务，考虑：1)用户体验 2)性能优化 3)代码可维护性 4)浏览器兼容性",
      "constraints": [
        "只使用项目中已有的技术栈",
        "遵循项目的代码规范",
        "确保组件可复用性",
        "注重无障碍访问(a11y)"
      ]
    },
    "collaboration": {
      "worksWellWith": ["designer", "backend", "qa"],
      "leadsIn": ["UI开发", "前端架构", "性能优化"],
      "assistsIn": ["API设计", "需求分析", "用户体验"]
    }
  },
  {
    "roleId": "backend",
    "name": "后端工程师",
    ...
  },
  ...
]
```

### 示例

```bash
curl http://localhost:3000/api/roles
```

---

## 2. 获取单个角色配置

获取指定角色的详细配置信息。

### 请求

```http
GET /api/roles/:roleId
```

**路径参数**:
- `roleId` (string, 必需): 角色ID，可选值：
  - `frontend` - 前端工程师
  - `backend` - 后端工程师
  - `fullstack` - 全栈工程师
  - `devops` - DevOps工程师
  - `qa` - 测试工程师
  - `architect` - 架构师
  - `pm` - 项目经理
  - `designer` - UI/UX设计师

### 响应

**成功响应** (200 OK):

```json
{
  "roleId": "frontend",
  "name": "前端工程师",
  "description": "负责用户界面开发、交互体验优化和前端架构设计",
  "color": "#3B82F6",
  "icon": "🎨",
  "techStack": {
    "primary": ["React", "Vue", "TypeScript", "JavaScript", "HTML", "CSS"],
    "secondary": ["Next.js", "Tailwind CSS", "Redux", "Zustand", "Vite"],
    "tools": ["VS Code", "Chrome DevTools", "Figma", "Git", "npm/yarn"]
  },
  "responsibilities": {
    "core": [
      "开发响应式用户界面",
      "实现交互逻辑和动画效果",
      "优化前端性能和加载速度",
      "确保跨浏览器兼容性",
      "编写前端单元测试"
    ],
    "support": [
      "参与UI/UX设计讨论",
      "协助API接口设计",
      "前端架构规划"
    ],
    "avoid": [
      "不负责后端API实现",
      "不负责数据库设计",
      "不负责服务器运维"
    ]
  },
  "capabilities": {
    "codeReview": true,
    "codeGen": true,
    "testing": true,
    "deployment": false,
    "design": false,
    "planning": false
  },
  "prompts": {
    "systemPrompt": "你是一名专业的前端工程师，擅长 React、TypeScript 和现代前端技术栈。专注于用户体验和代码质量。",
    "taskPrompt": "请以前端工程师的视角分析任务，考虑：1)用户体验 2)性能优化 3)代码可维护性 4)浏览器兼容性",
    "constraints": [
      "只使用项目中已有的技术栈",
      "遵循项目的代码规范",
      "确保组件可复用性",
      "注重无障碍访问(a11y)"
    ]
  },
  "collaboration": {
    "worksWellWith": ["designer", "backend", "qa"],
    "leadsIn": ["UI开发", "前端架构", "性能优化"],
    "assistsIn": ["API设计", "需求分析", "用户体验"]
  }
}
```

**错误响应** (404 Not Found):

```json
{
  "error": "Role not found"
}
```

### 示例

```bash
curl http://localhost:3000/api/roles/frontend
```

---

## 数据模型

### RoleSkill

```typescript
interface RoleSkill {
  roleId: string              // 角色ID
  name: string               // 角色名称
  description: string        // 角色描述
  color: string             // 主题色（十六进制）
  icon: string              // 图标（emoji）

  // 核心技能栈
  techStack: {
    primary: string[]       // 主要技术栈
    secondary: string[]     // 次要技术栈
    tools: string[]        // 常用工具
  }

  // 职责范围
  responsibilities: {
    core: string[]          // 核心职责
    support: string[]       // 支持职责
    avoid: string[]        // 避免职责
  }

  // Agent 能力
  capabilities: {
    codeReview: boolean     // 代码审查
    codeGen: boolean       // 代码生成
    testing: boolean       // 测试
    deployment: boolean    // 部署
    design: boolean        // 设计
    planning: boolean      // 规划
  }

  // Agent 指令模板
  prompts: {
    systemPrompt: string   // 系统提示词
    taskPrompt: string     // 任务提示词
    constraints: string[]  // 约束条件
  }

  // 协作偏好
  collaboration: {
    worksWellWith: string[]  // 适合协作的角色
    leadsIn: string[]       // 主导的场景
    assistsIn: string[]     // 辅助的场景
  }
}
```

---

## 角色列表

| 角色ID | 中文名称 | 图标 | 颜色 |
|--------|---------|------|------|
| frontend | 前端工程师 | 🎨 | #3B82F6 |
| backend | 后端工程师 | ⚙️ | #10B981 |
| fullstack | 全栈工程师 | 🚀 | #8B5CF6 |
| devops | DevOps工程师 | 🔧 | #F59E0B |
| qa | 测试工程师 | 🧪 | #EAB308 |
| architect | 架构师 | 🏛️ | #EF4444 |
| pm | 项目经理 | 📊 | #EC4899 |
| designer | UI/UX设计师 | ✨ | #06B6D4 |

---

## Agent 使用指南

### Agent 启动流程

1. **读取角色配置**
```javascript
const role = await fetch('/api/roles/frontend').then(r => r.json())
```

2. **初始化 Agent**
```javascript
const agent = new Agent({
  systemPrompt: role.prompts.systemPrompt,
  constraints: role.prompts.constraints,
  capabilities: role.capabilities
})
```

3. **任务执行**
```javascript
const result = await agent.executeTask(task, {
  context: role.prompts.taskPrompt,
  techStack: role.techStack.primary
})
```

### Prompt 使用示例

**前端工程师 Agent**:
```
系统提示：你是一名专业的前端工程师，擅长 React、TypeScript 和现代前端技术栈。专注于用户体验和代码质量。

任务提示：请以前端工程师的视角分析任务，考虑：
1) 用户体验
2) 性能优化
3) 代码可维护性
4) 浏览器兼容性

约束条件：
- 只使用项目中已有的技术栈
- 遵循项目的代码规范
- 确保组件可复用性
- 注重无障碍访问(a11y)

用户任务：实现一个可拖拽的看板组件
```

---

## 使用场景

### 场景1: 智能任务分配

```bash
# 1. 获取所有角色
GET /api/roles

# 2. 分析任务需求
task = "优化首页加载速度"

# 3. 匹配最适合的角色
matchRole(task, roles)
// 返回：frontend (主导), devops (辅助)

# 4. 分配任务给对应设备
assignTask(task, devicesWithRole['frontend'])
```

### 场景2: Agent 自我认知

```bash
# Device Agent 启动时：
1. GET /api/roles/{myRole}
2. 加载角色配置到内存
3. 使用 systemPrompt 初始化 AI
4. 根据 capabilities 过滤可执行任务
5. 根据 responsibilities 判断任务优先级
```

### 场景3: 协作推荐

```bash
# 当前任务：前端组件开发
currentRole = "frontend"

# 获取协作推荐
role = GET /api/roles/frontend
recommendations = role.collaboration.worksWellWith
// 返回：["designer", "backend", "qa"]

# 建议团队配置
suggest:
  - 设计师（UI设计）
  - 后端工程师（API对接）
  - 测试工程师（功能测试）
```

---

## 相关文档

- [功能设计文档 - F007 角色与 Agent 技能](../features/F007-role-agent-skills.md)
- [F002 - 设备管理](../features/F002-device-management.md)
- [API 概述](./README.md)
