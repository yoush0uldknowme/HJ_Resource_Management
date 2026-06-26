/**
 * HJ 资源管理系统 — 数据库备份脚本
 *
 * 用法：
 *   node scripts/backup.js                    # 备份到默认目录
 *   node scripts/backup.js /custom/backup     # 备份到指定目录
 *
 * 跨平台：Windows (PowerShell/Cmd) 和 Ubuntu (bash) 均可运行。
 *
 * 定时执行：
 *   Windows: 任务计划程序 schtasks
 *   Ubuntu:  crontab -e 添加 0 3 * * * node /opt/hj-system/scripts/backup.js
 */

import { cp, mkdir, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

const BACKUP_DIR = process.argv[2] || join(process.cwd(), "backups");
const DB_PATH = join(process.cwd(), "prisma", "dev.db");
const UPLOADS_DIR = join(process.cwd(), "public", "uploads");
const MAX_BACKUPS = 30; // 保留最近 30 个备份

async function backup() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `backup-${stamp}`);
  const dbBackup = join(backupPath, basename(DB_PATH));

  await mkdir(backupPath, { recursive: true });

  // 备份数据库
  try {
    await cp(DB_PATH, dbBackup);
    console.log(`✓ 数据库备份: ${dbBackup}`);
  } catch (err) {
    console.error(`✗ 数据库备份失败: ${err.message}`);
    process.exit(1);
  }

  // 备份上传文件
  try {
    await cp(UPLOADS_DIR, join(backupPath, "uploads"), { recursive: true });
    console.log(`✓ 上传文件备份: ${join(backupPath, "uploads")}`);
  } catch {
    console.warn(`⚠ 上传文件备份失败（可能不存在）`);
  }

  // 写入备份元信息
  await writeFile(
    join(backupPath, "backup-info.json"),
    JSON.stringify({ time: now.toISOString(), host: process.env.COMPUTERNAME || process.env.HOSTNAME || "unknown" }, null, 2)
  );

  // 清理旧备份
  try {
    const { readdir, rm } = await import("node:fs/promises");
    const entries = await readdir(BACKUP_DIR);
    const backupDirs = entries
      .filter((e) => e.startsWith("backup-"))
      .sort()
      .reverse(); // 最新在前

    for (let i = MAX_BACKUPS; i < backupDirs.length; i++) {
      await rm(join(BACKUP_DIR, backupDirs[i]), { recursive: true, force: true });
      console.log(`  清理旧备份: ${backupDirs[i]}`);
    }
  } catch {
    // 清理失败不影响主流程
  }

  console.log(`✓ 备份完成: ${backupPath}`);
  console.log(`  保留最近 ${MAX_BACKUPS} 个备份`);
}

backup().catch((err) => {
  console.error("备份失败:", err);
  process.exit(1);
});
