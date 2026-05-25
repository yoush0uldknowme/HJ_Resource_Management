"use server";

import { redirect } from "next/navigation";
import {
  clearLoginCookie,
  defaultLandingPath,
  hashPassword,
  sanitizeRedirectPath,
  setLoginCookie
} from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const mode = String(formData.get("mode") ?? "").trim();
  const redirectTo = sanitizeRedirectPath(formData.get("redirectTo"));

  const user = await prisma.user.findFirst({
    where: {
      username,
      passwordHash: hashPassword(password),
      isActive: true
    }
  });

  if (!user) {
    const params = new URLSearchParams({ error: "1" });
    if (mode) params.set("mode", mode);
    if (redirectTo) params.set("next", redirectTo);
    redirect(`/login?${params.toString()}`);
  }

  await setLoginCookie(user.username);
  redirect(redirectTo ?? defaultLandingPath(user));
}

export async function logoutAction() {
  await clearLoginCookie();
  redirect("/login");
}
