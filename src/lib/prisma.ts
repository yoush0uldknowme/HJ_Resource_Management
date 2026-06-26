import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 优雅断开：应用关闭时清理数据库连接
process.on("beforeExit", async () => {
  try {
    await prisma.$disconnect();
  } catch {
    // 断开失败时静默处理
  }
});
