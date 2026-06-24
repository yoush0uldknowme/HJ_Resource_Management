import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许手机通过局域网 IP 访问 dev server
  allowedDevOrigins: ["10.154.96.100"],
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  }
};

export default nextConfig;
