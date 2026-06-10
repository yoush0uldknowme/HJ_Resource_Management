"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";

export function AppShell({
  canManage,
  children
}: {
  canManage: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/mobile")) {
    return children;
  }

  const links = [
    { href: "/", label: "首页" },
    { href: canManage ? "/admin" : "/user", label: "工作台" },
    { href: "/motors", label: "电机" },
    { href: "/motors/inbound", label: "入库" },
    { href: "/motors/outbound", label: "出库" },
    ...(canManage ? [{ href: "/logs", label: "日志" }] : []),
    { href: "/feedback", label: "意见反馈" }
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href={canManage ? "/admin" : "/user"}>
          <span className="brand-mark">HJ</span>
          <span>
            <strong>资源管理系统</strong>
            <small>{canManage ? "管理端" : "现场端"}</small>
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
            </Link>
          ))}
        </nav>

        <div className="topbar-actions">
          <Link className="mobile-entry-pill" href="/mobile">
            现场端
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
