# F001 - 用户认证

## 基本信息

| 属性 | 值 |
|------|-----|
| 功能编号 | F001 |
| 功能名称 | 用户认证 |
| 所属模块 | 用户管理 |
| 实现版本 | 0.1.0 |
| 实现日期 | 2026-01-17 |
| 状态 | ✅ 完成 |

## 功能概述

提供用户注册、登录、登出功能，保护系统页面需要认证后才能访问。

## 用户故事

1. 作为新用户，我希望能够注册账户，以便使用系统功能
2. 作为已注册用户，我希望能够登录系统，以便管理我的设备
3. 作为已登录用户，我希望能够安全退出，以保护我的账户安全
4. 作为未登录用户，访问受保护页面时应被重定向到登录页

## 功能需求

### FR-001-01: 用户注册

**描述**: 新用户可以创建账户

**输入**:
- 用户名（必填，唯一）
- 邮箱（必填，唯一，有效格式）
- 密码（必填，至少6位）
- 确认密码（必填，与密码一致）

**处理**:
1. 验证所有必填字段
2. 验证邮箱格式
3. 验证密码长度
4. 验证密码一致性
5. 检查用户名/邮箱是否已存在
6. 使用 bcrypt 加密密码
7. 创建用户记录
8. 生成 JWT Token

**输出**:
- 成功：返回 Token 和用户信息，自动登录
- 失败：返回错误信息

### FR-001-02: 用户登录

**描述**: 已注册用户可以登录系统

**输入**:
- 邮箱或用户名（必填）
- 密码（必填）

**处理**:
1. 查找用户（支持邮箱或用户名）
2. 验证密码
3. 生成 JWT Token

**输出**:
- 成功：返回 Token 和用户信息
- 失败：返回"用户名或密码错误"

### FR-001-03: 用户登出

**描述**: 已登录用户可以退出系统

**处理**:
1. 清除本地存储的 Token
2. 重定向到登录页

### FR-001-04: 路由保护

**描述**: 未登录用户无法访问受保护页面

**处理**:
1. 检查 Token 是否存在且有效
2. 无效则重定向到登录页
3. 有效则允许访问

## 技术实现

### 后端

| 文件 | 说明 |
|------|------|
| `server/prisma/schema.prisma` | User 数据模型 |
| `server/src/middleware/auth.ts` | JWT 认证中间件 |
| `server/src/routes/auth.ts` | 认证 API 路由 |

### 前端

| 文件 | 说明 |
|------|------|
| `client/src/contexts/AuthContext.tsx` | 认证状态管理 |
| `client/src/pages/Login.tsx` | 登录页面 |
| `client/src/pages/Register.tsx` | 注册页面 |
| `client/src/components/ProtectedRoute.tsx` | 路由保护组件 |

### API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/me` | 获取当前用户 |

### 数据模型

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  password  String   // bcrypt hashed
  avatar    String?
  role      String   @default("user") // user, admin
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 安全措施

1. 密码使用 bcrypt 加盐哈希存储
2. JWT Token 7天有效期
3. Token 存储于 localStorage
4. 敏感 API 需要 Bearer Token

## UI 截图

### 登录页面
![登录页面](../../assets/screenshots/login.png)

### 注册页面
![注册页面](../../assets/screenshots/register.png)

## 测试用例

| 编号 | 场景 | 预期结果 |
|------|------|---------|
| TC-001-01 | 使用有效信息注册 | 注册成功，自动登录 |
| TC-001-02 | 使用已存在邮箱注册 | 显示"该邮箱已被注册" |
| TC-001-03 | 使用正确密码登录 | 登录成功，跳转首页 |
| TC-001-04 | 使用错误密码登录 | 显示"用户名或密码错误" |
| TC-001-05 | 未登录访问首页 | 重定向到登录页 |
| TC-001-06 | 点击退出登录 | 清除 Token，跳转登录页 |
