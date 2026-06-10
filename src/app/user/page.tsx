import Link from "next/link";
import { requireMotorOperator } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function UserPage() {
  await requireMotorOperator();

  const [total, inStock, checkedOut] = await Promise.all([
    prisma.motor.count(),
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } })
  ]);

  return (
    <div className="workspace-page">
      <section className="workspace-hero user-workspace">
        <div>
          <span className="eyebrow">USER WORKSPACE</span>
          <h1>用户端工作台</h1>
          <p>用于查看电机列表、现场入库/归还和出库操作。这里不会显示管理员维护功能。</p>
        </div>
        <div className="workspace-actions">
          <Link className="button" href="/motors">
            查看电机列表
          </Link>
          <Link className="button secondary" href="/mobile">
            手机现场端
          </Link>
        </div>
      </section>

      <section className="dashboard-band">
        <div className="metric-tile accent">
          <span>可查看电机</span>
          <strong>{total}</strong>
          <small>当前系统记录</small>
        </div>
        <div className="metric-tile">
          <span>在库</span>
          <strong>{inStock}</strong>
          <small>可申请或领用</small>
        </div>
        <div className="metric-tile">
          <span>已出库</span>
          <strong>{checkedOut}</strong>
          <small>当前使用中</small>
        </div>
      </section>

      <section className="module-panel">
        <div className="section-head">
          <div>
            <h2>常用操作</h2>
            <p>用户端只保留现场需要的入口，不提供建档、修改和删除。</p>
          </div>
        </div>
        <div className="module-grid user-module-grid">
          <Link className="module-card primary-module" href="/motors">
            <span>01</span>
            <strong>电机列表</strong>
            <small>按型号和状态查看当前电机</small>
          </Link>
          <Link className="module-card" href="/motors/inbound">
            <span>02</span>
            <strong>入库 / 归还</strong>
            <small>现场归还电机时使用</small>
          </Link>
          <Link className="module-card" href="/motors/outbound">
            <span>03</span>
            <strong>出库</strong>
            <small>登记现场领用和去向</small>
          </Link>
          <Link className="module-card" href="/feedback">
            <span>04</span>
            <strong>意见反馈</strong>
            <small>提交现场问题和改进建议</small>
          </Link>
        </div>
      </section>
    </div>
  );
}
