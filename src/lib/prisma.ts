import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // SQLite: 限制并发连接，防止 WAL 文件膨胀
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 每 5 分钟执行一次 SQLite WAL checkpoint，防止 WAL 文件无限增长导致查询变慢
const WAL_CHECKPOINT_INTERVAL = 5 * 60 * 1000;
let walCheckpointTimer: ReturnType<typeof setInterval> | null = null;

if (process.env.DATABASE_URL?.startsWith("file:")) {
  walCheckpointTimer = setInterval(async () => {
    try {
      // PRAGMA wal_checkpoint 返回结果行，必须用 $queryRawUnsafe 而非 $executeRawUnsafe
      await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
      // WAL checkpoint 失败时静默处理
    }
  }, WAL_CHECKPOINT_INTERVAL);

  // 防止 setInterval 阻止进程退出
  if (walCheckpointTimer && typeof walCheckpointTimer === "object" && "unref" in walCheckpointTimer) {
    (walCheckpointTimer as NodeJS.Timeout).unref();
  }
}

// 优雅断开：应用关闭时清理
const cleanup = async () => {
  if (walCheckpointTimer) {
    clearInterval(walCheckpointTimer);
    walCheckpointTimer = null;
  }
  try {
    await prisma.$disconnect();
  } catch {
    // 断开失败时静默处理
  }
};

process.on("beforeExit", cleanup);
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
