"use server";

import { redirect } from "next/navigation";
import { clearLoginCookie, hashPassword, setLoginCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findFirst({
    where: {
      username,
      passwordHash: hashPassword(password),
      isActive: true
    }
  });

  if (!user) {
    redirect("/login?error=1");
  }

  await setLoginCookie(user.username);
  redirect("/");
}

export async function logoutAction() {
  await clearLoginCookie();
  redirect("/login");
}
