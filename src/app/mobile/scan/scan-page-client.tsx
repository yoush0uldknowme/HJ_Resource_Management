"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/qr-scanner";

type Props = {
  children?: React.ReactNode;
};

export function ScanPageClient({ children }: Props) {
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

  return (
    <>
      {children}
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
        📷 扫码识别
      </button>
      {showScanner && (
        <QrScanner
          onScan={(code) => {
            router.push(`/mobile/scan?code=${encodeURIComponent(code)}`);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
