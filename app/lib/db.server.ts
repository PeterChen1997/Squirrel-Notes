import "dotenv/config";
import pg from "pg";
import { v4 as uuidv4 } from "uuid";

// 开发环境导入会话调试工具
if (process.env.NODE_ENV !== "production") {
  import("./session-debug.server")
    .then(({ debugSessions }) => {
      // 启动时执行一次调试
      setTimeout(debugSessions, 2000);
    })
    .catch(console.error);
}

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
        ai_summary TEXT,
        user_id VARCHAR(100),
        is_demo BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, user_id)
      );
    `);

    // 创建标签表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        color VARCHAR(20) DEFAULT '#3B82F6',
        user_id VARCHAR(100),
        usage_count INTEGER DEFAULT 0,
        is_demo BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, user_id)
      );
    `);

    // 创建知识点表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(200),
        content TEXT NOT NULL,
        summary TEXT,
        tag_ids JSONB DEFAULT '[]',
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

    // 检查是否需要估算学习时长
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM knowledge_points WHERE study_duration_minutes IS NULL OR study_duration_minutes = 0`
      );

      const countWithoutDuration = parseInt(result.rows[0].count);
      if (countWithoutDuration > 0) {
        console.log(`📊 发现 ${countWithoutDuration} 个知识点需要估算学习时长，开始迁移...`);
        await estimateAllKnowledgePointsDuration();
        await updateAllTopicsLearningTime();
        console.log("✅ 学习时长迁移完成");
      }
    } catch (error) {
      console.error("⚠️ 学习时长迁移失败:", error);
    }
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
  ai_summary?: string;
  total_learning_minutes?: number; // 总学习时长（分钟）
  first_study_at?: Date; // 首次学习时间
  last_study_at?: Date; // 最后学习时间
  user_id?: string;
  is_demo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// 标签数据类型
export interface Tag {
  id?: string;
  name: string;
  color: string;
  user_id?: string;
  usage_count: number;
  is_demo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// 知识点数据类型
export interface KnowledgePoint {
  id?: string;
  title?: string;
  content: string;
  summary?: string;
  tag_ids: string[];
  tags?: Tag[]; // 关联的标签对象，用于显示
  keywords: string[];

  confidence: number;
  learning_topic_id?: string;
  related_ids: string[];
  attachments: MediaAttachment[];
  processing_status: string;
  study_duration_minutes?: number; // 学习时长（分钟）
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

// === 标签相关操作 ===

// 创建标签
export async function createTag(
  tag: Omit<Tag, "id" | "created_at" | "updated_at" | "usage_count">
) {
  try {
    const result = await pool.query(
      `INSERT INTO tags (name, color, user_id, is_demo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tag.name, tag.color, tag.user_id, tag.is_demo || false]
    );
    return result.rows[0] as Tag;
  } catch (error: any) {
    // 如果是唯一约束冲突，返回现有标签
    if (
      error.code === "23505" &&
      error.constraint === "tags_name_user_id_key"
    ) {
      const existing = await pool.query(
        "SELECT * FROM tags WHERE name = $1 AND user_id = $2",
        [tag.name, tag.user_id]
      );
      return existing.rows[0] as Tag;
    } else {
      throw error;
    }
  }
}

// 获取所有标签
export async function getAllTags(userId?: string) {
  const query = userId
    ? "SELECT * FROM tags WHERE user_id = $1 OR user_id IS NULL ORDER BY usage_count DESC, created_at DESC"
    : "SELECT * FROM tags ORDER BY usage_count DESC, created_at DESC";
  const params = userId ? [userId] : [];

  const result = await pool.query(query, params);
  return result.rows as Tag[];
}

// 根据ID获取标签
export async function getTagsByIds(tagIds: string[]) {
  if (tagIds.length === 0) return [];

  const query = `SELECT * FROM tags WHERE id = ANY($1)`;
  const result = await pool.query(query, [tagIds]);
  return result.rows as Tag[];
}

// 更新标签使用次数
export async function incrementTagUsage(tagId: string) {
  await pool.query(
    "UPDATE tags SET usage_count = usage_count + 1 WHERE id = $1",
    [tagId]
  );
}

// 批量创建或获取标签
export async function createOrGetTags(
  tagNames: string[],
  userId?: string
): Promise<Tag[]> {
  const tags: Tag[] = [];
  const colors = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#6B7280",
  ];

  for (let i = 0; i < tagNames.length; i++) {
    const tagName = tagNames[i].trim();
    if (!tagName) continue;

    const color = colors[i % colors.length];
    const tag = await createTag({
      name: tagName,
      color,
      user_id: userId,
    });
    tags.push(tag);
  }

  return tags;
}

// === 学习主题相关操作 ===

// 创建学习主题
export async function createLearningTopic(
  topic: Omit<LearningTopic, "id" | "created_at" | "updated_at">
) {
  try {
    const result = await pool.query(
      `INSERT INTO learning_topics (name, description, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [topic.name, topic.description, topic.user_id]
    );
    return result.rows[0] as LearningTopic;
  } catch (error: any) {
    // 如果是唯一约束冲突，生成一个新的名称
    if (
      error.code === "23505" &&
      error.constraint === "learning_topics_name_user_id_key"
    ) {
      let counter = 1;
      let newName = `${topic.name} (${counter})`;

      // 循环直到找到一个不重复的名称
      while (true) {
        try {
          const result = await pool.query(
            `INSERT INTO learning_topics (name, description, user_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [newName, topic.description, topic.user_id]
          );
          return result.rows[0] as LearningTopic;
        } catch (innerError: any) {
          if (innerError.code === "23505") {
            counter++;
            newName = `${topic.name} (${counter})`;
          } else {
            throw innerError;
          }
        }
      }
    } else {
      throw error;
    }
  }
}

// 获取所有学习主题
export async function getAllLearningTopics(userId?: string) {
  const query = userId
    ? "SELECT * FROM learning_topics WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC"
    : "SELECT * FROM learning_topics ORDER BY created_at DESC";
  const params = userId ? [userId] : [];

  const result = await pool.query(query, params);
  return result.rows as LearningTopic[];
}

// 获取学习主题
export async function getLearningTopic(id: string) {
  const result = await pool.query(
    "SELECT * FROM learning_topics WHERE id = $1",
    [id]
  );
  if (result.rows.length === 0) return undefined;

  return result.rows[0] as LearningTopic;
}

// 更新学习主题
export async function updateLearningTopic(
  id: string,
  updates: Partial<LearningTopic>
) {
  const fields = Object.keys(updates).filter(
    (key) => key !== "id" && key !== "created_at" && key !== "updated_at"
  );
  const values = fields.map((field) => updates[field as keyof LearningTopic]);
  const setClause = fields
    .map((field, index) => `${field} = $${index + 2}`)
    .join(", ");

  const result = await pool.query(
    `UPDATE learning_topics SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  return result.rows[0] as LearningTopic;
}

// === 知识点相关操作 ===

// 创建知识点
export async function createKnowledgePoint(
  point: Omit<KnowledgePoint, "id" | "created_at" | "updated_at" | "tags">
) {
  const result = await pool.query(
    `INSERT INTO knowledge_points (title, content, summary, tag_ids, keywords, importance, confidence, learning_topic_id, related_ids, attachments, processing_status, study_duration_minutes, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      point.title,
      point.content,
      point.summary,
      JSON.stringify(point.tag_ids),
      JSON.stringify(point.keywords),
      3, // 固定默认值
      point.confidence,
      point.learning_topic_id,
      JSON.stringify(point.related_ids),
      JSON.stringify(point.attachments),
      point.processing_status,
      point.study_duration_minutes || 0,
      point.user_id,
    ]
  );
  const row = result.rows[0];
  const knowledgePoint = {
    ...row,
    tag_ids: Array.isArray(row.tag_ids)
      ? row.tag_ids
      : JSON.parse(row.tag_ids || "[]"),
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

  // 获取关联的标签
  if (knowledgePoint.tag_ids.length > 0) {
    knowledgePoint.tags = await getTagsByIds(knowledgePoint.tag_ids);
    // 更新标签使用次数
    for (const tagId of knowledgePoint.tag_ids) {
      await incrementTagUsage(tagId);
    }
  }

  // 如果有关联的学习主题，异步更新主题AI概览
  if (row.learning_topic_id) {
    updateTopicOverviewAsync(row.learning_topic_id).catch((error) =>
      console.error("更新主题概览失败:", error)
    );
  }

  return knowledgePoint;
}

// 获取知识点
export async function getKnowledgePoint(id: string, userId?: string) {
  const query = userId
    ? "SELECT * FROM knowledge_points WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)"
    : "SELECT * FROM knowledge_points WHERE id = $1";
  const params = userId ? [id, userId] : [id];

  const result = await pool.query(query, params);
  if (result.rows.length === 0) return undefined;

  const row = result.rows[0];
  const knowledgePoint = {
    ...row,
    tag_ids: Array.isArray(row.tag_ids)
      ? row.tag_ids
      : JSON.parse(row.tag_ids || "[]"),
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

  // 获取关联的标签
  if (knowledgePoint.tag_ids.length > 0) {
    knowledgePoint.tags = await getTagsByIds(knowledgePoint.tag_ids);
  } else {
    knowledgePoint.tags = [];
  }

  return knowledgePoint;
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
  const knowledgePoints = result.rows.map((row) => ({
    ...row,
    tag_ids: Array.isArray(row.tag_ids)
      ? row.tag_ids
      : JSON.parse(row.tag_ids || "[]"),
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

  // 为每个知识点获取关联的标签
  for (const point of knowledgePoints) {
    if (point.tag_ids.length > 0) {
      point.tags = await getTagsByIds(point.tag_ids);
    } else {
      point.tags = [];
    }
  }

  return knowledgePoints;
}

// 更新知识点
export async function updateKnowledgePoint(
  id: string,
  updates: Partial<KnowledgePoint>
) {
  const fields = Object.keys(updates).filter(
    (key) => key !== "id" && key !== "tags"
  );
  const values = fields.map((field) => {
    const value = updates[field as keyof KnowledgePoint];
    if (
      field === "tag_ids" ||
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
  const knowledgePoint = {
    ...row,
    tag_ids: Array.isArray(row.tag_ids)
      ? row.tag_ids
      : JSON.parse(row.tag_ids || "[]"),
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

  // 获取关联的标签
  if (knowledgePoint.tag_ids.length > 0) {
    knowledgePoint.tags = await getTagsByIds(knowledgePoint.tag_ids);
  } else {
    knowledgePoint.tags = [];
  }

  // 如果有关联的学习主题，异步更新主题AI概览
  if (row.learning_topic_id) {
    updateTopicOverviewAsync(row.learning_topic_id).catch((error) =>
      console.error("更新主题概览失败:", error)
    );
  }

  return knowledgePoint;
}

// === 学习时长管理函数 ===

// 更新知识点学习时长
export async function updateKnowledgePointStudyDuration(
  knowledgePointId: string,
  durationMinutes: number
) {
  const result = await pool.query(
    `UPDATE knowledge_points
     SET study_duration_minutes = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [durationMinutes, knowledgePointId]
  );

  if (result.rows.length === 0) {
    throw new Error("知识点不存在");
  }

  const knowledgePoint = result.rows[0] as KnowledgePoint;

  // 如果知识点关联了主题，更新主题的总学习时长
  if (knowledgePoint.learning_topic_id) {
    await updateTopicLearningTime(knowledgePoint.learning_topic_id);
  }

  return knowledgePoint;
}

// 更新主题的总学习时长和时间范围
export async function updateTopicLearningTime(topicId: string) {
  // 计算该主题下所有知识点的总学习时长和时间范围
  const result = await pool.query(
    `SELECT
       COALESCE(SUM(study_duration_minutes), 0) as total_minutes,
       MIN(created_at) as first_study_at,
       MAX(created_at) as last_study_at,
       COUNT(*) as knowledge_count
     FROM knowledge_points
     WHERE learning_topic_id = $1`,
    [topicId]
  );

  if (result.rows.length > 0) {
    const { total_minutes, first_study_at, last_study_at } = result.rows[0];

    await pool.query(
      `UPDATE learning_topics
       SET
         total_learning_minutes = $1,
         first_study_at = $2,
         last_study_at = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [total_minutes, first_study_at, last_study_at, topicId]
    );
  }
}

// 估算学习时长（基于内容长度和复杂度）
export function estimateStudyDuration(content: string): number {
  const contentLength = content.length;

  // 基础时长估算逻辑
  if (contentLength < 100) {
    return 5; // 短内容，5分钟
  } else if (contentLength < 300) {
    return 10; // 中等偏短，10分钟
  } else if (contentLength < 600) {
    return 20; // 中等长度，20分钟
  } else if (contentLength < 1000) {
    return 30; // 较长内容，30分钟
  } else {
    // 长内容，每200字符增加5分钟，最大60分钟
    return Math.min(60, 30 + Math.floor((contentLength - 1000) / 200) * 5);
  }
}


// 为所有没有学习时长的知识点估算时长
export async function estimateAllKnowledgePointsDuration() {
  const result = await pool.query(
    `SELECT id, content, study_duration_minutes
     FROM knowledge_points
     WHERE study_duration_minutes IS NULL OR study_duration_minutes = 0`
  );

  console.log(`找到 ${result.rows.length} 个需要估算学习时长的知识点`);

  for (const point of result.rows) {
    try {
      const estimatedMinutes = estimateStudyDuration(point.content || "");
      await updateKnowledgePointStudyDuration(point.id, estimatedMinutes);
      console.log(`知识点 ${point.id} 估算学习时长: ${estimatedMinutes} 分钟`);
    } catch (error) {
      console.error(`估算知识点 ${point.id} 学习时长失败:`, error);
    }
  }
}

// 批量更新所有主题的学习时长（用于数据迁移）
export async function updateAllTopicsLearningTime() {
  const topicsResult = await pool.query("SELECT id FROM learning_topics");

  for (const topic of topicsResult.rows) {
    try {
      await updateTopicLearningTime(topic.id);
      console.log(`已更新主题 ${topic.id} 的学习时长`);
    } catch (error) {
      console.error(`更新主题 ${topic.id} 学习时长失败:`, error);
    }
  }
}

// 搜索知识点
export async function searchKnowledgePoints(query: string, userId?: string) {
  const searchQuery = `
    SELECT * FROM knowledge_points 
    WHERE (content ILIKE $1 OR title ILIKE $1)
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

// 更新学习主题AI概览
export async function updateTopicAISummary(topicId: string, aiSummary: string) {
  await pool.query(
    `UPDATE learning_topics 
     SET ai_summary = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [aiSummary, topicId]
  );
}

// 异步更新主题概览（在后台执行）
export async function updateTopicOverviewAsync(topicId: string) {
  try {
    // 导入生成概览函数，避免循环依赖
    const { generateTopicOverview } = await import("~/lib/openai.server");

    // 获取主题信息
    const topic = await getLearningTopic(topicId);
    if (!topic) return;

    // 获取该主题下的所有知识点
    const knowledgePoints = await pool.query(
      `SELECT title, content, keywords, created_at 
       FROM knowledge_points 
       WHERE learning_topic_id = $1 
       ORDER BY created_at DESC`,
      [topicId]
    );

    const points = knowledgePoints.rows.map((row) => ({
      title: row.title,
      content: row.content,
      keywords: Array.isArray(row.keywords)
        ? row.keywords
        : JSON.parse(row.keywords || "[]"),
      created_at: row.created_at,
      tags: [], // 暂时设置为空数组，避免类型错误
    }));

    // 生成AI概览
    const overview = await generateTopicOverview(topic.name, points);

    // 保存概览到数据库
    const summaryText = JSON.stringify({
      summary: overview.summary,
      key_insights: overview.key_insights,
      learning_progress: overview.learning_progress,
      next_steps: overview.next_steps,
      confidence: overview.confidence,
      updated_at: new Date().toISOString(),
    });

    await updateTopicAISummary(topicId, summaryText);

    console.log(`主题 ${topic.name} 的AI概览已更新`);
  } catch (error) {
    console.error("更新主题概览失败:", error);
  }
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

    // 检查并添加 summary 字段到 knowledge_points 表
    const summaryColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_points' AND column_name = 'summary'
    `);

    if (summaryColumns.rows.length === 0) {
      await pool.query(`
        ALTER TABLE knowledge_points ADD COLUMN summary TEXT;
      `);
      console.log("已添加 summary 字段到 knowledge_points 表");
    }

    // 检查并添加 ai_summary 字段到 learning_topics 表
    const aiSummaryColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'learning_topics' AND column_name = 'ai_summary'
    `);

    if (aiSummaryColumns.rows.length === 0) {
      await pool.query(`
        ALTER TABLE learning_topics ADD COLUMN ai_summary TEXT;
      `);
      console.log("已添加 ai_summary 字段到 learning_topics 表");
    }

    // 添加学习时长相关字段
    // 为 learning_topics 表添加 total_learning_minutes 字段
    const totalLearningMinutesColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'learning_topics' AND column_name = 'total_learning_minutes'
    `);
    if (totalLearningMinutesColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE learning_topics
        ADD COLUMN total_learning_minutes INTEGER DEFAULT 0
      `);
      console.log("添加 total_learning_minutes 字段到 learning_topics 表");
    }

    // 为 learning_topics 表添加 first_study_at 和 last_study_at 字段
    const firstStudyAtColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'learning_topics' AND column_name = 'first_study_at'
    `);
    if (firstStudyAtColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE learning_topics
        ADD COLUMN first_study_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN last_study_at TIMESTAMP WITH TIME ZONE
      `);
      console.log("添加 first_study_at 和 last_study_at 字段到 learning_topics 表");
    }

    // 为 knowledge_points 表添加 study_duration_minutes 字段
    const studyDurationColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'knowledge_points' AND column_name = 'study_duration_minutes'
    `);
    if (studyDurationColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE knowledge_points
        ADD COLUMN study_duration_minutes INTEGER DEFAULT 0
      `);
      console.log("添加 study_duration_minutes 字段到 knowledge_points 表");
    }

    // 删除 categories 列（如果存在）
    await pool.query(`
      ALTER TABLE learning_topics DROP COLUMN IF EXISTS categories;
    `);

    // 检查并添加唯一约束到 learning_topics 表
    const constraintExists = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'learning_topics' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'learning_topics_name_user_id_key'
    `);

    if (constraintExists.rows.length === 0) {
      try {
        await pool.query(`
          ALTER TABLE learning_topics 
          ADD CONSTRAINT learning_topics_name_user_id_key UNIQUE (name, user_id)
        `);
        console.log("添加 learning_topics 表的唯一约束");
      } catch (error) {
        console.log("唯一约束可能已存在或有重复数据，跳过添加");
      }
    }

    // 检查并添加 tag_ids 字段到 knowledge_points 表
    const tagIdsColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_points' AND column_name = 'tag_ids'
    `);

    if (tagIdsColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE knowledge_points 
        ADD COLUMN tag_ids JSONB DEFAULT '[]'
      `);
      console.log("添加 tag_ids 字段到 knowledge_points 表");

      // 标签系统已就位
    }

    // 删除不再需要的 categories 字段
    try {
      await pool.query(`
        ALTER TABLE learning_topics 
        DROP COLUMN IF EXISTS categories
      `);
      console.log("删除 learning_topics 表中的 categories 字段");
    } catch (error) {
      console.log("categories 字段可能已经不存在，跳过删除");
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
  try {
    const result = await pool.query(
      `SELECT us.*, u.email, u.name, u.avatar_url 
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       WHERE us.id = $1 AND us.expires_at > CURRENT_TIMESTAMP`,
      [sessionId]
    );

    // 如果会话过期，自动清理
    if (result.rows.length === 0) {
      // 尝试删除过期的会话（如果存在）
      await pool.query(
        "DELETE FROM user_sessions WHERE id = $1 AND expires_at <= CURRENT_TIMESTAMP",
        [sessionId]
      );
    }

    return result.rows[0] as
      | (UserSession & Pick<User, "email" | "name" | "avatar_url">)
      | undefined;
  } catch (error) {
    console.error("查询用户会话失败:", error);
    return undefined;
  }
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

    // 更新学习主题（只绑定非demo数据）
    await client.query(
      `UPDATE learning_topics SET user_id = $1 WHERE user_id = $2 AND is_demo = false`,
      [userId, anonymousId]
    );

    // 更新知识点（只绑定非demo数据）
    await client.query(
      `UPDATE knowledge_points SET user_id = $1 WHERE user_id = $2 AND is_demo = false`,
      [userId, anonymousId]
    );

    // 删除匿名用户的demo数据
    await client.query(
      `DELETE FROM knowledge_points WHERE user_id = $1 AND is_demo = true`,
      [anonymousId]
    );

    await client.query(
      `DELETE FROM learning_topics WHERE user_id = $1 AND is_demo = true`,
      [anonymousId]
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

  console.log("创建demo数据...");

  // 创建示例学习主题
  const demoTopics = [
    {
      name: "网球技能",
      description: "网球技能学习记录，包含发球、击球、战术等技巧",
    },
    {
      name: "编程学习",
      description: "编程技能提升笔记，涵盖前端、后端、算法等知识",
    },
  ];

  for (const topic of demoTopics) {
    const topicResult = await pool.query(
      `INSERT INTO learning_topics (name, description, user_id, is_demo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [topic.name, topic.description, "demo", true]
    );

    // 为每个主题创建示例知识点
    const samplePoints =
      topic.name === "网球技能"
        ? [
            {
              title: "网球正手击球技巧",
              content: `今天网球课学习了正手击球的关键要点：

1. 站位：双脚与肩同宽，侧身对网
2. 握拍：大陆式握拍，拇指和食指形成V字
3. 引拍：拍头指向后场，肘部弯曲
4. 击球点：在身体前方，腰部高度
5. 随挥：击球后拍子继续向前上方挥动

重点是要保持身体平衡，转动腰部带动手臂发力。`,
              tags: ["正手", "击球", "技巧"],
              keywords: ["网球", "正手", "击球", "站位", "握拍"],
              importance: 5,
              confidence: 0.9,
            },
            {
              title: "网球发球动作要领",
              content: `网球发球是比赛中的关键环节，今天重点练习了：

发球动作分解：
1. 准备姿势：双脚分开，前脚脚尖指向目标
2. 抛球：左手抛球，球要抛到右肩上方
3. 引拍：右手引拍，拍头指向地面
4. 击球：在最高点击球，手腕发力
5. 随挥：击球后拍子继续向前

注意事项：抛球要稳定，击球时机要准确，力量要适中。`,
              tags: ["发球", "动作", "要领"],
              keywords: ["网球", "发球", "抛球", "击球", "随挥"],
              importance: 4,
              confidence: 0.85,
            },
          ]
        : [
            {
              title: "React Hooks 使用技巧",
              content: `今天学习了React Hooks的核心概念和使用技巧：

useState Hook:
- 用于管理组件状态
- 返回当前状态和更新函数
- 每次渲染都会创建新的状态

useEffect Hook:
- 用于处理副作用
- 依赖数组为空时只执行一次
- 可以返回清理函数

useContext Hook:
- 用于跨组件传递数据
- 避免props drilling
- 配合Provider使用

重点是要理解Hooks的执行时机和依赖关系。`,
              tags: ["React", "Hooks", "前端"],
              keywords: [
                "React",
                "Hooks",
                "useState",
                "useEffect",
                "useContext",
              ],
              importance: 5,
              confidence: 0.92,
            },
            {
              title: "JavaScript 异步编程",
              content: `深入学习了JavaScript异步编程的几种方式：

1. Promise:
- 解决回调地狱问题
- 支持链式调用
- 有then、catch、finally方法

2. async/await:
- 基于Promise的语法糖
- 代码更易读
- 错误处理用try-catch

3. Generator函数:
- 可以暂停和恢复执行
- 配合yield使用
- 适合处理复杂异步流程

实际项目中async/await最常用，代码简洁易懂。`,
              tags: ["JavaScript", "异步", "编程"],
              keywords: [
                "JavaScript",
                "Promise",
                "async",
                "await",
                "Generator",
              ],
              importance: 4,
              confidence: 0.88,
            },
          ];

    for (const point of samplePoints) {
      await pool.query(
        `INSERT INTO knowledge_points (title, content, keywords, importance, confidence, learning_topic_id, user_id, is_demo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          point.title,
          point.content,
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
