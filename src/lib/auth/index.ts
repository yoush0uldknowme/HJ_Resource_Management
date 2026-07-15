import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getTokenFromCookie, getTokenFromCookieOrHeader, verifyToken } from "./cookies";

export type CurrentUser = {
  id: number;
  username: string;
  role: string;
};

// ── 密码处理 ──

const BCRYPT_ROUNDS = 10;

/** 用 bcrypt 哈希密码（新密码专用） */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** 用 SHA-256 哈希密码（仅用于向后兼容旧数据） */
export function hashPasswordLegacy(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * 验证密码。
 * 先用 bcrypt 验证，失败后尝试 SHA-256（向后兼容迁移期的旧密码）。
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const bcryptResult = await bcrypt.compare(password, storedHash);
    if (bcryptResult) return true;
  } catch {
    // storedHash 不是 bcrypt 格式，继续尝试 SHA-256
  }
  return hashPasswordLegacy(password) === storedHash;
}

// ── 用户获取 ──

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getTokenFromCookieOrHeader();
  if (!token) return null;

  const claims = await verifyToken(token);
  if (!claims) return null;

  // 验证用户仍然存在且活跃
  const user = await prisma.user.findFirst({
    where: { id: claims.id, username: claims.username, isActive: true },
    select: { id: true, username: true, role: true }
  });
  return user ?? null;
}

/**
 * 仅从 cookie 获取当前用户（不接受 URL token fallback）。
 * 用于资料库下载等安全敏感接口，防止 token 泄露到日志/Referer。
 */
export async function getCurrentUserCookieOnly(): Promise<CurrentUser | null> {
  const token = await getTokenFromCookie();
  if (!token) return null;

  const claims = await verifyToken(token);
  if (!claims) return null;

  const user = await prisma.user.findFirst({
    where: { id: claims.id, username: claims.username, isActive: true },
    select: { id: true, username: true, role: true }
  });
  return user ?? null;
}

export async function requireCurrentUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${next}`);
  }
  return user;
}

// ── 权限判断 ──

/** 是否是管理员（建档、编辑、删除、审批、查看日志） */
export function isAdmin(user: Pick<CurrentUser, "role"> | null): boolean {
  return user?.role === "admin";
}

/** 是否是操作员（admin 或 operator，可入库、申请出库、扫码查询） */
export function isOperator(user: Pick<CurrentUser, "role"> | null): boolean {
  return user?.role === "admin" || user?.role === "operator";
}

export function defaultLandingPath(user: Pick<CurrentUser, "role"> | null): string {
  return isAdmin(user) ? "/admin" : "/user";
}

// ── 权限守卫 ──

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireCurrentUser();
  if (!isAdmin(user)) redirect("/user");
  return user;
}

export async function requireOperator(mobileFallback = false): Promise<CurrentUser> {
  const user = await requireCurrentUser(mobileFallback ? "/mobile" : undefined);
  if (!isOperator(user)) {
    redirect(mobileFallback ? "/login?mode=operator&next=/mobile&error=perm" : "/login?error=perm");
  }
  return user;
}

// ── 工具 ──

/** 校验并清理重定向路径，防止 open redirect */
export function sanitizeRedirectPath(
  value: FormDataEntryValue | string | null | undefined
): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/login")) {
    return null;
  }
  return path;
}
