import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import Label from "~/components/Label";
import { Container, Text, Button } from "~/components/ui";
import {
  loginUser,
  createSession,
  createSessionCookie,
  getCurrentUser,
} from "~/lib/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "登录 - 松鼠随记" },
    { name: "description", content: "登录松鼠随记，开始收集你的知识" },
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

  if (!email || !password) {
    return json({ error: "请填写所有必填字段" }, { status: 400 });
  }

  const { user, error } = await loginUser(email, password);

  if (error) {
    return json({ error }, { status: 400 });
  }

  if (user) {
    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      console.log("用户登录成功:", user.email);
    }

    const sessionId = await createSession(user.id!);

    if (isDev) {
      console.log("创建会话ID:", sessionId.substring(0, 8) + "...");
    }

    const cookieHeader = createSessionCookie(sessionId);

    return redirect("/", {
      headers: {
        "Set-Cookie": cookieHeader,
      },
    });
  }

  return json({ error: "登录失败" }, { status: 400 });
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-25 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
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
                <Text size="xl" weight="bold" color="primary" className="text-amber-900 dark:text-amber-100">
                  松鼠随记
                </Text>
                <Text size="sm" color="secondary" className="text-amber-600 dark:text-amber-400">
                  勤奋收集知识
                </Text>
              </div>
            </Link>
            <Text size="lg" color="primary" className="text-amber-700 dark:text-amber-300">
              欢迎回来！
            </Text>
            <Text size="sm" color="secondary" className="text-amber-600 dark:text-amber-400 mt-1">
              登录后继续收集你的知识宝藏
            </Text>
          </div>

          {/* 登录表单 */}
          <Container variant="glass" padding="md">
            <Form method="post" className="space-y-4">
              {actionData?.error && (
                <Container variant="default" padding="sm" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <Text size="sm" color="error" className="text-red-700 dark:text-red-300">
                    {actionData.error}
                  </Text>
                </Container>
              )}

              <div>
                <Label
                  htmlFor="email"
                  className="text-amber-900 dark:text-amber-100 mb-2"
                >
                  邮箱地址
                </Label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 border border-amber-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="text-amber-900 dark:text-amber-100 mb-2"
                >
                  密码
                </Label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full px-4 py-3 border border-amber-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="请输入密码"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
                className="w-full"
              >
                登录
              </Button>
            </Form>

            {/* 注册链接 */}
            <div className="mt-6 text-center">
              <Text size="sm" color="secondary" className="text-amber-600 dark:text-amber-400">
                还没有账号？
                <Link
                  to="/auth/register"
                  className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 font-medium ml-1 underline decoration-amber-300 hover:decoration-amber-500 transition-colors"
                >
                  立即注册
                </Link>
              </Text>
            </div>

            {/* 返回首页 */}
            <div className="mt-4 text-center">
              <Link
                to="/"
                className="text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 text-sm inline-flex items-center transition-colors"
              >
                <span className="mr-1">←</span>
                <Text size="sm" as="span">
                  继续浏览示例内容
                </Text>
              </Link>
            </div>
          </Container>
        </div>
      </div>
    </div>
  );
}
