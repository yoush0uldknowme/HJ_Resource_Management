"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "draft", label: "待入库" },
  { value: "in_stock", label: "在库" },
  { value: "checked_out", label: "已领用" }
] as const;

const DEFAULT_LOCATIONS: Record<string, string> = {
  draft: "待入库",
  in_stock: "在库",
  checked_out: "已领用"
};

/**
 * 管理员修改电机出入库状态的选择组件
 * 修改后会记录一条状态变更日志
 */
export function MotorStatusSelect({
  motorId,
  currentStatus,
  currentLocation
}: {
  motorId: number;
  currentStatus: string;
  currentLocation: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [location, setLocation] = useState(currentLocation);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    // 自动更新库位为默认值（用户可手动修改）
    if (DEFAULT_LOCATIONS[newStatus]) {
      setLocation(DEFAULT_LOCATIONS[newStatus]);
    }
  };

  const handleSubmit = async () => {
    if (status === currentStatus && location === currentLocation) {
      setMessage("状态未变化");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/update-motor-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motorId, status, location })
      });
      const data = await res.json();

      if (data.ok) {
        setMessage(data.message);
        router.refresh();
      } else {
        setMessage(data.message || "状态变更失败");
      }
    } catch {
      setMessage("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="status-change-control">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="motor-status">新状态</label>
          <select
            id="motor-status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={loading}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="motor-location">库位 / 去向</label>
          <input
            id="motor-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <button
        className="button secondary"
        type="button"
        onClick={handleSubmit}
        disabled={loading || (status === currentStatus && location === currentLocation)}
      >
        {loading ? "变更中..." : "变更状态"}
      </button>
      {message ? <p className={message.includes("失败") || message.includes("错误") ? "error" : "muted"}>{message}</p> : null}
      <small className="muted">状态变更将记录一条"状态变更"日志，包含原状态和新状态信息</small>
    </div>
  );
}
