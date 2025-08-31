import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { useState, useRef } from "react";

// 添加Web Speech API类型定义
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
import { Form, useNavigation, useLoaderData, Link } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import {
  getAllLearningTopics,
  initDatabase,
  createKnowledgePoint,
  getAllTags,
} from "~/lib/db.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import { analyzeLearningNote } from "~/lib/openai.server";
import Header from "~/components/Header";
import Textarea from "~/components/Textarea";
import PageTitle from "~/components/PageTitle";

export const meta: MetaFunction = () => {
  return [
    { title: "松鼠随记 - 聪明的知识收集助手" },
    {
      name: "description",
      content: "🐿️ 像松鼠一样勤奋收集知识！AI 智能分类，让学习变得有趣高效",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await initDatabase();
  const {
    user,
    anonymousId,
    isDemo,
    headers: authHeaders,
  } = await getCurrentUser(request);

  // 根据用户状态获取主题
  const userId = user?.id || anonymousId;
  const topics = await getAllLearningTopics(userId);

  const responseData = { topics, user, isDemo };

  return json(responseData, { headers: authHeaders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { user, anonymousId, isDemo } = await getCurrentUser(request);
  const userId = user?.id || anonymousId;

  const formData = await request.formData();
  const content = formData.get("content") as string;

  if (!content?.trim()) {
    return json({ error: "内容不能为空" }, { status: 400 });
  }

  try {
    // 先保存到数据库（不进行AI分析）
    const savedKnowledge = await createKnowledgePoint({
      title: content.substring(0, 50) + "...", // 临时标题
      user_id: userId,
      content: content.trim(),
      learning_topic_id: undefined,
      summary: "", // 暂时为空
      tag_ids: [],
      keywords: [],
      confidence: 0,
      related_ids: [],
      attachments: [],
      processing_status: "processing", // 标记为处理中
    });

    // 跳转到progress页面显示分析进度
    const params = new URLSearchParams();
    params.set("content", content);
    params.set("knowledgeId", savedKnowledge.id!);

    return redirect(`/progress?${params.toString()}`);
  } catch (error) {
    console.error("保存笔记失败:", error);
    return json({ error: "保存失败，请重试" }, { status: 500 });
  }
};

export default function Index() {
  const { topics, user, isDemo } = useLoaderData<typeof loader>();

  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const navigation = useNavigation();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // 检查是否正在提交或加载
  const isSubmitting =
    navigation.state === "submitting" || navigation.state === "loading";

  const examples = [
    "今天网球课学习了正手击球要点：击球点要在身体前方，挥拍时要转动腰部",
    "编程学习：React Hooks 的 useEffect 依赖数组为空时只执行一次",
    "英语学习：today、tomorrow 发音要注意重音在第一个音节",
    "数学：二次函数的顶点公式是 (-b/2a, 4ac-b²/4a)",
  ];

  // 开始语音识别
  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("您的浏览器不支持语音识别功能");
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "zh-CN";

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setContent((prev) => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("语音识别错误:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("语音识别启动失败:", error);
      alert("无法启动语音识别，请检查麦克风权限");
    }
  };

  // 停止语音识别
  const stopSpeechRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50 relative overflow-hidden">
      <Header user={user} isDemo={isDemo} />

      {/* 背景装饰松鼠元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 text-6xl opacity-10 transform rotate-12">
          🐿️
        </div>
        <div className="absolute bottom-20 left-10 text-4xl opacity-10 transform -rotate-12">
          🌰
        </div>
        <div className="absolute top-1/3 left-1/4 text-3xl opacity-10">🍂</div>
        <div className="absolute bottom-1/3 right-1/4 text-3xl opacity-10">
          🌳
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* 页面标题 */}
          <PageTitle
            title="松鼠随记"
            subtitle="知识不用理，松鼠来帮忙"
            icon="🐿️"
            className="mb-12"
          />

          <Form method="post" className="space-y-6">
            {/* 输入区域 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 overflow-hidden animate-slide-up relative z-10">
              {/* 输入模式切换 */}
              <div className="border-b border-amber-100 p-4 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-amber-900 flex items-center">
                    <span className="mr-2">📝</span>
                    小松鼠收集时间
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={
                        isListening
                          ? stopSpeechRecognition
                          : startSpeechRecognition
                      }
                      className={`group relative flex items-center justify-center px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                        isListening
                          ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                          : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white hover:from-amber-500 hover:via-orange-500 hover:to-amber-600"
                      }`}
                    >
                      {/* 录音动效圆圈 */}
                      <div
                        className={`relative ${
                          isRecording ? "animate-pulse" : ""
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                            isListening ? "bg-white/20" : "bg-white/30"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isListening
                                ? "bg-white animate-pulse"
                                : "bg-white"
                            }`}
                          ></div>
                        </div>
                        {/* 语音识别时的声波效果 */}
                        {isListening && (
                          <>
                            <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping"></div>
                            <div className="absolute inset-0 rounded-full border border-white/30 animate-ping animation-delay-75"></div>
                          </>
                        )}
                      </div>

                      {/* 悬浮效果光晕 */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* 文本输入区域 */}
              <div className="pb-4 px-4">
                <div className="space-y-4">
                  {/* 输入框 */}
                  <div className="relative">
                    <Textarea
                      name="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="🌰 告诉小松鼠你今天学到了什么新知识吧～ 比如：今天网球课学到的发球技巧..."
                      className={`h-40 ${
                        isSubmitting ? "opacity-60 pointer-events-none" : ""
                      }`}
                      rows={6}
                      required
                      disabled={isSubmitting}
                      variant="amber"
                    />

                    {/* 字符计数器 - 放在右下角 */}
                    <div className="absolute bottom-2 right-3 text-sm font-medium text-amber-700 flex items-center bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm border border-amber-200 mb-3">
                      <span className="mr-1">🐿️</span>
                      <span className="text-amber-800">{content.length}</span>
                      <span className="text-amber-500 mx-1">/</span>
                      <span className="text-amber-600">1000</span>
                    </div>
                  </div>

                  {/* 底部操作区域 */}
                  <div className="flex items-center justify-between">
                    {/* 提示文本 */}
                    <div className="text-sm text-amber-600 flex items-center">
                      <span className="mr-1">💡</span>
                      分析和分类交给我把
                    </div>

                    {/* 保存按钮 */}
                    <button
                      type="submit"
                      disabled={!content.trim() || isSubmitting}
                      className={`px-6 py-3 font-medium rounded-xl transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed ${
                        isSubmitting
                          ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                      } ${
                        !content.trim()
                          ? "disabled:from-gray-300 disabled:to-gray-400"
                          : ""
                      }`}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>
                            思考中...
                            {/* {navigation.state === "submitting"
                              ? "loading..."
                              : "页面跳转中..."} */}
                          </span>
                        </div>
                      ) : (
                        <span className="flex items-center">
                          <span className="mr-2">🚀</span>
                          走你
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* 隐藏字段 */}
                <input type="hidden" name="intent" value="analyze" />
              </div>
            </div>

            {/* 示例卡片 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 p-6 animate-slide-up relative z-10">
              <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center">
                <span className="mr-2">🌰</span>
                松鼠的学习示例 - 点击试试看
              </h3>
              <div className="grid gap-3">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => !isSubmitting && setContent(example)}
                    className={`text-left p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all text-amber-800 hover:text-amber-900 border border-amber-100 hover:border-amber-300 shadow-sm hover:shadow-md ${
                      isSubmitting ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    disabled={isSubmitting}
                  >
                    <span className="text-sm flex items-start">
                      <span className="mr-2 text-amber-500">🐿️</span>
                      {example}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI 智能分析预览 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <span className="mr-2">🤖</span>
                AI 智能分析流程
              </h3>
              <div className="space-y-4">
                {[
                  {
                    num: 1,
                    title: "内容理解",
                    desc: "AI 分析学习内容的主题和要点",
                    color: "bg-blue-500",
                  },
                  {
                    num: 2,
                    title: "智能分类",
                    desc: "自动归类到合适的知识领域",
                    color: "bg-green-500",
                  },
                  {
                    num: 3,
                    title: "关键词提取",
                    desc: "提取重要概念和关键信息",
                    color: "bg-purple-500",
                  },
                  {
                    num: 4,
                    title: "知识整合",
                    desc: "与已有内容建立关联",
                    color: "bg-orange-500",
                  },
                ].map((step, index) => (
                  <div key={step.num} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-lg ${step.color} text-white text-sm font-bold flex items-center justify-center mr-4 shadow-sm`}
                    >
                      {step.num}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-gray-900">
                        {step.title}
                      </div>
                      <div className="text-sm text-gray-600">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Form>

          {/* 最近记录的知识点预览 */}
          <div className="mt-12 text-center">
            <Link
              to="/knowledge"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              查看我的知识库
              <svg
                className="ml-1 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* 添加自定义动画样式 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `,
        }}
      />
    </div>
  );
}
