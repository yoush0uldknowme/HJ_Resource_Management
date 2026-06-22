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

// ── Schema ──

const requestSchema = z.object({
  model: z.string().trim().min(1),
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

  // 指定了具体电机时添加 assignedMotorId
  await prisma.outboundRequest.create({
    data: {
      requesterId: user.id,
      model: data.model,
      targetPerson: data.targetPerson,
      destination: data.destination,
      remark: data.remark,
      ...(data.motorId ? { assignedMotorId: data.motorId } : {})
    }
  });

  revalidatePath("/admin");
  revalidatePath("/requests");
  revalidatePath("/user");
  redirect(`${returnPath}?submitted=1`);
}

// ── 批量创建出库申请 ──

export async function batchCreateOutboundRequestAction(formData: FormData) {
  const user = await requireOperator();
  const rawCodes = String(formData.get("scannedCodes") ?? "").trim();
  const targetPerson = String(formData.get("targetPerson") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim();
  const remark = String(formData.get("remark") ?? "").trim() || undefined;
  const returnPath = String(formData.get("returnPath") ?? "") === "/mobile/requests"
    ? "/mobile/requests"
    : "/requests";

  if (!rawCodes) {
    redirect(`${returnPath}?error=empty`);
  }

  if (!targetPerson || !destination) {
    redirect(`${returnPath}?error=missing_fields`);
  }

  // 解析多个编号
  const codes = rawCodes
    .split(/[\n,\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  if (codes.length === 0) {
    redirect(`${returnPath}?error=empty`);
  }

  const succeeded: string[] = [];
  const failed: { code: string; reason: string }[] = [];

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

  revalidatePath("/admin");
  revalidatePath("/requests");
  revalidatePath("/user");

  const successCount = succeeded.length;
  const failedCount = failed.length;

  if (failedCount === 0) {
    redirect(
      `${returnPath}?submitted=1&success=${successCount}&codes=${encodeURIComponent(succeeded.join(","))}`
    );
  } else if (successCount === 0) {
    redirect(
      `${returnPath}?error=batch_failed&failed=${failedCount}`
    );
  } else {
    redirect(
      `${returnPath}?submitted=1&success=${successCount}&failed=${failedCount}&failedCodes=${encodeURIComponent(failed.map((f) => f.code).join(","))}`
    );
  }
}

// ── 审批通过（事务保护） ──

export async function approveOutboundRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = z.coerce.number().int().positive().parse(formData.get("requestId"));
  const rawMotorId = formData.get("motorId");
  const motorId = rawMotorId && String(rawMotorId).trim()
    ? z.coerce.number().int().positive().parse(rawMotorId)
    : null;
  const reviewRemark = String(formData.get("reviewRemark") ?? "").trim();

  // 整个审批流程在事务中执行，防止竞态
  try {
    await prisma.$transaction(async (tx) => {
      // 1. 检查申请状态
      const request = await tx.outboundRequest.findUnique({ where: { id: requestId } });
      if (!request || request.status !== "pending") {
        throw new Error("REQUEST_NOT_PENDING");
      }

      let assignedMotorId: number;

      if (motorId) {
        // 管理员选择了电机：验证
        const motor = await tx.motor.findUnique({ where: { id: motorId } });
        if (!motor || motor.model !== request.model || motor.status !== "in_stock") {
          throw new Error("MOTOR_NOT_AVAILABLE");
        }
        assignedMotorId = motor.id;
      } else if (request.assignedMotorId) {
        // 用户已预分配电机：验证仍有效
        const motor = await tx.motor.findUnique({ where: { id: request.assignedMotorId } });
        if (!motor || motor.model !== request.model || motor.status !== "in_stock") {
          throw new Error("MOTOR_NOT_AVAILABLE");
        }
        assignedMotorId = request.assignedMotorId;
      } else {
        throw new Error("MOTOR_NOT_AVAILABLE");
      }

      // 3. 更新申请为已审批
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

// ── 执行已审批出库（现场扫码） ──

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

  // 查找该电机对应的已审批出库申请
  const approvedRequest = await prisma.outboundRequest.findFirst({
    where: {
      assignedMotorId: motor.id,
      status: "approved"
    }
  });

  if (!approvedRequest) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "无法执行出库",
        message: `电机 ${motor.motorCode} 没有已审批的出库申请。请先在管理端审批。`
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

  // 事务：出库 + 标记申请为 completed（带乐观锁防止重复执行）
  try {
    await prisma.$transaction([
      prisma.motor.update({
        where: { id: motor.id },
        data: {
          status: next.motor.status,
          currentLocation: next.motor.currentLocation,
          transactions: { create: next.transaction }
        }
      }),
      prisma.outboundRequest.updateMany({
        where: { id: approvedRequest.id, status: "approved" },
        data: { status: "completed" }
      })
    ]);
  } catch (error) {
    // 如果乐观锁失败（申请已被其他人执行），给友好提示
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
      message: `${motor.motorCode} 已由 ${approvedRequest.targetPerson} 领用出库，车辆：${approvedRequest.destination}。`
    })
  );
}
