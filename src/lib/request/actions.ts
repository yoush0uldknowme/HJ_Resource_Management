"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { applyOutbound, executeMotorOutbound, MotorFlowError } from "@/lib/motor/flow";
import { findMotorByCode } from "@/lib/motor/lookup";
import { normalizeScannedCode } from "@/lib/utils";
import { resultUrl } from "@/lib/result";
import { emitNewRequest } from "@/lib/events";

// ── Schema ──

const requestSchema = z.object({
  model: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
  targetPerson: z.string().trim().min(1),
  destination: z.string().trim().min(1),
  remark: z.string().trim().optional(),
  motorId: z.coerce.number().int().positive().optional()
});

// ── 创建出库申请 ──

export async function createOutboundRequestAction(formData: FormData) {
  const user = await requireOperator();
  const rawMotorId = formData.get("motorId");
  const data = requestSchema.parse({
    model: formData.get("model"),
    quantity: formData.get("quantity") ?? 1,
    targetPerson: formData.get("targetPerson"),
    destination: formData.get("destination"),
    remark: formData.get("remark") || undefined,
    motorId: rawMotorId && String(rawMotorId).trim() ? rawMotorId : undefined
  });
  const returnPath = String(formData.get("returnPath") ?? "") === "/mobile/requests"
    ? "/mobile/requests"
    : "/requests";

  // 如果用户指定了具体电机，验证其状态和型号
  if (data.motorId) {
    const motor = await prisma.motor.findUnique({ where: { id: data.motorId } });
    if (!motor || motor.model !== data.model || motor.status !== "in_stock") {
      redirect(`${returnPath}?error=invalid_motor`);
    }
  }

  // 校验库存是否足够 + 创建申请，在同一事务中执行防止并发问题
  try {
    await prisma.$transaction(async (tx) => {
      // 事务内重新校验库存
      const inStockCount = await tx.motor.count({
        where: { model: data.model, status: "in_stock" }
      });
      if (data.quantity > inStockCount) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // 如果指定了电机，事务内再次校验
      if (data.motorId) {
        const motor = await tx.motor.findUnique({ where: { id: data.motorId } });
        if (!motor || motor.model !== data.model || motor.status !== "in_stock") {
          throw new Error("INVALID_MOTOR");
        }
      }

      await tx.outboundRequest.create({
        data: {
          requesterId: user.id,
          model: data.model,
          quantity: data.quantity,
          targetPerson: data.targetPerson,
          destination: data.destination,
          remark: data.remark,
          ...(data.motorId ? { assignedMotorId: data.motorId } : {})
        }
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      const inStockCount = await prisma.motor.count({
        where: { model: data.model, status: "in_stock" }
      });
      redirect(`${returnPath}?error=insufficient_stock&available=${inStockCount}`);
    }
    if (error instanceof Error && error.message === "INVALID_MOTOR") {
      redirect(`${returnPath}?error=invalid_motor`);
    }
    throw error;
  }

  // 触发 SSE 通知，推送给管理员
  // 事务已成功，触发通知
  emitNewRequest({
    type: "new_request",
    requestId: 0, // 事务内创建的 ID 已提交，此处用 0 占位
    model: data.model,
    quantity: data.quantity,
    requester: user.username
  });

  revalidatePath("/admin");
  revalidatePath("/requests");
  revalidatePath("/user");
  redirect(`${returnPath}?submitted=1`);
}

// ── 批量创建出库申请（按型号+数量） ──

export async function batchCreateOutboundRequestAction(formData: FormData) {
  const user = await requireOperator();
  const targetPerson = String(formData.get("targetPerson") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const remark = String(formData.get("remark") ?? "").trim() || undefined;
  const returnPath = String(formData.get("returnPath") ?? "") === "/mobile/requests"
    ? "/mobile/requests"
    : "/requests";

  if (!targetPerson || !destination) {
    redirect(`${returnPath}?error=missing_fields`);
  }

  // 解析多个型号+数量对，格式：model=GM6020&qty=2 或从重复字段读取
  // 支持两种格式：
  // 1. scannedCodes 文本框（每行一个编号）- 兼容旧方式
  // 2. models[] + quantities[] 数组 - 新方式
  const rawCodes = String(formData.get("scannedCodes") ?? "").trim();
  const models = formData.getAll("models[]");
  const quantities = formData.getAll("quantities[]");

  const succeeded: string[] = [];
  const failed: { code: string; reason: string }[] = [];

  if (models.length > 0) {
    // 新方式：按型号+数量
    for (let i = 0; i < models.length; i++) {
      const model = String(models[i]).trim();
      const qty = parseInt(String(quantities[i] ?? "1"), 10) || 1;
      if (!model || qty < 1) continue;

      // 检查库存是否足够
      const stockCount = await prisma.motor.count({
        where: { model, status: "in_stock" }
      });
      if (stockCount < qty) {
        failed.push({ code: `${model} x${qty}`, reason: `库存仅 ${stockCount} 台，不足 ${qty} 台` });
        continue;
      }

      await prisma.outboundRequest.create({
        data: {
          requesterId: user.id,
          model,
          quantity: qty,
          targetPerson,
          destination,
          remark
        }
      });
      succeeded.push(`${model} x${qty}`);
    }
  } else if (rawCodes) {
    // 旧方式：按具体编号
    const codes = rawCodes
      .split(/[\n,\s]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    for (const code of codes) {
      try {
        const motor = await findMotorByCode(prisma, code);
        if (!motor) {
          failed.push({ code, reason: "未找到电机" });
          continue;
        }
        if (motor.status !== "in_stock") {
          failed.push({ code, reason: `状态为 ${motor.status}，非在库` });
          continue;
        }

        await prisma.outboundRequest.create({
          data: {
            requesterId: user.id,
            model: motor.model,
            quantity: 1,
            targetPerson,
            destination,
            remark,
            assignedMotorId: motor.id
          }
        });
        succeeded.push(motor.motorCode);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "未知错误";
        failed.push({ code, reason });
      }
    }
  } else {
    redirect(`${returnPath}?error=empty`);
  }

  revalidatePath("/admin");
  revalidatePath("/requests");
  revalidatePath("/user");

  // 触发 SSE 通知（每条成功申请都通知）
  for (const item of succeeded) {
    emitNewRequest({
      type: "new_request",
      requestId: 0,
      model: item,
      quantity: 1,
      requester: user.username
    });
  }

  const successCount = succeeded.length;
  const failedCount = failed.length;

  if (failedCount === 0) {
    redirect(
      `${returnPath}?submitted=1&success=${successCount}&codes=${encodeURIComponent(succeeded.join(","))}`
    );
  } else if (successCount === 0) {
    redirect(`${returnPath}?error=batch_failed&failed=${failedCount}`);
  } else {
    redirect(
      `${returnPath}?submitted=1&success=${successCount}&failed=${failedCount}&failedCodes=${encodeURIComponent(failed.map((f) => f.code).join(","))}`
    );
  }
}

// ── 审批通过（事务保护）──

export async function approveOutboundRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = z.coerce.number().int().positive().parse(formData.get("requestId"));
  const rawMotorId = formData.get("motorId");
  // motorId 为空字符串或 "none" 时不指定电机
  const motorId = rawMotorId && String(rawMotorId).trim() && String(rawMotorId).trim() !== "none"
    ? z.coerce.number().int().positive().parse(rawMotorId)
    : null;
  const reviewRemark = String(formData.get("reviewRemark") ?? "").trim();

  // 先获取申请，检查是否有效
  const request = await prisma.outboundRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "pending") {
    redirect("/admin/requests?error=request_not_pending");
  }

  // 如果用户没有预选电机且数量 > 1，管理员可以不指定（由扫码按型号匹配）
  // 如果数量 = 1 且用户没有预选电机，管理员必须指定
  if (!motorId && !request.assignedMotorId && request.quantity === 1) {
    redirect("/admin/requests?error=motor_required");
  }

  // 如果管理员指定了电机，验证电机存在且在库
  if (motorId) {
    const motor = await prisma.motor.findUnique({ where: { id: motorId } });
    if (!motor || motor.status !== "in_stock") {
      redirect("/admin/requests?error=invalid_motor");
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      let assignedMotorId: number | null = null;

      if (motorId) {
        // 管理员指定了电机：已验证，直接使用
        assignedMotorId = motorId;
      } else if (request.assignedMotorId) {
        // 用户预选了电机：验证仍有效
        const motor = await tx.motor.findUnique({ where: { id: request.assignedMotorId } });
        if (!motor || motor.model !== request.model || motor.status !== "in_stock") {
          throw new Error("MOTOR_NOT_AVAILABLE");
        }
        assignedMotorId = request.assignedMotorId;
      }

      await tx.outboundRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          assignedMotorId,
          reviewedBy: admin.username,
          reviewedAt: new Date(),
          reviewRemark: reviewRemark || null
        }
      });
    });

    revalidatePath("/admin");
    revalidatePath("/admin/requests");
    revalidatePath("/requests");
    revalidatePath("/motors");
    revalidatePath("/logs");
    redirect("/admin/requests?approved=1");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "REQUEST_NOT_PENDING" || error.message === "MOTOR_NOT_AVAILABLE") {
        redirect("/admin/requests?error=motor");
      }
    }
    throw error;
  }
}

// ── 拒绝申请 ──

export async function rejectOutboundRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = z.coerce.number().int().positive().parse(formData.get("requestId"));
  const reviewRemark = String(formData.get("reviewRemark") ?? "").trim();

  await prisma.outboundRequest.updateMany({
    where: { id: requestId, status: "pending" },
    data: {
      status: "rejected",
      reviewedBy: admin.username,
      reviewedAt: new Date(),
      reviewRemark: reviewRemark || "管理员已拒绝"
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  redirect("/admin/requests?rejected=1");
}

// ── 执行已审批出库（现场扫码）──

export async function executeApprovedOutboundAction(formData: FormData) {
  const user = await requireOperator();
  const scannedCode = normalizeScannedCode(formData.get("scannedCode"));
  const returnPath = String(formData.get("returnPath") ?? "/mobile/scan");

  if (!scannedCode) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "出库失败",
        message: "请先扫描电机二维码。"
      })
    );
  }

  const motor = await findMotorByCode(prisma, scannedCode);
  if (!motor) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "未找到电机",
        message: `没有找到编码为 ${scannedCode} 的电机。`
      })
    );
  }

  // 查找该电机的已审批出库申请
  // 1. 先查找指定了该电机的申请
  // 2. 再查找同型号未指定电机的申请
  let approvedRequest = await prisma.outboundRequest.findFirst({
    where: {
      assignedMotorId: motor.id,
      status: "approved"
    }
  });

  if (!approvedRequest) {
    // 没有指定该电机的申请，查找同型号未指定电机的申请
    approvedRequest = await prisma.outboundRequest.findFirst({
      where: {
        model: motor.model,
        assignedMotorId: null,
        status: "approved"
      },
      orderBy: { createdAt: "asc" } // 先申请先得
    });
  }

  if (!approvedRequest) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "无法执行出库",
        message: `电机 ${motor.motorCode} 没有已审批的出库申请。请先在管理端审批。`
      })
    );
  }

  // 校验申请人身份
  if (approvedRequest.requesterId !== user.id) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "无法执行出库",
        message: "该出库申请不属于您，无法执行出库。"
      })
    );
  }

  // 执行实际出库
  let next;
  try {
    next = applyOutbound(
      { status: motor.status, currentLocation: motor.currentLocation },
      {
        operator: user.username,
        issuedBy: approvedRequest.targetPerson,
        vehicle: approvedRequest.destination,
        remark: approvedRequest.remark ?? undefined
      }
    );
  } catch (error) {
    if (error instanceof MotorFlowError) {
      redirect(
        resultUrl(returnPath, {
          type: "error",
          title: "出库失败",
          message: `${error.message}。当前状态：${motor.status}。`
        })
      );
    }
    throw error;
  }

  // 事务：出库 + 更新申请执行计数，事务内重检 motor.status
  try {
    await prisma.$transaction(async (tx) => {
      // 事务内重新校验电机状态，防止查询到执行之间状态被并发修改
      const currentMotor = await tx.motor.findUnique({ where: { id: motor.id } });
      if (!currentMotor || currentMotor.status !== "in_stock") {
        throw new Error("MOTOR_NOT_IN_STOCK");
      }

      const newExecutedCount = approvedRequest.executedCount + 1;
      const isFullyCompleted = newExecutedCount >= approvedRequest.quantity;

      await tx.motor.update({
        where: { id: motor.id },
        data: {
          status: next.motor.status,
          currentLocation: next.motor.currentLocation,
          transactions: { create: next.transaction }
        }
      });

      await tx.outboundRequest.update({
        where: { id: approvedRequest.id },
        data: {
          executedCount: newExecutedCount,
          status: isFullyCompleted ? "completed" : "approved",
          assignedMotorId: isFullyCompleted ? approvedRequest.assignedMotorId : null,
        }
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "MOTOR_NOT_IN_STOCK") {
      redirect(
        resultUrl(returnPath, {
          type: "error",
          title: "出库失败",
          message: `电机 ${motor.motorCode} 当前状态已变更，不再是在库状态，无法出库。请刷新后重试。`
        })
      );
    }
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "出库失败",
        message: "该申请可能已被其他人执行，请刷新后重试。"
      })
    );
  }

  revalidatePath("/motors");
  revalidatePath("/logs");
  revalidatePath("/mobile/scan");
  revalidatePath("/admin/requests");

  redirect(
    resultUrl(returnPath, {
      type: "success",
      title: "出库执行成功",
      message: `${motor.motorCode} 已由 ${approvedRequest.targetPerson} 领用出库（${approvedRequest.executedCount + 1}/${approvedRequest.quantity}），车辆：${approvedRequest.destination}。`
    })
  );
}
