import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin, verifyPassword } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

/**
 * 删除出库申请记录（管理员 + 二级密码验证）
 * POST /api/delete-request
 * body: { id: number, secondaryPassword: string }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ ok: false, message: "未登录或权限不足" }, { status: 401 });
  }

  let body: { id?: number; secondaryPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  const id = body.id;
  const secondaryPassword = (body.secondaryPassword ?? "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, message: "缺少申请ID" }, { status: 400 });
  }

  if (!secondaryPassword) {
    return NextResponse.json({ ok: false, message: "缺少二级密码" }, { status: 400 });
  }

  // 验证二级密码
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { secondaryPasswordHash: true }
  });

  if (!userRecord?.secondaryPasswordHash) {
    return NextResponse.json(
      { ok: false, message: "您尚未设置二级密码，请先在管理端工作台设置" },
      { status: 400 }
    );
  }

  const valid = await verifyPassword(secondaryPassword, userRecord.secondaryPasswordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, message: "二级密码不正确" }, { status: 403 });
  }

  // 验证申请存在且状态允许删除
  const requestRecord = await prisma.outboundRequest.findUnique({ where: { id } });
  if (!requestRecord) {
    return NextResponse.json({ ok: false, message: "未找到该申请记录" }, { status: 404 });
  }

  if (requestRecord.status === "pending") {
    return NextResponse.json(
      { ok: false, message: "不允许删除待审批的申请，请先拒绝后再删除" },
      { status: 400 }
    );
  }

  await prisma.outboundRequest.delete({ where: { id } });

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/requests");

  return NextResponse.json({ ok: true, message: "已删除" });
}
