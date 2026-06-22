import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { motorStatusLabel } from "@/lib/status";

export default async function AdminPage() {
  await requireAdmin();
  const [total, inStock, checkedOut, pendingRequests, recent] = await Promise.all([
    prisma.motor.count(),
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } }),
    prisma.outboundRequest.count({ where: { status: "pending" } }),
    prisma.motor.findMany({ orderBy: { updatedAt: "desc" }, take: 6 })
  ]);

  return (
    <div className="workspace-page">
      <section className="workspace-hero admin-workspace">
        <div>
          <span className="eyebrow">ADMIN WORKSPACE</span>
          <h1>管理端工作台</h1>
          <p>集中处理电机建档、库存流转、出库审批和操作记录。</p>
        </div>
        <div className="workspace-actions">
          <Link className="button" href="/admin/requests">处理审批 {pendingRequests ? `(${pendingRequests})` : ""}</Link>
          <Link className="button secondary" href="/motors/new">新建电机</Link>
        </div>
      </section>

      <section className="dashboard-band">
        <div className="metric-tile accent"><span>总电机</span><strong>{total}</strong><small>已建档资源</small></div>
        <div className="metric-tile"><span>在库</span><strong>{inStock}</strong><small>可分配库存</small></div>
        <div className="metric-tile"><span>已出库</span><strong>{checkedOut}</strong><small>当前使用中</small></div>
        <div className="metric-tile"><span>待审批</span><strong>{pendingRequests}</strong><small>等待管理员处理</small></div>
      </section>

      <section className="module-panel">
        <div className="section-head"><div><h2>管理模块</h2><p>从这里进入完整管理流程。</p></div></div>
        <div className="module-grid">
          <Link className="module-card primary-module" href="/motors"><span>01</span><strong>电机库</strong><small>按型号查看库存与档案</small></Link>
          <Link className="module-card" href="/admin/requests"><span>02</span><strong>出库审批</strong><small>{pendingRequests} 条待处理申请</small></Link>
          <Link className="module-card" href="/motors/inbound"><span>03</span><strong>入库</strong><small>登记归还和新资源入库</small></Link>
          <Link className="module-card" href="/logs"><span>04</span><strong>操作日志</strong><small>查看完整资源流转记录</small></Link>
        </div>
      </section>

      <section className="panel recent-panel">
        <div className="section-head"><div><h2>最近更新</h2><p>最近发生状态变化的电机。</p></div></div>
        <div className="recent-feed">
          {recent.map((motor) => (
            <Link href={`/motors/${motor.id}`} key={motor.id}>
              <span>{motor.motorCode}</span><strong>{motor.name}</strong>
              <small>{motor.model} · {motorStatusLabel(motor.status)}</small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
