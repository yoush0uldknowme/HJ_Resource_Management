import Link from "next/link";
import { isAdmin, getCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { HeroAnimation } from "@/components/hero-animation";
import { AnimatedCounter } from "@/components/animated-counter";

export default async function HomePage() {
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const primaryHref = user ? (admin ? "/admin" : "/user") : "/login";

  const [total, inStock, checkedOut, pending] = await Promise.all([
    prisma.motor.count(),
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } }),
    prisma.motor.count({ where: { status: "draft" } })
  ]);

  return (
    <div className="home-page">

      {/* ============= HERO ============= */}
      <section className="home-hero">
        {/* 动画层：桌面端 Three.js / 移动端 CSS 降级 */}
        <HeroAnimation />

        {/* 中心遮罩 — 黑雾 + 不规则洞 */}
        <div className="home-center-mask" aria-hidden="true" />

        {/* content */}
        <div className="home-hero-inner">
          <div className="home-badge" role="status">
            <span className="home-badge-dot" />
            v2.0 · 全新工作台上线
          </div>

          <h1 className="home-headline">
            <span className="home-headline-accent">悍匠资源管理系统</span>
          </h1>

          <div className="home-actions">
            <Link href={primaryHref} className="home-btn-cta">
              {user ? "进入工作台" : "立即使用"}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/mobile" className="home-btn-ghost">
              手机端扫码
              <kbd>⌘ K</kbd>
            </Link>
          </div>

          {/* stat chips */}
          <div className="home-stats">
            <div className="home-stat">
              <strong><AnimatedCounter value={total} /></strong>
              <span>总台数</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <strong><AnimatedCounter value={inStock} duration={1500} /></strong>
              <span>在库</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <strong><AnimatedCounter value={checkedOut} duration={1500} /></strong>
              <span>已出库</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat">
              <strong><AnimatedCounter value={pending} duration={1500} /></strong>
              <span>待处理</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
