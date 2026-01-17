# iTeam Agent Client 快速开始

## 5分钟快速上手

### 步骤 1: 安装依赖

```bash
cd agent-client
npm install
```

### 步骤 2: 安装Claude Code CLI（必需）

```bash
npm install -g @anthropic/claude-code
```

### 步骤 3: 配置Claude API Key

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

或在 `~/.bashrc` / `~/.zshrc` 中添加：

```bash
echo 'export ANTHROPIC_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

### 步骤 4: 启动iTeam服务器

在另一个终端窗口中：

```bash
cd ../server
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 步骤 5: 启动Agent客户端

```bash
./start-agent.sh
```

或使用npm命令：

```bash
# 开发模式（带开发者工具）
npm run dev

# 生产模式
npm start
```

### 步骤 6: 配置Agent

在打开的应用窗口中：

1. **服务器连接配置**
   - 服务器地址: `http://localhost:3000`
   - API Key: `iteam-device-key`

2. **Agent配置**
   - 设备名称: 例如 "我的开发机"
   - 角色: 选择您的角色（如 "Full Stack Developer"）
   - 技能标签: 输入您的技能（如 "react,nodejs,python"）

3. **点击"保存配置"**

4. **点击"连接服务器"**

### 步骤 7: 测试任务执行

连接成功后，Agent会自动接收并执行来自服务器的任务。

您可以在iTeam Web界面中创建任务来测试：

1. 访问 `http://localhost:5173`（前端应用）
2. 登录到iTeam
3. 在项目管理中创建新任务
4. 分配给您的Agent
5. Agent会自动接收并执行任务

## 常见问题

### Q: 如何获取Anthropic API Key？

访问 [Anthropic Console](https://console.anthropic.com/) 注册账号并创建API Key。

### Q: Agent无法连接到服务器？

检查：
1. iTeam服务器是否运行在 `http://localhost:3000`
2. API Key是否正确
3. 防火墙设置

### Q: Claude Code CLI无法执行任务？

检查：
1. `claude --version` 命令是否可用
2. `ANTHROPIC_API_KEY` 环境变量是否设置
3. API Key是否有效

### Q: 如何查看详细日志？

1. 使用开发模式启动：`./start-agent.sh --dev`
2. 在应用内查看"执行日志"面板
3. 打开开发者工具查看控制台

## 下一步

- 📖 阅读完整的 [使用文档](README.md)
- 🔧 了解如何[自定义任务类型](README.md#支持的任务类型)
- 🏗️ 查看 [项目结构](README.md#项目结构)
- 🐛 [报告问题](../README.md)

## 工作流程示例

### 示例 1: 自动生成代码

在iTeam中创建任务：
```json
{
  "type": "code_generation",
  "title": "创建用户登录组件",
  "description": "创建一个React登录组件，包含用户名和密码输入框",
  "workDir": "/path/to/your/project"
}
```

Agent会自动：
1. 接收任务
2. 调用Claude Code生成代码
3. 将结果反馈给服务器

### 示例 2: 修复Bug

```json
{
  "type": "bug_fix",
  "title": "修复登录按钮无响应问题",
  "description": "修复LoginButton组件点击无反应的bug",
  "file": "src/components/LoginButton.tsx",
  "workDir": "/path/to/your/project"
}
```

### 示例 3: 代码审查

```json
{
  "type": "code_review",
  "title": "审查用户管理模块",
  "files": ["src/user/UserService.ts", "src/user/UserController.ts"],
  "workDir": "/path/to/your/project"
}
```

---

**需要帮助？** 查看 [完整文档](README.md) 或提交Issue
