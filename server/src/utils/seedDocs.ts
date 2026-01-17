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
