import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

/**
 * 管理员修改电机出入库状态 API
 * POST /api/update-motor-status
 * body: { motorId: number, status: string, location?: string }
 *
 * 修改状态时会自动记录一条 MotorTransaction 日志
 * 允许的状态值: draft, in_stock, checked_out
 */
const ALLOWED_STATUSES = ["draft", "in_stock", "checked_out"];

const STATUS_LABELS: Record<string, string> = {
  draft: "待入库",
  in_stock: "在库",
  checked_out: "已领用"
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ ok: false, message: "未登录或权限不足" }, { status: 401 });
  }

  let body: { motorId?: number; status?: string; location?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  const motorId = body.motorId;
  const newStatus = body.status?.trim();
  const newLocation = body.location?.trim();

  if (!motorId || !Number.isInteger(motorId) || motorId <= 0) {
    return NextResponse.json({ ok: false, message: "无效的电机 ID" }, { status: 400 });
  }

  if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
    return NextResponse.json(
      { ok: false, message: `无效的状态值，允许: ${ALLOWED_STATUSES.join("/")}` },
      { status: 400 }
    );
  }

  // 验证电机存在
  const motor = await prisma.motor.findUnique({ where: { id: motorId } });
  if (!motor) {
    return NextResponse.json({ ok: false, message: "电机不存在" }, { status: 404 });
  }

  // 如果状态没变化，不需要更新
  if (motor.status === newStatus && (newLocation ?? motor.currentLocation) === motor.currentLocation) {
    return NextResponse.json({ ok: true, message: "状态无变化" });
  }

  // 默认库位映射
  const defaultLocationMap: Record<string, string> = {
    draft: "待入库",
    in_stock: "在库",
    checked_out: newLocation || motor.currentLocation || "已领用"
  };

  const location = newLocation || defaultLocationMap[newStatus] || motor.currentLocation;

  try {
    await prisma.$transaction(async (tx) => {
      // 更新电机状态
      await tx.motor.update({
        where: { id: motorId },
        data: {
          status: newStatus,
          currentLocation: location
        }
      });

      // 记录状态变更日志
      await tx.motorTransaction.create({
        data: {
          motorId,
          transactionType: "status_change",
          operator: user.username,
          remark: `管理员手动变更状态：${STATUS_LABELS[motor.status] ?? motor.status} → ${STATUS_LABELS[newStatus] ?? newStatus}`
        }
      });
    });

    revalidatePath("/motors");
    revalidatePath(`/motors/${motorId}`);
    revalidatePath("/logs");

    return NextResponse.json({
      ok: true,
      message: `状态已变更为 ${STATUS_LABELS[newStatus] ?? newStatus}`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "状态变更失败";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
