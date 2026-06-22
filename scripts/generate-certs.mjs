/**
 * 生成自签名 HTTPS 证书（优先用系统自带的 openssl）。
 * 证书缓存在 certificates/ 目录，有效期 365 天。
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CERT_DIR = join(__dirname, "..", "certificates");
const KEY = join(CERT_DIR, "localhost-key.pem");
const CERT = join(CERT_DIR, "localhost.pem");

function ensureDir() {
  if (!existsSync(CERT_DIR)) mkdirSync(CERT_DIR, { recursive: true });
}

/** 检查已缓存的证书是否仍然有效 */
function isValid(pemPath) {
  try {
    if (!existsSync(pemPath)) return false;
    const content = readFileSync(pemPath, "utf8");
    if (!content.includes("BEGIN")) return false;
    // 文件至少 200 字节才算合法
    if (statSync(pemPath).size < 200) return false;
    // 300 天内生成
    const ageDays = (Date.now() - statSync(pemPath).mtimeMs) / 86400000;
    return ageDays < 300;
  } catch {
    return false;
  }
}

export function generateCerts() {
  if (isValid(KEY) && isValid(CERT)) {
    return {
      key: readFileSync(KEY, "utf8"),
      cert: readFileSync(CERT, "utf8"),
    };
  }

  ensureDir();

  // 查找 openssl：PATH → Git for Windows 常见路径
  const candidates = [
    "openssl",
    "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
    "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe",
  ];
  let openssl = null;
  for (const c of candidates) {
    try {
      execSync(`"${c}" version`, { stdio: "ignore" });
      openssl = c;
      break;
    } catch {
      // 继续尝试下一个
    }
  }

  if (!openssl) {
    console.error("未找到 openssl，请安装 Git for Windows 或添加 openssl 到 PATH");
    process.exit(1);
  }

  console.log(`  使用 openssl (${openssl}) 生成证书...`);

  // Git for Windows 的 openssl 需要正确的 OPENSSL_CONF 路径
  const env = { ...process.env };
  const gitSslCnf = "C:\\Program Files\\Git\\usr\\ssl\\openssl.cnf";
  if (!env.OPENSSL_CONF || !existsSync(env.OPENSSL_CONF)) {
    if (existsSync(gitSslCnf)) {
      env.OPENSSL_CONF = gitSslCnf;
    }
  }

  execSync(
    `"${openssl}" req -x509 -newkey rsa:2048 -nodes ` +
      `-keyout "${KEY}" -out "${CERT}" ` +
      `-days 365 ` +
      `-subj "/CN=localhost/O=Dev" ` +
      `-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`,
    { stdio: "pipe", timeout: 15000, env }
  );

  console.log("  ✓ 证书已生成: certificates/");
  return {
    key: readFileSync(KEY, "utf8"),
    cert: readFileSync(CERT, "utf8"),
  };
}
