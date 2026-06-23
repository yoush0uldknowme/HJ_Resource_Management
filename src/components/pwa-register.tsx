"use client";

import { useEffect } from "react";

/**
 * PWA 注册组件
 * 在页面加载时注册 Service Worker，支持安装到手机桌面
 */
export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // 注册失败静默忽略，不影响正常使用
        });
    }
  }, []);

  return null;
}
