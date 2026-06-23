"use client";

import { useEffect, useRef } from "react";

/**
 * 首页鼠标光斑交互 — Raycast 风格
 * 监听鼠标移动，在 Hero 区域渲染一个跟随光标的径向渐变光斑
 */
export function HeroMouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = glow.parentElement?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      glow.style.setProperty("--mouse-x", `${x}%`);
      glow.style.setProperty("--mouse-y", `${y}%`);
      glow.style.opacity = "1";
    };

    const handleMouseLeave = () => {
      glow.style.opacity = "0";
    };

    const parent = glow.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", handleMouseMove);
      parent.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (parent) {
        parent.removeEventListener("mousemove", handleMouseMove);
        parent.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="hero-mouse-glow"
      aria-hidden="true"
      style={{
        opacity: 0,
        transition: "opacity 0.3s ease",
      }}
    />
  );
}
