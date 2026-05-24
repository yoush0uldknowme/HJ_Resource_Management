import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { prisma } from "./db";

const COOKIE_NAME = "hj_user";

export type CurrentUser = {
  id: number;
  username: string;
  role: string;
};

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const username = cookieStore.get(COOKIE_NAME)?.value;
  if (!username) return null;

  return prisma.user.findFirst({
    where: { username, isActive: true },
    select: { id: true, username: true, role: true }
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function canManageMotors(user: Pick<CurrentUser, "role"> | null): boolean {
  return user?.role === "admin";
}

export function canOperateMotors(user: Pick<CurrentUser, "role"> | null): boolean {
  return user?.role === "admin" || user?.role === "viewer";
}

export async function requireAdmin() {
  const user = await requireCurrentUser();
  if (!canManageMotors(user)) redirect("/");
  return user;
}

export async function requireMotorOperator() {
  const user = await requireCurrentUser();
  if (!canOperateMotors(user)) redirect("/");
  return user;
}

export async function setLoginCookie(username: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, username, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 10
  });
}

export async function clearLoginCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
