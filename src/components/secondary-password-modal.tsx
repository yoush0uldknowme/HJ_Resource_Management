"use client";

import { useState, useCallback } from "react";

/**
 * 二级密码验证弹窗
 * 用于删除电机、删除日志等高危操作的二次确认
 *
 * 当用户尚未设置二级密码时，自动切换到设置模式
 */
export function SecondaryPasswordModal({
  open,
  onVerified,
  onCancel,
  title = "二次验证",
  description = "此操作需要输入二级密码确认"
}: {
  open: boolean;
  onVerified: (password: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 是否需要先设置二级密码
  const [needSetup, setNeedSetup] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("请输入二级密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-secondary-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() })
      });
      const data = await res.json();

      if (data.ok) {
        onVerified(password.trim());
        setPassword("");
        setError("");
      } else if (data.message?.includes("尚未设置")) {
        // 未设置二级密码，切换到设置模式
        setNeedSetup(true);
        setError("");
      } else {
        setError(data.message || "验证失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [password, onVerified]);

  const handleSetup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupPassword.trim() || setupPassword.trim().length < 4) {
      setError("二级密码至少需要4位");
      return;
    }
    if (setupPassword.trim() !== setupConfirm.trim()) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 先设置二级密码
      const setRes = await fetch("/api/set-secondary-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: setupPassword.trim() })
      });
      const setData = await setRes.json();

      if (setData.ok) {
        // 设置成功后，自动用刚设置的密码验证通过
        onVerified(setupPassword.trim());
        setNeedSetup(false);
        setSetupPassword("");
        setSetupConfirm("");
        setError("");
      } else {
        setError(setData.message || "设置失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [setupPassword, setupConfirm, onVerified]);

  if (!open) return null;

  // 未设置二级密码 → 显示设置模式
  if (needSetup) {
    return (
      <div className="modal-overlay" onClick={onCancel}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <h2>设置二级密码</h2>
          <p className="modal-description">
            您尚未设置二级密码。二级密码用于验证删除电机、删除日志等高危操作。设置完成后将自动继续执行当前操作。
          </p>
          <form onSubmit={handleSetup}>
            <div className="field">
              <label htmlFor="setup-secondary-password">新二级密码</label>
              <input
                id="setup-secondary-password"
                type="password"
                value={setupPassword}
                onChange={(e) => { setSetupPassword(e.target.value); setError(""); }}
                placeholder="至少4位密码"
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="field">
              <label htmlFor="setup-secondary-confirm">确认密码</label>
              <input
                id="setup-secondary-confirm"
                type="password"
                value={setupConfirm}
                onChange={(e) => { setSetupConfirm(e.target.value); setError(""); }}
                placeholder="再次输入密码"
                disabled={loading}
              />
            </div>
            {error ? <p className="error">{error}</p> : null}
            <div className="modal-actions">
              <button className="button" type="submit" disabled={loading}>
                {loading ? "设置中..." : "设置并继续"}
              </button>
              <button className="button secondary" type="button" onClick={onCancel} disabled={loading}>
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 正常验证模式
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="modal-description">{description}</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="secondary-password">二级密码</label>
            <input
              id="secondary-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="请输入您的二级密码"
              autoFocus
              disabled={loading}
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <div className="modal-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "验证中..." : "确认"}
            </button>
            <button className="button secondary" type="button" onClick={onCancel} disabled={loading}>
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 管理端二级密码设置组件
 * 用于管理端工作台页面，让管理员主动设置/修改二级密码
 */
export function SecondaryPasswordSetting() {
  const [showSetup, setShowSetup] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // 是否已有二级密码
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/verify-secondary-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "check_status_dummy" })
      });
      const data = await res.json();
      if (data.message?.includes("尚未设置")) {
        setHasPassword(false);
      } else {
        setHasPassword(true);
      }
    } catch {
      // 网络错误，默认显示为未知
      setHasPassword(null);
    }
  }, []);

  // 首次渲染时检查状态
  useState(() => { checkStatus(); });

  const handleSetup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupPassword.trim() || setupPassword.trim().length < 4) {
      setError("二级密码至少需要4位");
      return;
    }
    if (setupPassword.trim() !== setupConfirm.trim()) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/set-secondary-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: setupPassword.trim() })
      });
      const data = await res.json();

      if (data.ok) {
        setSuccess("二级密码设置成功！");
        setShowSetup(false);
        setSetupPassword("");
        setSetupConfirm("");
        setHasPassword(true);
      } else {
        setError(data.message || "设置失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [setupPassword, setupConfirm]);

  return (
    <div className="secondary-password-setting">
      <div className="setting-row">
        <div>
          <strong>二级密码</strong>
          <small>
            {hasPassword === null ? "检测中..." : hasPassword ? "已设置" : "未设置"}
            — 删除电机、删除日志等高危操作需要二级密码确认
          </small>
        </div>
        <button
          className="button secondary compact"
          type="button"
          onClick={() => { setShowSetup(true); setError(""); setSuccess(""); }}
        >
          {hasPassword ? "修改密码" : "设置密码"}
        </button>
      </div>

      {success ? <p className="success">{success}</p> : null}

      {showSetup ? (
        <form onSubmit={handleSetup} className="setting-form">
          <div className="field">
            <label htmlFor="admin-set-password">{hasPassword ? "新二级密码" : "二级密码"}</label>
            <input
              id="admin-set-password"
              type="password"
              value={setupPassword}
              onChange={(e) => { setSetupPassword(e.target.value); setError(""); }}
              placeholder="至少4位密码"
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="field">
            <label htmlFor="admin-set-confirm">确认密码</label>
            <input
              id="admin-set-confirm"
              type="password"
              value={setupConfirm}
              onChange={(e) => { setSetupConfirm(e.target.value); setError(""); }}
              placeholder="再次输入密码"
              disabled={loading}
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <div className="modal-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "设置中..." : "确认设置"}
            </button>
            <button className="button secondary" type="button" onClick={() => setShowSetup(false)} disabled={loading}>
              取消
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
