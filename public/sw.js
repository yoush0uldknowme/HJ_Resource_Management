// HJ 资源管理系统 Service Worker
// 提供基本的离线缓存和 PWA 安装支持

const CACHE_NAME = "hj-resource-v1";
const OFFLINE_URL = "/login";

// 安装时预缓存登录页
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// 网络优先策略：优先用网络，失败时用缓存
self.addEventListener("fetch", (event) => {
  // 只处理 GET 请求
  if (event.request.method !== "GET") return;

  // 不缓存 API 请求和 _next 静态资源（让 Next.js 自己管）
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功则缓存一份
        if (response.ok && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，尝试缓存
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // 最后回退到登录页
          return caches.match(OFFLINE_URL);
        });
      })
  );
});

// 接收推送通知（PWA Web Push，预留）
self.addEventListener("push", (event) => {
  // 目前用 SSE 推送，这里预留 Web Push 扩展
  // 将来如果需要后台推送可以接入 VAPID
});
