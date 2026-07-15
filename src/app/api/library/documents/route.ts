import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/index";
import { listDocuments } from "@/lib/library/service";

/**
 * 获取文档列表（分页、搜索、过滤）
 * GET /api/library/documents?page=1&pageSize=20&categoryId=&search=&status=
 * 权限：登录用户，非管理员只能看 all_members 的 active 文档
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const categoryIdRaw = searchParams.get("categoryId");
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const result = await listDocuments({
    userId: user.id,
    userRole: user.role,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20,
    categoryId: categoryIdRaw ? parseInt(categoryIdRaw, 10) : undefined,
    search: search || undefined,
    // 只有管理员可以按 status 过滤，非管理员强制看 active
    status: user.role === "admin" ? status || undefined : undefined,
  });

  return NextResponse.json({ ok: true, ...result });
}
