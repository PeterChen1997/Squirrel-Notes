import "dotenv/config";
import pg from "pg";
import { v4 as uuidv4 } from "uuid";

const { Pool } = pg;

// 数据库连接池
let pool: pg.Pool;

declare global {
  var __db_pool: pg.Pool | undefined;
}

// 在开发环境中使用全局变量避免热重载时重复创建连接池
if (process.env.NODE_ENV === "production") {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
} else {
  if (!global.__db_pool) {
    global.__db_pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  pool = global.__db_pool;
}

export { pool };

// 数据库初始化函数
export async function initDatabase() {
  try {
    // 创建UUID扩展（如果不存在）
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 创建用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        avatar_url VARCHAR(500),
        anonymous_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建会话表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建匿名用户表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anonymous_users (
        id VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建学习主题表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_topics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        categories JSONB DEFAULT '[]',
        user_id VARCHAR(100),
        is_demo BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 创建知识点表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(200),
        content TEXT NOT NULL,
        category VARCHAR(100) DEFAULT '默认',
        tags JSONB DEFAULT '[]',
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
    `);

    // 创建媒体文件表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media_files (
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
    `);

    // 添加缺失的字段（迁移逻辑）
    await migrateDatabase();

    // 创建示例数据
    await createDemoData();

    // 创建更新时间触发器
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // 为相关表添加更新时间触发器
    const tables = ["users", "learning_topics", "knowledge_points"];
    for (const table of tables) {
      await pool.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log("数据库初始化完成");
  } catch (error) {
    console.error("数据库初始化失败:", error);
    throw error;
  }
}

// 用户数据类型
export interface User {
  id?: string;
  email: string;
  password_hash: string;
  name?: string;
  avatar_url?: string;
  anonymous_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

// 用户会话数据类型
export interface UserSession {
  id: string;
  user_id: string;
  expires_at: Date;
  created_at?: Date;
}

// 匿名用户数据类型
export interface AnonymousUser {
  id: string;
  created_at?: Date;
  last_active?: Date;
}

// 学习主题数据类型
export interface LearningTopic {
  id?: string;
  name: string;
  description?: string;
  categories: string[];
  user_id?: string;
  is_demo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// 知识点数据类型
export interface KnowledgePoint {
  id?: string;
  title?: string;
  content: string;
  category: string;
  tags: string[];
  keywords: string[];
  importance: number;
  confidence: number;
  learning_topic_id?: string;
  related_ids: string[];
  attachments: MediaAttachment[];
  processing_status: string;
  user_id?: string;
  is_demo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// 媒体附件数据类型
export interface MediaAttachment {
  id: string;
  type: "audio" | "video" | "image";
  url: string;
  duration_ms?: number;
  size_bytes?: number;
  transcript?: {
    text: string;
    language: string;
    confidence: number;
    segments: Array<{
      start_ms: number;
      end_ms: number;
      text: string;
    }>;
  };
  thumbnails?: string[];
  bookmarks?: Array<{
    ts_ms: number;
    label: string;
  }>;
}

// 媒体文件数据类型
export interface MediaFile {
  id?: string;
  knowledge_point_id: string;
  type: "audio" | "video" | "image";
  filename: string;
  url: string;
  size_bytes?: number;
  duration_ms?: number;
  transcript?: any;
  thumbnails?: string[];
  bookmarks?: Array<{ ts_ms: number; label: string }>;
  processing_status: string;
  created_at?: Date;
}

// === 学习主题相关操作 ===

// 创建学习主题
export async function createLearningTopic(
  topic: Omit<LearningTopic, "id" | "created_at" | "updated_at">
) {
  const result = await pool.query(
    `INSERT INTO learning_topics (name, description, categories, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      topic.name,
      topic.description,
      JSON.stringify(topic.categories),
      topic.user_id,
    ]
  );
  return result.rows[0] as LearningTopic;
}

// 获取所有学习主题
export async function getAllLearningTopics(userId?: string) {
  const query = userId
    ? "SELECT * FROM learning_topics WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC"
    : "SELECT * FROM learning_topics ORDER BY created_at DESC";
  const params = userId ? [userId] : [];

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    ...row,
    categories: Array.isArray(row.categories)
      ? row.categories
      : JSON.parse(row.categories || "[]"),
  })) as LearningTopic[];
}

// 获取学习主题
export async function getLearningTopic(id: string) {
  const result = await pool.query(
    "SELECT * FROM learning_topics WHERE id = $1",
    [id]
  );
  if (result.rows.length === 0) return undefined;

  const row = result.rows[0];
  return {
    ...row,
    categories: Array.isArray(row.categories)
      ? row.categories
      : JSON.parse(row.categories || "[]"),
  } as LearningTopic;
}

// === 知识点相关操作 ===

// 创建知识点
export async function createKnowledgePoint(
  point: Omit<KnowledgePoint, "id" | "created_at" | "updated_at">
) {
  const result = await pool.query(
    `INSERT INTO knowledge_points (title, content, category, tags, keywords, importance, confidence, learning_topic_id, related_ids, attachments, processing_status, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      point.title,
      point.content,
      point.category,
      JSON.stringify(point.tags),
      JSON.stringify(point.keywords),
      point.importance,
      point.confidence,
      point.learning_topic_id,
      JSON.stringify(point.related_ids),
      JSON.stringify(point.attachments),
      point.processing_status,
      point.user_id,
    ]
  );
  const row = result.rows[0];
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || "[]"),
    keywords: Array.isArray(row.keywords)
      ? row.keywords
      : JSON.parse(row.keywords || "[]"),
    related_ids: Array.isArray(row.related_ids)
      ? row.related_ids
      : JSON.parse(row.related_ids || "[]"),
    attachments: Array.isArray(row.attachments)
      ? row.attachments
      : JSON.parse(row.attachments || "[]"),
  } as KnowledgePoint;
}

// 获取知识点
export async function getKnowledgePoint(id: string) {
  const result = await pool.query(
    "SELECT * FROM knowledge_points WHERE id = $1",
    [id]
  );
  if (result.rows.length === 0) return undefined;

  const row = result.rows[0];
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || "[]"),
    keywords: Array.isArray(row.keywords)
      ? row.keywords
      : JSON.parse(row.keywords || "[]"),
    related_ids: Array.isArray(row.related_ids)
      ? row.related_ids
      : JSON.parse(row.related_ids || "[]"),
    attachments: Array.isArray(row.attachments)
      ? row.attachments
      : JSON.parse(row.attachments || "[]"),
  } as KnowledgePoint;
}

// 获取所有知识点
export async function getAllKnowledgePoints(userId?: string, topicId?: string) {
  let query = "SELECT * FROM knowledge_points WHERE 1=1";
  const params: any[] = [];
  let paramIndex = 1;

  if (userId) {
    query += ` AND (user_id = $${paramIndex} OR user_id IS NULL)`;
    params.push(userId);
    paramIndex++;
  }

  if (topicId) {
    query += ` AND learning_topic_id = $${paramIndex}`;
    params.push(topicId);
    paramIndex++;
  }

  query += " ORDER BY created_at DESC";

  const result = await pool.query(query, params);
  return result.rows.map((row) => ({
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || "[]"),
    keywords: Array.isArray(row.keywords)
      ? row.keywords
      : JSON.parse(row.keywords || "[]"),
    related_ids: Array.isArray(row.related_ids)
      ? row.related_ids
      : JSON.parse(row.related_ids || "[]"),
    attachments: Array.isArray(row.attachments)
      ? row.attachments
      : JSON.parse(row.attachments || "[]"),
  })) as KnowledgePoint[];
}

// 更新知识点
export async function updateKnowledgePoint(
  id: string,
  updates: Partial<KnowledgePoint>
) {
  const fields = Object.keys(updates).filter((key) => key !== "id");
  const values = fields.map((field) => {
    const value = updates[field as keyof KnowledgePoint];
    if (
      field === "tags" ||
      field === "keywords" ||
      field === "related_ids" ||
      field === "attachments"
    ) {
      return JSON.stringify(value);
    }
    return value;
  });
  const setClause = fields
    .map((field, index) => `${field} = $${index + 2}`)
    .join(", ");

  const result = await pool.query(
    `UPDATE knowledge_points SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  const row = result.rows[0];
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || "[]"),
    keywords: Array.isArray(row.keywords)
      ? row.keywords
      : JSON.parse(row.keywords || "[]"),
    related_ids: Array.isArray(row.related_ids)
      ? row.related_ids
      : JSON.parse(row.related_ids || "[]"),
    attachments: Array.isArray(row.attachments)
      ? row.attachments
      : JSON.parse(row.attachments || "[]"),
  } as KnowledgePoint;
}

// 搜索知识点
export async function searchKnowledgePoints(query: string, userId?: string) {
  const searchQuery = `
    SELECT * FROM knowledge_points 
    WHERE (content ILIKE $1 OR title ILIKE $1 OR category ILIKE $1)
    ${userId ? "AND (user_id = $2 OR user_id IS NULL)" : ""}
    ORDER BY created_at DESC
  `;
  const params = userId ? [`%${query}%`, userId] : [`%${query}%`];

  const result = await pool.query(searchQuery, params);
  return result.rows.map((row) => ({
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || "[]"),
    keywords: Array.isArray(row.keywords)
      ? row.keywords
      : JSON.parse(row.keywords || "[]"),
    related_ids: Array.isArray(row.related_ids)
      ? row.related_ids
      : JSON.parse(row.related_ids || "[]"),
    attachments: Array.isArray(row.attachments)
      ? row.attachments
      : JSON.parse(row.attachments || "[]"),
  })) as KnowledgePoint[];
}

// === 媒体文件相关操作 ===

// 创建媒体文件
export async function createMediaFile(
  file: Omit<MediaFile, "id" | "created_at">
) {
  const result = await pool.query(
    `INSERT INTO media_files (knowledge_point_id, type, filename, url, size_bytes, duration_ms, transcript, thumbnails, bookmarks, processing_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      file.knowledge_point_id,
      file.type,
      file.filename,
      file.url,
      file.size_bytes,
      file.duration_ms,
      JSON.stringify(file.transcript),
      JSON.stringify(file.thumbnails),
      JSON.stringify(file.bookmarks),
      file.processing_status,
    ]
  );
  return result.rows[0] as MediaFile;
}

// 获取知识点的媒体文件
export async function getMediaFilesByKnowledgePointId(
  knowledgePointId: string
) {
  const result = await pool.query(
    "SELECT * FROM media_files WHERE knowledge_point_id = $1 ORDER BY created_at ASC",
    [knowledgePointId]
  );
  return result.rows.map((row) => ({
    ...row,
    transcript:
      typeof row.transcript === "string"
        ? JSON.parse(row.transcript || "{}")
        : row.transcript,
    thumbnails: Array.isArray(row.thumbnails)
      ? row.thumbnails
      : JSON.parse(row.thumbnails || "[]"),
    bookmarks: Array.isArray(row.bookmarks)
      ? row.bookmarks
      : JSON.parse(row.bookmarks || "[]"),
  })) as MediaFile[];
}

// 更新媒体文件
export async function updateMediaFile(id: string, updates: Partial<MediaFile>) {
  const fields = Object.keys(updates).filter((key) => key !== "id");
  const values = fields.map((field) => {
    const value = updates[field as keyof MediaFile];
    if (
      field === "transcript" ||
      field === "thumbnails" ||
      field === "bookmarks"
    ) {
      return JSON.stringify(value);
    }
    return value;
  });
  const setClause = fields
    .map((field, index) => `${field} = $${index + 2}`)
    .join(", ");

  const result = await pool.query(
    `UPDATE media_files SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] as MediaFile;
}

// === 数据库迁移 ===

// 数据库迁移函数 - 添加缺失的字段
async function migrateDatabase() {
  try {
    // 检查并添加 is_demo 字段到 learning_topics 表
    const topicsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'learning_topics' AND column_name = 'is_demo'
    `);

    if (topicsColumns.rows.length === 0) {
      await pool.query(`
        ALTER TABLE learning_topics 
        ADD COLUMN is_demo BOOLEAN DEFAULT false
      `);
      console.log("添加 is_demo 字段到 learning_topics 表");
    }

    // 检查并添加 is_demo 字段到 knowledge_points 表
    const pointsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_points' AND column_name = 'is_demo'
    `);

    if (pointsColumns.rows.length === 0) {
      await pool.query(`
        ALTER TABLE knowledge_points 
        ADD COLUMN is_demo BOOLEAN DEFAULT false
      `);
      console.log("添加 is_demo 字段到 knowledge_points 表");
    }

    console.log("数据库迁移完成");
  } catch (error) {
    console.error("数据库迁移失败:", error);
    // 不抛出错误，让应用继续运行
  }
}

// === 用户认证相关操作 ===

// 创建用户
export async function createUser(
  user: Omit<User, "id" | "created_at" | "updated_at">
) {
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, avatar_url, anonymous_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      user.email,
      user.password_hash,
      user.name,
      user.avatar_url,
      user.anonymous_id,
    ]
  );
  return result.rows[0] as User;
}

// 根据邮箱获取用户
export async function getUserByEmail(email: string) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return result.rows[0] as User | undefined;
}

// 根据ID获取用户
export async function getUserById(id: string) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] as User | undefined;
}

// 创建用户会话
export async function createUserSession(session: UserSession) {
  const result = await pool.query(
    `INSERT INTO user_sessions (id, user_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [session.id, session.user_id, session.expires_at]
  );
  return result.rows[0] as UserSession;
}

// 获取用户会话
export async function getUserSession(sessionId: string) {
  const result = await pool.query(
    `SELECT us.*, u.email, u.name, u.avatar_url 
     FROM user_sessions us
     JOIN users u ON us.user_id = u.id
     WHERE us.id = $1 AND us.expires_at > NOW()`,
    [sessionId]
  );
  return result.rows[0] as
    | (UserSession & Pick<User, "email" | "name" | "avatar_url">)
    | undefined;
}

// 删除用户会话
export async function deleteUserSession(sessionId: string) {
  await pool.query("DELETE FROM user_sessions WHERE id = $1", [sessionId]);
}

// 创建匿名用户
export async function createAnonymousUser(id: string) {
  const result = await pool.query(
    `INSERT INTO anonymous_users (id) VALUES ($1)
     ON CONFLICT (id) DO UPDATE SET last_active = CURRENT_TIMESTAMP
     RETURNING *`,
    [id]
  );
  return result.rows[0] as AnonymousUser;
}

// 获取匿名用户
export async function getAnonymousUser(id: string) {
  const result = await pool.query(
    "SELECT * FROM anonymous_users WHERE id = $1",
    [id]
  );
  return result.rows[0] as AnonymousUser | undefined;
}

// 将匿名用户数据绑定到注册用户
export async function bindAnonymousDataToUser(
  anonymousId: string,
  userId: string
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 更新学习主题
    await client.query(
      `UPDATE learning_topics SET user_id = $1 WHERE user_id = $2`,
      [userId, anonymousId]
    );

    // 更新知识点
    await client.query(
      `UPDATE knowledge_points SET user_id = $1 WHERE user_id = $2`,
      [userId, anonymousId]
    );

    // 删除匿名用户记录
    await client.query("DELETE FROM anonymous_users WHERE id = $1", [
      anonymousId,
    ]);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// 创建示例数据
export async function createDemoData() {
  // 检查是否已有示例数据
  const existingTopics = await pool.query(
    "SELECT COUNT(*) FROM learning_topics WHERE is_demo = true"
  );

  if (parseInt(existingTopics.rows[0].count) > 0) {
    return; // 已有示例数据，跳过
  }

  // 创建示例学习主题
  const demoTopics = [
    {
      name: "网球技能",
      description: "网球技能学习记录",
      categories: ["基础动作", "发球技巧", "比赛战术"],
    },
    {
      name: "编程学习",
      description: "编程技能提升笔记",
      categories: ["前端开发", "后端开发", "数据库"],
    },
    {
      name: "英语学习",
      description: "英语技能提升记录",
      categories: ["口语练习", "语法学习", "单词记忆"],
    },
  ];

  for (const topic of demoTopics) {
    const topicResult = await pool.query(
      `INSERT INTO learning_topics (name, description, categories, user_id, is_demo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        topic.name,
        topic.description,
        JSON.stringify(topic.categories),
        "demo",
        true,
      ]
    );

    // 为每个主题创建示例知识点
    const samplePoints = [
      {
        title: `${topic.name}入门要点`,
        content: `这是关于${topic.name}的基础知识要点，包含核心概念和基本技能。`,
        category: topic.categories[0],
        tags: ["基础", "入门"],
        keywords: [topic.name, "基础"],
        importance: 4,
        confidence: 0.85,
      },
      {
        title: `${topic.name}进阶技巧`,
        content: `这是关于${topic.name}的进阶内容，适合有一定基础的学习者。`,
        category: topic.categories[1] || topic.categories[0],
        tags: ["进阶", "技巧"],
        keywords: [topic.name, "进阶"],
        importance: 3,
        confidence: 0.78,
      },
    ];

    for (const point of samplePoints) {
      await pool.query(
        `INSERT INTO knowledge_points (title, content, category, tags, keywords, importance, confidence, learning_topic_id, user_id, is_demo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          point.title,
          point.content,
          point.category,
          JSON.stringify(point.tags),
          JSON.stringify(point.keywords),
          point.importance,
          point.confidence,
          topicResult.rows[0].id,
          "demo",
          true,
        ]
      );
    }
  }
}
