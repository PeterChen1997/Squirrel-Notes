import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useLoaderData, useNavigation, Link, Form } from "@remix-run/react";
import { useState, useEffect } from "react";
import {
  getLearningTopic,
  getAllLearningTopics,
  getAllTags,
  initDatabase,
  updateKnowledgePoint,
} from "~/lib/db.server";
import { analyzeLearningNote } from "~/lib/openai.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import Header from "~/components/Header";
import PageTitle from "~/components/PageTitle";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await initDatabase();

  const url = new URL(request.url);
  const content = url.searchParams.get("content");
  const topicId = url.searchParams.get("topicId");
  const knowledgeId = url.searchParams.get("knowledgeId");

  if (!content) {
    return redirect("/");
  }

  const {
    user,
    anonymousId,
    isDemo,
    headers: authHeaders,
  } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  // 获取现有主题和标签信息
  const topics = await getAllLearningTopics(userId);
  const selectedTopic = topicId ? await getLearningTopic(topicId) : null;
  const existingTags = await getAllTags(userId);

  // AI 分析内容
  const analysis = await analyzeLearningNote(
    content,
    topics
      .filter((t) => t.id)
      .map((t) => ({ id: t.id!, name: t.name, description: t.description })),
    existingTags
  );

  return json(
    {
      content,
      topicId,
      knowledgeId,
      selectedTopic,
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
  const intent = formData.get("intent");

  if (intent === "update_knowledge") {
    const knowledgeId = formData.get("knowledgeId") as string;
    const analysis = JSON.parse(formData.get("analysis") as string);

    if (!knowledgeId) {
      return json({ error: "缺少知识点ID" }, { status: 400 });
    }

    try {
      // 更新知识点 with AI分析结果
      await updateKnowledgePoint(knowledgeId, {
        title: analysis.title || "未命名知识点",
        summary: analysis.summary || "",
        confidence: analysis.confidence || 0.8,
        processing_status: "completed",
      });

      // 跳转到analyze页面
      return redirect(`/analyze?id=${knowledgeId}`);
    } catch (error) {
      console.error("更新知识点失败:", error);
      return json({ error: "更新失败，请重试" }, { status: 500 });
    }
  }

  return json({ error: "未知操作" }, { status: 400 });
};

export default function ProgressPage() {
  const { content, analysis, selectedTopic, knowledgeId, user, isDemo } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { text: "🐿️ 小松鼠正在仔细阅读...", emoji: "📖" },
    { text: "🧠 分析知识要点...", emoji: "💡" },
    { text: "🏷️ 智能分类整理...", emoji: "📝" },
    { text: "🌰 收集完成！", emoji: "✅" },
  ];

  // 模拟进度
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 100) {
          return Math.min(prev + Math.random() * 15 + 5, 100);
        }
        return prev;
      });
    }, 300);

    return () => clearInterval(timer);
  }, []);

  // 步骤切换
  useEffect(() => {
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(stepTimer);
  }, []);

  // 3秒后自动提交分析结果
  useEffect(() => {
    if (progress >= 100 && analysis && knowledgeId) {
      const redirectTimer = setTimeout(() => {
        // 自动提交表单
        const form = document.getElementById(
          "analysis-form"
        ) as HTMLFormElement;
        if (form) {
          form.submit();
        }
      }, 1000);

      return () => clearTimeout(redirectTimer);
    }
  }, [progress, analysis, knowledgeId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50 relative overflow-hidden">
      <Header user={user} isDemo={isDemo} />
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 text-6xl opacity-20 animate-float">
          🐿️
        </div>
        <div className="absolute bottom-32 left-20 text-4xl opacity-20 animate-float-delayed">
          🌰
        </div>
        <div className="absolute top-1/2 left-1/3 text-3xl opacity-15 animate-pulse">
          🍂
        </div>
      </div>

      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-amber-200">
          {/* 松鼠动画 */}
          <div className="mb-8">
            <div className="text-8xl mb-4 animate-bounce-slow">🐿️</div>
          </div>

          {/* 页面标题 */}
          <PageTitle
            title="小松鼠正在整理知识"
            subtitle="正在用小脑瓜分析你的学习内容，马上就好啦～"
            icon="🐿️"
            className="mb-8"
          />

          {/* 进度条 */}
          <div className="mb-8">
            <div className="w-full bg-amber-100 rounded-full h-3 mb-4">
              <div
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* 当前步骤 */}
            <div className="text-amber-700 text-base md:text-lg font-medium mb-4 flex items-center justify-center">
              <span className="mr-2 text-2xl">{steps[currentStep]?.emoji}</span>
              {steps[currentStep]?.text}
            </div>

            <div className="text-amber-500 text-sm">预计需要 3-5 秒</div>
          </div>

          {/* AI分析结果预览 */}
          {analysis && progress >= 80 && (
            <div className="animate-fade-in">
              <div className="bg-amber-50 rounded-2xl p-4 mb-6 border border-amber-200">
                <h3 className="text-amber-800 font-semibold mb-3 flex items-center justify-center">
                  <span className="mr-2">🏷️</span>
                  分析结果
                </h3>

                {/* 智能标签 */}
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                  <span className="px-3 py-1 bg-yellow-200 text-yellow-800 text-sm rounded-full">
                    🎯 {Math.round(analysis.confidence * 100)}%
                  </span>
                </div>

                {/* 建议标签 */}
                {analysis.suggested_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {analysis.suggested_tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        🌱 {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 完成状态 */}
          {progress >= 100 && (
            <div className="text-green-600 text-base font-medium animate-pulse">
              🎉 收集完成！正在跳转到整理页面...
            </div>
          )}

          {/* 隐藏的表单，用于提交分析结果 */}
          {analysis && knowledgeId && (
            <Form method="post" id="analysis-form" className="hidden">
              <input type="hidden" name="intent" value="update_knowledge" />
              <input type="hidden" name="knowledgeId" value={knowledgeId} />
              <input
                type="hidden"
                name="analysis"
                value={JSON.stringify(analysis)}
              />
            </Form>
          )}
        </div>
      </div>

      {/* 自定义动画样式 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes bounce-slow {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-15px);
          }
          60% {
            transform: translateY(-7px);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(-3deg);
          }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 3s ease-in-out infinite 1s;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `,
        }}
      />
    </div>
  );
}
