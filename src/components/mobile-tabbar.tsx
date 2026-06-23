"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";

/**
 * 手机端底部固定导航栏
 * 提供快捷入口 + 退出登录 + 切换管理端/用户端
 */
export function MobileTabBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { href: "/mobile", label: "首页", icon: "🏠" },
    { href: "/mobile/motors", label: "电机", icon: "📋" },
    { href: "/mobile/scan", label: "扫码", icon: "📷" },
    { href: "/mobile/requests", label: "申请", icon: "📝" },
  ];

  return (
    <nav className="mobile-tabbar">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-tabbar-item${active ? " active" : ""}`}
          >
            <span className="mobile-tabbar-icon">{tab.icon}</span>
            <span className="mobile-tabbar-label">{tab.label}</span>
          </Link>
        );
      })}

      {/* 更多操作：退出登录 / 切换端 */}
      <form
        action={async (_formData: FormData) => {
          await logoutAction();
          router.push("/login");
        }}
      >
        <button
          type="submit"
          className="mobile-tabbar-item"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "inherit",
            fontFamily: "inherit",
            WebkitAppearance: "none",
          }}
        >
          <span className="mobile-tabbar-icon">🚪</span>
          <span className="mobile-tabbar-label">退出</span>
        </button>
      </form>

      {/* 管理员入口 */}
      {isAdmin ? (
        <Link href="/admin" className="mobile-tabbar-item" style={{ background: "none" }}>
          <span className="mobile-tabbar-icon">⚙️</span>
          <span className="mobile-tabbar-label">管理端</span>
        </Link>
      ) : null}
    </nav>
  );
}
