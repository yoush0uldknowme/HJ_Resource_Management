import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/index";

/**
 * 验证二级密码 API
 * POST /api/verify-secondary-password
 * body: { password: string }
 * 返回: { ok: boolean, message: string }
 *
 * 用于前端弹窗验证后，再调用实际的高危操作 API
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
  if (!password) {
    return NextResponse.json({ ok: false, message: "请输入二级密码" }, { status: 400 });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { secondaryPasswordHash: true }
  });

  if (!userRecord?.secondaryPasswordHash) {
    return NextResponse.json(
      { ok: false, message: "您尚未设置二级密码，请先在管理端设置中配置" },
      { status: 400 }
    );
  }

  const valid = await verifyPassword(password, userRecord.secondaryPasswordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, message: "二级密码不正确" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, message: "验证通过" });
}
