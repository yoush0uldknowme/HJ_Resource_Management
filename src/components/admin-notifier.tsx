"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type NotificationData = {
  type: "initial" | "new_request";
  pendingCount?: number;
  requestId?: number;
  model?: string;
  quantity?: number;
  requester?: string;
};

/**
 * 管理员实时通知组件
 * 通过 SSE 订阅新出库申请，收到时：
 * 1. 播放提示音
 * 2. 弹浏览器通知（需要用户授权）
 * 3. 页面内显示 Toast
 * 4. 导航栏待审批数字自动更新
 */
export function AdminNotifier({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [toast, setToast] = useState<NotificationData | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    // 创建提示音（用 Web Audio API 生成，不需要音频文件）
    const playBeep = () => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioContextClass();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + 0.4
        );

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
      } catch {
        // AudioContext 不可用，静默忽略
      }
    };

    const showToast = (data: NotificationData) => {
      setToast(data);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 6000);
    };

    // 请求浏览器通知权限
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // 建立 SSE 连接（使用 ref 以便重连时更新）
    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource("/api/events/requests");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data: NotificationData = JSON.parse(event.data);

          if (data.type === "initial") {
            // 初始连接，不弹通知
            return;
          }

          if (data.type === "new_request") {
            // 1. 播放提示音
            playBeep();

            // 2. 弹浏览器通知
            if ("Notification" in window && Notification.permission === "granted") {
              const n = new Notification("新的出库申请", {
                body: `${data.requester} 申请 ${data.model} × ${data.quantity}`,
                icon: "/icon-192.png",
                tag: `request-${data.requestId}`,
              });
              n.onclick = () => {
                window.focus();
                router.push("/admin/requests");
                n.close();
              };
            }

            // 3. 页面内 Toast
            showToast(data);

            // 4. 刷新页面数据（导航栏待审批数会更新）
            router.refresh();
          }
        } catch {
          // 解析失败，忽略
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // 不重连：如果是 401（未登录/非管理员），EventSource 无法读取状态码，
        // 但 onerror 一定触发。避免无限重连循环，静默放弃。
        // 管理员页面重新加载时会重新建立连接。
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <>
      {toast && toast.type === "new_request" ? (
        <div
          style={{
            position: "fixed",
            top: "70px",
            right: "20px",
            zIndex: 200,
            minWidth: "300px",
            maxWidth: "380px",
            padding: "16px 20px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0f766e, #115e59)",
            color: "#fff",
            boxShadow: "0 12px 40px rgba(15, 118, 110, 0.4)",
            animation: "toast-slide-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            cursor: "pointer",
          }}
          onClick={() => {
            setToast(null);
            router.push("/admin/requests");
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span style={{ fontSize: "20px" }}>🔔</span>
            <strong style={{ fontSize: "16px" }}>新的出库申请</strong>
          </div>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.9, lineHeight: 1.5 }}>
            <strong>{toast.requester}</strong> 申请{" "}
            <strong>{toast.model}</strong>
            {toast.quantity ? ` × ${toast.quantity}` : ""}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "12px", opacity: 0.7 }}>
            点击查看 →
          </p>
        </div>
      ) : null}

      <style>{`
        @keyframes toast-slide-right {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
