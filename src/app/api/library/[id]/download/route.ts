import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserCookieOnly } from "@/lib/auth/index";
import { downloadDocument } from "@/lib/library/service";

/**
 * 鉴权下载资料文件
 * GET /api/library/[id]/download
 *
 * 安全规则：
 * - 只认 cookie，不接受 URL token（防止 token 泄露到日志/Referer）
 * - 设置 Content-Disposition: attachment 强制下载
 * - 设置 X-Content-Type-Options: nosniff 防止 MIME 嗅探
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 只认 cookie，不接受 URL token fallback
  const user = await getCurrentUserCookieOnly();
  if (!user) {
    return NextResponse.json({ ok: false, message: "未登录" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, message: "无效的文档 ID" }, { status: 400 });
  }

  const result = await downloadDocument(id, { id: user.id, role: user.role });
  if (!result.ok || !result.buffer) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status ?? 500 }
    );
  }

  // 构建安全响应头
  const headers = new Headers();
  headers.set("Content-Type", result.mimeType ?? "application/octet-stream");
  // RFC 5987: 同时提供 ASCII filename 和 UTF-8 filename* 兼容旧浏览器
  const encodedFileName = encodeURIComponent(result.fileName ?? "download");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`
  );
  headers.set("Content-Length", String(result.fileSize ?? result.buffer.length));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(new Uint8Array(result.buffer), { status: 200, headers });
}
