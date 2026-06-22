import Link from "next/link";
import { requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { resultUrl } from "@/lib/result";

export default async function MobileRequestsPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const user = await requireOperator(true);
  const params = await searchParams;
  const requests = await prisma.outboundRequest.findMany({
    where: { requesterId: user.id },
    include: { assignedMotor: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>MY REQUESTS</span>
        <h1>我的申请</h1>
        <p>查看审批状态。已批准后请扫码执行出库。</p>
      </div>
      {params.submitted ? <div className="result-panel success"><h2>申请已提交</h2><p>管理员已经收到待审批提醒。</p></div> : null}
      {params.error === "invalid_motor" ? <div className="result-panel error"><h2>提交失败</h2><p>指定的电机不在库或型号不匹配，请重新选择。</p></div> : null}
      <section className="request-list">
        {requests.map((request) => (
          <article className="request-card" key={request.id}>
            <div className="request-card-head">
              <div><span>申请型号</span><strong>{request.model}</strong></div>
              <span className={`badge request-${request.status}`}>
                {request.status === "pending" ? "待审批" : request.status === "approved" ? "已批准" : request.status === "completed" ? "已完成" : "已拒绝"}
              </span>
            </div>
            <dl>
              <div><dt>领用人</dt><dd>{request.targetPerson}</dd></div>
              <div><dt>去向</dt><dd>{request.destination}</dd></div>
              <div><dt>分配编号</dt><dd>{request.assignedMotor?.motorCode ?? "-"}</dd></div>
              <div><dt>申请备注</dt><dd>{request.remark ?? "-"}</dd></div>
              <div><dt>审批意见</dt><dd>{request.reviewRemark ?? "-"}</dd></div>
            </dl>
            {/* 已批准：显示扫码出库按钮 */}
            {request.status === "approved" && request.assignedMotor ? (
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Link
                  className="button"
                  style={{ fontSize: "14px", padding: "8px 16px", background: "var(--primary)" }}
                  href={`/mobile/scan?code=${encodeURIComponent(request.assignedMotor.motorCode)}`}
                >
                  扫码执行出库 ({request.assignedMotor.motorCode})
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </section>
      {requests.length === 0 ? <p className="muted empty-state">还没有提交过出库申请。</p> : null}
      <Link className="button" href="/mobile/outbound">提交新申请</Link>
      <Link className="button secondary" href="/mobile">返回手机端</Link>
    </main>
  );
}
