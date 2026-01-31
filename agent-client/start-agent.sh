#!/bin/bash

echo "========================================="
echo "  iTeam Agent Client 启动脚本"
echo "========================================="
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js"
    echo "请先安装Node.js (版本 >= 18.0.0)"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Node.js: $NODE_VERSION"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到npm"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✓ npm: $NPM_VERSION"

# # 检查Claude Code CLI
# if ! command -v claude &> /dev/null; then
#     echo "⚠️  警告: 未找到Claude Code CLI"
#     echo "Agent将无法执行自动化任务"
#     echo "请运行: npm install -g @anthropic/claude-code"
#     echo ""
#     read -p "是否继续启动应用? (y/n) " -n 1 -r
#     echo ""
#     if [[ ! $REPLY =~ ^[Yy]$ ]]; then
#         exit 1
#     fi
# else
#     CLAUDE_VERSION=$(claude --version 2>&1 || echo "未知版本")
#     echo "✓ Claude Code CLI: $CLAUDE_VERSION"
# fi

echo ""
echo "========================================="

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✓ 依赖安装完成"
    echo ""
fi

# 检查环境变量
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  警告: 未设置ANTHROPIC_API_KEY环境变量"
    echo "Claude Code可能无法正常工作"
    echo "请设置: export ANTHROPIC_API_KEY=your-api-key"
    echo ""
fi

# 启动应用
echo "🚀 启动iTeam Agent Client..."
echo ""

if [ "$1" == "--dev" ]; then
    echo "以开发模式运行..."
    npm run dev
else
    npm start
fi
