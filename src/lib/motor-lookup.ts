import type { PrismaClient } from "@prisma/client";

export function normalizeScannedCode(value: FormDataEntryValue | null | undefined): string {
  return String(value ?? "").trim();
}

export async function findMotorByScannedCode(prisma: PrismaClient, scannedCode: string) {
  const code = scannedCode.trim();
  if (!code) return null;

  return prisma.motor.findFirst({
    where: {
      OR: [{ motorCode: code }, { snCode: code }]
    },
    include: {
      photos: {
        where: { photoType: "archive" },
        orderBy: { uploadedAt: "desc" },
        take: 1
      }
    }
  });
}
