import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useState } from "react";
import { Link, useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  getAllKnowledgePoints,
  getAllLearningTopics,
  searchKnowledgePoints,
  createLearningTopic,
  getAllTags,
  getLearningTopic,
  updateTopicOverviewAsync,
  initDatabase,
} from "~/lib/db.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import Header from "~/components/Header";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user, anonymousId, isDemo } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const topicId = url.searchParams.get("topic");
  const tagFilter = url.searchParams.get("tag");

  const topics = await getAllLearningTopics(userId);
  const allTags = await getAllTags(userId);

  let knowledgePoints;
  if (search) {
    knowledgePoints = await searchKnowledgePoints(search, userId);
  } else {
    knowledgePoints = await getAllKnowledgePoints(userId, topicId || undefined);
  }

  // 根据标签过滤（如果指定了标签）
  if (tagFilter && tagFilter !== "all") {
    knowledgePoints = knowledgePoints.filter(
      (kp) => kp.tags && kp.tags.some((tag) => tag.name === tagFilter)
    );
  }

  // 为每个主题获取AI概要
  const topicsWithOverview = await Promise.all(
    topics.map(async (topic) => {
      let aiOverview = null;
      if (topic.ai_summary) {
        try {
          aiOverview = JSON.parse(topic.ai_summary);
        } catch (error) {
          console.error(`解析主题 ${topic.name} 的AI概要失败:`, error);
        }
      }

      // 获取该主题下的知识点数量
      const topicKnowledgePoints = knowledgePoints.filter(
        (kp) => kp.learning_topic_id === topic.id
      );

      // 如果没有AI概要且有知识点，触发生成
      if (!aiOverview && topicKnowledgePoints.length > 0 && topic.id) {
        updateTopicOverviewAsync(topic.id).catch(console.error);
      }

      return {
        ...topic,
        aiOverview,
        knowledgePointsCount: topicKnowledgePoints.length,
      };
    })
  );

  const headers: HeadersInit = {};
  if (anonymousId && !user) {
    headers["Set-Cookie"] = createAnonymousCookie(anonymousId);
  }

  return json(
    {
      knowledgePoints,
      topics: topicsWithOverview,
      allTags,
      search,
      selectedTopic: topicId,
      selectedTag: tagFilter,
      user,
      isDemo,
    },
    { headers }
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await initDatabase();

  const { user, anonymousId } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create_topic") {
    const name = formData.get("topicName") as string;
    const description = formData.get("topicDescription") as string;

    if (!name?.trim()) {
      return json({ error: "主题名称不能为空" }, { status: 400 });
    }

    await createLearningTopic({
      name: name.trim(),
      description: description?.trim() || "",
      user_id: userId,
    });

    return redirect("/knowledge");
  }

  return json({ error: "未知操作" }, { status: 400 });
};

export default function KnowledgeIndex() {
  const {
    knowledgePoints,
    topics,
    allTags,
    search,
    selectedTopic,
    selectedTag,
    user,
    isDemo,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState(search || "");
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [loadingOverviews, setLoadingOverviews] = useState<Set<string>>(
    new Set()
  );
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(
    new Set()
  );

  // 处理AI概览重新生成
  const handleRegenerateOverview = async (topicId: string) => {
    setLoadingOverviews((prev) => new Set(prev).add(topicId));

    try {
      const response = await fetch("/api/regenerate-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });

      if (response.ok) {
        // 标记为最近更新
        setRecentlyUpdated((prev) => new Set(prev).add(topicId));
        // 3秒后移除更新标记
        setTimeout(() => {
          setRecentlyUpdated((prev) => {
            const newSet = new Set(prev);
            newSet.delete(topicId);
            return newSet;
          });
        }, 3000);
        // 刷新页面数据
        window.location.reload();
      }
    } catch (error) {
      console.error("重新生成概览失败:", error);
    } finally {
      setLoadingOverviews((prev) => {
        const newSet = new Set(prev);
        newSet.delete(topicId);
        return newSet;
      });
    }
  };

  // 按主题分组知识点
  const groupedPoints = knowledgePoints.reduce((acc, point) => {
    const topicName =
      topics.find((t) => t.id === point.learning_topic_id)?.name || "其他";
    if (!acc[topicName]) {
      acc[topicName] = [];
    }
    acc[topicName].push(point);
    return acc;
  }, {} as Record<string, typeof knowledgePoints>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // 添加状态管理折叠展开的笔记
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());

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
          {/* Demo提示 */}
          {isDemo && (
            <div className="mb-6 bg-amber-100/80 border border-amber-300 rounded-xl p-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">👀</span>
                <div>
                  <h3 className="font-semibold text-amber-900">
                    正在浏览示例内容
                  </h3>
                  <p className="text-amber-700 text-sm mt-1">
                    这些是演示数据。
                    <Link
                      to="/auth/register"
                      className="underline font-medium ml-1"
                    >
                      注册账号
                    </Link>
                    后即可创建专属于你的知识库！
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 搜索和筛选区域 */}
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-amber-100 p-6">
            {/* 搜索框 */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索知识点..."
                  className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                {searchQuery && (
                  <Link
                    to={`/knowledge?search=${encodeURIComponent(searchQuery)}`}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                  >
                    搜索
                  </Link>
                )}
              </div>
            </div>

            {/* 筛选器 */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4">
              {/* 主题筛选 */}
              <div className="flex-1 sm:flex-none">
                <label className="hidden sm:block text-sm font-medium text-gray-700 mb-2">
                  学习主题
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTopic || ""}
                    onChange={(e) => {
                      const params = new URLSearchParams();
                      if (e.target.value) params.set("topic", e.target.value);
                      if (selectedTag && selectedTag !== "all")
                        params.set("tag", selectedTag);
                      window.location.href = `/knowledge?${params.toString()}`;
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">📖 所有主题</option>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        📖 {topic.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowCreateTopic(true)}
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm whitespace-nowrap"
                    title="创建新主题"
                  >
                    <span className="sm:hidden">+</span>
                    <span className="hidden sm:inline">+ 新主题</span>
                  </button>
                </div>
              </div>

              {/* 标签筛选 */}
              <div className="flex-1 sm:flex-none">
                <label className="hidden sm:block text-sm font-medium text-gray-700 mb-2">
                  标签筛选
                </label>
                <select
                  value={selectedTag || "all"}
                  onChange={(e) => {
                    const params = new URLSearchParams();
                    if (selectedTopic) params.set("topic", selectedTopic);
                    if (e.target.value !== "all")
                      params.set("tag", e.target.value);
                    window.location.href = `/knowledge?${params.toString()}`;
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">🏷️ 所有标签</option>
                  {allTags.map((tag) => (
                    <option key={tag.id} value={tag.name}>
                      🏷️ {tag.name}
                      <span className="hidden sm:inline">
                        {" "}
                        ({tag.usage_count})
                      </span>
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">总知识点</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {knowledgePoints.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">学习主题</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {topics.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-purple-600"
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
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">标签数量</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {allTags.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 知识点列表 */}
          {knowledgePoints.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl sm:text-6xl mb-4">📚</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                还没有知识点
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6 px-4">
                开始记录你的第一个学习内容吧！
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-blue-600 transition-all"
              >
                <span className="mr-2">+</span>
                创建第一个笔记
              </Link>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {Object.entries(groupedPoints).map(([topicName, points]) => {
                // 找到对应的主题详情
                const topicDetail = topics.find((t) => t.name === topicName);
                const aiOverview = topicDetail?.aiOverview;

                return (
                  <div
                    key={topicName}
                    className="bg-white rounded-lg sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center flex-wrap gap-2">
                        <span className="mr-1 sm:mr-2 text-base sm:text-lg">
                          📖
                        </span>
                        <span className="flex-1 min-w-0 break-words">
                          {topicName}
                        </span>
                        <div className="flex items-center gap-2">
                          {topicDetail?.id &&
                            loadingOverviews.has(topicDetail.id) && (
                              <div className="flex items-center px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full whitespace-nowrap">
                                <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                                AI分析中
                              </div>
                            )}
                          {topicDetail?.id &&
                            recentlyUpdated.has(topicDetail.id) && (
                              <div className="flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full whitespace-nowrap">
                                <span className="mr-1">✨</span>
                                已更新
                              </div>
                            )}
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">
                            {points.length} 个知识点
                          </span>
                        </div>
                      </h3>
                    </div>

                    {/* AI概要区域 */}
                    <div className="p-4 sm:p-6 border-b border-gray-100">
                      {aiOverview ? (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                          <h4 className="text-sm sm:text-md font-semibold text-blue-900 mb-2 sm:mb-3 flex items-center flex-wrap gap-2">
                            <span className="mr-1 sm:mr-2">🤖</span>
                            <span className="flex-1">
                              <span className="sm:hidden">AI概览</span>
                              <span className="hidden sm:inline">
                                AI 学习概览
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">
                                <span className="sm:hidden">
                                  {Math.round(aiOverview.confidence * 100)}%
                                </span>
                                <span className="hidden sm:inline">
                                  置信度{" "}
                                  {Math.round(aiOverview.confidence * 100)}%
                                </span>
                              </span>
                              {topicDetail?.id && (
                                <button
                                  onClick={() =>
                                    handleRegenerateOverview(topicDetail.id!)
                                  }
                                  disabled={loadingOverviews.has(
                                    topicDetail.id!
                                  )}
                                  className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                  title="重新生成AI概览"
                                >
                                  {loadingOverviews.has(topicDetail.id!) ? (
                                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <span className="sm:hidden">🔄</span>
                                  )}
                                  <span className="hidden sm:inline">
                                    重新生成
                                  </span>
                                </button>
                              )}
                            </div>
                          </h4>

                          {/* 主题摘要 */}
                          <div className="mb-3 sm:mb-4">
                            <p className="text-blue-800 text-xs sm:text-sm leading-relaxed mb-2 sm:mb-3">
                              {aiOverview.summary}
                            </p>
                          </div>

                          <div className="space-y-3">
                            {/* 核心洞察 */}
                            {aiOverview.key_insights &&
                              aiOverview.key_insights.length > 0 && (
                                <div>
                                  <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">
                                    <span className="sm:hidden">💡</span>
                                    <span className="hidden sm:inline">
                                      💡 核心知识点
                                    </span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {aiOverview.key_insights
                                      .slice(0, 4)
                                      .map((insight: string, index: number) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="mr-1 text-blue-600 text-xs shrink-0">
                                            •
                                          </span>
                                          <span className="text-blue-800 text-xs leading-tight">
                                            {insight}
                                          </span>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}

                            {/* 实用要点 */}
                            {aiOverview.practical_points &&
                              aiOverview.practical_points.length > 0 && (
                                <div>
                                  <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">
                                    <span className="sm:hidden">⚡</span>
                                    <span className="hidden sm:inline">
                                      ⚡ 实用技巧
                                    </span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {aiOverview.practical_points
                                      .slice(0, 3)
                                      .map((point: string, index: number) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="mr-1 text-green-600 text-xs shrink-0">
                                            ▸
                                          </span>
                                          <span className="text-green-800 text-xs leading-tight">
                                            {point}
                                          </span>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}

                            {/* 经验总结 */}
                            {aiOverview.experience_summary &&
                              aiOverview.experience_summary.length > 0 && (
                                <div>
                                  <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">
                                    <span className="sm:hidden">💭</span>
                                    <span className="hidden sm:inline">
                                      💭 经验总结
                                    </span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {aiOverview.experience_summary
                                      .slice(0, 2)
                                      .map((summary: string, index: number) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="mr-1 text-purple-600 text-xs shrink-0">
                                            ◈
                                          </span>
                                          <span className="text-purple-800 text-xs leading-tight">
                                            {summary}
                                          </span>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}

                            {/* 下一步建议 */}
                            {aiOverview.next_steps &&
                              aiOverview.next_steps.length > 0 && (
                                <div>
                                  <h5 className="text-xs sm:text-sm font-medium text-blue-900 mb-1 sm:mb-2">
                                    <span className="sm:hidden">🎯</span>
                                    <span className="hidden sm:inline">
                                      🎯 进阶方向
                                    </span>
                                  </h5>
                                  <ul className="space-y-1">
                                    {aiOverview.next_steps
                                      .slice(0, 3)
                                      .map((step: string, index: number) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="mr-1 text-orange-600 text-xs shrink-0">
                                            →
                                          </span>
                                          <span className="text-orange-800 text-xs leading-tight">
                                            {step}
                                          </span>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                          </div>

                          {/* 学习进度 */}
                          {aiOverview.learning_progress && (
                            <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-100 rounded-lg">
                              <span className="text-blue-800 text-xs leading-tight">
                                <span className="sm:hidden">📊</span>
                                <span className="hidden sm:inline">
                                  📊 {aiOverview.learning_progress}
                                </span>
                                <span className="sm:hidden">
                                  {aiOverview.learning_progress}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      ) : points.length > 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <span className="mr-2">⏳</span>
                            <span className="text-yellow-800 text-xs sm:text-sm">
                              AI 正在生成学习概览...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center">
                            <span className="mr-2">📝</span>
                            <span className="text-gray-600 text-xs sm:text-sm leading-tight">
                              还没有学习笔记，添加第一条笔记后 AI 将自动生成概览
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {points.map((point) => (
                        <div
                          key={point.id}
                          className="bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-sm"
                        >
                          {/* 笔记标题栏 - 点击展开/收起 */}
                          <button
                            onClick={() => toggleExpand(point.id!)}
                            className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center flex-1 min-w-0">
                              <span className="mr-2 sm:mr-3 text-base shrink-0">
                                {expandedPoints.has(point.id!) ? "📖" : "📄"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base break-words">
                                  {point.title || "无标题"}
                                </h4>
                                <div className="flex items-center text-xs text-gray-500 space-x-2">
                                  <span className="shrink-0">
                                    <span className="sm:hidden">🕒</span>
                                    <span className="hidden sm:inline">
                                      🕒{" "}
                                      {formatDate(
                                        point.created_at?.toString() || ""
                                      )}
                                    </span>
                                  </span>
                                  {point.tags && point.tags.length > 0 && (
                                    <div className="flex items-center space-x-1 min-w-0">
                                      <span className="shrink-0">🏷️</span>
                                      <span className="truncate">
                                        {point.tags
                                          .slice(0, 1)
                                          .map((tag) =>
                                            typeof tag === "string"
                                              ? tag
                                              : tag.name
                                          )
                                          .join(", ")}
                                      </span>
                                      {point.tags.length > 1 && (
                                        <span>+{point.tags.length - 1}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="ml-2 text-gray-400 text-xs shrink-0">
                              <span className="sm:hidden">
                                {expandedPoints.has(point.id!) ? "▲" : "▼"}
                              </span>
                              <span className="hidden sm:inline">
                                {expandedPoints.has(point.id!)
                                  ? "收起"
                                  : "展开"}
                              </span>
                            </div>
                          </button>

                          {/* 笔记内容 - 展开时显示 */}
                          {expandedPoints.has(point.id!) && (
                            <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-200">
                              {/* AI摘要 */}
                              {point.summary && (
                                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200 mt-3">
                                  <h5 className="text-xs font-medium text-blue-900 mb-2 flex items-center">
                                    <span className="mr-2">🤖</span>
                                    <span className="sm:hidden">摘要</span>
                                    <span className="hidden sm:inline">
                                      AI 摘要
                                    </span>
                                  </h5>
                                  <p className="text-blue-800 text-xs leading-relaxed">
                                    {point.summary}
                                  </p>
                                </div>
                              )}

                              {/* 学习内容 */}
                              <div className="mb-3 mt-3">
                                <h5 className="text-xs font-medium text-gray-700 mb-2">
                                  <span className="sm:hidden">📝</span>
                                  <span className="hidden sm:inline">
                                    📝 内容
                                  </span>
                                </h5>
                                <div className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200">
                                  {point.content}
                                </div>
                              </div>

                              {/* 标签和关键词 */}
                              <div className="space-y-2 text-xs">
                                {point.tags && point.tags.length > 0 && (
                                  <div className="flex items-start">
                                    <span className="mr-2 text-gray-500 shrink-0">
                                      <span className="sm:hidden">🏷️</span>
                                      <span className="hidden sm:inline">
                                        🏷️ 标签:
                                      </span>
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {point.tags.map((tag, index) => (
                                        <span
                                          key={index}
                                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                                        >
                                          {typeof tag === "string"
                                            ? tag
                                            : tag.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {point.keywords &&
                                  point.keywords.length > 0 && (
                                    <div className="flex items-start">
                                      <span className="mr-2 text-gray-500 shrink-0">
                                        <span className="sm:hidden">🔑</span>
                                        <span className="hidden sm:inline">
                                          🔑 关键词:
                                        </span>
                                      </span>
                                      <div className="flex flex-wrap gap-1">
                                        {point.keywords.map(
                                          (keyword, index) => (
                                            <span
                                              key={index}
                                              className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                                            >
                                              {keyword}
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>

                              {/* 操作按钮 */}
                              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                                <Link
                                  to={`/knowledge/${point.id}`}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                                >
                                  <span className="sm:hidden">详情 →</span>
                                  <span className="hidden sm:inline">
                                    查看详情 →
                                  </span>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 创建主题模态框 */}
      {showCreateTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              创建新学习主题
            </h3>

            <Form method="post" onSubmit={() => setShowCreateTopic(false)}>
              <input type="hidden" name="intent" value="create_topic" />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    主题名称 *
                  </label>
                  <input
                    type="text"
                    name="topicName"
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="例如：网球学习、编程技能等"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    主题描述
                  </label>
                  <textarea
                    name="topicDescription"
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="描述这个学习主题的内容和目标（可选）"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={navigation.state === "submitting"}
                  className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition-colors"
                >
                  {navigation.state === "submitting" ? "创建中..." : "创建主题"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTopic(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
