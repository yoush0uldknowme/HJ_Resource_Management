import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { motorStatusLabel } from "@/lib/status";

export default async function DashboardPage() {
  await requireCurrentUser();
  const [total, inStock, checkedOut, recent] = await Promise.all([
    prisma.motor.count(),
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } }),
    prisma.motor.findMany({ orderBy: { updatedAt: "desc" }, take: 6 })
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>首页概览</h1>
          <p>展示电机建档、标签、入库、出库和留痕闭环的当前状态。</p>
        </div>
        <Link className="button" href="/motors/new">
          新建电机
        </Link>
      </div>

      <section className="grid stats">
        <div className="card">
          <div className="muted">电机总数</div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="card">
          <div className="muted">在库</div>
          <div className="stat-value">{inStock}</div>
        </div>
        <div className="card">
          <div className="muted">已领用</div>
          <div className="stat-value">{checkedOut}</div>
        </div>
        <div className="card">
          <div className="muted">待入库</div>
          <div className="stat-value">{total - inStock - checkedOut}</div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>最近更新</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>编码</th>
                <th>名称</th>
                <th>型号</th>
                <th>状态</th>
                <th>库位 / 去向</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((motor) => (
                <tr key={motor.id}>
                  <td>
                    <Link href={`/motors/${motor.id}`}>{motor.motorCode}</Link>
                  </td>
                  <td>{motor.name}</td>
                  <td>{motor.model}</td>
                  <td>
                    <span className="badge">{motorStatusLabel(motor.status)}</span>
                  </td>
                  <td>{motor.currentLocation ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
