# 认证 API

## 用户注册

创建新用户账户。

```http
POST /api/auth/register
```

### 请求体

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱地址，需唯一 |
| username | string | ✅ | 用户名，需唯一 |
| password | string | ✅ | 密码，至少6位 |

### 成功响应

```json
{
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "avatar": null,
    "role": "user"
  }
}
```

### 错误响应

| 状态码 | 错误信息 |
|-------|---------|
| 400 | 请填写所有必填字段 |
| 400 | 邮箱格式不正确 |
| 400 | 密码长度至少6位 |
| 400 | 该邮箱已被注册 |
| 400 | 该用户名已被使用 |

---

## 用户登录

使用邮箱/用户名和密码登录。

```http
POST /api/auth/login
```

### 请求体

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱或用户名 |
| password | string | ✅ | 密码 |

### 成功响应

```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "avatar": null,
    "role": "user"
  }
}
```

### 错误响应

| 状态码 | 错误信息 |
|-------|---------|
| 400 | 请填写邮箱和密码 |
| 401 | 用户名或密码错误 |

---

## 获取当前用户

获取当前登录用户信息。

```http
GET /api/auth/me
```

### 请求头

```http
Authorization: Bearer <token>
```

### 成功响应

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "avatar": null,
  "role": "user",
  "createdAt": "2026-01-17T07:00:00.000Z"
}
```

### 错误响应

| 状态码 | 错误信息 |
|-------|---------|
| 401 | 未授权访问，请先登录 |
| 401 | Token 无效或已过期 |
| 404 | 用户不存在 |

---

## 用户登出

登出当前用户（客户端应清除本地 Token）。

```http
POST /api/auth/logout
```

### 请求头

```http
Authorization: Bearer <token>
```

### 成功响应

```json
{
  "message": "登出成功"
}
```

---

## JWT Token 结构

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "username": "username",
  "role": "user",
  "iat": 1737100800,
  "exp": 1737705600
}
```

| 字段 | 说明 |
|------|------|
| userId | 用户 ID |
| email | 用户邮箱 |
| username | 用户名 |
| role | 用户角色 (user/admin) |
| iat | Token 签发时间 |
| exp | Token 过期时间 (7天后) |
