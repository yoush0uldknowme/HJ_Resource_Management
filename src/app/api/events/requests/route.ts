import { NextRequest } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { getListenerCount, subscribeToNewRequests, unsubscribeListener } from "@/lib/events";

export const dynamic = "force-dynamic";

// 最大 SSE 连接数限制，防止耗尽资源
const MAX_SSE_CONNECTIONS = 5;
// 连接超时：2 分钟后自动关闭，防止僵尸连接堆积
const CONNECTION_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * SSE 接口：管理员订阅新出库申请通知
 * GET /api/events/requests
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 连接数限制：防止耗尽资源
  if (getListenerCount() >= MAX_SSE_CONNECTIONS) {
    return new Response("Too many SSE connections", { status: 429 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接确认
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream 已关闭，清理 listener
          unsubscribeListener(listener);
          clearInterval(heartbeat);
          clearTimeout(timeout);
        }
      };

      // 先发送当前待审批数量
      prisma.outboundRequest
        .count({ where: { status: "pending" } })
        .then((count) => {
          send({ type: "initial", pendingCount: count });
        })
        .catch(() => {
          // 数据库查询失败，仍保持 SSE 连接
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
          clearTimeout(timeout);
          unsubscribeListener(listener);
        }
      }, 30000);

      // 连接超时后自动关闭
      const timeout = setTimeout(() => {
        clearInterval(heartbeat);
        unsubscribeListener(listener);
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "timeout" })}\n\n`));
          controller.close();
        } catch {
          // 已关闭
        }
      }, CONNECTION_TIMEOUT_MS);

      // 客户端断开时清理
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clearTimeout(timeout);
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
