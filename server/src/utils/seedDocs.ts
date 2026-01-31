import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding documents...')

    const docs = [
        {
            title: 'React 开发规范',
            content: '# React 开发规范\n\n## 组件命名\n使用 PascalCase 命名组件...\n\n## Hooks\n自定义 Hooks 以 use 开头...',
            category: 'standard',
            tags: JSON.stringify(['react', 'frontend', 'standard']),
            author: 'Admin'
        },
        {
            title: 'TypeScript 最佳实践',
            content: '# TypeScript 最佳实践\n\n## 类型定义\n优先使用 interface 而不是 type...\n\n## 泛型\n合理使用泛型增加代码复用性...',
            category: 'tech',
            tags: JSON.stringify(['typescript', 'frontend', 'backend']),
            author: 'Admin'
        },
        {
            title: 'API 设计指南',
            content: '# API 设计指南\n\n## 路由命名\n使用复数名词表示资源...\n\n## 状态码\n正确使用 HTTP 状态码...',
            category: 'standard',
            tags: JSON.stringify(['api', 'backend', 'rest']),
            author: 'Admin'
        },
        {
            title: 'iTeam 架构文档',
            content: '# iTeam 架构\n\n系统采用前后端分离架构...\n- 前端：React + Tailwind\n- 后端：Node.js + Prisma',
            category: 'tech',
            tags: JSON.stringify(['architecture', 'iteam']),
            author: 'Admin'
        },
        {
            title: 'Git 提交规范',
            content: '# Git Commit Convention\n\nFormat: <type>(<scope>): <subject>\n\nTypes:\n- feat: New feature\n- fix: Bug fix...',
            category: 'standard',
            tags: JSON.stringify(['git', 'workflow']),
            author: 'Admin'
        },
        {
            title: '常见部署问题排查',
            content: '# 部署问题\n\n## 端口占用\n使用 lsof -i :3000 查看端口占用...',
            category: 'bug',
            tags: JSON.stringify(['devops', 'deployment']),
            author: 'DevOps'
        },
        {
            title: 'iTeam Design Philosophy',
            content: '# iTeam Design Philosophy\n\niTeam is built on the concept of enabling a single human developer to function as a full "one-person team" by orchestrating multiple specialized AI agents.\n\n## 1. The Factory Analogy\n\nThe system is architected like a modern automated factory:\n\n| Component | Analogy | Role |\n| :--- | :--- | :--- |\n| **client** | **Control Room** (控制室) | The human overseer monitors status, manages projects, and issues high-level directives. |\n| **agent-client** | **Intelligent Robots** (智能机器人) | Automated units that receive instructions, execute tasks (via Claude Code), and report progress. |\n| **server** | **Scheduling System** (调度系统) | The central hub that stores data, routes messages, and ensures components stay synchronized. |\n\n## 2. Core Principles\n\n- **One Human, Many Machines**: Focus on high-level orchestration.\n- **Asynchronous Collaboration**: Tasks are assigned and executed independently.\n- **Role Specialization**: Agents have specific roles (PM, Architect, FE, BE, DevOps).\n- **Self-Evolution**: The system aims to eventually maintain its own codebase.',
            category: 'tech',
            tags: JSON.stringify(['iteam', 'philosophy', 'design']),
            author: 'Admin'
        },
        {
            title: 'iTeam Usage Guidelines',
            content: '# iTeam Usage Guidelines\n\n## Philosophy\n- **Incremental progress**: Small changes that compile and pass tests.\n- **Learning**: Study and plan before implementing.\n- **Pragmatic**: Adapt to project reality.\n\n## Process\n\n### 1. Planning & Staging\nEvery task requires an `IMPLEMENTATION_PLAN.md` with stages (Goal, Success Criteria, Tests, Status).\n\n### 2. Implementation Flow\n1. **Understand** - Study existing patterns.\n2. **Test** - Write test first (red).\n3. **Implement** - Minimal code to pass (green).\n4. **Refactor** - Clean up.\n5. **Commit** - Link to plan.\n\n### 3. The "3-Strikes" Rule\nIf stuck for 3 attempts:\n1. Document failure.\n2. Research alternatives.\n3. Question fundamentals.\n\n## Quality Gates\n- Tests written and passing\n- Code follows project conventions\n- No linter/formatter warnings',
            category: 'standard',
            tags: JSON.stringify(['iteam', 'usage', 'workflow']),
            author: 'Admin'
        }
    ]

    for (const doc of docs) {
        await prisma.document.create({
            data: doc
        })
    }

    console.log(`✅ Added ${docs.length} documents`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
