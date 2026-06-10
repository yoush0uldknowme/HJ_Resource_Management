"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function deleteLogAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await prisma.motorTransaction.deleteMany({ where: { id } });
  revalidatePath("/logs");
}

export async function clearLogsAction() {
  await requireAdmin();
  await prisma.motorTransaction.deleteMany();
  revalidatePath("/logs");
}
