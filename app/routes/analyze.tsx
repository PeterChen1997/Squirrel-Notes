import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useState } from "react";
import { Form, useLoaderData, useNavigation, Link } from "@remix-run/react";

export const meta = () => {
  return [{ title: "智能分析笔记 - 松鼠随记" }];
};
import {
  getKnowledgePoint,
  updateKnowledgePoint,
  getLearningTopic,
  getAllLearningTopics,
  getAllKnowledgePoints,
  createLearningTopic,
  getAllTags,
  createOrGetTags,
  initDatabase,
} from "~/lib/db.server";
import { analyzeLearningNote } from "~/lib/openai.server";
import { getCurrentUser } from "~/lib/auth.server";
import Header from "~/components/Header";
import Input from "~/components/Input";
import Select from "~/components/Select";
import PageTitle from "~/components/PageTitle";
import Label from "~/components/Label";
import { Container, Text, Panel, Button, Badge } from "~/components/ui";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await initDatabase();

  const {
    user,
    anonymousId,
    isDemo,
    headers: authHeaders,
  } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const url = new URL(request.url);
  const knowledgeId = url.searchParams.get("id");

  if (!knowledgeId) {
    return redirect("/");
  }

  // 获取已保存的知识点
  const knowledgePoint = await getKnowledgePoint(knowledgeId, userId);
  if (!knowledgePoint) {
    return redirect("/");
  }

  // 获取现有主题和标签信息
  const topics = await getAllLearningTopics(userId);
  const selectedTopic = knowledgePoint.learning_topic_id
    ? await getLearningTopic(knowledgePoint.learning_topic_id)
    : null;
  const existingTags = await getAllTags(userId);

  // 重新分析内容，提供编辑建议
  let analysis = null;
  try {
    analysis = await analyzeLearningNote(
      knowledgePoint.content,
      topics
        .filter((t) => t.id)
        .map((t) => ({ id: t.id!, name: t.name, description: t.description })),
      existingTags
    );
  } catch (error) {
    console.error("AI分析失败:", error);
    // 如果AI分析失败，仍然返回基本数据
  }

  return json(
    {
      knowledgePoint,
      selectedTopic,
      topics,
      existingTags,
      analysis,
      user,
      isDemo,
    },
    { headers: authHeaders }
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

  if (intent === "update") {
    // 处理更新请求
    const knowledgeId = formData.get("knowledgeId") as string;
    const content = formData.get("content") as string;
    const title = formData.get("title") as string;
    let learningTopicId = formData.get("learningTopicId") as string;
    const tags = formData.get("tags") as string;

    if (!knowledgeId || !content || !title) {
      throw new Error("缺少必要信息");
    }

    // 验证知识点归属
    const existingKnowledge = await getKnowledgePoint(knowledgeId, userId);
    if (!existingKnowledge) {
      return json({ error: "知识点不存在或无权限" }, { status: 404 });
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
    const tagIds = createdTags
      .map((tag) => tag.id)
      .filter((id): id is string => Boolean(id));

    // 获取 AI 分析摘要
    const summaryFromForm = formData.get("summary") as string;

    // 计算学习时长（基于内容长度和复杂度的简单估算）
    const contentLength = content.length;
    let estimatedMinutes = 15; // 默认15分钟

    // 简单的时长估算逻辑
    if (contentLength < 200) {
      estimatedMinutes = 5;
    } else if (contentLength < 500) {
      estimatedMinutes = 10;
    } else if (contentLength < 1000) {
      estimatedMinutes = 20;
    } else {
      estimatedMinutes = Math.min(60, 15 + Math.floor(contentLength / 200));
    }

    // 更新知识点，包含学习时长
    await updateKnowledgePoint(knowledgeId, {
      title,
      content,
      summary: summaryFromForm || undefined, // 保存 AI 摘要
      tag_ids: tagIds,
      keywords: [],
      learning_topic_id: learningTopicId || undefined,
      study_duration_minutes: estimatedMinutes, // 保存估算的学习时长
    });

    return redirect(`/knowledge/${knowledgeId}?updated=true`);
  }

  return null;
};

export default function AnalyzePage() {
  const {
    knowledgePoint,
    analysis,
    selectedTopic,
    topics,
    existingTags,
    user,
    isDemo,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [editedTitle, setEditedTitle] = useState(
    knowledgePoint.title || (analysis?.title || "")
  );
  const [editedTags, setEditedTags] = useState(
    knowledgePoint.tags
      ?.map((tag) => (typeof tag === "string" ? tag : tag.name))
      .join(", ") || (analysis?.suggested_tags?.join(", ") || "")
  );
  const [editedTopicId, setEditedTopicId] = useState(() => {
    // 优先使用现有知识点的主题
    if (selectedTopic?.id) {
      return selectedTopic.id;
    }
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

  // 新增：表单编辑状态控制
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  // 监听主题更改，当主题被更改后禁用表单
  const handleTopicChange = (value: string) => {
    setEditedTopicId(value);
    if (value && value !== editedTopicId) {
      // 主题被更改了，禁用表单
      setIsFormDisabled(true);
    }
  };

  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header user={user} isDemo={isDemo} />

      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <PageTitle
            title="智能分析笔记"
            subtitle="🤖 AI 已为您分析完成，请检查和编辑结果"
            icon="✏️"
            className="mb-8"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：AI摘要 + 原始内容 */}
            <Container variant="card" padding="md" className="space-y-6">
              {/* AI 摘要 */}
              {analysis?.summary && (
                <Panel title="AI 智能摘要" icon="🤖" theme="blue" size="sm">
                  <Text size="sm" color="primary" className="leading-relaxed">
                    {analysis.summary}
                  </Text>
                </Panel>
              )}

              {/* 原始内容 */}
              <div>
                <Text size="lg" weight="semibold" color="primary" className="mb-4 flex items-center">
                  <span className="mr-2">📝</span>
                  原始内容
                </Text>
                <Container variant="default" padding="sm">
                  <Text color="primary" className="leading-relaxed whitespace-pre-wrap">
                    {knowledgePoint.content}
                  </Text>
                </Container>
              </div>

              {selectedTopic && (
                <Container variant="default" padding="sm">
                  <Text size="sm" color="primary">
                    <span className="font-medium">选择的学习主题：</span>
                    {selectedTopic.name}
                  </Text>
                </Container>
              )}
            </Container>

            {/* 右侧：AI 分析结果和编辑 */}
            <Container variant="card" padding="md">
              <Text size="lg" weight="semibold" color="primary" className="mb-6 flex items-center">
                <span className="mr-2">🐿️</span>
                小松鼠的分析结果
                {analysis && (
                  <Badge variant="amber" size="sm" className="ml-2">
                    置信度: {Math.round(analysis.confidence * 100)}%
                  </Badge>
                )}
              </Text>

              <Form method="post" className="space-y-6">
                <input type="hidden" name="intent" value="update" />
                <input
                  type="hidden"
                  name="knowledgeId"
                  value={knowledgePoint.id}
                />
                <input
                  type="hidden"
                  name="content"
                  value={knowledgePoint.content}
                />
                <input
                  type="hidden"
                  name="summary"
                  value={analysis?.summary || ""}
                />
                <input
                  type="hidden"
                  name="topicId"
                  value={selectedTopic?.id || ""}
                />
                <input type="hidden" name="intent" value="save" />

                {/* 学习主题选择 - 优化为 select + 自定义输入框 */}
                <Panel
                  title="选择学习主题"
                  icon="🎯"
                  theme="blue"
                  size="sm"
                >
                  {analysis?.recommended_topic && (
                    <div className="mb-3">
                      <Badge variant="blue" size="sm">
                        AI 推荐: {analysis.recommended_topic.name}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* 主题选择下拉框 */}
                    <Select
                      name="learningTopicId"
                      value={editedTopicId}
                      onChange={(e) => {
                        handleTopicChange(e.target.value);
                        // 当选择自定义时，如果还没有自定义名称且有AI推荐，则填入推荐名称
                        if (
                          e.target.value === "__custom__" &&
                          !customTopicName &&
                          analysis?.recommended_topic?.name
                        ) {
                          setCustomTopicName(analysis.recommended_topic.name);
                        }
                      }}
                      disabled={isFormDisabled}
                      variant="blue"
                      options={[
                        { value: "", label: "不关联学习主题" },
                        ...topics.map((topic) => ({
                          value: topic.id!,
                          label: `📚 ${topic.name}`,
                        })),
                        { value: "__custom__", label: "✨ 自定义新主题" },
                      ]}
                    />

                    {/* 自定义主题输入框 */}
                    {editedTopicId === "__custom__" && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-300 dark:border-blue-600 p-3">
                        <Input
                          label="自定义主题名称:"
                          name="customTopicName"
                          value={customTopicName}
                          onChange={(e) => setCustomTopicName(e.target.value)}
                          placeholder="输入新的学习主题名称..."
                          required
                          variant="blue"
                          size="sm"
                          disabled={isFormDisabled}
                        />
                        {analysis.recommended_topic?.description &&
                          customTopicName ===
                            analysis.recommended_topic.name && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              💡 {analysis.recommended_topic.description}
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                </Panel>

                {/* 标题编辑 */}
                <Input
                  label="📝 笔记标题"
                  name="title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="为你的学习笔记起个标题..."
                  required
                  variant="amber"
                  disabled={isFormDisabled}
                />

                {/* 标签管理 + AI 洞察合并 */}
                <Panel
                  title="智能标签管理"
                  icon="🏷️"
                  theme="green"
                  size="sm"
                >
                  <div className="mb-3">
                    <Badge variant="green" size="sm">
                      置信度 {Math.round((analysis?.confidence || 0) * 100)}%
                    </Badge>
                  </div>

                  {/* 标签输入框 */}
                  <Input
                    name="tags"
                    value={editedTags}
                    onChange={(e) => setEditedTags(e.target.value)}
                    placeholder="例如：技术要点, 实践经验, 学习心得"
                    variant="green"
                    className="mb-3"
                    disabled={isFormDisabled}
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
                            <div
                              key={index}
                              className="flex items-center px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full border border-green-400 font-medium group hover:bg-green-300 transition-colors"
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const tags = editedTags
                                    .split(",")
                                    .map((t) => t.trim())
                                    .filter(Boolean);
                                  const newTags = tags.filter(
                                    (_, i) => i !== index
                                  );
                                  setEditedTags(newTags.join(", "));
                                }}
                                className="ml-1 text-green-600 hover:text-green-800 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="删除标签"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </Panel>

                {/* 提交按钮 - 优化样式 */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting || !editedTitle.trim()}
                    loading={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        小松鼠更新中...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">✏️</span>
                        更新笔记
                      </>
                    )}
                  </Button>

                  <Link
                    to="/"
                    className="inline-flex"
                  >
                    <Button
                      variant="secondary"
                      size="lg"
                      type="button"
                    >
                      <span className="mr-2">🔄</span>
                      重新记录
                    </Button>
                  </Link>
                </div>
              </Form>
            </Container>
          </div>
        </div>
      </div>
    </div>
  );
}
