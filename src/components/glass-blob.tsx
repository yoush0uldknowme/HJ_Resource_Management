"use client";

import React from "react";

/**
 * HeroBackground v15.4 — 双半球强对比（弧形分界修复版）
 *
 * 几何原理：
 *   - 深色圆：圆心在视口正上方远处 → 只露出底部一段弧 → 向下凸的曲线
 *   - 红色圆：圆心在视口正下方远处 → 只露出顶部一段弧 → 向上凸的曲线
 *   - 两段弧在视口中间相遇 → 形成自然的 S 形有机分界线
 *
 * 弯曲程度 ∝ 1 / 圆直径（圆越小，弧越弯）
 */

export function GlassSlats() {
  return (
    <div className="hero-semicircle-stage" aria-hidden="true">
      {/* 上方深色圆 — 圆心在视口上方 */}
      <div className="semicircle semicircle--dark" />

      {/* 下方红色圆 — 圆心在视口下方 */}
      <div className="semicircle semicircle--red" />

      {/* 噪点纹理 */}
      <div className="hero-noise" />
    </div>
  );
}
