"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireMotorOperator } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyOutbound, MotorFlowError } from "@/lib/motor-flow";
import { findMotorByScannedCode, normalizeScannedCode } from "@/lib/motor-lookup";
import { encodeActionResult } from "@/lib/action-result";

const requestSchema = z.object({
  model: z.string().trim().min(1),
  targetPerson: z.string().trim().min(1),
  destination: z.string().trim().min(1),
  remark: z.string().trim().optional()
});

export async function createOutboundRequestAction(formData: FormData) {
  const user = await requireMotorOperator();
  const data = requestSchema.parse({
    model: formData.get("model"),
    targetPerson: formData.get("targetPerson"),
    destination: formData.get("destination"),
    remark: formData.get("remark") || undefined
  });
  const returnPath = String(formData.get("returnPath") ?? "") === "/mobile/requests"
    ? "/mobile/requests"
    : "/requests";

  await prisma.outboundRequest.create({
    data: {
      requesterId: user.id,
      model: data.model,
      targetPerson: data.targetPerson,
      destination: data.destination,
      remark: data.remark
    }
  });

  revalidatePath("/admin");
  revalidatePath("/requests");
  revalidatePath("/user");
  redirect(`${returnPath}?submitted=1`);
}

export async function approveOutboundRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = z.coerce.number().int().positive().parse(formData.get("requestId"));
  const motorId = z.coerce.number().int().positive().parse(formData.get("motorId"));
  const reviewRemark = String(formData.get("reviewRemark") ?? "").trim();

  const request = await prisma.outboundRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "pending") redirect("/admin/requests");

  const motor = await prisma.motor.findUnique({ where: { id: motorId } });
  if (!motor || motor.model !== request.model || motor.status !== "in_stock") {
    redirect("/admin/requests?error=motor");
  }

  // 审批通过：只链接电机 + 标记已审批，不立即执行出库
  // 出库将在现场扫码后执行
  await prisma.outboundRequest.update({
    where: { id: request.id },
    data: {
      status: "approved",
      assignedMotorId: motor.id,
      reviewedBy: admin.username,
      reviewedAt: new Date(),
      reviewRemark: reviewRemark || null
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/requests");
  revalidatePath("/motors");
  revalidatePath("/logs");
  redirect("/admin/requests?approved=1");
}

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

function resultUrl(pathname: string, result: Parameters<typeof encodeActionResult>[0]) {
  return `${pathname}?${encodeActionResult(result)}`;
}

export async function executeApprovedOutboundAction(formData: FormData) {
  const user = await requireMotorOperator();
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

  const motor = await findMotorByScannedCode(prisma, scannedCode);
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
      data: { status: "completed" }
    })
  ]);

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
