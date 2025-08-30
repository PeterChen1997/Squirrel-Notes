import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useState } from "react";
import { Link, useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  getKnowledgePoint,
  updateKnowledgePoint,
  getAllKnowledgePoints,
  getLearningTopic,
  getAllLearningTopics,
  getAllTags,
  createOrGetTags,
  createLearningTopic,
  initDatabase,
} from "~/lib/db.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import { json, redirect } from "@remix-run/node";
import Header from "~/components/Header";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  await initDatabase();

  const id = params.id;
  if (!id) {
    throw new Response("Not Found", { status: 404 });
  }

  const { user, anonymousId, isDemo } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const knowledgePoint = await getKnowledgePoint(id, userId);
  if (!knowledgePoint) {
    throw new Response("Not Found", { status: 404 });
  }

  // 获取关联的学习主题
  const learningTopic = knowledgePoint.learning_topic_id
    ? await getLearningTopic(knowledgePoint.learning_topic_id)
    : null;

  // 获取所有学习主题供用户选择
  const allTopics = await getAllLearningTopics(userId);

  // 获取相关知识点（有相同标签的其他知识点，最多3个）
  const relatedPoints = await getAllKnowledgePoints(userId);
  const filteredRelated = relatedPoints
    .filter((p) => {
      if (p.id === id) return false;
      // 检查是否有共同标签
      if (!knowledgePoint.tags || !p.tags) return false;
      const pointTagNames = knowledgePoint.tags.map((tag) =>
        typeof tag === "string" ? tag : tag.name
      );
      const pTagNames = p.tags.map((tag) =>
        typeof tag === "string" ? tag : tag.name
      );
      return pointTagNames.some((tag) => pTagNames.includes(tag));
    })
    .sort((a, b) => {
      // 按相关性排序：优先考虑同主题的，然后按重要度，最后按更新时间
      const aIsSameTopic =
        a.learning_topic_id === knowledgePoint.learning_topic_id;
      const bIsSameTopic =
        b.learning_topic_id === knowledgePoint.learning_topic_id;

      if (aIsSameTopic && !bIsSameTopic) return -1;
      if (!aIsSameTopic && bIsSameTopic) return 1;

      // 最后按更新时间排序（新到旧）
      return (
        new Date(b.updated_at || 0).getTime() -
        new Date(a.updated_at || 0).getTime()
      );
    })
    .slice(0, 3);

  // 获取所有现有标签
  const allTags = await getAllTags(userId);

  const headers: HeadersInit = {};
  if (anonymousId && !user) {
    headers["Set-Cookie"] = createAnonymousCookie(anonymousId);
  }

  return json(
    {
      knowledgePoint,
      learningTopic,
      relatedPoints: filteredRelated,
      allTopics,
      allTags,
      user,
      isDemo,
    },
    { headers }
  );
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await initDatabase();

  const id = params.id;
  if (!id) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update") {
    const { user, anonymousId } = await getCurrentUser(request);
    const userId = user?.id || anonymousId;

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const tags = formData.get("tags") as string;

    let learningTopicId = formData.get("learningTopicId") as string;

    // 处理创建新主题的情况
    if (learningTopicId === "__custom__") {
      const customName = formData.get("customTopicName") as string;
      if (customName && customName.trim()) {
        // 创建自定义主题
        const newTopic = await createLearningTopic({
          name: customName.trim(),
          description: `用户自定义主题: ${customName.trim()}`,
          user_id: userId,
        });
        learningTopicId = newTopic.id!;
      } else {
        learningTopicId = "";
      }
    }

    // 处理标签
    const tagNames = tags
      ? tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : [];
    const createdTags =
      tagNames.length > 0 ? await createOrGetTags(tagNames, userId) : [];
    const tagIds = createdTags
      .map((tag) => tag.id)
      .filter((id): id is string => Boolean(id));

    await updateKnowledgePoint(id, {
      title,
      content,
      tag_ids: tagIds as string[],

      learning_topic_id: learningTopicId || undefined,
    });

    return redirect(`/knowledge/${id}`);
  }

  return null;
};

export default function KnowledgeDetailPage() {
  const {
    knowledgePoint,
    learningTopic,
    relatedPoints,
    allTopics,
    allTags,
    user,
    isDemo,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(knowledgePoint.title || "");
  const [editedContent, setEditedContent] = useState(knowledgePoint.content);
  const [editedTags, setEditedTags] = useState(
    knowledgePoint.tags
      ? knowledgePoint.tags
          .map((tag) => (typeof tag === "string" ? tag : tag.name))
          .join(", ")
      : ""
  );

  const [editedTopicId, setEditedTopicId] = useState(
    knowledgePoint.learning_topic_id || ""
  );
  const [customTopicName, setCustomTopicName] = useState("");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50">
      <Header user={user} isDemo={isDemo} />

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
                    <input
                      type="hidden"
                      name="learningTopicId"
                      value={editedTopicId}
                    />

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
                          placeholder="标签1, 标签2"
                        />
                      </div>
                    </div>

                    {/* 学习主题选择 */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                      <label className="block text-sm font-medium text-blue-900 mb-3 flex items-center">
                        <span className="mr-2">🎯</span>
                        选择学习主题
                      </label>

                      <div className="space-y-3">
                        {/* 主题选择下拉框 */}
                        <select
                          name="learningTopicId"
                          value={editedTopicId}
                          onChange={(e) => {
                            setEditedTopicId(e.target.value);
                            if (e.target.value !== "__custom__") {
                              setCustomTopicName("");
                            }
                          }}
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="">不关联学习主题</option>
                          {allTopics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              📚 {topic.name}
                            </option>
                          ))}
                          <option value="__custom__">✨ 自定义新主题</option>
                        </select>

                        {/* 自定义主题输入框 */}
                        {editedTopicId === "__custom__" && (
                          <div className="bg-white rounded-lg border border-blue-300 p-3">
                            <label className="block text-sm font-medium text-blue-900 mb-2">
                              自定义主题名称:
                            </label>
                            <input
                              type="text"
                              name="customTopicName"
                              value={customTopicName}
                              onChange={(e) =>
                                setCustomTopicName(e.target.value)
                              }
                              className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="输入新的学习主题名称..."
                              required
                            />
                          </div>
                        )}
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
                          setEditedTags(
                            knowledgePoint.tags
                              ? knowledgePoint.tags
                                  .map((tag) =>
                                    typeof tag === "string" ? tag : tag.name
                                  )
                                  .join(", ")
                              : ""
                          );

                          setEditedTopicId(
                            knowledgePoint.learning_topic_id || ""
                          );
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
                    {/* 头部信息 */}
                    <div className="mb-6 pb-6 border-b border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                          {knowledgePoint.title || "无标题"}
                        </h1>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center"
                        >
                          <svg
                            className="w-4 h-4"
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
                        </button>
                      </div>

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

                        {/* 标签显示 */}
                        {knowledgePoint.tags &&
                          knowledgePoint.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {knowledgePoint.tags
                                .slice(0, 3)
                                .map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                                  >
                                    {typeof tag === "string" ? tag : tag.name}
                                  </span>
                                ))}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* AI 摘要 */}
                    {knowledgePoint.summary && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="mr-2">🤖</span>
                          AI 智能摘要
                        </h3>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-blue-800 leading-relaxed">
                            {knowledgePoint.summary}
                          </p>
                        </div>
                      </div>
                    )}

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
                    {knowledgePoint.tags && knowledgePoint.tags.length > 0 && (
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
                              {typeof tag === "string" ? tag : tag.name}
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
                          <div className="flex flex-wrap gap-1">
                            {point.tags &&
                              point.tags.slice(0, 2).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full"
                                >
                                  {typeof tag === "string" ? tag : tag.name}
                                </span>
                              ))}
                          </div>
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
