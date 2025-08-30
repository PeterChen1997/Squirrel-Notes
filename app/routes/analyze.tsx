import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useState } from "react";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";
import {
  createKnowledgePoint,
  getLearningTopic,
  getAllLearningTopics,
  getAllKnowledgePoints,
  createLearningTopic,
  getAllTags,
  createOrGetTags,
  initDatabase,
} from "~/lib/db.server";
import { analyzeLearningNote } from "~/lib/openai.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import Header from "~/components/Header";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await initDatabase();

  const { user, anonymousId, isDemo } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const url = new URL(request.url);
  const content = url.searchParams.get("content");
  const topicId = url.searchParams.get("topicId");

  if (!content) {
    return redirect("/");
  }

  // 获取现有主题和标签信息
  const topics = await getAllLearningTopics(userId);
  const selectedTopic = topicId ? await getLearningTopic(topicId) : null;
  const existingTags = await getAllTags(userId);

  // AI 分析内容
  const analysis = await analyzeLearningNote(content, topics, existingTags);

  const headers: HeadersInit = {};
  if (anonymousId && !user) {
    headers["Set-Cookie"] = createAnonymousCookie(anonymousId);
  }

  return json(
    {
      content,
      topicId,
      selectedTopic,
      topics,
      existingTags,
      analysis,
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
    let learningTopicId = formData.get("learningTopicId") as string;
    const tags = formData.get("tags") as string;

    if (!content || !title) {
      throw new Error("缺少必要信息");
    }

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
          .filter(Boolean)
      : [];
    const createdTags =
      tagNames.length > 0 ? await createOrGetTags(tagNames, userId) : [];
    const tagIds = createdTags.map((tag) => tag.id).filter(Boolean);

    // 获取 AI 分析摘要
    const summaryFromForm = formData.get("summary") as string;

    // 创建知识点（移除重要程度，使用默认值）
    const knowledgePoint = await createKnowledgePoint({
      title,
      content,
      summary: summaryFromForm || undefined, // 保存 AI 摘要
      tag_ids: tagIds,
      keywords: [],

      confidence: 0.8,
      learning_topic_id: learningTopicId || undefined,
      related_ids: [],
      attachments: [],
      processing_status: "completed",
      user_id: userId,
    });

    return redirect(`/knowledge/${knowledgePoint.id}`);
  }

  return null;
};

export default function AnalyzePage() {
  const {
    content,
    analysis,
    selectedTopic,
    topics,
    existingTags,
    user,
    isDemo,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [editedTitle, setEditedTitle] = useState(analysis.title);
  const [editedTags, setEditedTags] = useState(
    analysis.suggested_tags.join(", ")
  );
  const [editedTopicId, setEditedTopicId] = useState(() => {
    // 如果AI推荐了现有主题，自动选中
    if (analysis.recommended_topic?.existing_topic_id) {
      return analysis.recommended_topic.existing_topic_id;
    }
    // 如果AI推荐了新主题，设置为自定义选项
    if (analysis.recommended_topic?.is_new) {
      return "__custom__";
    }
    return "";
  });

  // 新增：自定义主题名称状态
  const [customTopicName, setCustomTopicName] = useState(() => {
    // 如果AI推荐了新主题，默认填入推荐的名称
    return analysis.recommended_topic?.is_new
      ? analysis.recommended_topic.name
      : "";
  });

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50">
      <Header user={user} isDemo={isDemo} />

      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：AI摘要 + 原始内容 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6">
              {/* AI 摘要 - 移到前面 */}
              {analysis.summary && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                    <span className="mr-2">🤖</span>
                    AI 智能摘要
                  </h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>
              )}

              {/* 原始内容 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📝</span>
                  原始内容
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {content}
                  </p>
                </div>
              </div>

              {selectedTopic && (
                <div className="p-3 bg-blue-50 rounded-lg">
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
                <input type="hidden" name="intent" value="save" />
                <input type="hidden" name="content" value={content} />
                <input
                  type="hidden"
                  name="summary"
                  value={analysis.summary || ""}
                />
                <input
                  type="hidden"
                  name="topicId"
                  value={selectedTopic?.id || ""}
                />
                <input type="hidden" name="intent" value="save" />

                {/* 学习主题选择 - 优化为 select + 自定义输入框 */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-3 flex items-center">
                    <span className="mr-2">🎯</span>
                    选择学习主题
                    {analysis.recommended_topic && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        AI 推荐: {analysis.recommended_topic.name}
                      </span>
                    )}
                  </label>

                  <div className="space-y-3">
                    {/* 主题选择下拉框 */}
                    <select
                      name="learningTopicId"
                      value={editedTopicId}
                      onChange={(e) => {
                        setEditedTopicId(e.target.value);
                        // 当选择自定义时，如果还没有自定义名称且有AI推荐，则填入推荐名称
                        if (
                          e.target.value === "__custom__" &&
                          !customTopicName &&
                          analysis.recommended_topic?.name
                        ) {
                          setCustomTopicName(analysis.recommended_topic.name);
                        }
                      }}
                      className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">不关联学习主题</option>
                      {topics.map((topic) => (
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
                          onChange={(e) => setCustomTopicName(e.target.value)}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="输入新的学习主题名称..."
                          required
                        />
                        {analysis.recommended_topic?.description &&
                          customTopicName ===
                            analysis.recommended_topic.name && (
                            <p className="text-xs text-blue-600 mt-2">
                              💡 {analysis.recommended_topic.description}
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 标题编辑 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">📝</span>
                    笔记标题
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="为你的学习笔记起个标题..."
                    required
                  />
                </div>

                {/* 标签管理 + AI 洞察合并 */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <label className="block text-sm font-medium text-green-900 mb-3 flex items-center">
                    <span className="mr-2">🏷️</span>
                    智能标签管理
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      置信度 {Math.round(analysis.confidence * 100)}%
                    </span>
                  </label>

                  {/* 标签输入框 */}
                  <input
                    type="text"
                    name="tags"
                    value={editedTags}
                    onChange={(e) => setEditedTags(e.target.value)}
                    className="w-full px-4 py-3 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white mb-3"
                    placeholder="例如：技术要点, 实践经验, 学习心得"
                  />

                  {/* AI 推荐标签和关键词（去重后） */}
                  {(() => {
                    // 合并并去重关键词和推荐标签
                    const allSuggestions = [
                      ...new Set([
                        ...analysis.keywords,
                        ...analysis.suggested_tags,
                      ]),
                    ];

                    return (
                      allSuggestions.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs text-green-700 font-medium block mb-2 flex items-center">
                            <span className="mr-1">🤖</span>
                            AI 推荐标签 (点击添加):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {allSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  if (!editedTags.includes(suggestion)) {
                                    setEditedTags(
                                      editedTags
                                        ? `${editedTags}, ${suggestion}`
                                        : suggestion
                                    );
                                  }
                                }}
                                className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full hover:bg-green-200 transition-colors cursor-pointer border border-green-300"
                                title="点击添加到标签"
                              >
                                + {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    );
                  })()}

                  {/* 实时预览当前标签 */}
                  {editedTags.trim() && (
                    <div>
                      <span className="text-xs text-green-700 font-medium block mb-2">
                        当前标签预览:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {editedTags
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full border border-green-400 font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 提交按钮 - 优化样式 */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSubmitting || !editedTitle.trim()}
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:scale-100"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
                    className="px-6 py-4 border-2 border-amber-300 text-amber-700 font-semibold rounded-xl hover:bg-amber-50 transition-all text-center shadow-md hover:shadow-lg"
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
