import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/index";

/**
 * 删除日志 API（需要管理员权限 + 二级密码验证）
 * POST /api/delete-log
 * body: { id?: number, secondaryPassword: string, clearAll?: boolean }
 *
 * id: 删除单条日志
 * clearAll: true 时清空全部日志
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ ok: false, message: "未登录或权限不足" }, { status: 401 });
  }

  let body: { id?: number; secondaryPassword?: string; clearAll?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  const secondaryPassword = (body.secondaryPassword ?? "").trim();
  if (!secondaryPassword) {
    return NextResponse.json({ ok: false, message: "请输入二级密码" }, { status: 400 });
  }

  // 验证二级密码
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

  const valid = await verifyPassword(secondaryPassword, userRecord.secondaryPasswordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, message: "二级密码不正确" }, { status: 403 });
  }

  if (body.clearAll) {
    // 清空全部日志（逻辑删除）
    await prisma.motorTransaction.updateMany({
      data: { deleted: true, deletedAt: new Date() }
    });
    revalidatePath("/logs");
    return NextResponse.json({ ok: true, message: "全部日志已清空" });
  }

  // 删除单条日志
  const logId = body.id;
  if (!logId || !Number.isInteger(logId) || logId <= 0) {
    return NextResponse.json({ ok: false, message: "无效的日志 ID" }, { status: 400 });
  }

  await prisma.motorTransaction.updateMany({
    where: { id: logId },
    data: { deleted: true, deletedAt: new Date() }
  });
  revalidatePath("/logs");
  return NextResponse.json({ ok: true, message: "日志已删除" });
}
