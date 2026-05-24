import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { canManageMotors, getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "HJ 资源管理",
  description: "电机资源管理完整 demo"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const canManage = canManageMotors(user);

  return (
    <html lang="zh-CN">
      <body>
        {user ? (
          <AppShell canManage={canManage}>{children}</AppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
