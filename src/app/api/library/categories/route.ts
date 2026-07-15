import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth/index";
import { listCategories, createCategory } from "@/lib/library/service";

/**
 * 获取分类列表
 * GET /api/library/categories
 * 权限：所有登录用户
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }

  const categories = await listCategories();
  return NextResponse.json({ ok: true, categories });
}

/**
 * 创建分类
 * POST /api/library/categories
 * body: { name, description?, parentId?, sortOrder? }
 * 权限：仅管理员
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ ok: false, message: "权限不足" }, { status: 403 });
  }

  let body: { name?: string; description?: string; parentId?: number; sortOrder?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求格式错误" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ ok: false, message: "分类名称不能为空" }, { status: 400 });
  }

  try {
    const category = await createCategory({
      name: body.name,
      description: body.description,
      parentId: body.parentId,
      sortOrder: body.sortOrder,
    });
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
