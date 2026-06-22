"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { resultUrl } from "@/lib/result";
import { normalizeScannedCode } from "@/lib/utils";
import { isAdmin, requireAdmin, requireCurrentUser, requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import {
  applyInbound,
  applyOutbound,
  executeMotorOutbound,
  MotorFlowError
} from "./flow";
import { buildMotorCode, motorCodeRange } from "./code";
import { findMotorByCode, findMotorByCodeWithPhoto } from "./lookup";

// ── Schema ──

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

// ── 照片保存 ──

async function savePhoto(
  file: File,
  motorId: number,
  photoType: string,
  uploadedBy: string
) {
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

// ── 电机 CRUD ──

export async function createMotorAction(formData: FormData) {
  const user = await requireAdmin();
  const parsed = createMotorSchema.parse({
    name: formData.get("name"),
    model: formData.get("model"),
    remark: formData.get("remark") || undefined
  });

  const latest = await prisma.motor.findFirst({
    where: { motorCode: motorCodeRange(parsed.model) },
    orderBy: { motorCode: "desc" },
    select: { motorCode: true }
  });
  const lastSequence = latest ? Number(latest.motorCode.slice(-4)) || 0 : 0;
  const motorCode = buildMotorCode(parsed.model, lastSequence + 1);

  // 带重试的创建（处理编码竞态）
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const motor = await prisma.motor.create({
        data: {
          motorCode: attempt === 0 ? motorCode : buildMotorCode(parsed.model, lastSequence + attempt + 1),
          name: parsed.name,
          model: parsed.model,
          snCode: null,
          remark: parsed.remark,
          status: "in_stock",
          currentLocation: "在库",
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
    } catch (error: unknown) {
      const isUniqueError =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002";
      if (!isUniqueError || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      // 编码冲突，重试
    }
  }
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

// ── 入库 ──

async function performInbound(formData: FormData, returnPath: string) {
  const user = await requireOperator();
  const scannedCode = normalizeScannedCode(formData.get("scannedCode"));
  const remark = String(formData.get("remark") ?? "").trim();

  if (!scannedCode) {
    redirect(
      resultUrl(returnPath, {
        type: "error",
        title: "入库失败",
        message: "请先输入电机编号。"
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

  let next;
  try {
    next = applyInbound(
      { status: motor.status, currentLocation: motor.currentLocation },
      { operator: user.username, remark }
    );
  } catch (error) {
    if (error instanceof MotorFlowError) {
      redirect(
        resultUrl(returnPath, {
          type: "error",
          title: "入库失败",
          message: `${error.message}。当前状态：${motor.status}。`,
          motorId: motor.id,
          motorCode: motor.motorCode
        })
      );
    }
    throw error;
  }

  await executeMotorOutbound(prisma, motor.id, next.transaction, next.motor, [
    "/motors",
    "/logs",
    `/motors/${motor.id}`
  ]);

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

// ── 出库（直接出库，仅 admin） ──

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
        message: "请先输入电机编号。"
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

  await executeMotorOutbound(prisma, motor.id, next.transaction, next.motor, [
    "/motors",
    "/logs",
    `/motors/${motor.id}`
  ]);

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

// ── 导出给路由使用的 Actions ──

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

// ── 移动端扫码查询 ──

export async function mobileLookupMotorAction(formData: FormData) {
  await requireCurrentUser();
  const scannedCode = normalizeScannedCode(formData.get("scannedCode"));

  if (!scannedCode) {
    redirect(
      resultUrl("/mobile/scan", {
        type: "error",
        title: "查询失败",
        message: "请先输入电机编号。"
      })
    );
  }

  const motor = await findMotorByCodeWithPhoto(prisma, scannedCode);
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
