import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * 按扫码编码查找电机（轻量版，不含 photos）。
 * 用于出入库等不需要照片的场景。
 */
export async function findMotorByCode(
  prisma: PrismaClient,
  scannedCode: string
): Promise<Prisma.MotorGetPayload<{ include: { photos: false } }> | null> {
  const code = scannedCode.trim();
  if (!code) return null;

  return prisma.motor.findFirst({
    where: {
      OR: [{ motorCode: code }, { snCode: code }]
    }
  });
}

/**
 * 按扫码编码查找电机（含首张存档照片）。
 * 用于扫码查询页面等需要展示照片的场景。
 */
export async function findMotorByCodeWithPhoto(
  prisma: PrismaClient,
  scannedCode: string
) {
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
