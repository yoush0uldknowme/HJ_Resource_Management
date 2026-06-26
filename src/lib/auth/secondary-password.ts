"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/index";
import { hashPassword, verifyPassword } from "@/lib/auth/index";

/**
 * 设置二级密码（仅管理员可设置自己的二级密码）
 * 二级密码用于高危操作（删除电机、删除日志）的二次验证
 */
export async function setSecondaryPasswordAction(formData: FormData) {
  const user = await requireAdmin();
  const password = String(formData.get("password") ?? "").trim();

  if (!password || password.length < 4) {
    return { ok: false, message: "二级密码至少需要4位" };
  }

  const hash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { secondaryPasswordHash: hash }
  });

  return { ok: true, message: "二级密码已设置" };
}

/**
 * 验证二级密码（仅管理员）
 * 返回验证结果，不直接执行任何高危操作
 */
export async function verifySecondaryPasswordAction(formData: FormData) {
  const user = await requireAdmin();
  const password = String(formData.get("secondaryPassword") ?? "");

  if (!password) {
    return { ok: false, message: "请输入二级密码" };
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { secondaryPasswordHash: true }
  });

  if (!userRecord?.secondaryPasswordHash) {
    return { ok: false, message: "您尚未设置二级密码，请先在设置中配置" };
  }

  const valid = await verifyPassword(password, userRecord.secondaryPasswordHash);
  if (!valid) {
    return { ok: false, message: "二级密码不正确" };
  }

  return { ok: true, message: "验证通过" };
}

/**
 * 检查管理员是否已设置二级密码
 */
export async function hasSecondaryPassword() {
  const user = await requireAdmin();
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { secondaryPasswordHash: true }
  });
  return !!userRecord?.secondaryPasswordHash;
}
