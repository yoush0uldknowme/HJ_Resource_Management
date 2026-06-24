"use client";

import dynamic from "next/dynamic";
import { useIsDesktop } from "./use-is-desktop";
import { MobileFallback } from "./mobile-fallback";
import type { ComponentType } from "react";

// 桌面端 Three.js 场景 —— 动态导入，SSR 关闭，独立 chunk
const DesktopScene = dynamic(
  () => import("./desktop-scene") as Promise<{ default: ComponentType }>,
  {
    ssr: false,
    loading: () => <MobileFallback />,
  }
);

export function HeroAnimation() {
  const isDesktop = useIsDesktop();

  if (!isDesktop) return <MobileFallback />;
  return <DesktopScene />;
}
