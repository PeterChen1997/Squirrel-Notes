# 松鼠随记 🐿️

一个智能学习笔记应用，帮助你像松鼠收集坚果一样系统地整理和管理知识要点。采用AI驱动的智能标签系统，让知识管理更加简单高效。

## ✨ 功能特性

### 🎯 核心功能
- **📝 智能笔记录入**：支持文字输入和语音转文字，快速记录学习内容
- **🤖 AI 智能分析**：自动分析内容，提取关键信息和智能标签推荐
- **🏷️ 智能标签系统**：AI基于现有标签智能推荐，统一管理知识分类
- **🌳 知识树管理**：自动创建和管理学习主题，构建系统化知识结构
- **🔍 智能搜索**：按主题、标签快速查找知识点，支持关联度排序
- **✏️ 即时编辑**：知识点内容、标题、主题随时可编辑
- **📊 学习统计**：查看学习进度和知识点分布

### 🎨 用户体验
- **🍃 清新界面**：采用松鼠主题的温馨设计，琥珀色调营造舒适学习氛围
- **🌙 深色模式支持**：完美的明暗模式切换，保护视力
- **📱 响应式设计**：完美适配桌面和移动设备
- **⚡ 渐进式Web应用(PWA)**：支持添加到桌面，离线使用
- **👤 用户系统**：支持注册登录，也可匿名使用体验
- **🎯 简化交互**：移除不必要的评分功能，专注内容本身

## 🛠 技术栈

- **前端框架**：Remix (React Router) - 现代全栈React框架
- **数据库**：PostgreSQL - 可靠的关系型数据库
- **AI服务**：OpenAI GPT-4 & Whisper - 内容分析和语音转文字
- **样式设计**：Tailwind CSS - 实用优先的CSS框架
- **类型安全**：TypeScript - 类型安全的JavaScript
- **认证系统**：Cookie-based sessions - 安全的用户认证

## 🚀 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 12+
- OpenAI API Key

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd learning-note
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env` 文件：
   ```env
   # PostgreSQL 数据库连接
   DATABASE_URL=postgresql://username:password@localhost:5432/learning_note_db
   
   # OpenAI API 配置
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_API_ENDPOINT=https://api.openai.com/v1
   ```

4. **启动数据库**
   确保PostgreSQL服务运行，应用会自动创建所需的表结构

5. **开发模式运行**
   ```bash
   npm run dev
   ```
   
   访问 http://localhost:5173

6. **生产环境部署**
   ```bash
   npm run build
   npm start
   ```

## 📱 功能页面

### 🏠 首页 (`/`)
- **笔记输入区**：支持文字输入和语音录制
- **即时保存**：点击保存按钮开始AI分析
- **用户状态**：显示登录状态和demo提示

### 📋 知识库 (`/knowledge`)
- **知识点列表**：按主题分组展示所有知识点
- **智能筛选**：按主题、分类搜索和过滤
- **创建主题**：快速创建新的学习主题
- **重要度标识**：星级显示知识点重要程度

### 📄 知识详情 (`/knowledge/:id`)
- **完整内容**：查看知识点的详细信息和智能标签
- **编辑功能**：一键编辑标题、内容、标签和学习主题
- **智能关联**：显示最多3个高度相关的知识点，按相关性智能排序
- **标签展示**：直观的彩色标签显示，支持快速筛选

### 🌳 知识树 (`/topics`)
- **主题概览**：可视化展示所有学习主题，避免信息过载
- **统计信息**：每个主题的知识点数量和标签分布
- **智能排序**：按活跃度和最近更新时间排序
- **快速导航**：点击主题快速查看相关内容

### ⚡ 处理页面 (`/progress`)
- **分析进度**：实时显示AI分析状态
- **自动跳转**：完成后自动跳转到分析结果

### 🎯 分析结果 (`/analyze`)
- **AI分析结果**：智能提取的标题和推荐标签
- **标签智能推荐**：基于现有标签使用频率的智能推荐
- **编辑确认**：可以修改分析结果再保存，支持新增自定义标签
- **一键保存**：确认后直接保存到知识库

### 👤 用户系统
- **注册登录** (`/auth/register`, `/auth/login`)：安全的用户认证
- **匿名体验**：无需注册即可体验所有功能
- **数据迁移**：注册后自动绑定匿名期间的非demo数据

## 🗄 数据库架构

### 核心表结构

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  avatar_url VARCHAR(500),
  anonymous_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 学习主题表
CREATE TABLE learning_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  categories JSONB DEFAULT '[]',
  user_id VARCHAR(100),
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, user_id) -- 用户内主题名称唯一
);

-- 标签表 (新增)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',
  user_id VARCHAR(100),
  usage_count INTEGER DEFAULT 0,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, user_id) -- 用户内标签名称唯一
);

-- 知识点表
CREATE TABLE knowledge_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200),
  content TEXT NOT NULL,
  tag_ids JSONB DEFAULT '[]', -- 关联标签ID数组
  keywords JSONB DEFAULT '[]',
  importance INTEGER DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
  confidence DECIMAL(3,2) DEFAULT 0.0,
  learning_topic_id UUID REFERENCES learning_topics(id) ON DELETE SET NULL,
  related_ids JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  processing_status VARCHAR(50) DEFAULT 'completed',
  user_id VARCHAR(100),
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 媒体文件表
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_point_id UUID NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('audio', 'video', 'image')),
  filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT,
  duration_ms INTEGER,
  transcript JSONB,
  thumbnails JSONB DEFAULT '[]',
  bookmarks JSONB DEFAULT '[]',
  processing_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户会话表
CREATE TABLE user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 匿名用户表
CREATE TABLE anonymous_users (
  id VARCHAR(255) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 设计理念

### 🐿️ 松鼠主题
- **收集习性**：像松鼠收集坚果一样收集知识
- **系统整理**：建立知识仓库，方便后续查找
- **温馨色调**：琥珀色系营造舒适的学习环境

### 🧠 AI驱动
- **智能分析**：自动提取关键信息和推荐标签
- **标签推荐**：基于现有标签使用频率的智能推荐算法
- **主题推荐**：根据内容智能创建或推荐学习主题
- **语音支持**：使用Whisper模型转换语音为文字
- **关联度分析**：智能发现知识点间的关联关系

### 📱 渐进式体验
- **匿名友好**：无需注册即可体验完整功能
- **渐进增强**：注册后享受数据同步和备份
- **PWA支持**：可安装到设备，获得原生应用体验

## 🔧 开发指南

### 项目结构
```
app/
├── components/          # 可复用组件
│   └── Header.tsx      # 统一的页面头部
├── lib/                # 核心库文件
│   ├── db.server.ts    # 数据库操作
│   ├── openai.server.ts # AI服务集成
│   └── auth.server.ts  # 用户认证
├── routes/             # 页面路由
│   ├── _index.tsx      # 首页
│   ├── knowledge/      # 知识库相关页面
│   ├── auth/          # 认证相关页面
│   └── ...
└── root.tsx           # 应用根组件
```

### 关键特性
- **自动数据库迁移**：应用启动时自动检查和创建必要的表结构，无缝升级
- **智能数据迁移**：自动将旧的分类+标签系统迁移到新的标签系统
- **会话管理**：基于Cookie的安全会话系统
- **错误处理**：完善的错误处理和用户友好的错误提示
- **性能优化**：数据库连接池、智能查询优化、相关度排序
- **类型安全**：完整的TypeScript类型定义
- **AI智能推荐**：基于使用频率的标签推荐算法

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

**🐿️ 让我们一起像松鼠一样，系统地收集和整理知识吧！**