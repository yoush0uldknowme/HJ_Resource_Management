"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";

export function AppShell({
  isAdmin: canManage,
  pendingRequests,
  children
}: {
  isAdmin: boolean;
  pendingRequests: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/mobile")) return children;

  const links = useMemo(
    () => [
      { href: "/", label: "首页" },
      { href: canManage ? "/admin" : "/user", label: "工作台" },
      { href: "/motors", label: "电机" },
      { href: "/motors/inbound", label: "入库" },
      { href: "/motors/outbound", label: canManage ? "出库" : "申请出库" },
      ...(canManage
        ? [{ href: "/admin/requests", label: "审批", count: pendingRequests }]
        : [{ href: "/requests", label: "我的申请", count: pendingRequests }]),
      ...(canManage ? [{ href: "/logs", label: "日志" }] : []),
      { href: "/feedback", label: "意见反馈" }
    ],
    [canManage, pendingRequests]
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href={canManage ? "/admin" : "/user"}>
          <span className="brand-mark">HJ</span>
          <span>
            <strong>资源管理系统</strong>
            <small>{canManage ? "管理端" : "用户端"}</small>
          </span>
        </Link>
        <nav className="nav" aria-label="主导航">
          {links.map((link) => (
            <Link
              className={pathname === link.href ? "active" : ""}
              href={link.href}
              key={link.href}
            >
              {link.label}
              {"count" in link && link.count ? (
                <span className="nav-count">{link.count}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="topbar-actions">
          <Link className="mobile-entry-pill" href="/mobile">
            手机端
          </Link>
          <form action={logoutAction}>
            <button className="logout-button" type="submit">
              退出
            </button>
          </form>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
