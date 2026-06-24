"use client";

/**
 * GlassSlats — Raycast 级斜向毛玻璃长条阵列 v4
 *
 * 核心特征：
 * - 25 根长条，宽度 28-80px，高度 180%
 * - 整体旋转 -22°
 * - 整组 filter: hue-rotate 动画（全局色偏移动画）
 * - 每根长条内嵌 3 个随机位置的反光块，独立随机闪烁
 * - 铺满全屏（容器 200% x 200%）
 */

interface Slat {
  w: number;
  h: number;       // 高度百分比
  hue: number;
  sat: number;
  light: number;
  alpha: number;
  gap: number;     // 与下一根的间距
  yOffset: number; // 垂直偏移
  driftDur: number;  // 漂浮周期
  driftDelay: number;// 漂浮延迟
  sweepDelay: number;
  blocks: Block[];
}

interface Block {
  top: string;     // 垂直位置
  left: string;    // 水平位置
  w: string;       // 宽度
  h: string;       // 高度
  delay: number;   // 闪烁延迟
  dur: number;     // 闪烁周期
}

function makeBlocks(): Block[] {
  const n = 3;
  const out: Block[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      top:  `${8 + Math.random() * 75}%`,
      left: `${5 + Math.random() * 30}%`,
      w:    `${30 + Math.random() * 55}%`,
      h:    `${6 + Math.random() * 18}%`,
      delay: Math.random() * 4,
      dur:   1.5 + Math.random() * 3,
    });
  }
  return out;
}

const SLATS: Slat[] = [
  { w: 38, h: 175, hue: 220, sat: 85, light: 65, alpha: 0.13, gap: 14, yOffset: -12, driftDur: 3.8, driftDelay: 0.0,  sweepDelay: 0.0, blocks: makeBlocks() },
  { w: 56, h: 165, hue: 235, sat: 80, light: 63, alpha: 0.17, gap: 18, yOffset: 5,   driftDur: 4.2, driftDelay: 0.3,  sweepDelay: 1.2, blocks: makeBlocks() },
  { w: 42, h: 185, hue: 250, sat: 78, light: 62, alpha: 0.11, gap: 12, yOffset: -8,  driftDur: 3.5, driftDelay: 0.7,  sweepDelay: 0.5, blocks: makeBlocks() },
  { w: 68, h: 170, hue: 265, sat: 75, light: 60, alpha: 0.20, gap: 20, yOffset: 3,   driftDur: 4.0, driftDelay: 0.1,  sweepDelay: 2.0, blocks: makeBlocks() },
  { w: 34, h: 160, hue: 205, sat: 88, light: 67, alpha: 0.09, gap: 10, yOffset: -15, driftDur: 3.2, driftDelay: 1.1,  sweepDelay: 0.8, blocks: makeBlocks() },
  { w: 60, h: 180, hue: 280, sat: 72, light: 61, alpha: 0.16, gap: 16, yOffset: 7,   driftDur: 4.5, driftDelay: 0.5,  sweepDelay: 1.5, blocks: makeBlocks() },
  { w: 46, h: 168, hue: 230, sat: 82, light: 64, alpha: 0.14, gap: 14, yOffset: -4,  driftDur: 3.7, driftDelay: 0.9,  sweepDelay: 0.3, blocks: makeBlocks() },
  { w: 72, h: 175, hue: 260, sat: 76, light: 62, alpha: 0.19, gap: 22, yOffset: -1,  driftDur: 4.1, driftDelay: 0.2,  sweepDelay: 1.0, blocks: makeBlocks() },
  { w: 36, h: 155, hue: 290, sat: 80, light: 63, alpha: 0.10, gap: 11, yOffset: 10,  driftDur: 3.4, driftDelay: 1.3,  sweepDelay: 0.6, blocks: makeBlocks() },
  { w: 54, h: 172, hue: 215, sat: 86, light: 66, alpha: 0.15, gap: 15, yOffset: -6,  driftDur: 4.3, driftDelay: 0.6,  sweepDelay: 2.5, blocks: makeBlocks() },
  { w: 62, h: 182, hue: 245, sat: 77, light: 61, alpha: 0.18, gap: 17, yOffset: 2,   driftDur: 3.9, driftDelay: 0.4,  sweepDelay: 1.8, blocks: makeBlocks() },
  { w: 40, h: 162, hue: 270, sat: 74, light: 60, alpha: 0.12, gap: 13, yOffset: -10, driftDur: 3.6, driftDelay: 1.0,  sweepDelay: 0.9, blocks: makeBlocks() },
  { w: 66, h: 178, hue: 225, sat: 81, light: 63, alpha: 0.17, gap: 19, yOffset: 6,   driftDur: 4.4, driftDelay: 0.8,  sweepDelay: 1.3, blocks: makeBlocks() },
  { w: 44, h: 158, hue: 255, sat: 79, light: 62, alpha: 0.13, gap: 12, yOffset: -3,  driftDur: 3.3, driftDelay: 0.2,  sweepDelay: 2.2, blocks: makeBlocks() },
  { w: 58, h: 174, hue: 285, sat: 73, light: 61, alpha: 0.16, gap: 16, yOffset: 8,   driftDur: 4.6, driftDelay: 1.2,  sweepDelay: 0.7, blocks: makeBlocks() },
  { w: 48, h: 169, hue: 210, sat: 87, light: 65, alpha: 0.14, gap: 14, yOffset: -7,  driftDur: 3.8, driftDelay: 0.5,  sweepDelay: 1.6, blocks: makeBlocks() },
  { w: 70, h: 184, hue: 240, sat: 75, light: 62, alpha: 0.21, gap: 21, yOffset: 1,   driftDur: 4.0, driftDelay: 0.0,  sweepDelay: 2.8, blocks: makeBlocks() },
  { w: 32, h: 152, hue: 275, sat: 82, light: 64, alpha: 0.08, gap: 9,  yOffset: 12,  driftDur: 3.1, driftDelay: 1.4,  sweepDelay: 0.4, blocks: makeBlocks() },
  { w: 52, h: 171, hue: 230, sat: 78, light: 63, alpha: 0.15, gap: 15, yOffset: -9,  driftDur: 4.2, driftDelay: 0.7,  sweepDelay: 1.9, blocks: makeBlocks() },
  { w: 64, h: 177, hue: 260, sat: 76, light: 61, alpha: 0.18, gap: 18, yOffset: 4,   driftDur: 3.7, driftDelay: 0.3,  sweepDelay: 1.1, blocks: makeBlocks() },
  { w: 42, h: 163, hue: 200, sat: 84, light: 66, alpha: 0.12, gap: 13, yOffset: -5,  driftDur: 3.5, driftDelay: 1.0,  sweepDelay: 0.7, blocks: makeBlocks() },
  { w: 56, h: 173, hue: 250, sat: 79, light: 62, alpha: 0.16, gap: 16, yOffset: 9,   driftDur: 4.3, driftDelay: 0.6,  sweepDelay: 2.1, blocks: makeBlocks() },
  { w: 46, h: 167, hue: 280, sat: 77, light: 61, alpha: 0.13, gap: 14, yOffset: -11, driftDur: 3.4, driftDelay: 0.9,  sweepDelay: 0.5, blocks: makeBlocks() },
  { w: 68, h: 179, hue: 220, sat: 80, light: 63, alpha: 0.20, gap: 20, yOffset: 0,   driftDur: 4.1, driftDelay: 0.1,  sweepDelay: 1.4, blocks: makeBlocks() },
  { w: 38, h: 161, hue: 265, sat: 75, light: 62, alpha: 0.11, gap: 12, yOffset: 7,   driftDur: 3.6, driftDelay: 1.1,  sweepDelay: 0.8, blocks: makeBlocks() },
];

export function GlassSlats() {
  return (
    <div className="glass-slats-wrap" aria-hidden="true">
      {SLATS.map((s, i) => (
        <div
          key={i}
          className="glass-slat-item"
          style={{
            "--w":     `${s.w}px`,
            "--h":     `${s.h}%`,
            "--hue":   s.hue,
            "--sat":   `${s.sat}%`,
            "--light": `${s.light}%`,
            "--alpha": s.alpha,
            "--gap":   `${s.gap}px`,
          } as React.CSSProperties}
        >
          {/* 随机反光块 */}
          {s.blocks.map((b, j) => (
            <div
              key={j}
              className="slat-spec-block"
              style={{
                top:    b.top,
                left:   b.left,
                width:  b.w,
                height: b.h,
                animationDelay:    `${b.delay}s`,
                animationDuration: `${b.dur}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
