import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/index";

/**
 * 设置二级密码 API
 * POST /api/set-secondary-password
 * body: { password: string }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ ok: false, message: "未登录或权限不足" }, { status: 401 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  const password = (body.password ?? "").trim();
  if (!password || password.length < 4) {
    return NextResponse.json({ ok: false, message: "二级密码至少需要4位" }, { status: 400 });
  }

  const hash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { secondaryPasswordHash: hash }
  });

  return NextResponse.json({ ok: true, message: "二级密码已设置" });
}
