"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/qr-scanner";

type Props = {
  /** 扫码后跳转的目标页面路径，code 会自动作为 query 参数拼接 */
  redirectTo: string;
  /** 按钮文字 */
  label?: string;
  /** 扫码后是否替换导航栈（默认 true） */
  replace?: boolean;
};

export function MobileScanButton({
  redirectTo,
  label = "📷 扫码识别",
  replace = true
}: Props) {
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        className="button mobile-primary-action"
        type="button"
        onClick={() => setShowScanner(true)}
        style={{
          background: "var(--tech)",
          borderColor: "var(--tech)",
          color: "#08201d",
          fontWeight: 900
        }}
      >
        {label}
      </button>
      {showScanner && (
        <QrScanner
          onScan={(code) => {
            setShowScanner(false);
            const url = `${redirectTo}?code=${encodeURIComponent(code)}`;
            if (replace) {
              router.replace(url);
            } else {
              router.push(url);
            }
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
