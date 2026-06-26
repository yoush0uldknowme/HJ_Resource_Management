"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QrScannerLib from "qr-scanner";

type Props = {
  onScan: (code: string) => void;
  onClose: () => void;
};

export function QrScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<QrScannerLib | null>(null);
  const destroyedRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stop = useCallback(() => {
    if (scannerRef.current && !destroyedRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    destroyedRef.current = false;

    await new Promise((r) => setTimeout(r, 100));
    if (destroyedRef.current) return;

    const videoEl = document.getElementById("qr-video") as HTMLVideoElement | null;
    if (!videoEl) {
      setError("无法找到摄像头元素");
      return;
    }

    try {
      const scanner = new QrScannerLib(
        videoEl,
        (result) => {
          if (destroyedRef.current) return;
          scannerRef.current?.stop();
          scannerRef.current?.destroy();
          setScanning(false);
          onScanRef.current?.(result.data.trim());
        },
        {
          maxScansPerSecond: 5,
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setScanning(true);

      // 同时尝试两种颜色反转模式（亮码/暗码）提升彩色码识别
      scanner.setInversionMode("both");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "无法打开摄像头";
      setError(message);
    }
  }, []);

  useEffect(() => {
    start();
    return () => {
      destroyedRef.current = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-dialog">
        <div className="qr-scanner-header">
          <h3>扫描电机二维码</h3>
          <button type="button" className="qr-scanner-close" onClick={() => { stop(); onClose(); }}>
            ✕
          </button>
        </div>

        {error ? (
          <div className="qr-scanner-error">
            <p>⚠️ 摄像头错误：{error}</p>
            <p className="muted">请确保已授予摄像头权限，或使用手动输入。</p>
            <button className="button secondary" type="button" onClick={() => { stop(); onClose(); }}>
              关闭
            </button>
          </div>
        ) : (
          <>
            <div className="qr-video-wrapper" style={{
              position: "relative", width: "100%", background: "#000",
              borderRadius: 8, overflow: "hidden"
            }}>
              <video id="qr-video" style={{ width: "100%", display: "block" }} playsInline />
            </div>
            <p className="muted" style={{ textAlign: "center", marginTop: 12, fontSize: 14 }}>
              {scanning
                ? "请将手机靠近二维码，扫描到后自动关闭"
                : "正在启动摄像头..."}
            </p>
            <button className="button secondary" type="button" onClick={() => { stop(); onClose(); }}
              style={{ width: "100%", marginTop: 8 }}>
              关闭摄像头
            </button>
          </>
        )}
      </div>
    </div>
  );
}
