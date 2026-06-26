"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SecondaryPasswordModal } from "@/components/secondary-password-modal";

/**
 * 删除电机按钮（管理员专用，需二级密码验证）
 */
export function DeleteMotorButton({
  motorId,
  motorCode
}: {
  motorId: number;
  motorCode: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleVerified = async (secondaryPassword: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/delete-motor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: motorId, secondaryPassword })
      });
      const data = await res.json();

      if (data.ok) {
        setShowModal(false);
        router.push("/motors");
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
        className="button danger compact"
        type="button"
        onClick={() => setShowModal(true)}
        disabled={loading}
      >
        删除电机
      </button>
      {error ? <p className="error" style={{ marginTop: 8 }}>{error}</p> : null}
      <SecondaryPasswordModal
        open={showModal}
        onVerified={handleVerified}
        onCancel={() => setShowModal(false)}
        title={`删除电机 ${motorCode}`}
        description="删除电机将同时移除其照片、流转记录和相关出库申请引用。此操作不可撤销，请输入二级密码确认。"
      />
    </>
  );
}
