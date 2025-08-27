import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useState } from "react";
import { Link, useLoaderData } from "@remix-run/react";
import {
  getAllKnowledgePoints,
  getAllLearningTopics,
  searchKnowledgePoints,
} from "~/lib/db.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import Header from "~/components/Header";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user, anonymousId, isDemo } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const topicId = url.searchParams.get("topic");
  const category = url.searchParams.get("category");

  const topics = await getAllLearningTopics(userId);

  let knowledgePoints;
  if (search) {
    knowledgePoints = await searchKnowledgePoints(search, userId);
  } else {
    knowledgePoints = await getAllKnowledgePoints(userId, topicId || undefined);
  }

  // 过滤分类
  if (category && category !== "all") {
    knowledgePoints = knowledgePoints.filter((kp) => kp.category === category);
  }

  // 获取所有分类
  const categories = [...new Set(knowledgePoints.map((kp) => kp.category))];

  const headers: HeadersInit = {};
  if (anonymousId && !user) {
    headers["Set-Cookie"] = createAnonymousCookie(anonymousId);
  }

  return json(
    {
      knowledgePoints,
      topics,
      categories,
      search,
      selectedTopic: topicId,
      selectedCategory: category,
      user,
      isDemo,
    },
    { headers }
  );
};

export default function KnowledgeIndex() {
  const {
    knowledgePoints,
    topics,
    categories,
    search,
    selectedTopic,
    selectedCategory,
    user,
    isDemo,
  } = useLoaderData<typeof loader>();
  const [searchQuery, setSearchQuery] = useState(search || "");

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

  const getImportanceStars = (importance: number) => {
    return "⭐".repeat(importance);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50">
      <Header user={user} isDemo={isDemo} />

      <div className="px-6 py-8">
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
            <div className="flex flex-wrap gap-4">
              {/* 主题筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  学习主题
                </label>
                <select
                  value={selectedTopic || ""}
                  onChange={(e) => {
                    const params = new URLSearchParams();
                    if (e.target.value) params.set("topic", e.target.value);
                    if (selectedCategory && selectedCategory !== "all")
                      params.set("category", selectedCategory);
                    window.location.href = `/knowledge?${params.toString()}`;
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">所有主题</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 分类筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                <select
                  value={selectedCategory || "all"}
                  onChange={(e) => {
                    const params = new URLSearchParams();
                    if (selectedTopic) params.set("topic", selectedTopic);
                    if (e.target.value !== "all")
                      params.set("category", e.target.value);
                    window.location.href = `/knowledge?${params.toString()}`;
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">所有分类</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
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
                  <p className="text-sm text-gray-600">分类数量</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {categories.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 知识点列表 */}
          {knowledgePoints.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                还没有知识点
              </h3>
              <p className="text-gray-600 mb-6">
                开始记录你的第一个学习内容吧！
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all"
              >
                <span className="mr-2">+</span>
                创建第一个笔记
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedPoints).map(([topicName, points]) => (
                <div
                  key={topicName}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                >
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="mr-2">📖</span>
                      {topicName}
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {points.length} 个知识点
                      </span>
                    </h3>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {points.map((point) => (
                        <Link
                          key={point.id}
                          to={`/knowledge/${point.id}`}
                          className="block bg-gray-50 rounded-xl p-4 hover:bg-blue-50 hover:shadow-md transition-all border hover:border-blue-200"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                              {point.title || "无标题"}
                            </h4>
                            <div className="text-xs">
                              {getImportanceStars(point.importance)}
                            </div>
                          </div>

                          <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                            {point.content}
                          </p>

                          <div className="flex flex-wrap gap-1 mb-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {point.category}
                            </span>
                            {point.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="text-xs text-gray-500">
                            {point.created_at &&
                              formatDate(point.created_at.toString())}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
