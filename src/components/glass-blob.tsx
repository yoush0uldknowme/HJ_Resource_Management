"use client";

/**
 * GlassSlats — Raycast 级斜向毛玻璃长条阵列 v6
 *
 * 核心改动（v6 vs v5）：
 * - 色相范围大幅扩展：粉(330) → 橙(20) → 青(185) → 蓝(230) → 紫(280)
 * - alpha 大幅提升：0.50-0.70（之前 0.25-0.45）
 * - 更宽的长条：44-88px（之前 32-72px）
 * - 背后添加彩色渐变底图，让毛玻璃有东西可模糊
 */

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5) & 0xffffffff;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

interface Slat {
  w: number;
  h: number;
  hue1: number;  // 主色相
  hue2: number;  // 渐变末端色相（偏移量）
  sat: number;
  light: number;
  alpha: number;
  gap: number;
}

const SLATS: Slat[] = [
  // 从左到右：跨越整个色谱，模拟 Raycast 彩色光带
  { w: 48, h: 200, hue1: 330, hue2: 350, sat: 85, light: 62, alpha: 0.55, gap: 12 },  // 粉红
  { w: 64, h: 190, hue1: 350, hue2: 15,  sat: 90, light: 58, alpha: 0.60, gap: 16 },  // 红→橙
  { w: 52, h: 210, hue1: 15,  hue2: 35,  sat: 92, light: 55, alpha: 0.50, gap: 14 },  // 橙
  { w: 76, h: 195, hue1: 30,  hue2: 50,  sat: 88, light: 54, alpha: 0.65, gap: 20 },  // 橙黄
  { w: 44, h: 185, hue1: 45,  hue2: 65,  sat: 85, light: 58, alpha: 0.48, gap: 11 },  // 黄橙
  { w: 68, h: 205, hue1: 160, hue2: 180, sat: 82, light: 55, alpha: 0.58, gap: 18 },  // 青
  { w: 56, h: 192, hue1: 180, hue2: 200, sat: 86, light: 53, alpha: 0.62, gap: 15 },  // 青蓝
  { w: 80, h: 198, hue1: 200, hue2: 220, sat: 84, light: 56, alpha: 0.68, gap: 22 },  // 蓝青
  { w: 46, h: 188, hue1: 220, hue2: 240, sat: 80, light: 58, alpha: 0.52, gap: 13 },  // 蓝
  { w: 72, h: 202, hue1: 240, hue2: 260, sat: 78, light: 57, alpha: 0.64, gap: 19 },  // 蓝紫
  { w: 50, h: 195, hue1: 260, hue2: 280, sat: 76, light: 58, alpha: 0.55, gap: 14 },  // 紫
  { w: 66, h: 208, hue1: 278, hue2: 300, sat: 78, light: 56, alpha: 0.60, gap: 17 },  // 紫→品
  { w: 42, h: 186, hue1: 298, hue2: 325, sat: 84, light: 58, alpha: 0.48, gap: 11 },  // 品→粉
  { w: 74, h: 200, hue1: 320, hue2: 345, sat: 86, light: 56, alpha: 0.65, gap: 20 },  // 粉
  { w: 54, h: 194, hue1: 340, hue2: 10,  sat: 88, light: 57, alpha: 0.56, gap: 15 },  // 粉→红
  { w: 60, h: 196, hue1: 10,  hue2: 30,  sat: 90, light: 55, alpha: 0.58, gap: 16 },  // 红→橙
  { w: 82, h: 204, hue1: 170, hue2: 195, sat: 83, light: 54, alpha: 0.68, gap: 23 },  // 青绿
  { w: 40, h: 182, hue1: 230, hue2: 255, sat: 80, light: 58, alpha: 0.46, gap: 10 },  // 蓝
  { w: 64, h: 198, hue1: 250, hue2: 275, sat: 77, light: 57, alpha: 0.60, gap: 18 },  // 蓝紫
  { w: 56, h: 192, hue1: 285, hue2: 310, sat: 82, light: 56, alpha: 0.54, gap: 15 },  // 品
  { w: 70, h: 206, hue1: 25,  hue2: 50,  sat: 90, light: 54, alpha: 0.63, gap: 19 },  // 橙黄
  { w: 48, h: 190, hue1: 190, hue2: 215, sat: 85, light: 55, alpha: 0.52, gap: 13 },  // 青
  { w: 66, h: 199, hue1: 310, hue2: 335, sat: 86, light: 57, alpha: 0.58, gap: 17 },  // 粉
  { w: 52, h: 193, hue1: 140, hue2: 165, sat: 80, light: 56, alpha: 0.50, gap: 14 },  // 青绿
  { w: 78, h: 203, hue1: 210, hue2: 235, sat: 82, light: 57, alpha: 0.66, gap: 21 },  // 蓝
];

import React from "react";

export function GlassSlats() {
  return (
    <div className="glass-slats-wrap" aria-hidden="true">
      {/* 底部彩色渐变 — 给毛玻璃提供可模糊的内容 */}
      <div className="slats-rainbow-bg" />

      {SLATS.map((s, i) => (
        <div
          key={i}
          className="glass-slat-item"
          style={{
            "--w":      `${s.w}px`,
            "--h":      `${s.h}%`,
            "--hue1":   s.hue1,
            "--hue2":   s.hue2,
            "--sat":    `${s.sat}%`,
            "--light":  `${s.light}%`,
            "--alpha":  s.alpha,
            "--delay":  `${(i * 0.15) % 4}s`,
            "--float-dur": `${3 + (i % 5) * 0.4}s`,
            "--sweep-delay": `${(i * 0.4) % 7}s`,
          } as React.CSSProperties}
        >
          {/* 高光层 */}
          <span className="slat-shine" />
        </div>
      ))}
    </div>
  );
}
