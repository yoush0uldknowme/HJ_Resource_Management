import Link from "next/link";
import { requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

export default async function UserPage() {
  const user = await requireOperator();
  const [total, inStock, checkedOut, pendingRequests] = await Promise.all([
    prisma.motor.count(),
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } }),
    prisma.outboundRequest.count({ where: { requesterId: user.id, status: "pending" } })
  ]);

  return (
    <div className="workspace-page">
      <section className="workspace-hero user-workspace">
        <div>
          <span className="eyebrow">USER WORKSPACE</span>
          <h1>用户端工作台</h1>
          <p>查看电机资源、归还电机，并按型号提交出库申请。</p>
        </div>
        <div className="workspace-actions">
          <Link className="button" href="/motors/outbound">提交出库申请</Link>
          <Link className="button secondary" href="/requests">我的申请 {pendingRequests ? `(${pendingRequests})` : ""}</Link>
        </div>
      </section>

      <section className="dashboard-band">
        <div className="metric-tile accent"><span>电机总数</span><strong>{total}</strong><small>当前系统记录</small></div>
        <div className="metric-tile"><span>在库</span><strong>{inStock}</strong><small>可提交申请</small></div>
        <div className="metric-tile"><span>已出库</span><strong>{checkedOut}</strong><small>当前使用中</small></div>
        <div className="metric-tile"><span>我的待审批</span><strong>{pendingRequests}</strong><small>等待管理员处理</small></div>
      </section>

      <section className="module-panel">
        <div className="section-head"><div><h2>常用操作</h2><p>用户端不提供建档、编辑和删除功能。</p></div></div>
        <div className="module-grid user-module-grid">
          <Link className="module-card primary-module" href="/motors"><span>01</span><strong>电机列表</strong><small>按型号查看库存和状态</small></Link>
          <Link className="module-card" href="/motors/inbound"><span>02</span><strong>入库 / 归还</strong><small>归还具体电机</small></Link>
          <Link className="module-card" href="/motors/outbound"><span>03</span><strong>申请出库</strong><small>只需选择型号和填写去向</small></Link>
          <Link className="module-card" href="/requests"><span>04</span><strong>我的申请</strong><small>查看审批结果和分配编号</small></Link>
        </div>
      </section>
    </div>
  );
}
