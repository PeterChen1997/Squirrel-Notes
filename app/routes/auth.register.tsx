import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import Label from "~/components/Label";
import {
  registerUser,
  createSession,
  createSessionCookie,
  getCurrentUser,
  getOrCreateAnonymousId,
} from "~/lib/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "注册 - 松鼠随记" },
    { name: "description", content: "注册松鼠随记，开始收集你的知识" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user, headers: authHeaders } = await getCurrentUser(request);
  if (user) {
    return redirect("/");
  }
  return json({}, { headers: authHeaders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !confirmPassword) {
    return json({ error: "请填写所有必填字段" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return json({ error: "两次输入的密码不一致" }, { status: 400 });
  }

  // 获取匿名用户ID用于数据绑定
  const anonymousId = await getOrCreateAnonymousId(request);

  const { user, error } = await registerUser(
    email,
    password,
    name || undefined,
    anonymousId
  );

  if (error) {
    return json({ error }, { status: 400 });
  }

  if (user) {
    console.log("用户注册成功:", user.email);
    const sessionId = await createSession(user.id!);
    console.log("创建会话ID:", sessionId);

    const cookieHeader = createSessionCookie(sessionId);
    console.log("设置cookie:", cookieHeader);

    return redirect("/", {
      headers: {
        "Set-Cookie": cookieHeader,
      },
    });
  }

  return json({ error: "注册失败" }, { status: 400 });
};

export default function Register() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50 relative overflow-hidden">
      {/* 背景装饰 */}
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

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Logo和标题 */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-3 mb-4">
              <div className="text-4xl">🐿️</div>
              <div>
                <h1 className="text-2xl font-bold text-amber-900">松鼠随记</h1>
                <div className="text-sm text-amber-600">勤奋收集知识</div>
              </div>
            </Link>
            <p className="text-amber-700 text-lg">加入松鼠大家庭！</p>
            <p className="text-amber-600 text-sm mt-1">
              注册后可以保存和同步你的学习笔记
            </p>
          </div>

          {/* 注册表单 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 p-6">
            <Form method="post" className="space-y-4">
              {actionData?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {actionData.error}
                </div>
              )}

              <div>
                <Label htmlFor="name" className="text-amber-900 mb-2">
                  姓名 <span className="text-amber-500 text-xs">(可选)</span>
                </Label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="请输入你的姓名"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-amber-900 mb-2" required>
                  邮箱地址
                </Label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="text-amber-900 mb-2"
                  required
                >
                  密码
                </Label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="至少6个字符"
                />
              </div>

              <div>
                <Label
                  htmlFor="confirmPassword"
                  className="text-amber-900 mb-2"
                  required
                >
                  确认密码
                </Label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="再次输入密码"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:scale-100"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    注册中...
                  </div>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">🎉</span>
                    立即注册
                  </span>
                )}
              </button>
            </Form>

            {/* 数据绑定提示 */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <div className="text-amber-500 text-sm mr-2">💡</div>
                <div className="text-amber-700 text-xs">
                  注册后，你之前在本设备上创建的匿名笔记将自动绑定到你的账户
                </div>
              </div>
            </div>

            {/* 登录链接 */}
            <div className="mt-6 text-center">
              <p className="text-amber-600 text-sm">
                已有账号？
                <Link
                  to="/auth/login"
                  className="text-amber-700 hover:text-amber-800 font-medium ml-1 underline decoration-amber-300 hover:decoration-amber-500 transition-colors"
                >
                  立即登录
                </Link>
              </p>
            </div>

            {/* 返回首页 */}
            <div className="mt-4 text-center">
              <Link
                to="/"
                className="text-amber-500 hover:text-amber-600 text-sm inline-flex items-center transition-colors"
              >
                <span className="mr-1">←</span>
                继续浏览示例内容
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
