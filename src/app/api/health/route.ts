import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 健康检查接口
 * GET /api/health
 * 用于监控、负载均衡探测和 systemd 健康检查。
 * 返回 JSON: { status: "ok"|"degraded", db: boolean, uptime: number }
 */
export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // 数据库不可用
  }

  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      db: dbOk,
      timestamp: Date.now()
    },
    {
      status: dbOk ? 200 : 503,
      headers: { "Cache-Control": "no-cache" }
    }
  );
}
