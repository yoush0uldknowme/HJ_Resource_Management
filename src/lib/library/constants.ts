import path from "node:path";

/** 资料库文件存储目录（相对项目根目录） */
export const LIBRARY_STORAGE_DIR = path.join("storage", "library");

/** 默认单文件上传上限（MiB） */
export const DEFAULT_MAX_FILE_SIZE_MB = 200;

/**
 * 获取单文件上传上限（字节）。
 * 可通过环境变量 LIBRARY_MAX_FILE_SIZE_MB 覆盖。
 */
export function getMaxFileSizeBytes(): number {
  const mb = parseInt(process.env.LIBRARY_MAX_FILE_SIZE_MB ?? "", 10);
  const effectiveMb = Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_MAX_FILE_SIZE_MB;
  return effectiveMb * 1024 * 1024;
}

/** 允许的文件扩展名白名单（小写，不含点） */
export const ALLOWED_EXTENSIONS = new Set([
  // PDF
  "pdf",
  // Word
  "doc",
  "docx",
  // Excel
  "xls",
  "xlsx",
  "csv",
  // PowerPoint
  "ppt",
  "pptx",
  // 文本
  "txt",
  "md",
  "markdown",
  // 富文本
  "rtf",
  // OpenDocument
  "odt",
  "ods",
  "odp",
]);

/** 扩展名 → MIME 类型映射（服务端判定，不信任客户端） */
export const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
};
