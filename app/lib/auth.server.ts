import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import {
  createUser,
  getUserByEmail,
  getUserById,
  createUserSession,
  getUserSession,
  deleteUserSession,
  createAnonymousUser,
  getAnonymousUser,
  bindAnonymousDataToUser,
  type User,
  type UserSession,
} from "./db.server";

// 标准的 Cookie 解析函数
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

// 生成匿名用户ID
export function generateAnonymousId(): string {
  return `anon_${uuidv4()}`;
}

// 获取或创建匿名用户ID（从cookie或创建新的）
export async function getOrCreateAnonymousId(
  request: Request
): Promise<string> {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);

  let anonymousId = cookies.anonymous_id;

  if (!anonymousId) {
    anonymousId = generateAnonymousId();
    await createAnonymousUser(anonymousId);
  } else {
    // 确保匿名用户存在于数据库中
    const existingUser = await getAnonymousUser(anonymousId);
    if (!existingUser) {
      await createAnonymousUser(anonymousId);
    }
  }

  return anonymousId;
}

// 验证密码强度
export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return "密码至少需要6个字符";
  }
  return null;
}

// 验证邮箱格式
export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "请输入有效的邮箱地址";
  }
  return null;
}

// 哈希密码
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// 验证密码
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// 注册用户
export async function registerUser(
  email: string,
  password: string,
  name?: string,
  anonymousId?: string
): Promise<{ user?: User; error?: string }> {
  // 验证输入
  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  // 检查邮箱是否已存在
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return { error: "该邮箱已注册" };
  }

  try {
    // 创建用户
    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      email,
      password_hash: hashedPassword,
      name,
      anonymous_id: anonymousId,
    });

    // 如果有匿名ID，绑定数据
    if (anonymousId) {
      await bindAnonymousDataToUser(anonymousId, user.id!);
    }

    return { user };
  } catch (error) {
    console.error("用户注册失败:", error);
    return { error: "注册失败，请稍后重试" };
  }
}

// 用户登录
export async function loginUser(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  // 验证输入
  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  if (!password) {
    return { error: "请输入密码" };
  }

  try {
    // 查找用户
    const user = await getUserByEmail(email);
    if (!user) {
      return { error: "邮箱或密码错误" };
    }

    // 验证密码
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return { error: "邮箱或密码错误" };
    }

    return { user };
  } catch (error) {
    console.error("用户登录失败:", error);
    return { error: "登录失败，请稍后重试" };
  }
}

// 创建用户会话
export async function createSession(userId: string): Promise<string> {
  const sessionId = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30天后过期

  await createUserSession({
    id: sessionId,
    user_id: userId,
    expires_at: expiresAt,
  });

  return sessionId;
}

// 获取当前用户（从会话）
export async function getCurrentUser(request: Request): Promise<{
  user?: User & { email: string; name?: string; avatar_url?: string };
  anonymousId?: string;
  isDemo: boolean;
  headers?: HeadersInit;
}> {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies.session_id;

  const responseHeaders: string[] = [];
  const isDev = process.env.NODE_ENV !== "production";

  if (sessionId) {
    try {
      const session = await getUserSession(sessionId);
      if (session) {
        const userData = {
          id: session.user_id,
          email: session.email,
          name: session.name,
          avatar_url: session.avatar_url,
        };

        if (isDev) {
          console.log("会话验证成功:", {
            email: session.email,
            sessionId: sessionId.substring(0, 8) + "...",
          });
        }

        return {
          user: userData as User & {
            email: string;
            name?: string;
            avatar_url?: string;
          },
          isDemo: false,
        };
      } else {
        // 会话无效，清理Cookie
        responseHeaders.push(clearSessionCookie());
        if (isDev) {
          console.log(
            "会话无效，清理Cookie:",
            sessionId.substring(0, 8) + "..."
          );
        }
      }
    } catch (error) {
      console.error("获取用户会话失败:", error);
      responseHeaders.push(clearSessionCookie());
    }
  }

  // 如果没有用户会话，获取匿名用户ID
  const anonymousId = await getOrCreateAnonymousId(request);
  responseHeaders.push(createAnonymousCookie(anonymousId));

  return {
    anonymousId,
    isDemo: true,
    headers:
      responseHeaders.length > 0
        ? { "Set-Cookie": responseHeaders.join(", ") }
        : undefined,
  };
}

// 注销用户
export async function logoutUser(sessionId: string): Promise<void> {
  await deleteUserSession(sessionId);
}

// 设置会话Cookie
export function createSessionCookie(sessionId: string): string {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return `session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${
      30 * 24 * 60 * 60
    }; Path=/`;
  } else {
    // 开发环境使用 Lax 而不是 None，避免 Secure 要求
    return `session_id=${sessionId}; HttpOnly; SameSite=Lax; Max-Age=${
      30 * 24 * 60 * 60
    }; Path=/`;
  }
}

// 设置匿名用户Cookie
export function createAnonymousCookie(anonymousId: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  return `anonymous_id=${anonymousId}; HttpOnly; ${
    isProduction ? "Secure; " : ""
  }SameSite=Lax; Max-Age=${365 * 24 * 60 * 60}; Path=/`;
}

// 清除会话Cookie
export function clearSessionCookie(): string {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return `session_id=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`;
  } else {
    return `session_id=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
  }
}
