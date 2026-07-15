import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, statfs } from "node:fs/promises";
import {
  ALLOWED_EXTENSIONS,
  MIME_TYPES,
  LIBRARY_STORAGE_DIR,
} from "./constants";

// ── 扩展名处理 ──

/**
 * 从文件名提取扩展名，返回小写含点（如 ".pdf"）。
 * 无扩展名返回空字符串。
 */
export function extractExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/** 将扩展名标准化为小写不含点（如 "PDF" → "pdf"、".Docx" → "docx"） */
export function normalizeExtension(ext: string): string {
  return ext.trim().toLowerCase().replace(/^\./, "");
}

/** 检查扩展名是否在白名单中 */
export function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(normalizeExtension(ext));
}

/** 获取扩展名对应的 MIME 类型，未知类型返回 application/octet-stream */
export function getMimeType(ext: string): string {
  return MIME_TYPES[normalizeExtension(ext)] ?? "application/octet-stream";
}

// ── 文件名与路径安全 ──

/**
 * 生成 UUID 存储文件名。
 * @param originalExtension 原始扩展名（如 ".pdf" 或 "pdf" 或 ".PDF"）
 * @returns UUID + 小写扩展名（如 "a1b2c3...pdf"）
 */
export function generateStoredFileName(originalExtension: string): string {
  const normalized = normalizeExtension(originalExtension);
  const ext = normalized ? `.${normalized}` : "";
  return `${randomUUID()}${ext}`;
}

/**
 * 构建安全的存储相对路径，防止路径穿越。
 * 只接受纯文件名（不含路径分隔符或 ..），返回相对于资料库根目录的路径。
 * @throws 如果文件名包含路径分隔符或 ..
 */
export function buildSafeStoragePath(storedFileName: string): string {
  if (
    storedFileName.includes("/") ||
    storedFileName.includes("\\") ||
    storedFileName.includes("..")
  ) {
    throw new Error("存储文件名不能包含路径分隔符或 ..");
  }
  const basename = path.basename(storedFileName);
  if (basename !== storedFileName) {
    throw new Error("存储文件名不能包含目录组件");
  }
  return basename;
}

/** 资料库根目录的绝对路径 */
export function getLibraryRoot(): string {
  const projectRoot = process.cwd();
  return path.resolve(projectRoot, LIBRARY_STORAGE_DIR);
}

/**
 * 将相对存储路径解析为绝对路径，确保不逃出资料库目录。
 * @param relativePath 相对于资料库根目录的路径（通常是 storedFileName）
 * @returns 绝对路径
 * @throws 如果解析后的路径逃出资料库目录
 */
export function resolveLibraryPath(relativePath: string): string {
  const libraryRoot = getLibraryRoot();
  const resolved = path.resolve(libraryRoot, relativePath);

  // 确保解析后的路径在资料库目录内（或就是资料库目录本身）
  if (resolved !== libraryRoot && !resolved.startsWith(libraryRoot + path.sep)) {
    throw new Error("路径穿越检测：解析路径逃出资料库目录");
  }

  return resolved;
}

/** 确保资料库存储目录存在（首次使用时自动创建） */
export async function ensureLibraryDir(): Promise<string> {
  const dir = getLibraryRoot();
  await mkdir(dir, { recursive: true });
  return dir;
}

// ── 磁盘空间监控 ──

export interface DiskUsageInfo {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  freePercent: number;
}

/**
 * 获取资料库所在磁盘的使用情况。
 * 用于管理后台展示和低空间预警。
 */
export async function getDiskUsage(): Promise<DiskUsageInfo> {
  const libraryPath = getLibraryRoot();
  const stats = await statfs(libraryPath);
  const totalBytes = stats.bsize * stats.blocks;
  const freeBytes = stats.bsize * stats.bavail;
  const usedBytes = totalBytes - freeBytes;
  const freePercent = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0;
  return { totalBytes, freeBytes, usedBytes, freePercent };
}
