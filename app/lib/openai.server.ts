import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_ENDPOINT,
});

// 学习笔记分析结果接口
export interface LearningNoteAnalysis {
  title: string;
  category: string;
  keywords: string[];
  importance: number;
  confidence: number;
  related_topics: string[];
  summary: string;
  suggested_tags: string[];
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
  existingTopics: { id: string; name: string; description?: string; categories: string[] }[] = [],
  existingCategories: string[] = []
): Promise<LearningNoteAnalysis> {
  try {
    const existingTopicsText = existingTopics.length > 0 
      ? existingTopics.map(t => `ID: ${t.id}, 名称: ${t.name}, 描述: ${t.description || '无描述'}`).join('\n')
      : '无';

    const prompt = `
你是一个智能学习助手，擅长分析和整理学习笔记内容。请分析以下学习内容：

内容：${content}

现有学习主题：
${existingTopicsText}

现有分类：${existingCategories.join(", ") || "无"}

请按照以下JSON格式返回分析结果：

{
  "title": "为这个学习内容生成一个简洁有意义的标题（10-20字）",
  "category": "选择最合适的分类（如果有已有分类就从中选择，否则创建新的）",
  "keywords": ["提取3-5个关键词"],
  "importance": 4,
  "confidence": 0.85,
  "related_topics": ["相关的学习主题"],
  "summary": "用1-2句话总结核心要点",
  "suggested_tags": ["建议的标签"],
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

分析要求：
1. 识别学习领域（技能、理论、实践等）
2. 提取核心概念和关键信息
3. 评估内容的重要程度（1-5分）
4. 给出分类置信度（0-1之间）
5. 推荐相关主题和标签
6. 智能匹配或创建学习主题

如果内容不够明确或太简短，confidence应该较低（<0.7），建议默认分类为"默认"。
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
    if (!analysis.title || !analysis.category) {
      throw new Error("AI分析结果缺少必要字段");
    }

    // 设置默认值
    return {
      title: analysis.title,
      category: analysis.category || "默认",
      keywords: analysis.keywords || [],
      importance: Math.min(5, Math.max(1, analysis.importance || 3)),
      confidence: Math.min(1, Math.max(0, analysis.confidence || 0.5)),
      related_topics: analysis.related_topics || [],
      summary: analysis.summary || "",
      suggested_tags: analysis.suggested_tags || [],
    };
  } catch (error) {
    console.error("学习笔记分析失败:", error);
    // 返回默认分析结果
    return {
      title: "学习笔记",
      category: "默认",
      keywords: [],
      importance: 3,
      confidence: 0.5,
      related_topics: [],
      summary: "AI分析暂时不可用，已保存到默认分类",
      suggested_tags: [],
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
