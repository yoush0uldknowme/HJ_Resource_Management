"use client";

/**
 * GlassSlats — 斜向毛玻璃长条阵列
 * Raycast 官网风格的核心视觉：
 * - 多根斜向长条并排，四周圆角
 * - 毛玻璃质感（backdrop-filter: blur + 半透明）
 * - 颜色随机变化 + 互相遮盖
 * - 缓慢漂移动画
 */

const SLAT_COUNT = 7;

export function GlassSlats() {
  return (
    <div className="glass-slats-container" aria-hidden="true">
      {Array.from({ length: SLAT_COUNT }, (_, i) => (
        <div
          key={i}
          className="glass-slat"
          style={{
            "--slat-index": i,
            "--slat-hue": `${i * 51}`,
            "--slat-delay": `${i * 0.7}s`,
            "--slat-offset": `${i * 14 - 42}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
