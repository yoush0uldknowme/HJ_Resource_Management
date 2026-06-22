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
  /** 标记 scanner.start() 是否成功，防止对未启动的扫描器调用 stop() */
  const startedRef = useRef(false);
  /** 标记是否已主动停止，避免清理函数二次 stop */
  const stoppedRef = useRef(false);

  const doStop = useCallback(async () => {
    // 只有扫描器真正启动过才调用 stop()，否则 html5-qrcode 会抛出
    // "Cannot stop, scanner is not running or paused"
    if (scannerRef.current && startedRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // 已停止，忽略
      }
      startedRef.current = false;
    }
    scannerRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    scannedRef.current = false;
    stoppedRef.current = false;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          // 不在此处 stop，由组件卸载清理统一处理
          setScanning(false);
          onScan(decodedText.trim());
        },
        () => {
          // 未识别到二维码，静默忽略
        }
      );
      startedRef.current = true;
      setScanning(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "无法打开摄像头";
      setError(message);
    }
  }, [onScan]);

  const stop = useCallback(async () => {
    stoppedRef.current = true;
    await doStop();
    setScanning(false);
    onClose();
  }, [onClose, doStop]);

  useEffect(() => {
    start();
    return () => {
      // 如果已通过 close 按钮主动停止过，不再重复停止
      if (!stoppedRef.current) {
        doStop();
      }
    };
  }, [start, doStop]);

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
