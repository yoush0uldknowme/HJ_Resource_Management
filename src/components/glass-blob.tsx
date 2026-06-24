"use client";

/**
 * GlassSlats — Raycast 风格斜向毛玻璃长条阵列 v7
 *
 * v7 改动（按用户反馈）：
 * - 色系改为单色系（蓝紫 → 白），不再五颜六色
 * - 长条数量增至 35 根，铺满全屏
 * - 统一宽度 54px，紧密排列（gap 2px）
 * - 倾斜角度 -32°（更陡）
 * - 颜色过渡改用缓慢漂移（12s ease-in-out），不再生硬
 * - 背景改为明亮渐变，让毛玻璃 blur 有东西可模糊
 * - 新增中心高亮区，让遮罩下的内容更清晰
 */

import React from "react";

/* 确定性伪随机（避免 SSR 水合不匹配）*/
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5) & 0xffffffff;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

/* 单色系配色：蓝紫 → 白
 * 每条长条的主色相在 220~270 之间（蓝→紫），
 * 渐变末端向白色偏移（更高的 lightness + 更低的 saturation）
 * 整体做缓慢的色相漂移（220→270→220），过渡柔和
 */
const SLAT_COUNT = 35;
const SLAT_WIDTH = 54;          // px，统一宽度
const SLAT_GAP   = 2;          // px，紧密排列

interface Slat {
  hue: number;       // 主色相（220~270 蓝紫区间）
  sat: number;       // 饱和度（60~80，较高）
  light: number;     // 亮度（50~65）
  alpha: number;     // 不透明度（0.55~0.78，清晰可见的独立条带）
  height: number;    // 高度百分比
  driftOffset: number; // 色相漂移相位偏移（让每条漂移不同步）
}

function generateSlats(): Slat[] {
  const slats: Slat[] = [];
  for (let i = 0; i < SLAT_COUNT; i++) {
    // 色相在蓝紫区间均匀分布，加一点随机偏移
    const baseHue = 220 + (i / SLAT_COUNT) * 50 + (rand() - 0.5) * 12;
    slats.push({
      hue:         Math.round(baseHue),
      sat:         Math.round(68 + rand() * 16),   // 68~84%
      light:       Math.round(50 + rand() * 16),   // 50~66%
      alpha:       parseFloat((0.55 + rand() * 0.23).toFixed(2)), // 0.55~0.78
      height:      Math.round(90 + rand() * 40),   // 90~130%
      driftOffset: parseFloat((i * 0.28).toFixed(2)),
    });
  }
  return slats;
}

const SLATS = generateSlats();

export function GlassSlats() {
  return (
    <div className="glass-slats-wrap" aria-hidden="true">

      {/* 明亮背景渐变 — 毛玻璃需要这个才能出效果 */}
      <div className="slats-bg-gradient" />

      {/* 动态光斑层 — 缓慢漂移的彩色光晕 */}
      <div className="slats-light-pool pool-1" />
      <div className="slats-light-pool pool-2" />
      <div className="slats-light-pool pool-3" />

      {SLATS.map((s, i) => (
        <div
          key={i}
          className="glass-slat-item"
          style={{
            "--i":        i,
            "--w":        `${SLAT_WIDTH}px`,
            "--h":        `${s.height}%`,
            "--hue":      s.hue,
            "--sat":      `${s.sat}%`,
            "--light":    `${s.light}%`,
            "--alpha":    s.alpha,
            "--drift":    s.driftOffset,
            "--float-dur": `${4 + (i % 4) * 0.6}s`,
          } as React.CSSProperties}
        >
          {/* 高光扫过效果 */}
          <span className="slat-shine" />
        </div>
      ))}
    </div>
  );
}
