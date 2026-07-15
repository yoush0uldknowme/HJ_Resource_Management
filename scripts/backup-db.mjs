#!/usr/bin/env node
/**
 * 数据库定时备份脚本
 *
 * 功能：
 *   1. 将 prisma/dev.db 复制到独立的备份仓库目录
 *   2. 在备份仓库中 git commit + push 到私有 GitHub 仓库
 *   3. 保留最近 30 份快照，自动清理更早的
 *
 * 用法：
 *   node scripts/backup-db.mjs
 *
 * 环境变量：
 *   HJ_DB_BACKUP_REPO  — 备份仓库的 git remote URL（首次运行时自动设置）
 *   HJ_DB_BACKUP_DIR   — 备份仓库本地路径（默认 D:/github/HJ_DB_Backup）
 *   DATABASE_URL        — Prisma 数据库路径（默认从 .env 读取）
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

// ── 配置 ──

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DB = path.join(PROJECT_ROOT, "prisma", "dev.db");
const BACKUP_DIR = process.env.HJ_DB_BACKUP_DIR || "D:/github/HJ_DB_Backup";
const BACKUP_REPO_URL = process.env.HJ_DB_BACKUP_REPO;
const MAX_SNAPSHOTS = 30;

// ── 工具函数 ──

function log(msg) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function git(args, cwd = BACKUP_DIR) {
  return execSync(`git ${args}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ── 主流程 ──

function main() {
  log("开始数据库备份...");

  // 1. 检查源数据库
  if (!existsSync(SOURCE_DB)) {
    throw new Error(`源数据库不存在: ${SOURCE_DB}`);
  }
  const dbSize = statSync(SOURCE_DB).size;
  log(`源数据库: ${SOURCE_DB} (${(dbSize / 1024).toFixed(1)} KB)`);

  // 2. 确保备份目录存在
  if (!existsSync(BACKUP_DIR)) {
    log(`创建备份目录: ${BACKUP_DIR}`);
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 3. 初始化备份仓库（首次运行）
  const gitDir = path.join(BACKUP_DIR, ".git");
  if (!existsSync(gitDir)) {
    log("初始化备份仓库...");
    git("init", BACKUP_DIR);
    git('config user.name "HJ Backup Bot"', BACKUP_DIR);
    git('config user.email "backup@localhost"', BACKUP_DIR);

    if (BACKUP_REPO_URL) {
      git(`remote add origin ${BACKUP_REPO_URL}`, BACKUP_DIR);
      log(`已设置远程仓库: ${BACKUP_REPO_URL}`);
    } else {
      log("警告: 未设置 HJ_DB_BACKUP_REPO 环境变量，将只做本地备份");
    }
  } else if (BACKUP_REPO_URL) {
    // 确保远程地址正确
    try {
      git(`remote set-url origin ${BACKUP_REPO_URL}`, BACKUP_DIR);
    } catch {
      git(`remote add origin ${BACKUP_REPO_URL}`, BACKUP_DIR);
    }
  }

  // 4. 复制数据库快照
  const snapshotName = `dev-${timestamp()}.db`;
  const snapshotPath = path.join(BACKUP_DIR, snapshotName);
  copyFileSync(SOURCE_DB, snapshotPath);
  log(`已创建快照: ${snapshotName}`);

  // 5. 写入备份元信息
  const manifest = {
    backupTime: new Date().toISOString(),
    sourceFile: "prisma/dev.db",
    sourceSizeBytes: dbSize,
    snapshotFile: snapshotName,
    projectRoot: PROJECT_ROOT,
  };
  const manifestPath = path.join(BACKUP_DIR, "latest-backup.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // 6. 清理旧快照（保留最近 MAX_SNAPSHOTS 份）
  const snapshots = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("dev-") && f.endsWith(".db"))
    .sort()
    .reverse();

  if (snapshots.length > MAX_SNAPSHOTS) {
    const toDelete = snapshots.slice(MAX_SNAPSHOTS);
    for (const f of toDelete) {
      unlinkSync(path.join(BACKUP_DIR, f));
      log(`清理旧快照: ${f}`);
    }
  }

  // 7. Git 提交
  git("add -A", BACKUP_DIR);
  try {
    git(`commit -m "DB backup ${timestamp()}"`, BACKUP_DIR);
    log("已提交备份");
  } catch {
    log("无变更，跳过提交");
    return;
  }

  // 8. 推送到远程
  if (BACKUP_REPO_URL) {
    try {
      // 尝试推送，如果远程没有 main 分支则用 -u 建立
      try {
        git("push origin HEAD", BACKUP_DIR);
      } catch {
        git("push -u origin HEAD", BACKUP_DIR);
      }
      log("已推送到远程仓库");
    } catch (err) {
      log(`推送失败: ${err.message}`);
      log("本地备份已完成，将在下次重试推送");
    }
  }

  log("备份完成。");
}

// ── 执行 ──

try {
  main();
} catch (err) {
  console.error(`备份失败: ${err.message}`);
  process.exit(1);
}
