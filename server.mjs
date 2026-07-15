/**
 * HJ 资源管理系统 — 统一服务器入口
 *
 * 双平台部署：
 *   Windows: 自动生成自签名证书 → HTTPS://0.0.0.0:4011
 *   Ubuntu:  设置 NO_HTTPS=1 → HTTP://127.0.0.1:4011（由 Caddy/Nginx 反向代理）
 *
 * 环境变量（可选）：
 *   PORT      监听端口，默认 4011
 *   HOST      监听地址，默认 0.0.0.0（Ubuntu 建议 127.0.0.1）
 *   NO_HTTPS  设为 1 禁用 HTTPS（反向代理模式）
 *   TLS_CERT  HTTPS 证书路径（不设置则自动生成自签名证书）
 *   TLS_KEY   HTTPS 私钥路径
 *   NODE_ENV  production 时禁用开发模式
 *
 *   BACKUP_INTERVAL_HOURS  自动备份间隔（小时），默认 24
 *   DISABLE_AUTO_BACKUP    设为 1 禁用自动备份
 *   HJ_DB_BACKUP_DIR       备份仓库本地路径，默认 D:/github/HJ_DB_Backup
 *   HJ_DB_BACKUP_REPO      备份远程仓库 URL（首次运行时自动设置 remote）
 *
 * 使用:
 *   node server.mjs                    # Windows HTTPS 模式
 *   NO_HTTPS=1 node server.mjs          # Ubuntu 反向代理模式
 */

import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { parse } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import next from "next";
import { generateCerts } from "./scripts/generate-certs.mjs";

// ── 自动检测本机局域网 IP ──
function getLanIp() {
  const ifaces = networkInterfaces();
  // 优先匹配真实的物理网卡名称
  const priorityPatterns = [/wlan/i, /wi-fi/i, /以太网/i, /ethernet/i, /en\d/i, /eth\d/i];
  // 排除虚拟网卡
  const excludePatterns = [/vmware/i, /virtualbox/i, /vbox/i, /hyper-v/i, /docker/i, /veth/i, /loopback/i];

  // 先按优先级匹配
  for (const pattern of priorityPatterns) {
    for (const [name, addrs] of Object.entries(ifaces)) {
      if (pattern.test(name) && !excludePatterns.some((ep) => ep.test(name))) {
        for (const addr of addrs) {
          if (addr.family === "IPv4" && !addr.internal) {
            return addr.address;
          }
        }
      }
    }
  }

  // 兜底：取第一个非内部非虚拟的 IPv4
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (excludePatterns.some((ep) => ep.test(name))) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}

const PORT = parseInt(process.env.PORT || "4011", 10);
const HOST = process.env.HOST || "0.0.0.0";
const NO_HTTPS = process.env.NO_HTTPS === "1";
const dev = process.env.NODE_ENV !== "production";
const LAN_IP = getLanIp();

// 仅 Windows 自签证书开发环境禁用 TLS 验证
if (dev && !NO_HTTPS) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// 开发模式下自动将本机 IP 加入允许列表，手机可直接访问
const nextConf = dev && LAN_IP
  ? { allowedDevOrigins: [LAN_IP] }
  : {};

const app = next({ dev, hostname: HOST, port: PORT, conf: nextConf });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  let server;
  let backupTimer = null;

  if (NO_HTTPS) {
    // ── HTTP 纯文本模式（Ubuntu 反向代理） ──
    server = createHttpServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
  } else {
    // ── HTTPS 模式（Windows 自签证书） ──
    let key, cert;
    if (process.env.TLS_CERT && process.env.TLS_KEY) {
      key = readFileSync(process.env.TLS_KEY);
      cert = readFileSync(process.env.TLS_CERT);
    } else {
      ({ key, cert } = generateCerts());
    }
    server = createHttpsServer(
      { key, cert, minVersion: "TLSv1.2" },
      (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      }
    );
  }

  server.listen(PORT, HOST, (err) => {
    if (err) throw err;
    const protocol = NO_HTTPS ? "HTTP" : "HTTPS";
    console.log("");
    console.log("═══════════════════════════════════════════════════════");
    console.log(`  HJ 资源管理系统已启动 (${protocol})`);
    console.log(`  桌面端: ${protocol.toLowerCase()}://localhost:${PORT}`);
    if (LAN_IP) {
      console.log(`  手机端: ${protocol.toLowerCase()}://${LAN_IP}:${PORT}`);
    }
    if (!NO_HTTPS) {
      console.log("  首次访问需点击「高级 → 继续前往」");
    }
    console.log("═══════════════════════════════════════════════════════");
    console.log("");

    // ── 自动数据库备份 ──
    // 应用运行时自动定期备份，不依赖外部调度工具
    const BACKUP_INTERVAL_HOURS = parseInt(process.env.BACKUP_INTERVAL_HOURS || "24", 10);
    const BACKUP_SCRIPT = path.join(import.meta.dirname, "scripts", "backup-db.mjs");

    function runBackup() {
      if (!existsSync(BACKUP_SCRIPT)) return;
      const child = spawn(process.execPath, [BACKUP_SCRIPT], {
        stdio: ["ignore", "pipe", "pipe"],
        cwd: import.meta.dirname,
        env: { ...process.env },
      });
      let output = "";
      child.stdout.on("data", (d) => { output += d; });
      child.stderr.on("data", (d) => { output += d; });
      child.on("close", (code) => {
        const lastLine = output.trim().split("\n").pop() || "";
        if (code === 0) {
          console.log(`[备份] 成功 — ${lastLine}`);
        } else {
          console.error(`[备份] 失败 (exit ${code}) — ${lastLine}`);
        }
      });
      child.on("error", (err) => {
        console.error(`[备份] 无法启动备份脚本 — ${err.message}`);
      });
    }

    let backupTimer = null;
    if (process.env.DISABLE_AUTO_BACKUP !== "1") {
      // 启动后 2 分钟执行首次备份，避免与启动初始化抢资源
      setTimeout(runBackup, 2 * 60 * 1000);
      backupTimer = setInterval(runBackup, BACKUP_INTERVAL_HOURS * 60 * 60 * 1000);
      console.log(`  自动备份: 每 ${BACKUP_INTERVAL_HOURS} 小时执行一次`);
      console.log("  （设置 DISABLE_AUTO_BACKUP=1 可禁用）");
      console.log("");
    }
  });

  // 优雅关闭
  const gracefulShutdown = (signal) => {
    console.log(`\n收到 ${signal} 信号，正在关闭...`);
    if (backupTimer) clearInterval(backupTimer);
    server.close(() => {
      console.log("服务器已关闭");
      process.exit(0);
    });
    setTimeout(() => {
      console.log("关闭超时，强制退出");
      process.exit(1);
    }, 5000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
});
