import { createHash } from "node:crypto";
import { writeFile, readFile, unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import {
  extractExtension,
  isAllowedExtension,
  getMimeType,
  generateStoredFileName,
  buildSafeStoragePath,
  resolveLibraryPath,
  ensureLibraryDir,
  getDiskUsage,
} from "./security";
import { getMaxFileSizeBytes } from "./constants";
import { generateSlug, ensureUniqueSlug } from "./slug";

// ── 类型定义 ──

export interface UploadInput {
  file: File;
  title: string;
  description?: string;
  categoryId: number;
  visibility: "all_members" | "admins_only";
  tags?: string[];
  uploaderId: number;
}

export interface UploadResult {
  ok: boolean;
  documentId?: number;
  message?: string;
}

export interface DownloadResult {
  ok: boolean;
  buffer?: Buffer;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  message?: string;
  status?: number;
}

export interface DocumentListInput {
  userId: number;
  userRole: string;
  page?: number;
  pageSize?: number;
  categoryId?: number;
  search?: string;
  status?: string;
}

export interface DocumentUpdateInput {
  title?: string;
  description?: string;
  categoryId?: number;
  visibility?: "all_members" | "admins_only";
  tags?: string[];
  status?: "active" | "archived";
  actorId: number;
}

// ── 标签处理（事务内复用） ──

async function resolveTagIds(
  tx: Parameters<Parameters<typeof prisma["$transaction"]>[0]>[0],
  tagNames: string[]
): Promise<number[]> {
  const tagIds: number[] = [];
  for (const rawName of tagNames) {
    const trimmed = rawName.trim();
    if (!trimmed) continue;

    const existing = await tx.libraryTag.findUnique({ where: { name: trimmed } });
    if (existing) {
      tagIds.push(existing.id);
      continue;
    }

    const baseSlug = generateSlug(trimmed);
    const uniqueSlug = await ensureUniqueSlug(baseSlug, async (s) => {
      const ex = await tx.libraryTag.findUnique({ where: { slug: s } });
      return !!ex;
    });
    const tag = await tx.libraryTag.create({
      data: { name: trimmed, slug: uniqueSlug },
    });
    tagIds.push(tag.id);
  }
  return tagIds;
}

// ── 上传 ──

export async function uploadDocument(input: UploadInput): Promise<UploadResult> {
  // 1. 校验文件大小
  const maxSize = getMaxFileSizeBytes();
  if (input.file.size > maxSize) {
    return {
      ok: false,
      message: `文件大小 ${formatBytes(input.file.size)} 超过上限 ${formatBytes(maxSize)}`,
    };
  }
  if (input.file.size === 0) {
    return { ok: false, message: "文件为空" };
  }

  // 2. 校验扩展名
  const ext = extractExtension(input.file.name);
  if (!isAllowedExtension(ext)) {
    return { ok: false, message: `不支持的文件类型：${ext || "无扩展名"}` };
  }

  // 3. 校验标题
  if (!input.title.trim()) {
    return { ok: false, message: "标题不能为空" };
  }

  // 4. 校验分类存在且启用
  const category = await prisma.libraryCategory.findUnique({
    where: { id: input.categoryId },
  });
  if (!category || !category.isActive) {
    return { ok: false, message: "分类不存在或已停用" };
  }

  // 5. 检查磁盘空间（预留 5% 安全余量）
  const disk = await getDiskUsage();
  const safetyMargin = disk.totalBytes * 0.05;
  if (disk.freeBytes - input.file.size < safetyMargin) {
    return {
      ok: false,
      message: `磁盘空间不足，剩余 ${formatBytes(disk.freeBytes)}，需要至少 ${formatBytes(input.file.size + safetyMargin)}`,
    };
  }

  // 6. 生成存储文件名和路径
  const storedFileName = generateStoredFileName(ext);
  const safePath = buildSafeStoragePath(storedFileName);
  const absolutePath = resolveLibraryPath(safePath);

  // 7. 读取文件内容并计算 SHA-256
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // 8. 写入文件
  await ensureLibraryDir();
  await writeFile(absolutePath, buffer);

  // 9. 事务：创建文档记录 + 标签 + 审计日志
  try {
    const result = await prisma.$transaction(async (tx) => {
      const tagIds = input.tags && input.tags.length > 0
        ? await resolveTagIds(tx, input.tags)
        : [];

      const document = await tx.libraryDocument.create({
        data: {
          title: input.title.trim(),
          description: input.description?.trim() || null,
          originalFileName: input.file.name,
          storedFileName,
          storagePath: safePath,
          fileExtension: ext,
          mimeType: getMimeType(ext),
          fileSize: input.file.size,
          sha256,
          categoryId: input.categoryId,
          visibility: input.visibility,
          status: "active",
          uploaderId: input.uploaderId,
          tags: tagIds.length > 0
            ? { create: tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        },
      });

      await tx.libraryAuditLog.create({
        data: {
          documentId: document.id,
          actorId: input.uploaderId,
          action: "upload",
          detail: `上传文件 ${input.file.name}（${formatBytes(input.file.size)}）`,
        },
      });

      return document;
    });

    return { ok: true, documentId: result.id };
  } catch (error) {
    // DB 失败，清理已写入的孤儿文件
    try {
      await unlink(absolutePath);
    } catch {
      // 清理失败不影响错误返回
    }
    const message = error instanceof Error ? error.message : "数据库写入失败";
    return { ok: false, message };
  }
}

// ── 下载 ──

export async function downloadDocument(
  documentId: number,
  user: { id: number; role: string }
): Promise<DownloadResult> {
  const doc = await prisma.libraryDocument.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.status === "archived") {
    return { ok: false, message: "文件不存在或已归档", status: 404 };
  }

  // 权限校验：admins_only 资料只有管理员可下载
  if (doc.visibility === "admins_only" && user.role !== "admin") {
    return { ok: false, message: "无权访问此文件", status: 403 };
  }

  // 读取文件
  const absolutePath = resolveLibraryPath(doc.storagePath);
  let buffer: Buffer;
  try {
    buffer = await readFile(absolutePath);
  } catch {
    return { ok: false, message: "文件读取失败，可能已被移动或删除", status: 500 };
  }

  // 审计日志（记录在文件读取成功后）
  try {
    await prisma.libraryAuditLog.create({
      data: {
        documentId: doc.id,
        actorId: user.id,
        action: "download",
        detail: `下载文件 ${doc.originalFileName}`,
      },
    });
  } catch {
    // 审计日志失败不影响下载
  }

  return {
    ok: true,
    buffer,
    fileName: doc.originalFileName,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
  };
}

// ── 分类 CRUD ──

export async function listCategories() {
  return prisma.libraryCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { documents: true } },
    },
  });
}

export async function createCategory(input: {
  name: string;
  description?: string;
  parentId?: number;
  sortOrder?: number;
}) {
  const baseSlug = generateSlug(input.name);
  const uniqueSlug = await ensureUniqueSlug(baseSlug, async (s) => {
    const ex = await prisma.libraryCategory.findUnique({ where: { slug: s } });
    return !!ex;
  });

  return prisma.libraryCategory.create({
    data: {
      name: input.name.trim(),
      slug: uniqueSlug,
      description: input.description?.trim() || null,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateCategory(
  id: number,
  input: {
    name?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined) data.description = input.description.trim() || null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return prisma.libraryCategory.update({ where: { id }, data });
}

export async function deleteCategory(id: number): Promise<{ ok: boolean; message?: string }> {
  const count = await prisma.libraryDocument.count({ where: { categoryId: id } });
  if (count > 0) {
    return { ok: false, message: `该分类下有 ${count} 个文档，无法删除。请先迁移或删除文档。` };
  }

  await prisma.libraryCategory.delete({ where: { id } });
  return { ok: true };
}

// ── 文档列表 ──

export async function listDocuments(input: DocumentListInput) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(Math.max(1, input.pageSize ?? 20), 100);
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  // 权限过滤：非管理员只能看 all_members 的 active 文档
  if (input.userRole !== "admin") {
    where.visibility = "all_members";
    where.status = "active";
  } else {
    // 管理员可以看所有状态，但默认只看 active
    if (input.status) {
      where.status = input.status;
    } else {
      where.status = "active";
    }
  }

  if (input.categoryId) where.categoryId = input.categoryId;

  if (input.search) {
    where.OR = [
      { title: { contains: input.search } },
      { description: { contains: input.search } },
      { originalFileName: { contains: input.search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.libraryDocument.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        uploader: { select: { id: true, username: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
    }),
    prisma.libraryDocument.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ── 文档详情 ──

export async function getDocumentDetail(id: number, userRole: string) {
  const doc = await prisma.libraryDocument.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      uploader: { select: { id: true, username: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  if (!doc) return null;

  // 权限校验
  if (doc.visibility === "admins_only" && userRole !== "admin") return null;
  if (doc.status === "archived" && userRole !== "admin") return null;

  return doc;
}

// ── 更新文档元数据 ──

export async function updateDocument(id: number, input: DocumentUpdateInput) {
  return prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title.trim();
    if (input.description !== undefined) data.description = input.description.trim() || null;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.status !== undefined) {
      data.status = input.status;
      data.archivedAt = input.status === "archived" ? new Date() : null;
    }

    // 标签更新：先删后建
    if (input.tags !== undefined) {
      await tx.libraryDocumentTag.deleteMany({ where: { documentId: id } });
      const tagIds = input.tags.length > 0 ? await resolveTagIds(tx, input.tags) : [];
      if (tagIds.length > 0) {
        data.tags = { create: tagIds.map((tagId) => ({ tagId })) };
      }
    }

    const doc = await tx.libraryDocument.update({ where: { id }, data });

    await tx.libraryAuditLog.create({
      data: {
        documentId: id,
        actorId: input.actorId,
        action: "update",
        detail: "更新文档元数据",
      },
    });

    return doc;
  });
}

// ── 删除文档 ──

export async function deleteDocument(
  id: number,
  actorId: number
): Promise<{ ok: boolean; message?: string }> {
  const doc = await prisma.libraryDocument.findUnique({ where: { id } });
  if (!doc) return { ok: false, message: "文档不存在" };

  // 先删数据库（审计日志不级联，保留记录）
  await prisma.$transaction(async (tx) => {
    await tx.libraryDocumentTag.deleteMany({ where: { documentId: id } });
    await tx.libraryDocument.delete({ where: { id } });
    await tx.libraryAuditLog.create({
      data: {
        documentId: id,
        actorId,
        action: "delete",
        detail: `删除文件 ${doc.originalFileName}`,
      },
    });
  });

  // 再删物理文件（失败不影响主流程，留为可清理的孤儿文件）
  try {
    const absolutePath = resolveLibraryPath(doc.storagePath);
    await unlink(absolutePath);
  } catch {
    // 文件删除失败不报错
  }

  return { ok: true };
}

// ── 工具函数 ──

/** 格式化字节数为人类可读字符串 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
