"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = {
  onScan: (code: string) => void;
  onClose: () => void;
};

export function QrScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  const start = useCallback(async () => {
    setError(null);
    scannedRef.current = false;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          // 避免重复触发
          if (scannedRef.current) return;
          scannedRef.current = true;
          scanner.stop().catch(() => {});
          setScanning(false);
          onScan(decodedText.trim());
        },
        () => {
          // 未识别到二维码，静默忽略
        }
      );
      setScanning(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "无法打开摄像头";
      setError(message);
    }
  }, [onScan]);

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // 已停止，忽略
      }
      scannerRef.current = null;
    }
    setScanning(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    start();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [start]);

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-dialog">
        <div className="qr-scanner-header">
          <h3>扫描电机二维码</h3>
          <button type="button" className="qr-scanner-close" onClick={stop}>
            ✕
          </button>
        </div>

        {error ? (
          <div className="qr-scanner-error">
            <p>⚠️ 摄像头错误：{error}</p>
            <p className="muted">请确保已授予摄像头权限，或使用手动输入。</p>
            <button className="button secondary" type="button" onClick={stop}>
              关闭
            </button>
          </div>
        ) : (
          <>
            <div id="qr-reader" style={{ width: "100%" }} />
            <p className="muted" style={{ textAlign: "center", marginTop: 8 }}>
              {scanning ? "将二维码对准扫描框" : "正在启动摄像头..."}
            </p>
            <button
              className="button secondary"
              type="button"
              onClick={stop}
              style={{ width: "100%", marginTop: 8 }}
            >
              关闭摄像头
            </button>
          </>
        )}
      </div>
    </div>
  );
}
