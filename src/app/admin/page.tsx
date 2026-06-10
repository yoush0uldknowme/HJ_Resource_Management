import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { motorStatusLabel } from "@/lib/status";

export default async function AdminPage() {
  await requireAdmin();

  const [total, inStock, checkedOut, pending, recent, models] = await Promise.all([
    prisma.motor.count(),
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } }),
    prisma.motor.count({ where: { status: "draft" } }),
    prisma.motor.findMany({ orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.motor.groupBy({
      by: ["model"],
      _count: { model: true },
      orderBy: { _count: { model: "desc" } },
      take: 4
    })
  ]);

  return (
    <div className="workspace-page">
      <section className="workspace-hero admin-workspace">
        <div>
          <span className="eyebrow">ADMIN WORKSPACE</span>
          <h1>管理端工作台</h1>
          <p>用于建档、维护、审批和查看完整流转记录。这里保留所有管理员能力。</p>
        </div>
        <div className="workspace-actions">
          <Link className="button" href="/motors/new">
            新建电机
          </Link>
          <Link className="button secondary" href="/motors">
            查看电机库
          </Link>
        </div>
      </section>

      <section className="dashboard-band">
        <div className="metric-tile accent">
          <span>总电机</span>
          <strong>{total}</strong>
          <small>已建档资源</small>
        </div>
        <div className="metric-tile">
          <span>在库</span>
          <strong>{inStock}</strong>
          <small>可调配库存</small>
        </div>
        <div className="metric-tile">
          <span>出库中</span>
          <strong>{checkedOut}</strong>
          <small>当前使用资源</small>
        </div>
        <div className="metric-tile">
          <span>待入库</span>
          <strong>{pending}</strong>
          <small>草稿或待确认资源</small>
        </div>
      </section>

      <section className="home-layout">
        <div className="module-panel">
          <div className="section-head">
            <div>
              <h2>管理模块</h2>
              <p>电脑端管理员入口，后续审批和账号管理也会放在这里。</p>
            </div>
          </div>
          <div className="module-grid">
            <Link className="module-card primary-module" href="/motors">
              <span>01</span>
              <strong>电机库</strong>
              <small>按型号查看库存、状态和档案</small>
            </Link>
            <Link className="module-card" href="/motors/inbound">
              <span>02</span>
              <strong>入库</strong>
              <small>新电机建档后入库或现场归还</small>
            </Link>
            <Link className="module-card" href="/motors/outbound">
              <span>03</span>
              <strong>出库</strong>
              <small>管理员直接登记领用和去向</small>
            </Link>
            <Link className="module-card" href="/logs">
              <span>04</span>
              <strong>操作记录</strong>
              <small>查看电机流转和维护日志</small>
            </Link>
          </div>
        </div>

        <div className="side-stack">
          <section className="panel dark-panel">
            <div className="section-head compact-head">
              <div>
                <h2>型号热区</h2>
                <p>当前数量最多的型号</p>
              </div>
            </div>
            <div className="model-rank-list">
              {models.map((item, index) => (
                <Link href={`/motors?q=${encodeURIComponent(item.model)}`} key={item.model}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.model}</strong>
                  <small>{item._count.model} 台</small>
                </Link>
              ))}
              {models.length === 0 ? <p className="muted">暂无型号数据</p> : null}
            </div>
          </section>

          <section className="panel recent-panel">
            <div className="section-head compact-head">
              <div>
                <h2>最近更新</h2>
                <p>最新发生变化的电机</p>
              </div>
            </div>
            <div className="recent-feed">
              {recent.map((motor) => (
                <Link href={`/motors/${motor.id}`} key={motor.id}>
                  <span>{motor.motorCode}</span>
                  <strong>{motor.name}</strong>
                  <small>
                    {motor.model} · {motorStatusLabel(motor.status)}
                  </small>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
