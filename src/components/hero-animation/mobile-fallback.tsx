"use client";

import { HERO_CONFIG as C } from "./config";

export function MobileFallback() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: C.mobileGradient,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* 简单静态渐变，不加载任何 JS 动画 */}
      <div
        style={{
          position: "absolute",
          inset: "-20% -20%",
          background: `radial-gradient(ellipse at 50% 45%, ${C.mobileAccent}22 0%, transparent 65%)`,
          filter: "blur(60px)",
        }}
      />
    </div>
  );
}
