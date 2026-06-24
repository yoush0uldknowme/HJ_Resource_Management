"use client";

/**
 * GlassSlats — Raycast 级斜向毛玻璃长条阵列
 *
 * 核心特征：
 * - 15 根长条，宽度 36-78px，高度 120-160%
 * - 每根独立渐变色（蓝→紫→粉→橙→青）
 * - backdrop-filter 真实毛玻璃
 * - 色相微漂移 + 缓慢浮动 + 扫光
 * - 整体旋转 -14°
 */

interface Slat {
  w: number;       // 宽度 px
  h: number;       // 高度百分比
  hue1: number;    // 起始色相
  hue2: number;    // 结束色相
  sat: number;     // 饱和度
  light: number;   // 亮度
  alpha: number;   // 透明度
  hueDur: number;  // 色相动画时长
  floatDur: number;// 漂浮动画时长
  delay: number;   // 延迟
  sweepDur: number;// 扫光时长
  sweepDelay: number;
  yOffset: number; // 垂直偏移百分比
}

const SLATS: Slat[] = [
  { w: 44, h: 130, hue1: 230, hue2: 260, sat: 80, light: 62, alpha: 0.14, hueDur: 6.0, floatDur: 4.2, delay: 0.0, sweepDur: 8.0, sweepDelay: 0.0, yOffset: -8 },
  { w: 68, h: 145, hue1: 250, hue2: 280, sat: 75, light: 60, alpha: 0.18, hueDur: 5.5, floatDur: 3.8, delay: 0.5, sweepDur: 7.0, sweepDelay: 1.2, yOffset: 4 },
  { w: 38, h: 120, hue1: 210, hue2: 240, sat: 85, light: 64, alpha: 0.10, hueDur: 7.0, floatDur: 4.5, delay: 1.0, sweepDur: 9.0, sweepDelay: 0.5, yOffset: -12 },
  { w: 56, h: 155, hue1: 270, hue2: 300, sat: 70, light: 58, alpha: 0.15, hueDur: 5.0, floatDur: 3.5, delay: 0.3, sweepDur: 6.5, sweepDelay: 2.0, yOffset: 2 },
  { w: 72, h: 140, hue1: 220, hue2: 250, sat: 82, light: 63, alpha: 0.20, hueDur: 6.5, floatDur: 4.0, delay: 0.8, sweepDur: 7.5, sweepDelay: 0.8, yOffset: -5 },
  { w: 40, h: 125, hue1: 290, hue2: 320, sat: 78, light: 60, alpha: 0.11, hueDur: 7.5, floatDur: 4.8, delay: 1.3, sweepDur: 8.5, sweepDelay: 1.5, yOffset: 8 },
  { w: 60, h: 150, hue1: 240, hue2: 270, sat: 76, light: 61, alpha: 0.16, hueDur: 5.8, floatDur: 3.6, delay: 0.2, sweepDur: 7.2, sweepDelay: 0.3, yOffset: -3 },
  { w: 48, h: 135, hue1: 200, hue2: 230, sat: 88, light: 65, alpha: 0.13, hueDur: 6.2, floatDur: 4.3, delay: 0.7, sweepDur: 8.2, sweepDelay: 2.2, yOffset: 6 },
  { w: 76, h: 160, hue1: 260, hue2: 290, sat: 72, light: 59, alpha: 0.19, hueDur: 5.3, floatDur: 3.9, delay: 1.1, sweepDur: 6.8, sweepDelay: 1.0, yOffset: -7 },
  { w: 36, h: 118, hue1: 310, hue2: 340, sat: 80, light: 62, alpha: 0.09, hueDur: 7.2, floatDur: 4.6, delay: 0.4, sweepDur: 9.2, sweepDelay: 0.6, yOffset: 10 },
  { w: 64, h: 148, hue1: 230, hue2: 260, sat: 78, light: 63, alpha: 0.17, hueDur: 6.0, floatDur: 3.7, delay: 0.9, sweepDur: 7.8, sweepDelay: 1.8, yOffset: -2 },
  { w: 42, h: 128, hue1: 280, hue2: 310, sat: 74, light: 60, alpha: 0.12, hueDur: 6.8, floatDur: 4.4, delay: 0.1, sweepDur: 8.8, sweepDelay: 0.4, yOffset: 5 },
  { w: 52, h: 142, hue1: 210, hue2: 250, sat: 84, light: 64, alpha: 0.15, hueDur: 5.6, floatDur: 3.4, delay: 0.6, sweepDur: 7.4, sweepDelay: 2.5, yOffset: -9 },
  { w: 70, h: 152, hue1: 250, hue2: 280, sat: 73, light: 60, alpha: 0.18, hueDur: 5.4, floatDur: 4.1, delay: 1.2, sweepDur: 6.6, sweepDelay: 1.3, yOffset: 3 },
  { w: 46, h: 132, hue1: 190, hue2: 220, sat: 86, light: 66, alpha: 0.13, hueDur: 6.6, floatDur: 4.7, delay: 0.3, sweepDur: 8.4, sweepDelay: 0.9, yOffset: -6 },
];

export function GlassSlats() {
  return (
    <div className="glass-slats-wrap" aria-hidden="true">
      {SLATS.map((s, i) => (
        <div
          key={i}
          className="glass-slat-item"
          style={{
            "--w":          `${s.w}px`,
            "--h":          `${s.h}%`,
            "--hue1":       s.hue1,
            "--hue2":       s.hue2,
            "--sat":        `${s.sat}%`,
            "--light":      `${s.light}%`,
            "--alpha":      s.alpha,
            "--hue-dur":    `${s.hueDur}s`,
            "--float-dur":  `${s.floatDur}s`,
            "--delay":      `${s.delay}s`,
            "--sweep-dur":  `${s.sweepDur}s`,
            "--sweep-delay":`${s.sweepDelay}s`,
            "--y-offset":   `${s.yOffset}%`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
