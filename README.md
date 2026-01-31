<p align="center">
  <img src="docs/images/logo-banner.png" alt="iTeam Logo" width="600">
</p>

<p align="center">
  <strong>一人即团队 · 让个人开发者拥有团队协作的超能力</strong>
</p>

<p align="center">
  <a href="https://github.com/ULis3h/iteam/releases"><img src="https://img.shields.io/github/v/release/ULis3h/iteam?include_prereleases&style=flat-square&color=8B5CF6" alt="Release"></a>
  <img src="https://img.shields.io/badge/build-passing-brightgreen?style=flat-square" alt="Build">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  <a href="https://deepwiki.com/ULis3h/iteam"><img src="https://img.shields.io/badge/Ask%20DeepWiki-8B5CF6?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0yIDE3TDEyIDIyTDIyIDE3IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMiAxMkwxMiAxN0wyMiAxMiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+&logoColor=white" alt="Ask DeepWiki"></a>
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> •
  <a href="#-功能特性">功能特性</a> •
  <a href="#-agent-client">Agent Client</a> •
  <a href="#-技术栈">技术栈</a> •
  <a href="#-文档">文档</a>
</p>

---

<p align="center">
  <img src="docs/images/dashboard-preview.png" alt="Dashboard Preview" width="90%">
</p>

## 🎯 核心理念

**iTeam** 让个人开发者能够像管理一个完整团队一样，协调多个 AI Agent 和开发设备。

- 🖥️ **多设备协作** - 将多台设备作为虚拟团队成员管理
- 🤖 **AI Agent 集成** - 与 Claude Code、Gemini CLI 等 AI 工具深度集成  
- 📊 **实时拓扑图** - 可视化展示所有设备和 Agent 的连接状态
- 📝 **知识库管理** - 集中管理项目文档、技术笔记、Bug 修复记录

---

## ⚡ 快速开始

```bash
# 克隆仓库
git clone https://github.com/ULis3h/iteam.git
cd iteam

# 一键启动开发环境
./start-dev.sh
```

访问 http://localhost:5173 开始使用！

### 下载 Agent Client

<p>
  <a href="https://github.com/ULis3h/iteam/releases/latest">
    <img src="https://img.shields.io/badge/Download-macOS%20ARM64-8B5CF6?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS">
  </a>
</p>

---

## ✨ 功能特性

### 📡 设备拓扑图
点击展开查看每个部门的设备详情，实时监控连接状态。

<img src="docs/images/topology-preview.png" alt="Topology" width="80%">

### 🤖 AI Agent Client
独立桌面应用，自动接收任务并调用 Claude Code 执行。

### 📋 项目管理
看板式任务管理，支持多项目并行。

### 📝 文档中心
Markdown 编辑器，分类管理技术文档。

---

## 🤖 Agent Client

Agent Client 是 iTeam 的桌面客户端，让你的开发机器变成智能 Agent：

```bash
# 安装依赖
cd agent-client && npm install

# 启动 Agent
./start-agent.sh
```

**主要功能：**
- ✅ 自动连接 iTeam 服务器
- ✅ 接收并执行派发的任务
- ✅ 调用 Claude Code 自动完成开发任务
- ✅ 实时上报任务状态

详见 [Agent Client 文档](./agent-client/README.md)

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Backend** | Node.js, Express, Prisma ORM, Socket.IO |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) |
| **Desktop** | Electron |
| **AI Integration** | Claude Code, 支持 Gemini CLI |

---

## 📖 文档

- 📘 [系统架构](./ARCHITECTURE.md) - 完整架构设计
- 📗 [快速上手](./QUICKSTART.md) - 5分钟入门指南
- 📙 [Agent Client](./agent-client/README.md) - 桌面客户端使用
- 📕 [API 参考](./docs/api/README.md) - REST API 文档

---

## 🗺 路线图

- [x] 设备管理与实时状态监控
- [x] 拓扑图可视化（点击展开/收起）
- [x] Agent Client 桌面应用
- [x] 文档编辑器
- [ ] 工作流自动化
- [ ] 多 Agent 协作任务
- [ ] 代码贡献分析

---

## 📝 License

MIT License © 2024 [ULis3h](https://github.com/ULis3h)

---

<p align="center">
  <strong>iTeam</strong> - 让一个人拥有一个团队的力量 💪
</p>
