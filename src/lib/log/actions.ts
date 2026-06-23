"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

export async function deleteLogAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await prisma.motorTransaction.updateMany({
    where: { id },
    data: { deleted: true, deletedAt: new Date() }
  });
  revalidatePath("/logs");
}

export async function clearLogsAction() {
  await requireAdmin();
  await prisma.motorTransaction.updateMany({
    data: { deleted: true, deletedAt: new Date() }
  });
  revalidatePath("/logs");
}
