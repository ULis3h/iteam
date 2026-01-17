# F006 - 文档中心

## 基本信息

| 属性 | 值 |
|------|-----|
| 功能编号 | F006 |
| 功能名称 | 文档中心 |
| 所属模块 | 知识管理 |
| 实现版本 | 0.1.0 |
| 实现日期 | 2026-01-17 |
| 状态 | 🚧 基础实现 |

## 功能概述

团队知识库管理，存储开发规范、技术积累、Bug 修复记录等文档。

## 用户故事

1. 作为用户，我希望浏览团队文档，以便学习和参考
2. 作为用户，我希望按分类筛选文档，以便快速找到所需内容
3. 作为用户，我希望搜索文档，以便精确查找
4. 作为用户，我希望创建新文档，以便记录知识

## 当前实现

### 已完成
- [x] 文档列表页面
- [x] 分类筛选
- [x] 搜索功能
- [x] 文档数据模型
- [x] 文档 API 端点

### 待完成
- [ ] 创建文档表单
- [ ] 编辑文档功能
- [ ] Markdown 编辑器
- [ ] 文档详情页
- [ ] 标签管理

## 数据模型

```prisma
model Document {
  id        String   @id @default(uuid())
  title     String
  content   String
  category  String   @default("other") // standard, tech, bug, other
  tags      String   @default("[]") // JSON array
  author    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 文档分类

| 分类代码 | 显示名称 | 图标 | 颜色 | 说明 |
|---------|---------|------|------|------|
| standard | 开发规范 | Code | 蓝色 | 编码规范、流程规范 |
| tech | 技术积累 | FileCode | 紫色 | 技术文章、学习笔记 |
| bug | Bug修复 | Bug | 红色 | Bug 记录和修复方案 |
| other | 其他 | FileText | 绿色 | 其他类型文档 |

## API 端点

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| GET | `/api/documents` | 获取所有文档 | ✅ |
| GET | `/api/documents/:id` | 获取文档详情 | ✅ |
| POST | `/api/documents` | 创建文档 | ✅ |
| PUT | `/api/documents/:id` | 更新文档 | ✅ |
| DELETE | `/api/documents/:id` | 删除文档 | ✅ |

## UI 特性

### 搜索
- 支持标题搜索
- 支持内容搜索
- 支持标签搜索

### 分类筛选
- 顶部分类标签栏
- 显示各分类文档数量
- 点击切换分类

### 文档卡片
- 分类图标和颜色指示
- 标题和内容预览
- 标签展示
- 作者和日期信息

## 后续规划

### Phase 1: 完善基础功能
- 新建文档表单
- Markdown 编辑器集成
- 文档详情页

### Phase 2: 增强功能
- 文档版本历史
- 协作编辑（多设备）
- 文档模板

### Phase 3: 智能功能
- AI 自动分类
- 相关文档推荐
- 智能搜索
