import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rm } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/index";

/**
 * 删除电机 API（需要管理员权限 + 二级密码验证）
 * POST /api/delete-motor
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

  const motorId = body.id;
  const secondaryPassword = (body.secondaryPassword ?? "").trim();

  if (!motorId || !Number.isInteger(motorId) || motorId <= 0) {
    return NextResponse.json({ ok: false, message: "无效的电机 ID" }, { status: 400 });
  }

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

  // 验证电机存在
  const motor = await prisma.motor.findUnique({ where: { id: motorId } });
  if (!motor) {
    return NextResponse.json({ ok: false, message: "电机不存在" }, { status: 404 });
  }

  // 删除电机（级联删除关联的照片和出库申请引用）
  try {
    await prisma.$transaction(async (tx) => {
      // 将关联的未完成出库申请的 assignedMotorId 设为 null（避免外键冲突）
      await tx.outboundRequest.updateMany({
        where: { assignedMotorId: motorId, status: { in: ["pending", "approved"] } },
        data: { assignedMotorId: null }
      });

      // 删除电机（照片和已完成的出库申请引用通过 onDelete: Cascade/SetNull 自动处理）
      await tx.motor.delete({ where: { id: motorId } });
    });

    // 事务成功后清理磁盘上的照片文件
    const uploadDir = path.join(process.cwd(), "public", "uploads", "motors", String(motorId));
    try {
      await rm(uploadDir, { recursive: true, force: true });
    } catch {
      // 目录不存在或无权限，不影响主流程
    }

    revalidatePath("/motors");
    revalidatePath("/logs");
    revalidatePath("/admin");

    return NextResponse.json({ ok: true, message: `电机 ${motor.motorCode} 已删除` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
