/**
 * Next.js HTTPS 开发服务器
 * 用 Node.js 内建 crypto 生成自签名证书，让手机端能正常调用摄像头。
 * 使用: npm run dev
 *
 * ⚠️ NODE_TLS_REJECT_UNAUTHORIZED 仅在开发环境启用。
 * Next.js Server Action 内部会 fetch 自身的 HTTPS 地址，
 * 自签名证书会导致 DEPTH_ZERO_SELF_SIGNED_CERT 错误。
 * 生产环境应使用正规证书，不需要此设置。
 */

import { createServer } from "node:https";
import { parse } from "node:url";
import next from "next";
import { generateCerts } from "./scripts/generate-certs.mjs";

const PORT = 4011;
const HOST = "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

// 仅开发环境禁用 TLS 验证（自签名证书兼容）
if (dev) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const app = next({ dev, hostname: HOST, port: PORT });
const handle = app.getRequestHandler();

// 生成或读取自签名证书
const { key, cert } = generateCerts();

app.prepare().then(() => {
  const server = createServer(
    {
      key,
      cert,
      minVersion: "TLSv1.2",
    },
    (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }
  );

  server.listen(PORT, HOST, (err) => {
    if (err) throw err;
    console.log("");
    console.log("════════════════════════════════════════════════");
    console.log("  HTTPS 服务已启动");
    console.log(`  桌面访问: https://localhost:${PORT}`);
    console.log(`  手机访问: https://<你的电脑IP>:${PORT}`);
    console.log("  (首次访问需点击「高级 → 继续前往」)");
    console.log("════════════════════════════════════════════════");
    console.log("");
  });

  // 优雅关闭处理
  const gracefulShutdown = (signal) => {
    console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
    server.close(() => {
      console.log("HTTPS 服务器已关闭");
      process.exit(0);
    });
    // 5 秒后强制退出，防止卡死
    setTimeout(() => {
      console.log("优雅关闭超时，强制退出");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
});
