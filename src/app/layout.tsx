import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { isAdmin, getCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "HJ 资源管理系统",
  description: "电机资源管理 demo"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const pendingRequests = user
    ? await prisma.outboundRequest.count({
        where: admin ? { status: "pending" } : { requesterId: user.id, status: "pending" }
      })
    : 0;

  return (
    <html lang="zh-CN">
      <body>
        {user ? (
          <AppShell isAdmin={admin} pendingRequests={pendingRequests}>
            {children}
          </AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
