import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 拦截 URL 中的 token 参数（手机端 cookie 拒绝时的 fallback 方案）。
 *
 * 手机浏览器通过 IP 访问时常常拒绝 Set-Cookie，不能依赖重定向—
 * 因为 cookie 设不进去，跳转后又会回到登录页形成死循环。
 *
 * 新策略：看到 token 参数时，同时做两件事：
 *   1. 尽量写 cookie（桌面端可用）
 *   2. 把 token 注入到 x-hj-token 请求头，让 getCurrentUser() 从请求头读取
 *
 * 不重定向，不修改 URL，页面直接渲染。
 */
export function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.next();

  // 把 token 注入到请求头，页面代码通过 headers() 读取
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hj-token", token);

  const response = NextResponse.next({
    request: { headers: requestHeaders }
  });

  // 尽量写 cookie（电脑端浏览器会接受）
  response.cookies.set("hj_token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 10, // 10 hours
    sameSite: "lax",
    ...(process.env.NODE_ENV === "production" ? { secure: true } : {})
  });

  return response;
}

export const config = {
  matcher: "/((?!_next|login).*)"
};
