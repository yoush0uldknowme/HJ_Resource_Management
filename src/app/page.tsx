import Link from "next/link";
import { isAdmin, getCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { HeroMouseGlow } from "@/components/hero-mouse-glow";
import { GlassSlats } from "@/components/glass-blob";
import { MarqueeLights } from "@/components/marquee-lights";
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
    <div className="cinematic-home">
      {/* === 背景层 z-index: 0-1 === */}

      {/* 背景点阵 */}
      <div className="cinematic-grid" aria-hidden="true" />

      {/* 角落光晕 — 左下（红）+ 右下（青）由 CSS ::before / ::after 实现 */}

      {/* 中心玻璃有机形状容器 */}
      <div className="cinematic-panel-c" aria-hidden="true">
        <GlassSlats />
      </div>

      {/* 跑马灯光线 */}
      <MarqueeLights />

      {/* 鼠标跟随光斑 */}
      <HeroMouseGlow />

      {/* === 前景内容层 z-index: 2+ === */}
      <section className="cinematic-stage">
        <div className="cinematic-status">
          <span>系统在线</span>
          <span>资源同步完成</span>
        </div>

        <div className="cinematic-title-block">
          <span className="cinematic-kicker">HJ RESOURCE ORBIT</span>
          <h1>电机资源管理系统</h1>
          <p>面向仓库、实验室和现场领用的电机资源中枢。</p>
          <strong>
            <AnimatedCounter value={total} />
          </strong>
          <small>TOTAL MOTORS</small>
        </div>

        <div className="cinematic-actions">
          <Link href={primaryHref}>
            {user ? "进入工作台" : "登录系统"}
          </Link>
          <Link href="/admin">管理端</Link>
          <Link href="/user">用户端</Link>
          <Link href="/mobile">手机端</Link>
        </div>

        <div className="cinematic-metrics" aria-label="资源概览">
          <div>
            <span>在库</span>
            <strong>
              <AnimatedCounter value={inStock} duration={1500} />
            </strong>
          </div>
          <div>
            <span>已出库</span>
            <strong>
              <AnimatedCounter value={checkedOut} duration={1500} />
            </strong>
          </div>
          <div>
            <span>待处理</span>
            <strong>
              <AnimatedCounter value={pending} duration={1500} />
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}
