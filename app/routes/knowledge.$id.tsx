import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useState } from "react";
import { Link, useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  getKnowledgePoint,
  updateKnowledgePoint,
  getAllKnowledgePoints,
  getLearningTopic,
  getAllLearningTopics,
} from "~/lib/db.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import { json, redirect } from "@remix-run/node";
import Header from "~/components/Header";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const id = params.id;
  if (!id) {
    throw new Response("Not Found", { status: 404 });
  }

  const { user, anonymousId, isDemo } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const knowledgePoint = await getKnowledgePoint(id);
  if (!knowledgePoint) {
    throw new Response("Not Found", { status: 404 });
  }

  // 获取关联的学习主题
  const learningTopic = knowledgePoint.learning_topic_id
    ? await getLearningTopic(knowledgePoint.learning_topic_id)
    : null;

  // 获取所有学习主题供用户选择
  const allTopics = await getAllLearningTopics(userId);

  // 获取相关知识点（同类别的其他知识点）
  const relatedPoints = await getAllKnowledgePoints(userId);
  const filteredRelated = relatedPoints
    .filter((p) => p.id !== id && p.category === knowledgePoint.category)
    .slice(0, 5);

  const headers: HeadersInit = {};
  if (anonymousId && !user) {
    headers["Set-Cookie"] = createAnonymousCookie(anonymousId);
  }

  return json({
    knowledgePoint,
    learningTopic,
    relatedPoints: filteredRelated,
    allTopics,
    user,
    isDemo,
  }, { headers });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const id = params.id;
  if (!id) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update") {
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const category = formData.get("category") as string;
    const tags = formData.get("tags") as string;
    const importance = parseInt(formData.get("importance") as string);
    const learningTopicId = formData.get("learningTopicId") as string;

    await updateKnowledgePoint(id, {
      title,
      content,
      category,
      tags: tags
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t)
        : [],
      importance,
      learning_topic_id: learningTopicId || null,
    });

    return redirect(`/knowledge/${id}`);
  }

  return null;
};

export default function KnowledgeDetailPage() {
  const { knowledgePoint, learningTopic, relatedPoints, allTopics, user, isDemo } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(knowledgePoint.title || "");
  const [editedContent, setEditedContent] = useState(knowledgePoint.content);
  const [editedCategory, setEditedCategory] = useState(knowledgePoint.category);
  const [editedTags, setEditedTags] = useState(knowledgePoint.tags.join(", "));
  const [editedImportance, setEditedImportance] = useState(
    knowledgePoint.importance
  );

  const isSubmitting = navigation.state === "submitting";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getImportanceStars = (importance: number) => {
    return "⭐".repeat(importance);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* 顶部导航 */}
      <nav className="px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <Link
            to="/knowledge"
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
            <span>返回知识库</span>
          </Link>
          <div className="flex items-center space-x-4">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-all"
              >
                编辑
              </button>
            )}
            <Link
              to="/"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              + 新增笔记
            </Link>
          </div>
        </div>
      </nav>

      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 主要内容区域 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {isEditing ? (
                  /* 编辑模式 */
                  <Form method="post" className="p-6">
                    <input type="hidden" name="intent" value="update" />

                    <div className="space-y-6">
                      {/* 标题编辑 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          标题
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-semibold"
                          placeholder="输入标题..."
                        />
                      </div>

                      {/* 内容编辑 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          内容
                        </label>
                        <textarea
                          name="content"
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          rows={12}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="输入学习内容..."
                          required
                        />
                      </div>

                      {/* 分类和标签 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            分类
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
                            placeholder="标签1, 标签2"
                          />
                        </div>
                      </div>

                      {/* 重要程度 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          重要程度
                        </label>
                        <div className="flex items-center space-x-4">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <label
                              key={level}
                              className="flex items-center cursor-pointer"
                            >
                              <input
                                type="radio"
                                name="importance"
                                value={level}
                                checked={editedImportance === level}
                                onChange={(e) =>
                                  setEditedImportance(parseInt(e.target.value))
                                }
                                className="sr-only"
                              />
                              <span
                                className={`text-2xl ${
                                  editedImportance >= level
                                    ? "text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              >
                                ⭐
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex space-x-4 pt-4 border-t">
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
                            setIsEditing(false);
                            setEditedTitle(knowledgePoint.title || "");
                            setEditedContent(knowledgePoint.content);
                            setEditedCategory(knowledgePoint.category);
                            setEditedTags(knowledgePoint.tags.join(", "));
                            setEditedImportance(knowledgePoint.importance);
                          }}
                          className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </Form>
                ) : (
                  /* 查看模式 */
                  <div className="p-6">
                    {/* 头部信息 */}
                    <div className="mb-6 pb-6 border-b border-gray-100">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                        {knowledgePoint.title || "无标题"}
                      </h1>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
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
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          创建于{" "}
                          {knowledgePoint.created_at &&
                            formatDate(knowledgePoint.created_at.toString())}
                        </div>

                        <div className="flex items-center">
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
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                          {knowledgePoint.category}
                        </div>

                        <div className="flex items-center">
                          <span className="mr-2">重要程度:</span>
                          {getImportanceStars(knowledgePoint.importance)}
                        </div>
                      </div>
                    </div>

                    {/* 内容 */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        学习内容
                      </h3>
                      <div className="prose max-w-none">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {knowledgePoint.content}
                        </p>
                      </div>
                    </div>

                    {/* 标签 */}
                    {knowledgePoint.tags.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          标签
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {knowledgePoint.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 关键词 */}
                    {knowledgePoint.keywords.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          关键词
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {knowledgePoint.keywords.map((keyword, index) => (
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
                )}
              </div>
            </div>

            {/* 侧边栏 */}
            <div className="space-y-6">
              {/* 学习主题信息 */}
              {learningTopic && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">📖</span>
                    学习主题
                  </h3>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">
                      {learningTopic.name}
                    </h4>
                    {learningTopic.description && (
                      <p className="text-sm text-blue-700 mt-1">
                        {learningTopic.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 相关知识点 */}
              {relatedPoints.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🔗</span>
                    相关知识点
                  </h3>
                  <div className="space-y-3">
                    {relatedPoints.map((point) => (
                      <Link
                        key={point.id}
                        to={`/knowledge/${point.id}`}
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-all"
                      >
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {point.title || "无标题"}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {point.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-blue-600">
                            {point.category}
                          </span>
                          <span className="text-xs">
                            {getImportanceStars(point.importance)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 快速操作 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  快速操作
                </h3>
                <div className="space-y-3">
                  <Link
                    to="/"
                    className="block w-full px-4 py-3 bg-blue-500 text-white text-center rounded-lg hover:bg-blue-600 transition-all"
                  >
                    + 新增笔记
                  </Link>
                  <Link
                    to="/knowledge"
                    className="block w-full px-4 py-3 border border-gray-300 text-gray-700 text-center rounded-lg hover:bg-gray-50 transition-all"
                  >
                    浏览知识库
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
