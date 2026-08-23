import type { NextConfig } from "next";

const nextConfig: NextConfig = {
// 手机端访问 IP 由 server.mjs 启动时自动检测，无需手动配置
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    },
    // 资料库上传走 middleware，Next.js 对带 middleware 的请求默认只接受 10MB 包体；
    // 这里放宽到 250 MiB，覆盖 200 MiB 单文件上限 + 表单字段余量。
    middlewareClientMaxBodySize: "250mb"
  }
};

export default nextConfig;
