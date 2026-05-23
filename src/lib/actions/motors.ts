"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyInbound, applyOutbound } from "@/lib/motor-flow";
import { buildMotorCode, motorCodeRange } from "@/lib/motor-code";

const createMotorSchema = z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  remark: z.string().optional()
});

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
  const user = await requireCurrentUser();
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

async function findMotorByScannedCode(scannedCode: string) {
  const code = scannedCode.trim();
  if (!code) {
    throw new Error("scanned code is required");
  }

  return prisma.motor.findFirstOrThrow({
    where: {
      OR: [{ motorCode: code }, { snCode: code }]
    }
  });
}

export async function inboundMotorAction(formData: FormData) {
  const user = await requireCurrentUser();
  const scannedCode = String(formData.get("scannedCode") ?? "").trim();
  const remark = String(formData.get("remark") ?? "").trim();

  const motor = await findMotorByScannedCode(scannedCode);
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

  revalidatePath(`/motors/${motor.id}`);
  redirect(`/motors/${motor.id}`);
}

export async function outboundMotorAction(formData: FormData) {
  const user = await requireCurrentUser();
  const scannedCode = String(formData.get("scannedCode") ?? "").trim();
  const issuedBy = String(formData.get("issuedBy") ?? "").trim();
  const vehicle = String(formData.get("vehicle") ?? "").trim();
  const remark = String(formData.get("remark") ?? "").trim();

  const motor = await findMotorByScannedCode(scannedCode);
  const next = applyOutbound(
    { status: motor.status, currentLocation: motor.currentLocation },
    { operator: user.username, issuedBy, vehicle, remark }
  );

  await prisma.motor.update({
    where: { id: motor.id },
    data: {
      status: next.motor.status,
      currentLocation: next.motor.currentLocation,
      transactions: { create: next.transaction }
    }
  });

  revalidatePath(`/motors/${motor.id}`);
  redirect(`/motors/${motor.id}`);
}
