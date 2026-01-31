# BMAD-METHOD 整合计划

## 概述

本文档描述如何将 BMAD-METHOD 的核心理念整合到 iTeam 项目中，构建一个更强大的 AI 驱动开发框架。

## BMAD 核心概念提取

### 1. Agent 定义结构

BMAD 使用 YAML 文件定义 Agent，每个 Agent 包含：

```yaml
# 示例：pm.agent.yaml
id: "_bmad/bmm/agents/pm.md"
name: "John"
title: "Product Manager"
icon: "📋"
module: "bmm"

persona:
  role: "Product Manager specializing in collaborative PRD creation"
  experience: "8+ years launching B2B and consumer products"
  expertise: ["Market research", "Competitive analysis", "User behavior"]
  communication: "Asks 'WHY?' relentlessly. Direct and data-sharp"

principles:
  - "User-centered design and Jobs-to-be-Done framework"
  - "Ship minimum viable solutions over pursuing perfection"
  - "User value drives decisions before technical constraints"

menu:  # 可执行的工作流
  - code: "CP"
    name: "Create PRD"
    workflow: "create-prd"
  - code: "VP"
    name: "Validate PRD"
    workflow: "validate-prd"
```

### 2. 工作流阶段

BMAD 将开发流程分为 4 个阶段：

```
Phase 1: Analysis（分析）
  └── brainstorming, research, market-analysis

Phase 2: Planning（规划）
  └── product-brief, create-prd, create-ux

Phase 3: Solutioning（方案设计）
  └── create-architecture, create-epics-and-stories

Phase 4: Implementation（实施）
  └── sprint-planning, dev-story, code-review, retrospective
```

### 3. 快速流程 (Quick Flow)

用于小功能和 Bug 修复的简化路径：

```
/quick-spec  →  /dev-story  →  /code-review
    ↓              ↓              ↓
代码分析       故事实施       质量审查
生成技术规格   编写代码+测试   多维度Review
```

### 4. 团队编排 (Party Mode)

多 Agent 协作模式：

```yaml
# team-fullstack.yaml
name: "Full Product Team"
agents:
  - pm         # 产品经理
  - architect  # 架构师
  - dev        # 开发者
  - ux         # UX设计师
  - quinn      # QA测试
mode: "collaborative"  # 协作模式
```

---

## iTeam 整合方案

### 第一阶段：增强 Agent 定义

#### 1.1 数据库模型扩展

```prisma
// 新增 AgentTemplate 模型
model AgentTemplate {
  id          String   @id @default(uuid())
  code        String   @unique  // pm, architect, dev, qa, etc.
  name        String            // "John", "Winston", "Amelia"
  title       String            // "Product Manager"
  icon        String            // emoji or icon name

  // Persona 配置
  role        String            // 角色描述
  experience  String?           // 经验描述
  expertise   String            // JSON: 专长领域数组
  communication String?         // 沟通风格

  // 行为配置
  principles  String            // JSON: 核心原则数组
  workflows   String            // JSON: 可执行工作流数组

  // 系统字段
  isBuiltIn   Boolean  @default(false)  // 是否内置
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("agent_templates")
}

// 扩展现有 Device 模型
model Device {
  // ... 现有字段 ...

  // 新增字段
  agentTemplateId String?        // 关联的 Agent 模板
  agentConfig     String?        // JSON: 自定义配置覆盖
  skillLevel      String @default("intermediate")  // beginner/intermediate/expert

  agentTemplate AgentTemplate? @relation(fields: [agentTemplateId], references: [id])
}
```

#### 1.2 预置 Agent 模板

| Code | Name | Title | Icon | 核心职责 |
|------|------|-------|------|---------|
| `pm` | John | Product Manager | 📋 | 需求分析、PRD创建、用户访谈 |
| `architect` | Winston | System Architect | 🏗️ | 技术架构、API设计、技术选型 |
| `dev` | Amelia | Software Engineer | 💻 | 代码实现、测试编写、代码审查 |
| `qa` | Quinn | QA Engineer | 🧪 | 测试策略、自动化测试、质量保障 |
| `ux` | Maya | UX Designer | 🎨 | 用户体验、原型设计、交互设计 |
| `devops` | Oscar | DevOps Engineer | ⚙️ | CI/CD、部署、基础设施 |
| `sm` | Sam | Scrum Master | 📊 | Sprint管理、团队协调、障碍清除 |

### 第二阶段：工作流系统

#### 2.1 Workflow 数据模型

```prisma
model Workflow {
  id          String   @id @default(uuid())
  code        String   @unique  // create-prd, dev-story, etc.
  name        String            // "Create PRD"
  description String
  phase       Int               // 1-4 (分析/规划/方案/实施)

  // 工作流配置
  agentCode   String            // 执行此工作流的 Agent
  steps       String            // JSON: 步骤定义
  inputs      String?           // JSON: 所需输入
  outputs     String?           // JSON: 输出产物

  // 依赖关系
  prerequisites String?         // JSON: 前置工作流

  // 系统字段
  isBuiltIn   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("workflows")
}

// 工作流执行实例
model WorkflowExecution {
  id          String   @id @default(uuid())
  workflowId  String
  projectId   String
  deviceId    String            // 执行的 Agent/Device

  status      String   @default("pending")  // pending/running/completed/failed
  progress    Int      @default(0)          // 0-100
  currentStep Int      @default(0)

  inputs      String?           // JSON: 实际输入
  outputs     String?           // JSON: 实际输出
  logs        String?           // JSON: 执行日志

  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workflow    Workflow @relation(fields: [workflowId], references: [id])
  project     Project  @relation(fields: [projectId], references: [id])
  device      Device   @relation(fields: [deviceId], references: [id])

  @@map("workflow_executions")
}
```

#### 2.2 预置工作流

**快速流程 (Quick Flow)**
```
/quick-spec    - 快速技术规格生成
/dev-story     - 开发故事实施
/code-review   - 代码审查
```

**完整流程 (Full Flow)**
```
Phase 1 - 分析:
  /brainstorm      - 头脑风暴
  /research        - 市场/技术研究

Phase 2 - 规划:
  /product-brief   - 产品简报
  /create-prd      - 创建PRD
  /create-ux       - 创建UX设计

Phase 3 - 方案:
  /architecture    - 技术架构设计
  /create-epics    - 创建Epic和Story

Phase 4 - 实施:
  /sprint-plan     - Sprint规划
  /dev-story       - 开发实施
  /code-review     - 代码审查
  /retrospective   - 回顾总结
```

### 第三阶段：团队编排系统

#### 3.1 Team 数据模型

```prisma
model Team {
  id          String   @id @default(uuid())
  name        String
  description String?

  // 团队配置
  members     String            // JSON: Agent配置数组 [{deviceId, role, priority}]
  mode        String   @default("sequential")  // sequential/parallel/collaborative

  // 工作流程
  defaultWorkflows String?      // JSON: 默认工作流序列

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("teams")
}
```

#### 3.2 团队模板

**Solo Developer Team** (快速开发)
```yaml
name: "Solo Developer"
members:
  - agent: quick-flow-solo-dev
mode: sequential
workflows: [quick-spec, dev-story, code-review]
```

**Full Product Team** (完整产品团队)
```yaml
name: "Full Product Team"
members:
  - agent: pm
  - agent: architect
  - agent: dev
  - agent: qa
  - agent: ux
mode: collaborative
workflows: [product-brief, create-prd, architecture, create-epics, sprint-plan]
```

**Backend Squad** (后端小队)
```yaml
name: "Backend Squad"
members:
  - agent: architect
  - agent: dev (backend specialist)
  - agent: devops
mode: collaborative
```

### 第四阶段：命令系统集成

#### 4.1 Slash Commands 实现

在 agent-client 中添加命令解析：

```javascript
// commands.js
const COMMANDS = {
  // 快速流程
  '/quick-spec': { workflow: 'quick-spec', agent: 'dev' },
  '/dev-story': { workflow: 'dev-story', agent: 'dev' },
  '/code-review': { workflow: 'code-review', agent: 'dev' },

  // 规划流程
  '/product-brief': { workflow: 'product-brief', agent: 'pm' },
  '/create-prd': { workflow: 'create-prd', agent: 'pm' },
  '/architecture': { workflow: 'architecture', agent: 'architect' },

  // 帮助
  '/iteam-help': { action: 'show-help' },
  '/status': { action: 'show-status' },
};
```

#### 4.2 Web UI 命令面板

在 client 中添加命令面板组件：

```tsx
// components/CommandPalette.tsx
- 快捷键 Cmd+K 打开
- 搜索和执行工作流
- 显示可用命令列表
- 支持参数输入
```

### 第五阶段：规模自适应

#### 5.1 项目复杂度评估

```typescript
interface ProjectComplexity {
  scale: 'small' | 'medium' | 'large' | 'enterprise';
  factors: {
    codebaseSize: number;      // 代码行数
    fileCount: number;         // 文件数量
    dependencies: number;      // 依赖数量
    teamSize: number;          // 参与Agent数
    integrations: number;      // 外部集成数
  };
}

function assessComplexity(project: Project): ProjectComplexity {
  // 基于因素计算复杂度
  // 返回推荐的工作流深度
}
```

#### 5.2 自适应工作流选择

| 项目规模 | 推荐流程 | Agent配置 |
|---------|---------|----------|
| Small (bug fix, small feature) | Quick Flow | Solo Dev |
| Medium (feature, module) | Simplified Full | Dev + QA |
| Large (epic, system) | Full Flow | Product Team |
| Enterprise (product, platform) | Extended Flow | Full Team + Specialists |

---

## 实施路线图

### Phase 1: 基础设施 (1-2周)
- [ ] 添加 AgentTemplate 数据模型
- [ ] 创建预置 Agent 模板数据
- [ ] 扩展 Device 模型关联
- [ ] 更新 API 支持 Agent 模板

### Phase 2: 工作流引擎 (2-3周)
- [ ] 添加 Workflow 数据模型
- [ ] 添加 WorkflowExecution 模型
- [ ] 实现工作流执行引擎
- [ ] 创建预置工作流
- [ ] agent-client 集成工作流执行

### Phase 3: 团队编排 (1-2周)
- [ ] 添加 Team 数据模型
- [ ] 实现团队协作模式
- [ ] 创建预置团队模板
- [ ] UI 团队管理界面

### Phase 4: 命令系统 (1周)
- [ ] 实现 Slash Commands 解析
- [ ] Web UI 命令面板
- [ ] 帮助系统集成

### Phase 5: 智能适配 (1-2周)
- [ ] 项目复杂度评估算法
- [ ] 自适应工作流推荐
- [ ] Agent 技能匹配优化

---

## 文件结构规划

```
server/
├── src/
│   ├── routes/
│   │   ├── agents.ts          # Agent模板API
│   │   ├── workflows.ts       # 工作流API
│   │   └── teams.ts           # 团队API
│   ├── services/
│   │   ├── workflowEngine.ts  # 工作流执行引擎
│   │   ├── complexityAnalyzer.ts  # 复杂度分析
│   │   └── teamOrchestrator.ts    # 团队编排
│   └── data/
│       ├── agents/            # Agent模板YAML
│       ├── workflows/         # 工作流定义YAML
│       └── teams/             # 团队模板YAML

client/
├── src/
│   ├── pages/
│   │   ├── Agents.tsx         # Agent模板管理
│   │   ├── Workflows.tsx      # 工作流管理
│   │   └── Teams.tsx          # 团队管理
│   └── components/
│       ├── CommandPalette.tsx # 命令面板
│       └── WorkflowViewer.tsx # 工作流可视化

agent-client/
├── src/
│   ├── services/
│   │   ├── command-parser.js  # 命令解析
│   │   └── workflow-executor.js  # 工作流执行
│   └── data/
│       └── commands.json      # 命令定义
```

---

## 核心价值

通过整合 BMAD-METHOD 的理念，iTeam 将具备：

1. **结构化 AI 协作** - 不再是随机的AI对话，而是有章法的开发流程
2. **角色专业化** - 每个Agent有明确的专长和职责
3. **工作流驱动** - 可重复、可追踪的开发过程
4. **团队协作** - 多Agent协同完成复杂任务
5. **规模适应** - 根据项目复杂度自动调整流程深度

这将使 iTeam 从一个"设备管理系统"进化为真正的"AI驱动开发框架"。
