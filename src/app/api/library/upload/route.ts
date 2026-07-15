import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isOperator } from "@/lib/auth/index";
import { uploadDocument } from "@/lib/library/service";

/**
 * 上传资料文件
 * POST /api/library/upload
 * multipart/form-data: file, title, description?, categoryId, visibility, tags?
 * 权限：operator（管理员和操作员均可上传）
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isOperator(user)) {
    return NextResponse.json({ ok: false, message: "未登录或权限不足" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误，需要 multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  const title = formData.get("title");
  const description = formData.get("description");
  const categoryIdRaw = formData.get("categoryId");
  const visibility = formData.get("visibility");
  const tagsRaw = formData.getAll("tags");

  // 校验必填字段
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "缺少文件" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ ok: false, message: "标题不能为空" }, { status: 400 });
  }
  const categoryId = parseInt(String(categoryIdRaw), 10);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ ok: false, message: "无效的分类 ID" }, { status: 400 });
  }
  if (visibility !== "all_members" && visibility !== "admins_only") {
    return NextResponse.json({ ok: false, message: "无效的可见范围" }, { status: 400 });
  }

  const tags = tagsRaw.filter((t): t is string => typeof t === "string" && t.trim().length > 0);

  const result = await uploadDocument({
    file,
    title,
    description: typeof description === "string" ? description : undefined,
    categoryId,
    visibility,
    tags,
    uploaderId: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, documentId: result.documentId });
}
