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
import PageTitle from "~/components/PageTitle";
import Label from "~/components/Label";
import AIOverview from "~/components/AIOverview";
import { KnowledgeCard } from "~/components/KnowledgeCard";
import { mockTopics, mockKnowledgePoints, mockTags } from "~/data/mockData";
import {
  isNoContentAnonymousUser,
  shouldShowDemoNotice,
  shouldDisableEditing,
  type UserState,
  type ContentState,
} from "~/lib/user-utils";
import { Container, Text, Input, Button, Badge } from "~/components/ui";
import Textarea from "~/components/Textarea";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const {
    user,
    anonymousId,
    isDemo,
    headers: authHeaders,
  } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const topicId = url.searchParams.get("topic");
  const tagFilter = url.searchParams.get("tag");

  // 先尝试获取真实数据
  let topics = await getAllLearningTopics(userId);
  let allTags = await getAllTags(userId);
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

  // 如果是匿名用户且没有真实数据，使用mock数据
  const userState: UserState = {
    user: user
      ? {
          id: user.id!,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
        }
      : undefined,
    anonymousId,
    isDemo,
  };
  const contentState: ContentState = { topics, knowledgePoints, tags: allTags };

  if (isNoContentAnonymousUser(userState, contentState)) {
    topics = mockTopics as any;
    allTags = mockTags as any;

    if (search) {
      knowledgePoints = mockKnowledgePoints.filter(
        (kp) =>
          kp.title.toLowerCase().includes(search.toLowerCase()) ||
          kp.content.toLowerCase().includes(search.toLowerCase())
      );
    } else {
      knowledgePoints = topicId
        ? mockKnowledgePoints.filter((kp) => kp.learning_topic_id === topicId)
        : mockKnowledgePoints;
    }

    // 根据标签过滤（如果指定了标签）
    if (tagFilter && tagFilter !== "all") {
      knowledgePoints = knowledgePoints.filter(
        (kp) => kp.tags && kp.tags.some((tag) => tag.name === tagFilter)
      );
    }
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
      anonymousId,
    },
    { headers: authHeaders }
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
    anonymousId,
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

  // 用户状态
  const userState: UserState = {
    user: user
      ? {
          id: user.id!,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
        }
      : undefined,
    anonymousId,
    isDemo,
  };
  const contentState: ContentState = { topics, knowledgePoints, tags: allTags };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header user={user} isDemo={isDemo} />

      <div className="px-3 sm:px-6 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <PageTitle
            title="知识库"
            subtitle="📚 管理你的所有学习笔记和主题"
            icon="📖"
            className="mb-6"
          />

          {/* Demo提示 - 只在没有真实数据时显示 */}
          {shouldShowDemoNotice(userState, contentState) && (
            <div className="mb-6 bg-amber-100/80 border border-amber-300 rounded-xl p-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">👀</span>
                <div>
                  <h3 className="font-semibold text-amber-900">
                    正在浏览示例内容
                  </h3>
                  <p className="text-amber-700 text-sm mt-1">
                    这些是演示数据，仅供查看。
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
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-amber-100 p-6 dark:bg-gray-800 dark:border-gray-700">
            {/* 搜索框 */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索知识点..."
                  className="w-full px-4 py-3 pl-12 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg
                    className="w-5 h-5 text-gray-400 dark:text-gray-500"
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
                <Label className="hidden sm:block mb-2 text-gray-900 dark:text-gray-100">
                  学习主题
                </Label>
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
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                <Label className="hidden sm:block text-gray-900 dark:text-gray-100 mb-2">
                  标签筛选
                </Label>
                <select
                  value={selectedTag || "all"}
                  onChange={(e) => {
                    const params = new URLSearchParams();
                    if (selectedTopic) params.set("topic", selectedTopic);
                    if (e.target.value !== "all")
                      params.set("tag", e.target.value);
                    window.location.href = `/knowledge?${params.toString()}`;
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
            <Container variant="card" padding="md">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
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
                  <Text size="sm" color="secondary">
                    总知识点
                  </Text>
                  <Text size="2xl" weight="bold" color="primary">
                    {knowledgePoints.length}
                  </Text>
                </div>
              </div>
            </Container>

            <Container variant="card" padding="md">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
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
                  <Text size="sm" color="secondary">
                    学习主题
                  </Text>
                  <Text size="2xl" weight="bold" color="primary">
                    {topics.length}
                  </Text>
                </div>
              </div>
            </Container>

            <Container variant="card" padding="md">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
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
                  <Text size="sm" color="secondary">
                    标签数量
                  </Text>
                  <Text size="2xl" weight="bold" color="primary">
                    {allTags.length}
                  </Text>
                </div>
              </div>
            </Container>
          </div>

          {/* 主题列表 */}
          {topics.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-4xl sm:text-6xl mb-4">📚</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                还没有学习主题
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 px-4">
                开始创建你的第一个学习主题吧！
              </p>
              <button
                onClick={() => setShowCreateTopic(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-500 text-white text-sm sm:text-base font-semibold rounded-xl hover:bg-blue-600 transition-all"
              >
                <span className="mr-2">+</span>
                创建第一个主题
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              {topics.map((topic) => (
                <KnowledgeCard
                  key={topic.id}
                  topic={{
                    ...topic,
                    aiOverview: topic.aiOverview,
                  }}
                  onRegenerateOverview={handleRegenerateOverview}
                  isLoadingOverview={
                    topic.id ? loadingOverviews.has(topic.id) : false
                  }
                  isRecentlyUpdated={
                    topic.id ? recentlyUpdated.has(topic.id) : false
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建主题模态框 */}
      {showCreateTopic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Container variant="card" padding="lg" className="w-full max-w-md">
            <Text size="lg" weight="semibold" color="primary" className="mb-4">
              创建新学习主题
            </Text>

            <Form method="post" onSubmit={() => setShowCreateTopic(false)}>
              <input type="hidden" name="intent" value="create_topic" />

              <div className="space-y-4">
                <div>
                  <Label className="mb-2" required>
                    主题名称
                  </Label>
                  <Input
                    name="topicName"
                    required
                    placeholder="例如：网球学习、编程技能等"
                    variant="amber"
                  />
                </div>

                <div>
                  <Label className="text-gray-700 dark:text-gray-300 mb-2">
                    主题描述
                  </Label>
                  <Textarea
                    name="topicDescription"
                    rows={3}
                    placeholder="描述这个学习主题的内容和目标（可选）"
                    variant="amber"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  type="submit"
                  disabled={navigation.state === "submitting"}
                  loading={navigation.state === "submitting"}
                  variant="primary"
                  className="flex-1"
                >
                  创建主题
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreateTopic(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </Form>
          </Container>
        </div>
      )}
    </div>
  );
}
