import { NextRequest } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { subscribeToNewRequests, unsubscribeListener } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * SSE 接口：管理员订阅新出库申请通知
 * GET /api/events/requests
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接确认
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 先发送当前待审批数量
      prisma.outboundRequest
        .count({ where: { status: "pending" } })
        .then((count) => {
          send({ type: "initial", pendingCount: count });
        });

      // 订阅新申请事件
      const listener = (data: unknown) => send(data);
      subscribeToNewRequests(listener);

      // 心跳保活（每 30 秒发一条注释）
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // 客户端断开时清理
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribeListener(listener);
        try {
          controller.close();
        } catch {
          // 已关闭
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
