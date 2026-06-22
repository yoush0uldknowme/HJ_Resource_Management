"use client";

export default function MobileError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mobile-shell" style={{ paddingTop: 32, textAlign: "center" }}>
      <div className="result-panel error">
        <h2>页面加载失败</h2>
        <p className="muted">{error.message || "发生了未知错误，请刷新后重试。"}</p>
      </div>
      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <button className="button mobile-primary-action" onClick={reset}>
          重试
        </button>
        <a className="button secondary" href="/mobile">
          返回手机端
        </a>
      </div>
    </main>
  );
}
