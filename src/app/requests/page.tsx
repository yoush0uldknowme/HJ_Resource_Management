import Link from "next/link";
import { requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

const statusLabel: Record<string, string> = {
  pending: "待审批",
  approved: "已批准",
  rejected: "已拒绝",
  completed: "已完成"
};

export default async function MyRequestsPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireOperator();
  const params = await searchParams;
  const requests = await prisma.outboundRequest.findMany({
    where: { requesterId: user.id },
    include: { assignedMotor: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="request-page">
      <div className="page-head">
        <div>
          <h1>我的出库申请</h1>
          <p>查看申请状态、管理员处理意见和最终分配的电机编号。</p>
        </div>
        <Link className="button" href="/motors/outbound">新建申请</Link>
      </div>
      {params.submitted ? <div className="result-panel success"><h2>申请已提交</h2><p>管理员工作台已出现新的待审批提醒。</p></div> : null}
      <section className="request-list">
        {requests.map((request) => (
          <article className="request-card" key={request.id}>
            <div className="request-card-head">
              <div><span>型号</span><strong>{request.model}</strong></div>
              <span className={`badge request-${request.status}`}>{statusLabel[request.status] ?? request.status}</span>
            </div>
            <dl>
              <div><dt>领用人</dt><dd>{request.targetPerson}</dd></div>
              <div><dt>去向</dt><dd>{request.destination}</dd></div>
              <div><dt>申请时间</dt><dd>{request.createdAt.toLocaleString("zh-CN")}</dd></div>
              <div><dt>分配电机</dt><dd>{request.assignedMotor?.motorCode ?? "-"}</dd></div>
              <div><dt>申请备注</dt><dd>{request.remark ?? "-"}</dd></div>
              <div><dt>审批意见</dt><dd>{request.reviewRemark ?? "-"}</dd></div>
            </dl>
            {/* 已批准：显示扫码出库链接 */}
            {request.status === "approved" && request.assignedMotor ? (
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Link
                  className="button"
                  style={{ fontSize: "14px", padding: "8px 16px" }}
                  href={`/mobile/scan?code=${encodeURIComponent(request.assignedMotor.motorCode)}`}
                >
                  前往手机端扫码出库 ({request.assignedMotor.motorCode})
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </section>
      {requests.length === 0 ? <p className="muted empty-state">还没有提交过出库申请。</p> : null}
    </div>
  );
}
