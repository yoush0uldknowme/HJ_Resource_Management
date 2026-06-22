/**
 * Next.js HTTPS 开发服务器
 * 用 Node.js 内建 crypto 生成自签名证书，让手机端能正常调用摄像头。
 * 使用: npm run dev
 */

// 开发环境下允许自签名证书，解决 Server Action / API route 内部
// fetch 自身 HTTPS 时报 DEPTH_ZERO_SELF_SIGNED_CERT 的问题
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { createServer } from "node:https";
import { parse } from "node:url";
import next from "next";
import { generateCerts } from "./scripts/generate-certs.mjs";

const PORT = 4011;
const HOST = "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname: HOST, port: PORT });
const handle = app.getRequestHandler();

// 生成或读取自签名证书
const { key, cert } = generateCerts();

app.prepare().then(() => {
  // 注意：https.createServer 必须直接接收 key/cert，
  // 不能传 secureContext（Node.js 不支持这种用法，会导致 ERR_SSL_VERSION_OR_CIPHER_MISMATCH）
  createServer(
    {
      key,
      cert,
      minVersion: "TLSv1.2",
    },
    (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }
  ).listen(PORT, HOST, (err) => {
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
});
