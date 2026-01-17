#!/bin/bash

echo "========================================="
echo "  iTeam 连接测试脚本"
echo "========================================="
echo ""

# 检查server是否运行
if pgrep -f "tsx watch src/index.ts" > /dev/null; then
    echo "✅ Server 正在运行"
else
    echo "❌ Server 未运行"
    echo "请在另一个终端运行: cd server && npm run dev"
    exit 1
fi

echo ""
echo "等待5秒让server完全启动..."
sleep 5

# 测试server健康检查
echo ""
echo "📡 测试Server健康检查..."
SERVER_HEALTH=$(curl -s http://localhost:3000/api/health)
if [ $? -eq 0 ]; then
    echo "✅ Server健康检查通过"
    echo "   $SERVER_HEALTH"
else
    echo "❌ Server健康检查失败"
    exit 1
fi

# 检查数据库
echo ""
echo "📊 检查数据库文件..."
if [ -f "/home/ulis/codes/iteam/server/prisma/dev.db" ]; then
    echo "✅ 数据库文件存在"
    DB_SIZE=$(du -h /home/ulis/codes/iteam/server/prisma/dev.db | cut -f1)
    echo "   大小: $DB_SIZE"
else
    echo "❌ 数据库文件不存在"
    echo "请运行: cd server && npm run prisma:migrate"
fi

echo ""
echo "========================================="
echo "现在可以启动agent-client了："
echo "  cd agent-client"
echo "  npm start"
echo ""
echo "然后在agent-client中："
echo "  1. 配置服务器地址: http://localhost:3000"
echo "  2. 配置API Key: iteam-device-key"
echo "  3. 设置设备名称和角色"
echo "  4. 点击'连接服务器'"
echo "========================================="
