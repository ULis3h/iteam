#!/bin/bash

# iTeam 开发环境启动脚本

set -e

echo "========================================="
echo "  iTeam - 一人即团队协作管理系统"
echo "========================================="
echo ""

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ 错误: Node.js版本过低 (当前: v$(node -v))"
    echo "   需要: v20.0.0 或更高版本"
    echo ""
    echo "建议安装步骤:"
    echo "1. 安装nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "2. 重启终端"
    echo "3. 安装Node 20: nvm install 20"
    echo "4. 使用Node 20: nvm use 20"
    echo ""
    exit 1
fi

echo "✅ Node.js版本检查通过: $(node -v)"
echo ""

# 检查是否首次运行
FIRST_RUN=false
if [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    FIRST_RUN=true
fi

if [ "$FIRST_RUN" = true ]; then
    echo "📦 首次运行，正在安装依赖..."
    echo ""

    # 安装后端依赖
    echo "安装后端依赖..."
    cd server
    npm install

    # 初始化数据库
    echo ""
    echo "初始化数据库..."
    npx prisma generate
    npx prisma migrate dev --name init

    cd ..

    # 安装前端依赖
    echo ""
    echo "安装前端依赖..."
    cd client
    npm install
    cd ..

    echo ""
    echo "✅ 依赖安装完成！"
    echo ""
fi

# 启动服务
echo "🚀 启动开发服务器..."
echo ""

# 检查端口是否被占用
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  警告: 端口3000已被占用"
    echo "   请先关闭占用该端口的进程"
    exit 1
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  警告: 端口5173已被占用"
    echo "   请先关闭占用该端口的进程"
    exit 1
fi

# 启动后端
echo "启动后端服务 (http://localhost:3000)..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "启动前端服务 (http://localhost:5173)..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================="
echo "  ✅ 服务启动成功！"
echo "========================================="
echo ""
echo "后端服务: http://localhost:3000"
echo "前端应用: http://localhost:5173"
echo ""
echo "进程ID:"
echo "  后端 PID: $BACKEND_PID"
echo "  前端 PID: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "========================================="
echo ""

# 清理函数
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ 所有服务已停止"
    exit 0
}

# 捕获退出信号
trap cleanup SIGINT SIGTERM

# 等待
wait
