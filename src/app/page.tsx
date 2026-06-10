import Link from "next/link";
import { canManageMotors, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const user = await getCurrentUser();
  const canManage = canManageMotors(user);
  const primaryHref = user ? (canManage ? "/admin" : "/user") : "/login";

  const [total, inStock, checkedOut, pending] = await Promise.all([
    prisma.motor.count(),
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } }),
    prisma.motor.count({ where: { status: "draft" } })
  ]);

  const matrixLines = [
    "60200001 GM6020 READY VECTOR 0xA1F9",
    "35080012 GM3508 STOCK SIGNAL 0x4E22",
    "20060008 M2006 FLOW CHECKSUM 0x7C90",
    "HJ RESOURCE ORBIT MOTOR STATUS ONLINE",
    "INBOUND OUTBOUND ARCHIVE FIELD SYNC",
    "6020 3508 2006 4310 8006 0001 0002",
    "WAREHOUSE NODE ACTIVE TRACE LOG",
    "MOTOR RESOURCE CONTROL SYSTEM"
  ];

  return (
    <div className="cinematic-home">
      <div className="cinematic-matrix" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index}>{matrixLines[index % matrixLines.length]}</span>
        ))}
      </div>
      <div className="cinematic-glow cinematic-glow-a" aria-hidden="true" />
      <div className="cinematic-glow cinematic-glow-b" aria-hidden="true" />
      <div className="cinematic-orbit" aria-hidden="true">
        <div className="cinematic-orbit-ring ring-a" />
        <div className="cinematic-orbit-ring ring-b" />
        <div className="cinematic-orbit-ring ring-c" />
      </div>

      <section className="cinematic-stage">
        <div className="cinematic-status">
          <span>系统在线</span>
          <span>资源同步完成</span>
        </div>
        <div className="cinematic-title-block">
          <span className="cinematic-kicker">HJ RESOURCE ORBIT</span>
          <h1>电机资源管理系统</h1>
          <p>面向仓库、实验室和现场领用的电机资源中枢。</p>
          <strong>{total}</strong>
          <small>TOTAL MOTORS</small>
        </div>
        <div className="cinematic-actions">
          <Link href={primaryHref}>{user ? "进入工作台" : "登录系统"}</Link>
          <Link href="/admin">管理端</Link>
          <Link href="/user">用户端</Link>
          <Link href="/mobile">手机现场端</Link>
        </div>
        <div className="cinematic-metrics" aria-label="资源概览">
          <div><span>IN STOCK</span><strong>{inStock}</strong></div>
          <div><span>CHECKED OUT</span><strong>{checkedOut}</strong></div>
          <div><span>PENDING</span><strong>{pending}</strong></div>
        </div>
      </section>
    </div>
  );
}
