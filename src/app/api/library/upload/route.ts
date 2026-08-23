import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isOperator } from "@/lib/auth/index";
import { uploadDocument } from "@/lib/library/service";
import { getMaxFileSizeBytes } from "@/lib/library/constants";
import { parseMultipart, createFileFromBuffer } from "@/lib/server/multipart";

/**
 * 上传资料文件
 * POST /api/library/upload
 * multipart/form-data: file, title, description?, categoryId, visibility, tags?
 * 权限：operator（管理员和操作员均可上传）
 *
 * 注意：使用 busboy 绕过 Next.js 原生 request.formData()，避免中文文件名/大文件解析失败。
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isOperator(user)) {
    return NextResponse.json({ ok: false, message: "未登录或权限不足" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = await parseMultipart(request, { maxFileSize: getMaxFileSizeBytes() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "请求格式错误，需要 multipart/form-data";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  const fileData = parsed.files.find((f) => f.fieldname === "file");
  const title = parsed.fields.title?.[0];
  const description = parsed.fields.description?.[0];
  const categoryIdRaw = parsed.fields.categoryId?.[0];
  const visibility = parsed.fields.visibility?.[0];
  const tags = parsed.fields.tags ?? [];

  // 校验必填字段
  if (!fileData || fileData.size === 0) {
    return NextResponse.json({ ok: false, message: "缺少文件" }, { status: 400 });
  }
  if (!title || !title.trim()) {
    return NextResponse.json({ ok: false, message: "标题不能为空" }, { status: 400 });
  }
  const categoryId = parseInt(String(categoryIdRaw), 10);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ ok: false, message: "无效的分类 ID" }, { status: 400 });
  }
  if (visibility !== "all_members" && visibility !== "admins_only") {
    return NextResponse.json({ ok: false, message: "无效的可见范围" }, { status: 400 });
  }

  const file = createFileFromBuffer(fileData.buffer, fileData.filename, fileData.mimetype);
  const cleanedTags = tags.filter((t) => t.trim().length > 0);

  const result = await uploadDocument({
    file,
    title,
    description,
    categoryId,
    visibility,
    tags: cleanedTags,
    uploaderId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, documentId: result.documentId });
}
