import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import {
  logoutUser,
  clearSessionCookie,
  createAnonymousCookie,
  generateAnonymousId,
} from "~/lib/auth.server";
import { createAnonymousUser } from "~/lib/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = new URLSearchParams(cookieHeader?.replace(/; /g, "&") || "");
  const sessionId = cookies.get("session_id");

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
};

export const loader = () => {
  return redirect("/");
};
