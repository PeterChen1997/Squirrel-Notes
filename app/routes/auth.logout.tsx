import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import {
  logoutUser,
  clearSessionCookie,
  createAnonymousCookie,
  generateAnonymousId,
} from "~/lib/auth.server";
import { createAnonymousUser } from "~/lib/db.server";

// 复用Cookie解析函数
function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join("=").trim();
    }
  });

  return cookies;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const cookieHeader = request.headers.get("Cookie");
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies.session_id;

    if (sessionId) {
      await logoutUser(sessionId);
    }

    // 创建新的匿名用户ID
    const newAnonymousId = generateAnonymousId();
    await createAnonymousUser(newAnonymousId);

    return redirect("/", {
      headers: {
        "Set-Cookie": [
          clearSessionCookie(),
          createAnonymousCookie(newAnonymousId),
        ].join(", "),
      },
    });
  } catch (error) {
    console.error("注销失败:", error);
    // 即使出错也要重定向到首页
    return redirect("/");
  }
};

export const loader = () => {
  return redirect("/");
};
