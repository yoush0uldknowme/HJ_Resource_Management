"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QrScannerLib from "qr-scanner";

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

const COOLDOWN_MS = 2000; // 成功后的冷却时间
const FAIL_COOLDOWN_MS = 800; // 失败后的冷却时间

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

  const scannerRef = useRef<QrScannerLib | null>(null);
  const destroyedRef = useRef(false);
  const submittedRef = useRef(false);
  const cooldownRef = useRef(false);
  const historyIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSuccessRef = useRef(false);

  // 用 ref 存最新 props
  const modeRef = useRef(mode); modeRef.current = mode;
  const issuedByRef = useRef(issuedBy); issuedByRef.current = issuedBy;
  const vehicleRef = useRef(vehicle); vehicleRef.current = vehicle;
  const targetPersonRef = useRef(targetPerson); targetPersonRef.current = targetPerson;
  const destinationRef = useRef(destination); destinationRef.current = destination;
  const remarkRef = useRef(remark); remarkRef.current = remark;

  const successCount = history.filter((h) => h.ok).length;
  const failCount = history.filter((h) => !h.ok).length;

  const submitCode = async (code: string) => {
    if (submittedRef.current || cooldownRef.current) return;
    submittedRef.current = true;
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
      result = { ok: false, motorCode: code, message: "网络错误" };
    }

    setToast(result);
    setHistory((prev) => [{ ...result, id: ++historyIdRef.current }, ...prev]);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);

    submittedRef.current = false;
    setSubmitting(false);

    if (result.ok) {
      hasSuccessRef.current = true;
    }

    // 冷却
    cooldownRef.current = true;
    setCooldown(true);
    setTimeout(() => {
      cooldownRef.current = false;
      setCooldown(false);
    }, result.ok ? COOLDOWN_MS : FAIL_COOLDOWN_MS);
  };

  const handleClose = () => {
    destroyedRef.current = true;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
    }
    if (hasSuccessRef.current) router.refresh();
    onClose();
  };

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled) return;

      const videoEl = document.getElementById("continuous-qr-video") as HTMLVideoElement | null;
      if (!videoEl) {
        setError("无法找到扫描器容器");
        return;
      }

      try {
        const scanner = new QrScannerLib(
          videoEl,
          (result) => {
            if (cancelled || destroyedRef.current || submittedRef.current || cooldownRef.current) return;
            submitCode(result.data.trim());
          },
          {
            maxScansPerSecond: 3,
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
        scanner.setInversionMode("both");

        if (!cancelled) setScanning(true);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "无法打开摄像头");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-dialog" style={{ width: "min(440px, 100%)" }}>
        <div className="qr-scanner-header">
          <h3>
            {mode === "inbound" ? "连续扫码入库"
              : mode === "outbound" ? "连续扫码出库"
              : mode === "executeApproved" ? "连续扫码执行出库"
              : "连续扫码申请出库"}
          </h3>
          <button className="qr-scanner-close" onClick={handleClose}>✕</button>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "12px", fontSize: "14px" }}>
          <span style={{ color: "var(--primary-dark)", fontWeight: 700 }}>✓ 成功 {successCount}</span>
          <span style={{ color: "var(--danger)", fontWeight: 700 }}>✗ 失败 {failCount}</span>
          <span style={{ color: "var(--muted)" }}>共 {history.length} 次</span>
        </div>

        <div style={{
          position: "relative", width: "100%", borderRadius: "8px",
          overflow: "hidden", background: "#000", minHeight: "200px",
          opacity: cooldown ? 0.4 : 1, transition: "opacity 0.3s"
        }}>
          <video id="continuous-qr-video" style={{ width: "100%", display: "block" }} playsInline />
        </div>

        {error ? (
          <div className="qr-scanner-error">
            <p className="error">⚠️ {error}</p>
            <p className="muted" style={{ fontSize: "13px" }}>请确认已授予摄像头权限，并使用 HTTPS 访问。</p>
          </div>
        ) : (
          <p style={{
            textAlign: "center", fontSize: "14px", marginTop: "10px",
            color: cooldown ? "var(--primary)" : "var(--muted)",
            fontWeight: cooldown ? 700 : 400
          }}>
            {cooldown ? "⏳ 请稍候..." : submitting ? "正在处理..." : scanning ? "请将手机靠近二维码" : "正在启动摄像头..."}
          </p>
        )}

        {history.length > 0 ? (
          <div style={{
            marginTop: "12px", maxHeight: "160px", overflowY: "auto",
            border: "1px solid var(--line)", borderRadius: "8px", padding: "8px"
          }}>
            {history.map((item) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "6px 8px", marginBottom: "4px", borderRadius: "6px",
                background: item.ok ? "#effaf6" : "#fff3f1", fontSize: "13px"
              }}>
                <span style={{ fontWeight: 700 }}>{item.ok ? "✓" : "✗"}</span>
                <span style={{ fontWeight: 600 }}>{item.motorCode}</span>
                <span style={{ color: "var(--muted)", flex: 1, fontSize: "12px" }}>{item.message}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {toast ? (
        <div style={{
          position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)",
          zIndex: 200, padding: "14px 24px", borderRadius: "10px",
          background: toast.ok ? "#0f766e" : "#b42318", color: "#fff",
          fontSize: "16px", fontWeight: 700,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          animation: "toast-slide-in 0.3s ease-out",
          maxWidth: "90%", textAlign: "center"
        }}>
          {toast.message}
        </div>
      ) : null}

      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
