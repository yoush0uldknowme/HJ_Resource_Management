import { randomBytes } from "node:crypto";

/**
 * 将名称转换为 URL 友好的 slug。
 * - ASCII 字母数字保留，空格/下划线转连字符
 * - 非单词字符（含中文）移除
 * - 结果为空或过短时回退到 `cat-{随机短ID}`
 */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // 移除非单词字符（\w = [a-zA-Z0-9_]）
    .replace(/[\s_-]+/g, "-") // 连续空白/下划线/连字符合并为单个连字符
    .replace(/^-+|-+$/g, ""); // 去掉首尾连字符

  if (base.length < 2) {
    return `cat-${randomShortId()}`;
  }
  return base;
}

/** 生成 6 位随机十六进制短 ID */
function randomShortId(): string {
  return randomBytes(3).toString("hex");
}

/**
 * 如果 slug 在数据库中已存在，追加 -2、-3… 后缀直到唯一。
 * @param baseSlug 原始 slug
 * @param exists 检查 slug 是否已存在的异步函数
 * @returns 唯一的 slug
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  if (!(await exists(baseSlug))) return baseSlug;

  let counter = 2;
  while (true) {
    const candidate = `${baseSlug}-${counter}`;
    if (!(await exists(candidate))) return candidate;
    counter++;
    // 防御性上限
    if (counter > 1000) {
      return `${baseSlug}-${randomShortId()}`;
    }
  }
}
