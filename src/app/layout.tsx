import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "HJ 资源管理",
  description: "电机资源管理试点系统"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN">
      <body>
        {user ? (
          <div className="app-shell">
            <aside className="sidebar">
              <div className="brand">
                <strong>HJ 资源管理</strong>
                <span>电机试点 MVP</span>
              </div>
              <nav className="nav">
                <Link href="/">首页概览</Link>
                <Link href="/motors">电机列表</Link>
                <Link href="/motors/new">新建电机</Link>
                <Link href="/motors/inbound">入库</Link>
                <Link href="/motors/outbound">出库</Link>
                <Link href="/logs">操作记录</Link>
                <form action={logoutAction}>
                  <button className="logout-button" type="submit">
                    退出登录
                  </button>
                </form>
              </nav>
            </aside>
            <main className="content">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
