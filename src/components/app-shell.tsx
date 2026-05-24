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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>HJ 资源管理</strong>
          <span>{canManage ? "管理后台" : "现场操作端"}</span>
        </div>
        <nav className="nav">
          {canManage ? <Link href="/">首页概览</Link> : null}
          <Link href="/motors">电机列表</Link>
          {canManage ? <Link href="/motors/new">新建电机</Link> : null}
          <Link href="/motors/inbound">入库</Link>
          <Link href="/motors/outbound">出库</Link>
          {canManage ? <Link href="/logs">操作记录</Link> : null}
          <form action={logoutAction}>
            <button className="logout-button" type="submit">
              退出登录
            </button>
          </form>
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
