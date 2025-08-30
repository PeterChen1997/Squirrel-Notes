import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getAllLearningTopics, getAllKnowledgePoints } from "~/lib/db.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import Header from "~/components/Header";

export const meta: MetaFunction = () => {
  return [
    { title: "知识树 - 松鼠随记" },
    {
      name: "description",
      content: "查看和管理你的学习主题，像松鼠一样系统地整理知识",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user, anonymousId, isDemo } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const [topics, knowledgePoints] = await Promise.all([
    getAllLearningTopics(userId),
    getAllKnowledgePoints(userId),
  ]);

  // 为每个主题计算知识点数量和标签统计
  const topicsWithStats = topics.map((topic) => {
    const topicKnowledgePoints = knowledgePoints.filter(
      (kp) => kp.learning_topic_id === topic.id
    );
    // 获取所有标签
    const allTags = topicKnowledgePoints.flatMap((kp) => kp.tags || []);
    const uniqueTags = [
      ...new Set(
        allTags.map((tag) => (typeof tag === "string" ? tag : tag.name))
      ),
    ];

    return {
      ...topic,
      knowledgePointsCount: topicKnowledgePoints.length,
      uniqueTags,

      recentUpdated: topicKnowledgePoints.sort(
        (a, b) =>
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
      )[0]?.updated_at,
    };
  });

  // 按最近更新时间排序
  topicsWithStats.sort((a, b) => {
    const timeA = a.recentUpdated ? new Date(a.recentUpdated).getTime() : 0;
    const timeB = b.recentUpdated ? new Date(b.recentUpdated).getTime() : 0;
    return timeB - timeA;
  });

  const headers: HeadersInit = {};
  if (anonymousId && !user) {
    headers["Set-Cookie"] = createAnonymousCookie(anonymousId);
  }

  return json(
    {
      topics: topicsWithStats,
      totalKnowledgePoints: knowledgePoints.length,
      totalTopics: topics.length,
      user,
      isDemo,
    },
    { headers }
  );
};

export default function TopicsPage() {
  const { topics, totalKnowledgePoints, totalTopics, user, isDemo } =
    useLoaderData<typeof loader>();

  const getTopicEmoji = (name: string) => {
    const lowercaseName = name.toLowerCase();
    if (
      lowercaseName.includes("网球") ||
      lowercaseName.includes("运动") ||
      lowercaseName.includes("体育")
    )
      return "🎾";
    if (
      lowercaseName.includes("编程") ||
      lowercaseName.includes("代码") ||
      lowercaseName.includes("技术")
    )
      return "💻";
    if (
      lowercaseName.includes("英语") ||
      lowercaseName.includes("语言") ||
      lowercaseName.includes("学习")
    )
      return "📚";
    if (lowercaseName.includes("数学") || lowercaseName.includes("算法"))
      return "📐";
    if (lowercaseName.includes("设计") || lowercaseName.includes("艺术"))
      return "🎨";
    if (lowercaseName.includes("音乐")) return "🎵";
    if (lowercaseName.includes("健康") || lowercaseName.includes("养生"))
      return "🌿";
    return "🌱"; // 默认emoji
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 text-6xl opacity-10 transform rotate-12">
          🌳
        </div>
        <div className="absolute bottom-20 left-10 text-4xl opacity-10 transform -rotate-12">
          🐿️
        </div>
        <div className="absolute top-1/3 left-1/4 text-3xl opacity-10">🌰</div>
        <div className="absolute bottom-1/3 right-1/4 text-3xl opacity-10">
          🍂
        </div>
      </div>

      {/* 统一Header */}
      <Header user={user} isDemo={isDemo} />

      {/* 主要内容 */}
      <div className="px-6 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Demo提示 */}
          {isDemo && (
            <div className="mb-6 bg-amber-100/80 border border-amber-300 rounded-xl p-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">👀</span>
                <div>
                  <h3 className="font-semibold text-amber-900">
                    正在浏览示例知识树
                  </h3>
                  <p className="text-amber-700 text-sm mt-1">
                    这些是演示数据。
                    <Link
                      to="/auth/register"
                      className="underline font-medium ml-1"
                    >
                      注册账号
                    </Link>
                    后即可创建专属于你的知识树！
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 页面标题 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🌳</div>
            <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-4">
              我的知识树
            </h1>
            <p className="text-lg text-amber-700 mb-6">
              🐿️ 小松鼠的学习成果展示，每个分支都是珍贵的收获
            </p>

            {/* 统计信息 */}
            <div className="flex justify-center space-x-8 mb-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-md border border-amber-200">
                <div className="text-2xl font-bold text-amber-900">
                  {totalTopics}
                </div>
                <div className="text-sm text-amber-700">学习主题</div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-md border border-amber-200">
                <div className="text-2xl font-bold text-amber-900">
                  {totalKnowledgePoints}
                </div>
                <div className="text-sm text-amber-700">知识点</div>
              </div>
            </div>
          </div>

          {/* 知识树展示 */}
          {topics.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌱</div>
              <h2 className="text-2xl font-semibold text-amber-900 mb-4">
                还没有种下知识的种子
              </h2>
              <p className="text-amber-700 mb-6">
                赶快去记录你的第一个学习收获吧！
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-all shadow-md hover:shadow-lg"
              >
                <span className="mr-2">📝</span>
                开始记录
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02]"
                >
                  {/* 主题头部 */}
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-3xl">
                        {getTopicEmoji(topic.name)}
                      </div>
                      <div className="text-right">
                        <div className="text-sm opacity-90">知识点</div>
                        <div className="text-2xl font-bold">
                          {topic.knowledgePointsCount}
                        </div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{topic.name}</h3>
                    {topic.description && (
                      <p className="text-amber-100 text-sm">
                        {topic.description}
                      </p>
                    )}
                  </div>

                  {/* 主题内容 */}
                  <div className="p-6">
                    {/* 标签展示 */}
                    {topic.uniqueTags.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-amber-900 mb-2">
                          相关标签：
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {topic.uniqueTags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {topic.uniqueTags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{topic.uniqueTags.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 平均重要度 */}
                    {topic.knowledgePointsCount > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm"></div>
                      </div>
                    )}

                    {/* 最近更新时间 */}
                    {topic.recentUpdated && (
                      <div className="mb-4 text-xs text-amber-600">
                        最近更新：
                        {new Date(topic.recentUpdated).toLocaleDateString(
                          "zh-CN"
                        )}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex space-x-2 mt-4">
                      <Link
                        to={`/knowledge?topic=${topic.id}`}
                        className="flex-1 text-center px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-all"
                      >
                        查看概览
                      </Link>
                      <Link
                        to="/"
                        className="px-4 py-2 border border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition-all"
                      >
                        添加内容
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 底部操作 */}
          <div className="text-center mt-12">
            <Link
              to="/"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <span className="mr-2">🌰</span>
              收集新知识
              <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
