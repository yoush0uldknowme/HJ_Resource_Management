"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resultUrl } from "@/lib/result";
import {
  defaultLandingPath,
  sanitizeRedirectPath,
  verifyPassword
} from "./index";
import { clearLoginCookie, setLoginCookie } from "./cookies";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const mode = String(formData.get("mode") ?? "").trim();
  const redirectTo = sanitizeRedirectPath(formData.get("redirectTo"));

  if (!username || !password) {
    redirect(
      resultUrl("/login", {
        type: "error",
        title: "登录失败",
        message: "请输入用户名和密码。"
      })
    );
  }

  const user = await prisma.user.findFirst({
    where: { username, isActive: true }
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    const params = new URLSearchParams({ error: "1" });
    if (mode) params.set("mode", mode);
    if (redirectTo) params.set("next", redirectTo);
    redirect(`/login?${params.toString()}`);
  }

  // 如果密码是旧版 SHA-256，自动升级为 bcrypt
  const legacyHash = (await import("./index")).hashPasswordLegacy(password);
  if (user.passwordHash === legacyHash) {
    const { hashPassword } = await import("./index");
    const newHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });
  }

  const token = await setLoginCookie({ id: user.id, username: user.username, role: user.role });
  const targetUrl = redirectTo ?? defaultLandingPath(user);
  const sep = targetUrl.includes("?") ? "&" : "?";
  redirect(`${targetUrl}${sep}token=${encodeURIComponent(token)}`);
}

export async function logoutAction() {
  await clearLoginCookie();
  redirect("/");
}
