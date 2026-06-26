"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SecondaryPasswordModal } from "@/components/secondary-password-modal";

/**
 * 删除单条日志按钮（管理员专用，需二级密码验证）
 */
export function DeleteLogButton({ logId, motorCode }: { logId: number; motorCode: string }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerified = async (secondaryPassword: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/delete-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: logId, secondaryPassword })
      });
      const data = await res.json();
      if (data.ok) {
        setShowModal(false);
        router.refresh();
      } else {
        alert(data.message || "删除失败");
        setShowModal(false);
      }
    } catch {
      alert("网络错误");
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
        删除
      </button>
      <SecondaryPasswordModal
        open={showModal}
        onVerified={handleVerified}
        onCancel={() => setShowModal(false)}
        title="删除日志"
        description={`确定删除 ${motorCode} 的这条日志吗？请输入二级密码确认。`}
      />
    </>
  );
}

/**
 * 清空全部日志按钮（管理员专用，需二级密码验证）
 */
export function ClearLogsButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerified = async (secondaryPassword: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/delete-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true, secondaryPassword })
      });
      const data = await res.json();
      if (data.ok) {
        setShowModal(false);
        router.refresh();
      } else {
        alert(data.message || "清空失败");
        setShowModal(false);
      }
    } catch {
      alert("网络错误");
      setShowModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="button danger"
        type="button"
        onClick={() => setShowModal(true)}
        disabled={loading}
      >
        清空全部日志
      </button>
      <SecondaryPasswordModal
        open={showModal}
        onVerified={handleVerified}
        onCancel={() => setShowModal(false)}
        title="清空全部日志"
        description="确定清空全部操作日志吗？此操作无法撤销。请输入二级密码确认。"
      />
    </>
  );
}
