import Link from "next/link";
import { isAdmin, getCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { HeroMouseGlow } from "@/components/hero-mouse-glow";
import { GlassSlats } from "@/components/glass-blob";
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
        {/* bg: dot grid */}
        <div className="home-grid" aria-hidden="true" />

        {/* bg: corner glows */}
        <div className="home-glow-bl" aria-hidden="true" />
        <div className="home-glow-br" aria-hidden="true" />

      {/* bg: glass slats */}
        <div className="home-slats-container" aria-hidden="true">
          <GlassSlats />
        </div>

        {/* 中心遮罩 — 黑雾 + 不规则洞 */}
        <div className="home-center-mask" aria-hidden="true" />

        {/* mouse glow */}
        <HeroMouseGlow />

        {/* content */}
        <div className="home-hero-inner">
          <div className="home-badge" role="status">
            <span className="home-badge-dot" />
            v2.0 · 全新工作台上线
          </div>

          <h1 className="home-headline">
            掌控每一台<br />
            <span className="home-headline-accent">电机资源</span>
          </h1>

          <p className="home-subline">
            面向仓库、实验室与现场的专业电机资源管理中枢。<br />
            快速入库、精准追踪、一键出库，效率提升 10 倍。
          </p>

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
