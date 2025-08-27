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

// 生成匿名用户ID
export function generateAnonymousId(): string {
  return `anon_${uuidv4()}`;
}

// 获取或创建匿名用户ID（从cookie或创建新的）
export async function getOrCreateAnonymousId(
  request: Request
): Promise<string> {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = new URLSearchParams(cookieHeader?.replace(/; /g, "&") || "");

  let anonymousId = cookies.get("anonymous_id");

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
}> {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = new URLSearchParams(cookieHeader?.replace(/; /g, "&") || "");

  const sessionId = cookies.get("session_id");

  if (sessionId) {
    console.log("找到会话ID:", sessionId);
    const session = await getUserSession(sessionId);
    if (session) {
      console.log("找到有效会话:", session.email);
      const userData = {
        id: session.user_id,
        email: session.email,
        name: session.name,
        avatar_url: session.avatar_url,
      };
      console.log("返回用户数据:", JSON.stringify(userData));
      return {
        user: userData as User & {
          email: string;
          name?: string;
          avatar_url?: string;
        },
        isDemo: false,
      };
    } else {
      console.log("会话无效或已过期");
    }
  } else {
    console.log("未找到会话ID，cookie:", cookieHeader);
  }

  // 如果没有用户会话，获取匿名用户ID
  const anonymousId = await getOrCreateAnonymousId(request);
  return {
    anonymousId,
    isDemo: true,
  };
}

// 注销用户
export async function logoutUser(sessionId: string): Promise<void> {
  await deleteUserSession(sessionId);
}

// 设置会话Cookie
export function createSessionCookie(sessionId: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  return `session_id=${sessionId}; HttpOnly; ${
    isProduction ? "Secure; " : ""
  }SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}; Path=/`;
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
  return `session_id=; HttpOnly; ${
    isProduction ? "Secure; " : ""
  }SameSite=Lax; Max-Age=0; Path=/`;
}
