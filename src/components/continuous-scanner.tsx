"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

type ScanResult = {
  ok: boolean;
  motorCode: string;
  message: string;
};

type Props = {
  mode: "inbound" | "outbound" | "request" | "executeApproved";
  issuedBy?: string;
  vehicle?: string;
  targetPerson?: string;
  destination?: string;
  remark?: string;
  onClose: () => void;
};

type HistoryItem = ScanResult & { id: number };

/** 扫码成功后的冷却时间（毫秒），避免连续扫描堆积 */
const COOLDOWN_MS = 2000;

export function ContinuousScanner({
  mode,
  issuedBy = "",
  vehicle = "",
  targetPerson = "",
  destination = "",
  remark = "",
  onClose
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // 所有会变化的值都用 ref 存，避免 callback 重建导致 useEffect 重跑
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const scannedRef = useRef(false);
  const submittingRef = useRef(false);
  const cooldownRef = useRef(false);
  const historyIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSuccessRef = useRef(false); // 记录是否有成功操作，关闭时用于判断是否刷新

  // 用 ref 保存最新的 props，供扫码回调使用
  const modeRef = useRef(mode);
  const issuedByRef = useRef(issuedBy);
  const vehicleRef = useRef(vehicle);
  const targetPersonRef = useRef(targetPerson);
  const destinationRef = useRef(destination);
  const remarkRef = useRef(remark);

  modeRef.current = mode;
  issuedByRef.current = issuedBy;
  vehicleRef.current = vehicle;
  targetPersonRef.current = targetPerson;
  destinationRef.current = destination;
  remarkRef.current = remark;

  const successCount = history.filter((h) => h.ok).length;
  const failCount = history.filter((h) => !h.ok).length;

  // 提交扫码结果到 API — 不依赖任何会变化的 state，用 ref
  const submitCode = async (code: string) => {
    if (submittingRef.current || cooldownRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    let result: ScanResult;
    try {
      const res = await fetch("/api/scan-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: modeRef.current,
          code,
          issuedBy: issuedByRef.current,
          vehicle: vehicleRef.current,
          targetPerson: targetPersonRef.current,
          destination: destinationRef.current,
          remark: remarkRef.current
        })
      });
      const data = await res.json();
      result = {
        ok: data.ok ?? false,
        motorCode: data.motorCode ?? code,
        message: data.message ?? "操作完成"
      };
    } catch {
      result = {
        ok: false,
        motorCode: code,
        message: "网络错误，请检查连接"
      };
    }

    // 更新 UI
    setToast(result);
    setHistory((prev) => [
      { ...result, id: ++historyIdRef.current },
      ...prev
    ]);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);

    submittingRef.current = false;
    setSubmitting(false);

    if (result.ok) {
      hasSuccessRef.current = true;
      // 成功后进入冷却期，防止连续扫描堆积
      cooldownRef.current = true;
      setCooldown(true);
      cooldownTimerRef.current = setTimeout(() => {
        cooldownRef.current = false;
        setCooldown(false);
        // 冷却结束后才重置扫描标记
        scannedRef.current = false;
      }, COOLDOWN_MS);
    } else {
      // 失败也短暂冷却（500ms），避免快速重复扫描同一个
      cooldownRef.current = true;
      setCooldown(true);
      cooldownTimerRef.current = setTimeout(() => {
        cooldownRef.current = false;
        setCooldown(false);
        scannedRef.current = false;
      }, 800);
    }
  };

  // 关闭扫描器：如果有成功操作，刷新页面让用户看到最新状态
  const handleClose = () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (scannerRef.current && startedRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    startedRef.current = false;
    scannerRef.current = null;

    // 如果有过成功操作，刷新当前页面让数据更新
    if (hasSuccessRef.current) {
      router.refresh();
    }
    onClose();
  };

  // 只在组件挂载时启动一次扫描器，绝不重新执行
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (startedRef.current) return;
      startedRef.current = true;

      // 等待 DOM 元素就绪
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled) return;

      const el = document.getElementById("continuous-qr-reader");
      if (!el) {
        setError("无法找到扫描器容器");
        return;
      }

      const scanner = new Html5Qrcode("continuous-qr-reader");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          (decodedText) => {
            // 冷却期或提交中不响应
            if (scannedRef.current || submittingRef.current || cooldownRef.current) return;
            scannedRef.current = true;
            submitCode(decodedText.trim());
          },
          () => {
            // 未识别到二维码，静默忽略
          }
        );
        if (!cancelled) {
          setScanning(true);
        } else {
          scanner.stop().catch(() => {});
        }
      } catch (e: unknown) {
        startedRef.current = false;
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "无法打开摄像头";
          setError(message);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (scannerRef.current && startedRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      startedRef.current = false;
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-dialog" style={{ width: "min(440px, 100%)" }}>
        <div className="qr-scanner-header">
          <h3>
            {mode === "inbound"
              ? "连续扫码入库"
              : mode === "outbound"
                ? "连续扫码出库"
                : mode === "executeApproved"
                  ? "连续扫码执行出库"
                  : "连续扫码申请出库"}
          </h3>
          <button className="qr-scanner-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* 统计栏 */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "12px",
            fontSize: "14px"
          }}
        >
          <span style={{ color: "var(--primary-dark)", fontWeight: 700 }}>
            ✓ 成功 {successCount}
          </span>
          <span style={{ color: "var(--danger)", fontWeight: 700 }}>
            ✗ 失败 {failCount}
          </span>
          <span style={{ color: "var(--muted)" }}>
            共 {history.length} 次
          </span>
        </div>

        {/* 摄像头预览 */}
        <div
          id="continuous-qr-reader"
          style={{
            width: "100%",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#000",
            minHeight: "200px",
            // 冷却时降低透明度提示用户等待
            opacity: cooldown ? 0.4 : 1,
            transition: "opacity 0.3s"
          }}
        />

        {error ? (
          <div className="qr-scanner-error">
            <p className="error">⚠️ {error}</p>
            <p className="muted" style={{ fontSize: "13px" }}>
              请确认已授予摄像头权限，并使用 HTTPS 访问。
            </p>
          </div>
        ) : (
          <p
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: cooldown
                ? "var(--primary)"
                : "var(--muted)",
              marginTop: "10px",
              fontWeight: cooldown ? 700 : 400
            }}
          >
            {cooldown
              ? "⏳ 请稍候，2 秒后可继续扫描..."
              : submitting
                ? "正在处理..."
                : scanning
                  ? "将二维码对准扫描框，扫完自动继续"
                  : "正在启动摄像头..."}
          </p>
        )}

        {/* 最近操作历史 */}
        {history.length > 0 ? (
          <div
            style={{
              marginTop: "12px",
              maxHeight: "160px",
              overflowY: "auto",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "8px"
            }}
          >
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 8px",
                  marginBottom: "4px",
                  borderRadius: "6px",
                  background: item.ok ? "#effaf6" : "#fff3f1",
                  fontSize: "13px"
                }}
              >
                <span style={{ fontWeight: 700, flex: "0 0 auto" }}>
                  {item.ok ? "✓" : "✗"}
                </span>
                <span style={{ fontWeight: 600, flex: "0 0 auto" }}>
                  {item.motorCode}
                </span>
                <span style={{ color: "var(--muted)", flex: 1, fontSize: "12px" }}>
                  {item.message}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 浮动 Toast 提示 */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            padding: "14px 24px",
            borderRadius: "10px",
            background: toast.ok ? "#0f766e" : "#b42318",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            animation: "toast-slide-in 0.3s ease-out",
            maxWidth: "90%",
            textAlign: "center"
          }}
        >
          {toast.message}
        </div>
      ) : null}

      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        #continuous-qr-reader video {
          object-fit: cover;
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
