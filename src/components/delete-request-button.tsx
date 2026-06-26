"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SecondaryPasswordModal } from "@/components/secondary-password-modal";

/**
 * 带二级密码验证的申请删除按钮
 */
export function DeleteRequestButton({
  requestId,
  model,
  quantity
}: {
  requestId: number;
  model: string;
  quantity: number;
}) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleVerified = async (secondaryPassword: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, secondaryPassword })
      });
      const data = await res.json();
      if (data.ok) {
        setShowModal(false);
        router.refresh();
      } else {
        setError(data.message || "删除失败");
        setShowModal(false);
      }
    } catch {
      setError("网络错误");
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="button danger secondary"
        type="button"
        onClick={() => { setShowModal(true); setError(""); }}
        disabled={loading}
      >
        删除记录
      </button>
      {error ? <p className="error" style={{ marginTop: 8 }}>{error}</p> : null}
      <SecondaryPasswordModal
        open={showModal}
        onVerified={handleVerified}
        onCancel={() => setShowModal(false)}
        title="删除申请记录"
        description={`确定删除 ${model} × ${quantity} 的申请记录吗？此操作不可撤销，请输入二级密码确认。`}
      />
    </>
  );
}
