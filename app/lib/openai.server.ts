import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_ENDPOINT,
});

// 学习笔记分析结果接口
export interface LearningNoteAnalysis {
  title: string;
  keywords: string[];
  importance: number;
  confidence: number;
  related_topics: string[];
  summary: string;
  suggested_tags: string[]; // AI建议的标签，包含原来的分类概念
  // 新增主题相关字段
  recommended_topic: {
    name: string;
    description: string;
    confidence: number; // 0-1，推荐该主题的置信度
    is_new: boolean; // 是否为新创建的主题
    existing_topic_id?: string; // 如果匹配到现有主题，返回ID
  };
}

// 分析学习笔记内容
export async function analyzeLearningNote(
  content: string,
  existingTopics: {
    id: string;
    name: string;
    description?: string;
  }[] = [],
  existingTags: { name: string; usage_count: number }[] = []
): Promise<LearningNoteAnalysis> {
  try {
    const existingTopicsText =
      existingTopics.length > 0
        ? existingTopics
            .map(
              (t) =>
                `ID: ${t.id}, 名称: ${t.name}, 描述: ${
                  t.description || "无描述"
                }`
            )
            .join("\n")
        : "无";

    const existingTagsText =
      existingTags.length > 0
        ? existingTags
            .sort((a, b) => b.usage_count - a.usage_count)
            .slice(0, 20) // 只显示前20个最常用的标签
            .map((t) => `${t.name} (使用${t.usage_count}次)`)
            .join(", ")
        : "无";

    const prompt = `
你是一个智能学习助手，擅长分析和整理学习笔记内容。请分析以下学习内容：

内容：${content}

现有学习主题：
${existingTopicsText}

现有标签（按使用频率排序）：${existingTagsText}

请按照以下JSON格式返回分析结果：

{
  "title": "为这个学习内容生成一个简洁有意义的标题（10-20字）",
  "keywords": ["提取3-5个关键词"],
  "importance": 4,
  "confidence": 0.85,
  "related_topics": ["相关的学习主题"],
  "summary": "用1-2句话总结核心要点",
  "suggested_tags": ["建议的标签，优先使用现有标签，包含分类、技能、主题等维度"],
  "recommended_topic": {
    "name": "主题名称",
    "description": "主题描述（简洁明了）",
    "confidence": 0.85,
    "is_new": false,
    "existing_topic_id": "如果匹配到现有主题则填写其ID，否则为null"
  }
}

主题匹配规则：
1. 仔细分析内容，判断是否属于现有学习主题
2. 如果内容明显属于某个现有主题，设置is_new为false，并提供existing_topic_id
3. 如果内容不属于任何现有主题，创建新主题，设置is_new为true，existing_topic_id为null
4. 如果不确定，优先匹配最相关的现有主题
5. 新主题名称应该简洁（2-6个字），描述应该准确概括主题范围

标签建议规则：
1. 优先使用现有的高频标签，避免创建重复标签
2. 建议3-6个标签，涵盖不同维度：技能类型、难度级别、应用领域等
3. 如果现有标签不足以描述内容，可以建议新标签
4. 标签应该简洁明了，2-4个字为佳

分析要求：
1. 识别学习领域（技能、理论、实践等）
2. 提取核心概念和关键信息
3. 评估内容的重要程度（1-5分）
4. 给出分析置信度（0-1之间）
5. 推荐相关主题和标签
6. 智能匹配或创建学习主题

如果内容不够明确或太简短，confidence应该较低（<0.7），建议使用通用标签。
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "你是一个专业的学习内容分析专家，擅长智能分类和信息提取。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("AI分析返回为空");
    }

    let cleanContent = responseContent.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const analysis = JSON.parse(cleanContent) as LearningNoteAnalysis;

    // 验证必要字段
    if (!analysis.title) {
      throw new Error("AI分析结果缺少必要字段");
    }

    // 设置默认值
    return {
      title: analysis.title,
      keywords: analysis.keywords || [],
      importance: Math.min(5, Math.max(1, analysis.importance || 3)),
      confidence: Math.min(1, Math.max(0, analysis.confidence || 0.5)),
      related_topics: analysis.related_topics || [],
      summary: analysis.summary || "",
      suggested_tags:
        analysis.suggested_tags?.length > 0
          ? analysis.suggested_tags
          : ["学习笔记"],
      recommended_topic: analysis.recommended_topic || {
        name: "默认",
        description: "默认学习主题",
        confidence: 0.5,
        is_new: false,
        existing_topic_id: undefined,
      },
    };
  } catch (error) {
    console.error("学习笔记分析失败:", error);
    // 返回默认分析结果
    return {
      title: "学习笔记",
      keywords: [],
      importance: 3,
      confidence: 0.5,
      related_topics: [],
      summary: "AI分析暂时不可用，已保存为学习笔记",
      suggested_tags: ["学习笔记"],
      recommended_topic: {
        name: "默认",
        description: "默认学习主题",
        confidence: 0.5,
        is_new: false,
        existing_topic_id: undefined,
      },
    };
  }
}

// 语音转文字（使用OpenAI Whisper）
export async function transcribeAudio(
  audioBuffer: Buffer,
  language = "zh"
): Promise<{
  text: string;
  language: string;
  confidence: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}> {
  try {
    // 创建一个FormData对象来上传音频文件
    const formData = new FormData();
    const audioFile = new File([audioBuffer], "audio.webm", {
      type: "audio/webm",
    });
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");
    formData.append("language", language);
    formData.append("response_format", "verbose_json");

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: language,
      response_format: "verbose_json",
    });

    return {
      text: response.text,
      language: language,
      confidence: 0.9, // Whisper一般有较高的准确度
      segments: response.segments?.map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
    };
  } catch (error) {
    console.error("语音转写失败:", error);
    throw new Error("语音转写服务暂时不可用");
  }
}

// 从转写文本中提取关键信息
export async function extractKeyPointsFromTranscript(
  transcript: string,
  context?: string
): Promise<{
  keyPoints: string[];
  actionItems: string[];
  questions: string[];
  summary: string;
}> {
  try {
    const prompt = `
请分析以下语音转写内容，提取关键信息：

转写内容：${transcript}
${context ? `上下文：${context}` : ""}

请按照JSON格式返回：

{
  "keyPoints": ["关键要点1", "关键要点2"],
  "actionItems": ["需要练习的动作或要点"],
  "questions": ["需要进一步了解的问题"],
  "summary": "整体总结"
}

要求：
1. 识别重要的技术要点或概念
2. 提取可操作的练习项目
3. 发现疑问或需要深入的地方
4. 生成简洁的总结
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "你是一个学习内容分析专家，擅长从语音记录中提取关键学习要点。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("关键信息提取失败");
    }

    let cleanContent = responseContent.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    }

    const result = JSON.parse(cleanContent);

    return {
      keyPoints: result.keyPoints || [],
      actionItems: result.actionItems || [],
      questions: result.questions || [],
      summary: result.summary || "无法生成摘要",
    };
  } catch (error) {
    console.error("关键信息提取失败:", error);
    return {
      keyPoints: [],
      actionItems: [],
      questions: [],
      summary: "关键信息提取暂时不可用",
    };
  }
}

// 主题概览结果接口
export interface TopicOverview {
  summary: string;
  key_insights: string[];
  practical_points?: string[];
  experience_summary?: string[];
  learning_progress: string;
  next_steps: string[];
  confidence: number;
}

// 生成主题AI概览
export async function generateTopicOverview(
  topicName: string,
  knowledgePoints: Array<{
    title?: string;
    content: string;
    keywords: string[];
    created_at?: Date;
  }>
): Promise<TopicOverview> {
  if (!openai) {
    return {
      summary: `${topicName} 学习总结`,
      key_insights: ["知识点收集中..."],
      learning_progress: "学习进行中",
      next_steps: ["继续添加学习笔记"],
      confidence: 0.5,
    };
  }

  if (knowledgePoints.length === 0) {
    return {
      summary: `${topicName} 学习主题已创建，等待添加第一条学习笔记。`,
      key_insights: ["暂无学习内容"],
      learning_progress: "刚开始学习",
      next_steps: ["添加第一条学习笔记", "制定学习计划"],
      confidence: 0.3,
    };
  }

  try {
    const knowledgeContent = knowledgePoints
      .map(
        (point, index) =>
          `${index + 1}. ${point.title || "笔记"}:\n${
            point.content
          }\n关键词: ${point.keywords.join(", ")}`
      )
      .join("\n\n");

    const prompt = `你是一个专业的学习导师，请为"${topicName}"主题进行全面的知识结构化梳理。

基于以下${knowledgePoints.length}条学习笔记，进行深度分析：

${knowledgePoints
  .map(
    (point, index) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 笔记 ${index + 1}: ${point.title || "无标题"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **完整内容：**
${point.content}

🔑 **关键词：** ${point.keywords?.join(", ") || "无"}
🏷️ **标签：** ${
      point.tags
        ?.map((tag) => (typeof tag === "string" ? tag : tag.name))
        .join(", ") || "无"
    }
📅 **记录时间：** ${
      point.created_at
        ? new Date(point.created_at).toLocaleDateString()
        : "未知"
    }`
  )
  .join("\n")}

你是专业学习导师，请进行深度知识梳理，确保每个笔记的核心内容都在概览中有所体现。返回JSON格式：

{
  "summary": "主题的完整知识框架概述（不少于100字）",
  "key_insights": ["核心要点1（具体详细）", "核心要点2", "核心要点3", "核心要点4", "核心要点5"],
  "practical_points": ["实用技巧1", "实用技巧2", "实用技巧3"],
  "experience_summary": ["经验总结1", "经验总结2"],
  "next_steps": ["深入方向1", "深入方向2", "深入方向3"],
  "learning_progress": "详细的学习现状分析和掌握程度评估",
  "confidence": 0.9
}

要求：
- 全面性：每个笔记的核心要点都必须体现
- 结构化：将知识点组织成逻辑框架，必要时拆分多种功能点，如网球正反手分开整理等
- 实用性：能替代重新阅读所有笔记
- 深度解读：分析知识点之间的关联`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一个专业的学习助手，善于分析学习内容并提供有价值的概览和建议。请始终用中文回答，返回标准的JSON格式。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("AI 返回了空的响应");
    }

    // 解析 JSON 响应
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("无法解析 AI 返回的 JSON");
    }

    const overview: TopicOverview = JSON.parse(jsonMatch[0]);

    // 验证返回的数据结构
    if (!overview.summary || !Array.isArray(overview.key_insights)) {
      throw new Error("AI 返回的数据格式不正确");
    }

    return overview;
  } catch (error) {
    console.error("生成主题概览失败:", error);

    // 返回备用概览
    return {
      summary: `${topicName} - 包含 ${knowledgePoints.length} 条学习笔记，涵盖了多个方面的知识点。`,
      key_insights: knowledgePoints
        .slice(0, 4)
        .map((p) => p.title || "重要知识点"),
      practical_points: ["整理现有笔记", "建立知识体系"],
      experience_summary: ["需要系统化学习"],
      learning_progress: `已收集 ${knowledgePoints.length} 条笔记，学习进展良好`,
      next_steps: [
        "整理和复习现有笔记",
        "深入探索相关主题",
        "建立完整知识框架",
      ],
      confidence: 0.6,
    };
  }
}
