import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useState } from "react";
import {
  Link,
  useLoaderData,
  Form,
  useNavigation,
  replace,
} from "@remix-run/react";
import {
  getLearningTopic,
  getAllKnowledgePoints,
  getAllTags,
  updateLearningTopic,
  initDatabase,
} from "~/lib/db.server";
import { getCurrentUser } from "~/lib/auth.server";
import Header from "~/components/Header";
import BackLink from "~/components/BackLink";
import Input from "~/components/Input";
import Textarea from "~/components/Textarea";
import PageTitle from "~/components/PageTitle";
import { mockTopics, mockKnowledgePoints } from "~/data/mockData";
import {
  shouldShowDemoNotice,
  shouldDisableEditing,
  type UserState,
} from "~/lib/user-utils";

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

  // 先检查是否为mock数据
  let topic: any;
  let knowledgePoints: any[] = [];
  let allTags: any[] = [];

  if (isDemo && topicId.startsWith("mock-")) {
    // 如果是匿名用户访问mock数据
    topic = mockTopics.find((t) => t.id === topicId);
    if (!topic) {
      throw new Response("Not Found", { status: 404 });
    }
    knowledgePoints = mockKnowledgePoints.filter(
      (kp) => kp.learning_topic_id === topicId
    );
    allTags = [];
  } else {
    // 尝试获取真实数据
    topic = await getLearningTopic(topicId);
    if (topic) {
      // 如果找到真实主题，获取相关数据
      knowledgePoints = await getAllKnowledgePoints(userId, topicId);
      allTags = await getAllTags(userId);
    } else {
      // 没有找到主题
      throw new Response("Not Found", { status: 404 });
    }
  }

  // 解析AI概要
  let aiOverview = null;
  if (topic.ai_summary) {
    try {
      aiOverview = JSON.parse(topic.ai_summary);
    } catch (error) {
      console.error(`解析主题 ${topic.name} 的AI概要失败:`, error);
    }
  }

  // 如果是mock数据，确保有AI概览
  if (isDemo && topicId.startsWith("mock-") && !aiOverview) {
    aiOverview = {
      confidence: 0.85,
      learning_progress: "基础阶段",
      key_concepts: ["示例概念1", "示例概念2", "示例概念3"],
      difficulty_level: "初级到中级",
      estimated_hours: 20,
      summary: "这是一个示例主题的AI分析概览，展示了系统的基本功能。",
      key_insights: [
        "示例洞察1：这是一个重要的学习要点",
        "示例洞察2：需要注意的关键细节",
        "示例洞察3：实践建议和技巧",
      ],
      practical_points: [
        "示例要点1：具体的操作步骤",
        "示例要点2：常见问题和解决方案",
        "示例要点3：进阶学习建议",
      ],
      learning_steps: [
        "第一步：了解基础知识",
        "第二步：进行实践练习",
        "第三步：总结和反思",
      ],
    };
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
      anonymousId,
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
      // 前端强制刷新当前页面
      return replace(redirectUrl);
    } catch (error) {
      console.error("更新主题失败:", error);
      return json({ error: "更新主题失败，请重试" }, { status: 500 });
    }
  }

  return json({ error: "未知操作" }, { status: 400 });
};

export default function TopicDetailPage() {
  const { topic, knowledgePoints, allTags, user, isDemo, anonymousId } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editedName, setEditedName] = useState(topic.name);
  const [editedDescription, setEditedDescription] = useState(
    topic.description || ""
  );
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());
  const [isAiOverviewExpanded, setIsAiOverviewExpanded] = useState(false);

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
            <BackLink to="/knowledge" text="返回知识库" />
          </div>

          {/* 页面标题 */}
          <PageTitle
            title="主题详情"
            subtitle="📚 管理学习主题和知识点"
            icon="📖"
            className="mb-6"
          />

          {/* Demo提示 - 只在查看mock数据时显示 */}
          {shouldShowDemoNotice(userState, undefined, topic.id) && (
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

          {/* 主题信息卡片 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
            {isEditingTopic ? (
              /* 编辑模式 */
              <Form method="post" className="p-6">
                <input type="hidden" name="intent" value="update_topic" />

                <div className="space-y-4">
                  <Input
                    label="主题名称 *"
                    name="name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="输入主题名称..."
                    required
                    variant="blue"
                    size="lg"
                    className="text-xl font-semibold"
                  />

                  <Textarea
                    label="主题描述"
                    name="description"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={3}
                    placeholder="输入主题描述..."
                    variant="blue"
                  />
                </div>

                <div className="flex space-x-4 mt-6 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        保存中...
                      </>
                    ) : (
                      "保存更改"
                    )}
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
                <div className="space-y-4 mb-6">
                  {/* 标题和编辑按钮 */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center">
                        <span className="mr-2 sm:mr-3">📖</span>
                        {topic.name}
                      </h1>
                      {topic.description && (
                        <p className="text-gray-600 text-base sm:text-lg">
                          {topic.description}
                        </p>
                      )}
                    </div>
                    {shouldDisableEditing(userState, topic.id) ? (
                      <span className="self-start sm:self-auto px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center text-sm sm:text-base">
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
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        演示模式
                      </span>
                    ) : (
                      <button
                        onClick={() => setIsEditingTopic(true)}
                        className="self-start sm:self-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center text-sm sm:text-base"
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
                    )}
                  </div>

                  {/* 统计信息 */}
                  <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 gap-2 sm:gap-4">
                    <span className="flex items-center">
                      <span className="mr-1">📊</span>
                      {knowledgePoints.length} 个知识点
                    </span>
                    <span className="flex items-center">
                      <span className="mr-1">🕒</span>
                      创建于 {formatDate(topic.created_at?.toString() || "")}
                    </span>
                  </div>
                </div>

                {/* AI概要 - 默认折叠 */}
                {topic.aiOverview && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 mb-6 overflow-hidden">
                    {/* 可点击的标题栏 */}
                    <button
                      onClick={() =>
                        setIsAiOverviewExpanded(!isAiOverviewExpanded)
                      }
                      className="w-full p-4 text-left hover:bg-blue-100/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                          <span className="mr-2">🤖</span>
                          AI 学习概览
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            置信度{" "}
                            {Math.round(topic.aiOverview.confidence * 100)}%
                          </span>
                          <svg
                            className={`w-5 h-5 text-blue-600 transition-transform ${
                              isAiOverviewExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* 展开的内容 */}
                    {isAiOverviewExpanded && (
                      <div className="px-4 pb-4 space-y-4">
                        <p className="text-blue-800 leading-relaxed">
                          {topic.aiOverview.summary}
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                          <div className="p-3 bg-blue-100 rounded-lg">
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
            )}
          </div>

          {/* 知识点列表 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <span className="mr-2">📚</span>
                知识点详情
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  {knowledgePoints.length} 个
                </span>
              </h2>
            </div>

            {knowledgePoints.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <div className="text-5xl sm:text-6xl mb-4">📝</div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  还没有知识点
                </h3>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">
                  在这个主题下还没有任何学习笔记
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center px-4 sm:px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all text-sm sm:text-base"
                >
                  <span className="mr-2">+</span>
                  添加第一个笔记
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {knowledgePoints.map((point) => (
                  <div key={point.id} className="p-4 sm:p-6">
                    {/* 知识点标题栏 */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <button
                        onClick={() => toggleExpand(point.id!)}
                        className="flex-1 text-left"
                      >
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                          <span className="mr-2 text-lg sm:text-xl">
                            {expandedPoints.has(point.id!) ? "📖" : "📄"}
                          </span>
                          {point.title || "无标题"}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 gap-1 sm:gap-4">
                          <span className="flex items-center">
                            <span className="mr-1">🕒</span>
                            {formatDate(point.created_at?.toString() || "")}
                          </span>
                          {point.tags && point.tags.length > 0 && (
                            <div className="flex items-center">
                              <span className="mr-1">🏷️</span>
                              <span className="truncate">
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
                      <div className="flex items-center space-x-2 self-start">
                        <button
                          onClick={() => toggleExpand(point.id!)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          {expandedPoints.has(point.id!) ? "收起" : "展开"}
                        </button>
                        {shouldDisableEditing(userState, point.id) ? (
                          <span className="px-3 py-1 bg-gray-400 text-white text-sm rounded-lg cursor-not-allowed">
                            演示
                          </span>
                        ) : (
                          <Link
                            to={`/knowledge/${point.id}`}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            编辑
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* 知识点内容 - 展开时显示 */}
                    {expandedPoints.has(point.id!) && (
                      <div className="mt-4 pl-4 sm:pl-8 border-l-2 border-blue-200">
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
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 text-sm sm:text-base">
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
                                    className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 text-xs sm:text-sm rounded-full"
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
                                    className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-full"
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
