import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useState, useRef } from "react";
import { Form, useNavigation, useLoaderData, Link } from "@remix-run/react";
import { json } from "@remix-run/node";
import { getAllLearningTopics } from "~/lib/db.server";
import { initDatabase } from "~/lib/db.server";
import { getCurrentUser, createAnonymousCookie } from "~/lib/auth.server";
import Header from "~/components/Header";

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
  const { user, anonymousId, isDemo } = await getCurrentUser(request);

  // 根据用户状态获取主题
  const userId = user?.id || anonymousId;
  const topics = await getAllLearningTopics(userId);

  const headers: HeadersInit = {};
  if (anonymousId && !user) {
    headers["Set-Cookie"] = createAnonymousCookie(anonymousId);
  }

  const responseData = { topics, user, isDemo };

  return json(responseData, { headers });
};

export default function Index() {
  const { topics, user, isDemo } = useLoaderData<typeof loader>();

  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const navigation = useNavigation();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const examples = [
    "今天网球课学习了正手击球要点：击球点要在身体前方，挥拍时要转动腰部",
    "编程学习：React Hooks 的 useEffect 依赖数组为空时只执行一次",
    "英语学习：today、tomorrow 发音要注意重音在第一个音节",
    "数学：二次函数的顶点公式是 (-b/2a, 4ac-b²/4a)",
  ];

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        // 这里可以上传音频并转写
        console.log("录音完成", audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("录音启动失败:", error);
      alert("无法启动录音，请检查麦克风权限");
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
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
          {/* 标题区域 */}
          <div className="text-center mb-12 animate-fade-in relative z-10">
            <div className="text-6xl mb-4">🐿️</div>
            <h2 className="text-3xl md:text-4xl font-bold text-amber-900 mb-4">
              小松鼠要收集知识啦！
            </h2>
            <p className="text-lg text-amber-700">
              🌰 像松鼠储存坚果一样，让我帮你整理每一个学习收获
            </p>
          </div>

          <Form method="post" action="/analyze" className="space-y-6">
            {/* 输入区域 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 overflow-hidden animate-slide-up relative z-10">
              {/* 输入模式切换 */}
              <div className="border-b border-amber-100 p-4 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-amber-900 flex items-center">
                    <span className="mr-2">📝</span>
                    小松鼠收集时间
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`group relative flex items-center justify-center px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                        isRecording
                          ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                          : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-white hover:from-amber-500 hover:via-orange-500 hover:to-amber-600"
                      }`}
                    >
                      {/* 录音动效圆圈 */}
                      <div
                        className={`relative mr-3 ${
                          isRecording ? "animate-pulse" : ""
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                            isRecording ? "bg-white/20" : "bg-white/30"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isRecording
                                ? "bg-white animate-pulse"
                                : "bg-white"
                            }`}
                          ></div>
                        </div>
                        {/* 录音时的声波效果 */}
                        {isRecording && (
                          <>
                            <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping"></div>
                            <div className="absolute inset-0 rounded-full border border-white/30 animate-ping animation-delay-75"></div>
                          </>
                        )}
                      </div>

                      {/* 按钮文本 */}
                      <span className="flex items-center">
                        {isRecording ? (
                          <>
                            <span className="mr-1">🛑</span>
                            <span>停止录音</span>
                          </>
                        ) : (
                          <>
                            <span className="mr-1">🎙️</span>
                            <span>语音记录</span>
                          </>
                        )}
                      </span>

                      {/* 悬浮效果光晕 */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>

                    {/* 录音状态提示 */}
                    {isRecording && (
                      <div className="flex items-center text-red-600 text-sm font-medium animate-pulse">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                        录音中...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 文本输入区域 */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* 输入框 */}
                  <div className="relative">
                    <textarea
                      name="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="🌰 告诉小松鼠你今天学到了什么新知识吧～ 比如：今天网球课学到的发球技巧..."
                      className="w-full p-4 text-base border-2 border-amber-200 rounded-xl focus:border-amber-500 focus:outline-none resize-none h-40 text-amber-900 placeholder-amber-400 transition-all bg-amber-25"
                      rows={6}
                      required
                    />

                    {/* 字符计数器 - 放在右下角 */}
                    <div className="absolute bottom-2 right-3 text-xs text-amber-400 flex items-center bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                      <span className="mr-1">🐿️</span>
                      {content.length}/1000
                    </div>
                  </div>

                  {/* 底部操作区域 */}
                  <div className="flex items-center justify-between">
                    {/* 提示文本 */}
                    <div className="text-sm text-amber-600 flex items-center">
                      <span className="mr-1">💡</span>
                      小松鼠会智能分析并分类你的知识
                    </div>

                    {/* 保存按钮 */}
                    <button
                      type="submit"
                      disabled={
                        !content.trim() || navigation.state === "submitting"
                      }
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:scale-100"
                    >
                      {navigation.state === "submitting" ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          AI分析中...
                        </div>
                      ) : (
                        <span className="flex items-center">
                          <span className="mr-2">🚀</span>
                          智能收集
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
                    onClick={() => setContent(example)}
                    className="text-left p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all text-amber-800 hover:text-amber-900 border border-amber-100 hover:border-amber-300 shadow-sm hover:shadow-md"
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
