import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useState } from "react";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import {
  createKnowledgePoint,
  getLearningTopic,
  getAllLearningTopics,
  createLearningTopic,
} from "~/lib/db.server";
import { analyzeLearningNote } from "~/lib/openai.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const content = url.searchParams.get("content");
  const topicId = url.searchParams.get("topicId");

  if (!content) {
    return redirect("/");
  }

  // 获取现有分类信息
  const topics = await getAllLearningTopics();
  const selectedTopic = topicId ? await getLearningTopic(topicId) : null;
  const existingCategories = topics.flatMap((t) => t.categories);

  // AI 分析内容
  const analysis = await analyzeLearningNote(
    content,
    selectedTopic?.name,
    existingCategories
  );

  return {
    content,
    topicId,
    selectedTopic,
    topics,
    analysis,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "analyze") {
    // 处理分析请求 - 跳转到progress页面
    const content = formData.get("content") as string;
    const topicId = formData.get("topicId") as string;

    if (!content) {
      return redirect("/");
    }

    const params = new URLSearchParams();
    params.set("content", content);
    if (topicId) params.set("topicId", topicId);

    return redirect(`/progress?${params.toString()}`);
  }

  if (intent === "save") {
    // 处理保存请求
    const content = formData.get("content") as string;
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const topicId = formData.get("topicId") as string;
    const tags = formData.get("tags") as string;
    const importance = parseInt(formData.get("importance") as string);

    if (!content || !title) {
      throw new Error("缺少必要信息");
    }

    // 如果没有选择主题，创建一个默认的学习主题
    let learningTopicId = topicId;
    if (!learningTopicId && category !== "默认") {
      const newTopic = await createLearningTopic({
        name: category,
        description: `自动创建的学习主题：${category}`,
        categories: [category],
      });
      learningTopicId = newTopic.id!;
    }

    // 创建知识点
    const knowledgePoint = await createKnowledgePoint({
      title,
      content,
      category,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      keywords: [],
      importance,
      confidence: 0.8,
      learning_topic_id: learningTopicId,
      related_ids: [],
      attachments: [],
      processing_status: "completed",
    });

    return redirect(`/knowledge/${knowledgePoint.id}`);
  }

  return null;
};

export default function AnalyzePage() {
  const { content, analysis, selectedTopic } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [editedTitle, setEditedTitle] = useState(analysis.title);
  const [editedCategory, setEditedCategory] = useState(analysis.category);
  const [editedTags, setEditedTags] = useState(
    analysis.suggested_tags.join(", ")
  );
  const [editedImportance, setEditedImportance] = useState(analysis.importance);

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* 顶部导航 */}
      <nav className="px-6 py-4 border-b border-gray-100">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <Link
            to="/"
            className="flex items-center space-x-3 text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>返回首页</span>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📚</div>
            <h1 className="text-xl font-bold text-gray-900">AI 分析结果</h1>
          </div>
        </div>
      </nav>

      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：原始内容 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                原始内容
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {content}
                </p>
              </div>

              {selectedTopic && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>选择的学习主题：</strong>
                    {selectedTopic.name}
                  </p>
                </div>
              )}
            </div>

            {/* 右侧：AI 分析结果和编辑 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-6 flex items-center">
                <span className="mr-2">🐿️</span>
                小松鼠的分析结果
                <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                  置信度: {Math.round(analysis.confidence * 100)}%
                </span>
              </h3>

              <Form method="post" className="space-y-6">
                <input type="hidden" name="content" value={content} />
                <input
                  type="hidden"
                  name="topicId"
                  value={selectedTopic?.id || ""}
                />
                <input type="hidden" name="intent" value="save" />

                {/* 标题编辑 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    笔记标题
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* 分类编辑 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类
                    {analysis.confidence < 0.7 && (
                      <span className="ml-2 text-orange-600 text-xs">
                        (AI 不确定，请确认)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* 重要程度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重要程度
                  </label>
                  <div className="flex items-center space-x-4">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <label key={level} className="flex items-center">
                        <input
                          type="radio"
                          name="importance"
                          value={level}
                          checked={editedImportance === level}
                          onChange={(e) =>
                            setEditedImportance(parseInt(e.target.value))
                          }
                          className="mr-2"
                        />
                        <span className="flex items-center">
                          {"⭐".repeat(level)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 标签编辑 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签 (用逗号分隔)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={editedTags}
                    onChange={(e) => setEditedTags(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如：技术要点, 实践经验"
                  />
                </div>

                {/* 智能标签展示 */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="text-sm font-medium text-amber-900 mb-3 flex items-center">
                    <span className="mr-2">🏷️</span>
                    智能标签
                  </h4>
                  
                  <div className="space-y-3">
                    {/* 分类标签 */}
                    <div>
                      <span className="text-xs text-amber-700 font-medium">分类：</span>
                      <span className="ml-2 px-3 py-1 bg-amber-200 text-amber-800 text-sm rounded-full">
                        📚 {analysis.category}
                      </span>
                    </div>
                    
                    {/* 重要程度 */}
                    <div>
                      <span className="text-xs text-amber-700 font-medium">重要程度：</span>
                      <span className="ml-2 px-3 py-1 bg-orange-200 text-orange-800 text-sm rounded-full">
                        {"⭐".repeat(analysis.importance)} ({analysis.importance}/5)
                      </span>
                    </div>

                    {/* 关键词标签 */}
                    {analysis.keywords.length > 0 && (
                      <div>
                        <span className="text-xs text-amber-700 font-medium block mb-2">关键词：</span>
                        <div className="flex flex-wrap gap-2">
                          {analysis.keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"
                            >
                              🔑 {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 建议标签 */}
                    {analysis.suggested_tags.length > 0 && (
                      <div>
                        <span className="text-xs text-amber-700 font-medium block mb-2">建议标签：</span>
                        <div className="flex flex-wrap gap-2">
                          {analysis.suggested_tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                            >
                              🌱 {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI 摘要 */}
                {analysis.summary && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                      <span className="mr-2">📝</span>
                      AI 摘要
                    </h4>
                    <p className="text-sm text-blue-800 leading-relaxed">{analysis.summary}</p>
                  </div>
                )}

                                {/* 提交按钮 */}
                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-6 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        小松鼠收藏中...
                      </div>
                    ) : (
                      <span className="flex items-center justify-center">
                        <span className="mr-2">🌰</span>
                        收藏到知识库
                      </span>
                    )}
                  </button>
                  
                  <Link
                    to="/"
                    className="px-6 py-3 border border-amber-300 text-amber-700 font-semibold rounded-xl hover:bg-amber-50 transition-all text-center"
                  >
                    <span className="flex items-center justify-center">
                      <span className="mr-2">🔄</span>
                      重新记录
                    </span>
                  </Link>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
