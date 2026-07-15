import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { updateCategory, deleteCategory } from "@/lib/library/service";

/**
 * 更新分类
 * PUT /api/library/categories/[id]
 * body: { name?, description?, sortOrder?, isActive? }
 * 权限：仅管理员
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ ok: false, message: "权限不足" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, message: "无效的分类 ID" }, { status: 400 });
  }

  let body: { name?: string; description?: string; sortOrder?: number; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  try {
    const category = await updateCategory(id, body);
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

/**
 * 删除分类
 * DELETE /api/library/categories/[id]
 * 权限：仅管理员
 * 如果分类下有文档则拒绝删除
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ ok: false, message: "权限不足" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, message: "无效的分类 ID" }, { status: 400 });
  }

  const result = await deleteCategory(id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
