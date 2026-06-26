import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isAdmin, isOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { findMotorByCode } from "@/lib/motor/lookup";
import {
  applyInbound,
  applyOutbound,
  executeMotorOutbound,
  MotorFlowError
} from "@/lib/motor/flow";

/**
 * 连续扫码出入库 / 申请 / 执行已审批出库 API
 * POST /api/scan-execute
 * body: {
 *   mode: "inbound" | "outbound" | "request" | "executeApproved",
 *   code: string,
 *   issuedBy?: string,       // outbound 需要
 *   vehicle?: string,        // outbound 需要
 *   targetPerson?: string,   // request 需要
 *   destination?: string,    // request 需要
 *   remark?: string
 * }
 * 返回: { ok: boolean, motorCode?: string, message: string }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isOperator(user)) {
    return NextResponse.json(
      { ok: false, message: "未登录或权限不足" },
      { status: 401 }
    );
  }

  let body: {
    mode?: string;
    code?: string;
    issuedBy?: string;
    vehicle?: string;
    targetPerson?: string;
    destination?: string;
    remark?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "请求格式错误" },
      { status: 400 }
    );
  }

  const mode = body.mode;
  const code = (body.code ?? "").trim();
  const remark = (body.remark ?? "").trim();

  if (!code) {
    return NextResponse.json(
      { ok: false, message: "缺少电机编号" },
      { status: 400 }
    );
  }

  const motor = await findMotorByCode(prisma, code);
  if (!motor) {
    return NextResponse.json({
      ok: false,
      motorCode: code,
      message: `未找到编码为 ${code} 的电机`
    });
  }

  try {
    if (mode === "inbound") {
      const next = applyInbound(
        { status: motor.status, currentLocation: motor.currentLocation },
        { operator: user.username, remark }
      );
      await executeMotorOutbound(prisma, motor.id, next.transaction, next.motor, [
        "/motors",
        "/logs",
        `/motors/${motor.id}`
      ]);
      revalidatePath("/motors");
      revalidatePath("/logs");
      return NextResponse.json({
        ok: true,
        motorCode: motor.motorCode,
        message: `${motor.motorCode} 已入库 ✓`
      });
    }

    if (mode === "outbound") {
      if (!isAdmin(user)) {
        return NextResponse.json(
          { ok: false, message: "出库操作需要管理员权限" },
          { status: 403 }
        );
      }
      const issuedBy = (body.issuedBy ?? "").trim();
      const vehicle = (body.vehicle ?? "").trim();
      if (!issuedBy || !vehicle) {
        return NextResponse.json(
          { ok: false, message: "缺少出库人或车辆信息" },
          { status: 400 }
        );
      }
      const next = applyOutbound(
        { status: motor.status, currentLocation: motor.currentLocation },
        { operator: user.username, issuedBy, vehicle, remark }
      );
      await executeMotorOutbound(prisma, motor.id, next.transaction, next.motor, [
        "/motors",
        "/logs",
        `/motors/${motor.id}`
      ]);
      revalidatePath("/motors");
      revalidatePath("/logs");
      return NextResponse.json({
        ok: true,
        motorCode: motor.motorCode,
        message: `${motor.motorCode} 已出库给 ${issuedBy} ✓`
      });
    }

    if (mode === "request") {
      // 普通用户连续扫码创建出库申请
      const targetPerson = (body.targetPerson ?? "").trim();
      const destination = (body.destination ?? "").trim();
      if (!targetPerson || !destination) {
        return NextResponse.json(
          { ok: false, message: "缺少领用人或车辆信息" },
          { status: 400 }
        );
      }

      // 检查电机状态
      if (motor.status !== "in_stock") {
        return NextResponse.json({
          ok: false,
          motorCode: motor.motorCode,
          message: `${motor.motorCode} 状态为 ${motor.status}，非在库，无法申请`
        });
      }

      await prisma.outboundRequest.create({
        data: {
          requesterId: user.id,
          model: motor.model,
          quantity: 1,
          targetPerson,
          destination,
          remark: remark || null,
          assignedMotorId: motor.id
        }
      });

      revalidatePath("/admin");
      revalidatePath("/requests");
      revalidatePath("/mobile/requests");

      return NextResponse.json({
        ok: true,
        motorCode: motor.motorCode,
        message: `${motor.motorCode} 已提交申请 ✓`
      });
    }

    if (mode === "executeApproved") {
      // 扫码执行已审批的出库申请
      // 1. 先查找指定了该电机的已审批申请
      // 2. 再查找同型号未指定电机的已审批申请
      if (motor.status !== "in_stock") {
        return NextResponse.json({
          ok: false,
          motorCode: motor.motorCode,
          message: `${motor.motorCode} 状态为 ${motor.status}，非在库`
        });
      }

      let approvedRequest = await prisma.outboundRequest.findFirst({
        where: {
          assignedMotorId: motor.id,
          status: "approved"
        }
      });

      if (!approvedRequest) {
        approvedRequest = await prisma.outboundRequest.findFirst({
          where: {
            model: motor.model,
            assignedMotorId: null,
            status: "approved"
          },
          orderBy: { createdAt: "asc" }
        });
      }

      if (!approvedRequest) {
        return NextResponse.json({
          ok: false,
          motorCode: motor.motorCode,
          message: `${motor.motorCode} 没有已审批的出库申请`
        });
      }

      // 校验申请人身份 — 只有申请人本人才能执行自己的出库申请
      if (approvedRequest.requesterId !== user.id) {
        return NextResponse.json({
          ok: false,
          motorCode: motor.motorCode,
          message: `该出库申请不属于您，无法执行出库`
        }, { status: 403 });
      }

      const next = applyOutbound(
        { status: motor.status, currentLocation: motor.currentLocation },
        {
          operator: user.username,
          issuedBy: approvedRequest.targetPerson,
          vehicle: approvedRequest.destination,
          remark: approvedRequest.remark ?? undefined
        }
      );

      const newExecutedCount = approvedRequest.executedCount + 1;
      const isFullyCompleted = newExecutedCount >= approvedRequest.quantity;

      await prisma.$transaction([
        prisma.motor.update({
          where: { id: motor.id },
          data: {
            status: next.motor.status,
            currentLocation: next.motor.currentLocation,
            transactions: { create: next.transaction }
          }
        }),
        prisma.outboundRequest.update({
          where: { id: approvedRequest.id },
          data: {
            executedCount: newExecutedCount,
            status: isFullyCompleted ? "completed" : "approved",
            assignedMotorId: isFullyCompleted ? approvedRequest.assignedMotorId : null,
          }
        })
      ]);

      revalidatePath("/motors");
      revalidatePath("/logs");
      revalidatePath("/admin/requests");

      return NextResponse.json({
        ok: true,
        motorCode: motor.motorCode,
        message: `${motor.motorCode} 已出库给 ${approvedRequest.targetPerson}（${newExecutedCount}/${approvedRequest.quantity}）✓`
      });
    }

    return NextResponse.json(
      { ok: false, message: "无效的操作模式，应为 inbound、outbound 或 request" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof MotorFlowError
        ? `${error.message}（当前状态：${motor.status}）`
        : error instanceof Error
          ? error.message
          : "未知错误";
    return NextResponse.json({
      ok: false,
      motorCode: motor.motorCode,
      message
    });
  }
}
