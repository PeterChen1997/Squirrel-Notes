import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useState } from "react";
import { Link, useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  getLearningTopic,
  getAllKnowledgePoints,
  getAllTags,
  updateLearningTopic,
  initDatabase,
} from "~/lib/db.server";
import { getCurrentUser } from "~/lib/auth.server";
import Header from "~/components/Header";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  await initDatabase();

  const topicId = params.id;
  if (!topicId) {
    throw new Response("Not Found", { status: 404 });
  }

  const {
    user,
    anonymousId,
    isDemo,
    headers: authHeaders,
  } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  // 获取学习主题
  const topic = await getLearningTopic(topicId);
  if (!topic) {
    throw new Response("Not Found", { status: 404 });
  }

  // 获取该主题下的所有知识点
  const knowledgePoints = await getAllKnowledgePoints(userId, topicId);

  // 获取所有标签
  const allTags = await getAllTags(userId);

  // 解析AI概要
  let aiOverview = null;
  if (topic.ai_summary) {
    try {
      aiOverview = JSON.parse(topic.ai_summary);
    } catch (error) {
      console.error(`解析主题 ${topic.name} 的AI概要失败:`, error);
    }
  }

  return json(
    {
      topic: {
        ...topic,
        aiOverview,
      },
      knowledgePoints,
      allTags,
      user,
      isDemo,
    },
    { headers: authHeaders }
  );
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await initDatabase();

  const topicId = params.id;
  if (!topicId) {
    throw new Response("Not Found", { status: 404 });
  }

  const { user, anonymousId } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update_topic") {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name?.trim()) {
      return json({ error: "主题名称不能为空" }, { status: 400 });
    }

    try {
      await updateLearningTopic(topicId, {
        name: name.trim(),
        description: description?.trim() || "",
      });

      // 确保重定向到正确的URL
      const redirectUrl = `/knowledge/topic/${topicId}`;
      console.log("重定向到:", redirectUrl);
      return redirect(redirectUrl);
    } catch (error) {
      console.error("更新主题失败:", error);
      return json({ error: "更新主题失败，请重试" }, { status: 500 });
    }
  }

  return json({ error: "未知操作" }, { status: 400 });
};

export default function TopicDetailPage() {
  const { topic, knowledgePoints, allTags, user, isDemo } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editedName, setEditedName] = useState(topic.name);
  const [editedDescription, setEditedDescription] = useState(
    topic.description || ""
  );
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());

  const isSubmitting = navigation.state === "submitting";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpand = (pointId: string) => {
    setExpandedPoints((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50">
      <Header user={user} isDemo={isDemo} />

      <div className="px-3 sm:px-6 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* 返回链接 */}
          <div className="mb-6">
            <Link
              to="/knowledge"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <svg
                className="w-4 h-4 mr-2"
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
              返回知识库
            </Link>
          </div>

          {/* 主题信息卡片 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
            {isEditingTopic ? (
              /* 编辑模式 */
              <Form method="post" className="p-6">
                <input type="hidden" name="intent" value="update_topic" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      主题名称 *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-semibold"
                      placeholder="输入主题名称..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      主题描述
                    </label>
                    <textarea
                      name="description"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入主题描述..."
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-6 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? "保存中..." : "保存更改"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTopic(false);
                      setEditedName(topic.name);
                      setEditedDescription(topic.description || "");
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                  >
                    取消
                  </button>
                </div>
              </Form>
            ) : (
              /* 查看模式 */
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center">
                      <span className="mr-3">📖</span>
                      {topic.name}
                    </h1>
                    {topic.description && (
                      <p className="text-gray-600 text-lg">
                        {topic.description}
                      </p>
                    )}
                    <div className="flex items-center text-sm text-gray-500 mt-3">
                      <span className="mr-4">
                        📊 {knowledgePoints.length} 个知识点
                      </span>
                      <span>
                        🕒 创建于{" "}
                        {formatDate(topic.created_at?.toString() || "")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingTopic(true)}
                    className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    编辑主题
                  </button>
                </div>

                {/* AI概要 */}
                {topic.aiOverview && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                      <span className="mr-2">🤖</span>
                      AI 学习概览
                      <span className="ml-auto px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        置信度 {Math.round(topic.aiOverview.confidence * 100)}%
                      </span>
                    </h3>

                    <p className="text-blue-800 mb-4 leading-relaxed">
                      {topic.aiOverview.summary}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 核心洞察 */}
                      {topic.aiOverview.key_insights &&
                        topic.aiOverview.key_insights.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                              💡 核心知识点
                            </h4>
                            <ul className="space-y-1">
                              {topic.aiOverview.key_insights.map(
                                (insight: string, index: number) => (
                                  <li
                                    key={index}
                                    className="flex items-start text-sm"
                                  >
                                    <span className="mr-2 text-blue-600 mt-1">
                                      •
                                    </span>
                                    <span className="text-blue-800">
                                      {insight}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      {/* 实用技巧 */}
                      {topic.aiOverview.practical_points &&
                        topic.aiOverview.practical_points.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                              ⚡ 实用技巧
                            </h4>
                            <ul className="space-y-1">
                              {topic.aiOverview.practical_points.map(
                                (point: string, index: number) => (
                                  <li
                                    key={index}
                                    className="flex items-start text-sm"
                                  >
                                    <span className="mr-2 text-green-600 mt-1">
                                      ▸
                                    </span>
                                    <span className="text-green-800">
                                      {point}
                                    </span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>

                    {/* 学习进度 */}
                    {topic.aiOverview.learning_progress && (
                      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                        <span className="text-blue-800 text-sm">
                          📊 {topic.aiOverview.learning_progress}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 知识点列表 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="mr-2">📚</span>
                知识点详情
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  {knowledgePoints.length} 个
                </span>
              </h2>
            </div>

            {knowledgePoints.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  还没有知识点
                </h3>
                <p className="text-gray-600 mb-6">
                  在这个主题下还没有任何学习笔记
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all"
                >
                  <span className="mr-2">+</span>
                  添加第一个笔记
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {knowledgePoints.map((point) => (
                  <div key={point.id} className="p-6">
                    {/* 知识点标题栏 */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => toggleExpand(point.id!)}
                        className="flex-1 text-left"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="mr-2 text-xl">
                            {expandedPoints.has(point.id!) ? "📖" : "📄"}
                          </span>
                          {point.title || "无标题"}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span>
                            🕒 {formatDate(point.created_at?.toString() || "")}
                          </span>
                          {point.tags && point.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <span>🏷️</span>
                              <span>
                                {point.tags
                                  .slice(0, 2)
                                  .map((tag) =>
                                    typeof tag === "string" ? tag : tag.name
                                  )
                                  .join(", ")}
                                {point.tags.length > 2 &&
                                  ` +${point.tags.length - 2}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => toggleExpand(point.id!)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          {expandedPoints.has(point.id!) ? "收起" : "展开"}
                        </button>
                        <Link
                          to={`/knowledge/${point.id}`}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          编辑
                        </Link>
                      </div>
                    </div>

                    {/* 知识点内容 - 展开时显示 */}
                    {expandedPoints.has(point.id!) && (
                      <div className="mt-4 pl-8 border-l-2 border-blue-200">
                        {/* AI摘要 */}
                        {point.summary && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                              <span className="mr-2">🤖</span>
                              AI 摘要
                            </h4>
                            <p className="text-blue-800 text-sm leading-relaxed">
                              {point.summary}
                            </p>
                          </div>
                        )}

                        {/* 学习内容 */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            📝 内容
                          </h4>
                          <div className="prose max-w-none">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                              {point.content}
                            </p>
                          </div>
                        </div>

                        {/* 标签和关键词 */}
                        <div className="space-y-3">
                          {point.tags && point.tags.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                🏷️ 标签
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {point.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                                  >
                                    {typeof tag === "string" ? tag : tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {point.keywords && point.keywords.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                🔑 关键词
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {point.keywords.map((keyword, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
