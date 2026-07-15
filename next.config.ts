import type { NextConfig } from "next";

const nextConfig: NextConfig = {
// 手机端访问 IP 由 server.mjs 启动时自动检测，无需手动配置
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  }
};

export default nextConfig;
