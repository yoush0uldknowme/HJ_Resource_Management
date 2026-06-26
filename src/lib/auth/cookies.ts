import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { CurrentUser } from "./index";

const COOKIE_NAME = "hj_token";

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createToken(user: CurrentUser): Promise<string> {
  return new SignJWT({ id: user.id, username: user.username, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10h")
    .sign(await jwtSecret());
}

export async function verifyToken(token: string): Promise<CurrentUser | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    if (
      typeof payload.id !== "number" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      id: payload.id,
      username: payload.username,
      role: payload.role
    };
  } catch {
    return null;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 10, // 10 hours
    sameSite: "lax" as const,
    // HTTPS 开发服务器使用自签名证书，浏览器可能不信任，
    // secure 在非 HTTPS 环境下会导致 cookie 无法设置，
    // 因此仅在生产环境启用 secure
    ...(process.env.NODE_ENV === "production" ? { secure: true as const } : {})
  };
}

export async function setCookieValue(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, cookieOptions());
}

/** 创建 token 并设置 cookie，返回 token 供 URL fallback 使用 */
export async function setLoginCookie(user: CurrentUser): Promise<string> {
  const token = await createToken(user);
  await setCookieValue(token);
  return token;
}

export async function getTokenFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

/** cookie 优先，若没有则尝试从请求头读取（middleware 注入的 URL token fallback） */
export async function getTokenFromCookieOrHeader(): Promise<string | undefined> {
  const fromCookie = await getTokenFromCookie();
  if (fromCookie) return fromCookie;

  try {
    const heads = await headers();
    return heads.get("x-hj-token") ?? undefined;
  } catch {
    return undefined;
  }
}

export async function clearLoginCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
