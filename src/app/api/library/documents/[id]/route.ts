import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { getDocumentDetail, updateDocument, deleteDocument } from "@/lib/library/service";

/**
 * 获取文档详情
 * GET /api/library/documents/[id]
 * 权限：登录用户，非管理员只能看 all_members 的 active 文档
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, message: "无效的文档 ID" }, { status: 400 });
  }

  const doc = await getDocumentDetail(id, user.role);
  if (!doc) {
    return NextResponse.json({ ok: false, message: "文档不存在或无权访问" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, document: doc });
}

/**
 * 更新文档元数据
 * PATCH /api/library/documents/[id]
 * body: { title?, description?, categoryId?, visibility?, tags?, status? }
 * 权限：仅管理员
 */
export async function PATCH(
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
    return NextResponse.json({ ok: false, message: "无效的文档 ID" }, { status: 400 });
  }

  let body: {
    title?: string;
    description?: string;
    categoryId?: number;
    visibility?: "all_members" | "admins_only";
    tags?: string[];
    status?: "active" | "archived";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  try {
    const doc = await updateDocument(id, { ...body, actorId: user.id });
    return NextResponse.json({ ok: true, document: doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

/**
 * 删除文档（同时删除物理文件）
 * DELETE /api/library/documents/[id]
 * 权限：仅管理员
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
    return NextResponse.json({ ok: false, message: "无效的文档 ID" }, { status: 400 });
  }

  const result = await deleteDocument(id, user.id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
