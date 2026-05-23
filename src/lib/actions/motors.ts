"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { encodeActionResult, type ActionResult } from "@/lib/action-result";
import { requireAdmin, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyInbound, applyOutbound, MotorFlowError } from "@/lib/motor-flow";
import { buildMotorCode, motorCodeRange } from "@/lib/motor-code";
import { findMotorByScannedCode, normalizeScannedCode } from "@/lib/motor-lookup";

const createMotorSchema = z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  remark: z.string().optional()
});

const updateMotorSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1),
  model: z.string().min(1),
  remark: z.string().optional()
});

function resultUrl(pathname: string, result: ActionResult) {
  return `${pathname}?${encodeActionResult(result)}`;
}

async function savePhoto(file: File, motorId: number, photoType: string, uploadedBy: string) {
  if (!file || file.size === 0) return;

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name) || ".jpg";
  const directory = path.join(process.cwd(), "public", "uploads", "motors", String(motorId));
  const fileName = `${photoType}-${Date.now()}${extension}`;
  const absolutePath = path.join(directory, fileName);
  const publicPath = `/uploads/motors/${motorId}/${fileName}`;

  await mkdir(directory, { recursive: true });
  await writeFile(absolutePath, bytes);

  await prisma.motorPhoto.create({
    data: {
      motorId,
      photoPath: publicPath,
      photoType,
      uploadedBy
    }
  });
}

export async function createMotorAction(formData: FormData) {
  const user = await requireAdmin();
  const parsed = createMotorSchema.parse({
    name: formData.get("name"),
    model: formData.get("model"),
    remark: formData.get("remark") || undefined
  });

  const count = await prisma.motor.count({
    where: { motorCode: motorCodeRange(parsed.model) }
  });
  const motorCode = buildMotorCode(parsed.model, count + 1);

  const motor = await prisma.motor.create({
    data: {
      motorCode,
      name: parsed.name,
      model: parsed.model,
      snCode: motorCode,
      remark: parsed.remark,
      createdBy: user.username,
      transactions: {
        create: {
          transactionType: "create",
          operator: user.username,
          remark: "新建电机档案"
        }
      }
    }
  });

  await savePhoto(formData.get("photo") as File, motor.id, "archive", user.username);
  revalidatePath("/motors");
  redirect(`/motors/${motor.id}`);
}

export async function updateMotorAction(formData: FormData) {
  await requireAdmin();
  const parsed = updateMotorSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    model: formData.get("model"),
    remark: formData.get("remark") || undefined
  });

  await prisma.motor.update({
    where: { id: parsed.id },
    data: {
      name: parsed.name,
      model: parsed.model,
      remark: parsed.remark
    }
  });

  revalidatePath("/motors");
  revalidatePath(`/motors/${parsed.id}`);
  redirect(`/motors/${parsed.id}`);
}

export async function deleteMotorAction(formData: FormData) {
  await requireAdmin();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));

  await prisma.motor.delete({ where: { id } });

  revalidatePath("/motors");
  revalidatePath("/logs");
  redirect("/motors");
}

async function performInbound(formData: FormData, returnPath: string) {
  const user = await requireAdmin();
  const scannedCode = normalizeScannedCode(formData.get("scannedCode"));
  const remark = String(formData.get("remark") ?? "").trim();

  if (!scannedCode) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "入库失败",
        message: "请先扫码或输入电机编码。"
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

  const next = applyInbound(
    { status: motor.status, currentLocation: motor.currentLocation },
    { operator: user.username, remark }
  );

  await prisma.motor.update({
    where: { id: motor.id },
    data: {
      status: next.motor.status,
      currentLocation: next.motor.currentLocation,
      transactions: { create: next.transaction }
    }
  });

  revalidatePath("/motors");
  revalidatePath("/logs");
  revalidatePath(`/motors/${motor.id}`);
  redirect(
    resultUrl(returnPath, {
      type: "success",
      title: "入库成功",
      message: `${motor.motorCode} 已入库。`,
      motorId: motor.id,
      motorCode: motor.motorCode
    })
  );
}

async function performOutbound(formData: FormData, returnPath: string) {
  const user = await requireAdmin();
  const scannedCode = normalizeScannedCode(formData.get("scannedCode"));
  const issuedBy = String(formData.get("issuedBy") ?? "").trim();
  const vehicle = String(formData.get("vehicle") ?? "").trim();
  const remark = String(formData.get("remark") ?? "").trim();

  if (!scannedCode) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "出库失败",
        message: "请先扫码或输入电机编码。"
      })
    );
  }

  if (!issuedBy || !vehicle) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "出库失败",
        message: "请填写出库人和使用车辆。"
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

  let next;
  try {
    next = applyOutbound(
      { status: motor.status, currentLocation: motor.currentLocation },
      { operator: user.username, issuedBy, vehicle, remark }
    );
  } catch (error) {
    if (error instanceof MotorFlowError) {
      redirect(
        resultUrl(returnPath, {
          type: "error",
          title: "出库失败",
          message: `${error.message}。当前状态：${motor.status}。`,
          motorId: motor.id,
          motorCode: motor.motorCode
        })
      );
    }
    throw error;
  }

  await prisma.motor.update({
    where: { id: motor.id },
    data: {
      status: next.motor.status,
      currentLocation: next.motor.currentLocation,
      transactions: { create: next.transaction }
    }
  });

  revalidatePath("/motors");
  revalidatePath("/logs");
  revalidatePath(`/motors/${motor.id}`);
  redirect(
    resultUrl(returnPath, {
      type: "success",
      title: "出库成功",
      message: `${motor.motorCode} 已出库给 ${issuedBy}，车辆：${vehicle}。`,
      motorId: motor.id,
      motorCode: motor.motorCode
    })
  );
}

export async function inboundMotorAction(formData: FormData) {
  await performInbound(formData, "/motors/inbound");
}

export async function outboundMotorAction(formData: FormData) {
  await performOutbound(formData, "/motors/outbound");
}

export async function mobileInboundMotorAction(formData: FormData) {
  await performInbound(formData, "/mobile/inbound");
}

export async function mobileOutboundMotorAction(formData: FormData) {
  await performOutbound(formData, "/mobile/outbound");
}

export async function mobileLookupMotorAction(formData: FormData) {
  await requireCurrentUser();
  const scannedCode = normalizeScannedCode(formData.get("scannedCode"));

  if (!scannedCode) {
    redirect(
      resultUrl("/mobile/scan", {
        type: "error",
        title: "查询失败",
        message: "请先扫码或输入电机编码。"
      })
    );
  }

  const motor = await findMotorByScannedCode(prisma, scannedCode);
  if (!motor) {
    redirect(
      resultUrl("/mobile/scan", {
        type: "error",
        title: "未找到电机",
        message: `没有找到编码为 ${scannedCode} 的电机。`
      })
    );
  }

  redirect(
    resultUrl("/mobile/scan", {
      type: "success",
      title: "已找到电机",
      message: `${motor.motorCode} / ${motor.model} / 当前状态：${motor.status}`,
      motorId: motor.id,
      motorCode: motor.motorCode
    })
  );
}
