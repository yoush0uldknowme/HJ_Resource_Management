import Link from "next/link";
import { isAdmin, requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

export default async function MobileHomePage() {
  const user = await requireOperator(true);
  const admin = isAdmin(user);
  const [inStock, checkedOut, pendingRequests] = await Promise.all([
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } }),
    prisma.outboundRequest.count({
      where: admin ? { status: "pending" } : { requesterId: user.id, status: "pending" }
    })
  ]);

  return (
    <main className="mobile-shell mobile-home">
      <section className="mobile-home-hero">
        <span>HJ FIELD CONSOLE</span>
        <h1>手机端</h1>
        <p>{admin ? "管理员模式，已解锁全部手机与管理入口。" : "用户模式，快速完成查询、入库和出库操作。"}</p>
        <div className="mobile-home-stats">
          <div><strong>{inStock}</strong><small>在库</small></div>
          <div><strong>{checkedOut}</strong><small>已出库</small></div>
        </div>
      </section>

      <section className="mobile-quick-grid">
        <Link className="mobile-quick-card primary" href="/mobile/motors">
          <span>01</span><strong>电机列表</strong><small>查看型号和状态</small>
        </Link>
        <Link className="mobile-quick-card" href="/mobile/scan">
          <span>02</span><strong>编号查询</strong><small>输入八位编号</small>
        </Link>
        <Link className="mobile-quick-card" href="/mobile/inbound">
          <span>03</span><strong>入库 / 归还</strong><small>更新为在库状态</small>
        </Link>
        <Link className="mobile-quick-card" href="/mobile/outbound">
          <span>04</span><strong>电机出库</strong><small>登记领用和去向</small>
        </Link>
        <Link className="mobile-quick-card" href={admin ? "/admin/requests" : "/mobile/requests"}>
          <span>05</span><strong>{admin ? "待审批" : "我的申请"}</strong><small>{pendingRequests} 条等待处理</small>
        </Link>
      </section>

      {admin ? (
        <section className="mobile-admin-strip">
          <div><strong>管理员工具</strong><span>建档与完整后台管理</span></div>
          <Link href="/admin">打开工作台</Link>
        </section>
      ) : null}
    </main>
  );
}
