import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { PWARegister } from "@/components/pwa-register";
import { isAdmin, getCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "HJ 资源管理系统",
  description: "电机资源管理系统 — 建档、入库、出库、扫码、审批",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "HJ资源管理",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PWARegister />
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
