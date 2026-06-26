import Link from "next/link";
import { requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

export default async function MobileRequestsPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string; error?: string; available?: string; total?: string; reserved?: string }>;
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
      {params.error === "insufficient_stock" ? (
        <div className="result-panel error">
          <h2>库存不足</h2>
          <p>当前可用库存 {params.available ?? "?"} 台，无法满足您的申请数量。</p>
        </div>
      ) : null}
      <section className="request-list">
        {requests.map((request) => {
          const isPartial = request.status === "approved" && request.executedCount > 0 && request.executedCount < request.quantity;
          return (
          <article className="request-card" key={request.id}>
            <div className="request-card-head">
              <div>
                <span>申请型号</span>
                <strong>
                  {request.model} × {request.quantity}
                  {request.status === "approved" && request.executedCount > 0 ? (
                    <span style={{ fontWeight: 400, fontSize: "0.85em", color: "#6B6B6B", marginLeft: 6 }}>
                      （已执行 {request.executedCount}/{request.quantity}）
                    </span>
                  ) : null}
                </strong>
              </div>
              <span className={`badge request-${request.status}`}>
                {request.status === "pending" ? "待审批" : request.status === "approved" ? "已批准" : request.status === "completed" ? "已完成" : "已拒绝"}
                {isPartial ? " (部分完成)" : ""}
              </span>
            </div>
            <dl>
              <div><dt>领用人</dt><dd>{request.targetPerson}</dd></div>
              <div><dt>去向</dt><dd>{request.destination}</dd></div>
              <div><dt>分配编号</dt><dd>{request.assignedMotor?.motorCode ?? "-"}</dd></div>
              <div><dt>申请备注</dt><dd>{request.remark ?? "-"}</dd></div>
              <div><dt>审批意见</dt><dd>{request.reviewRemark ?? "-"}</dd></div>
            </dl>
            {request.status === "approved" && request.executedCount < request.quantity ? (
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {request.assignedMotor ? (
                  <Link className="button" style={{ fontSize: "14px", padding: "8px 16px", background: "var(--primary)" }}
                    href={`/mobile/scan?code=${encodeURIComponent(request.assignedMotor.motorCode)}`}>
                    扫码执行出库 ({request.assignedMotor.motorCode})
                  </Link>
                ) : (
                  <span style={{ padding: "10px 14px", background: "rgba(34,197,94,0.08)", borderRadius: 8, fontSize: 14, color: "#16a34a", fontWeight: 600 }}>
                    已批准，请前往扫码页面扫描任意同型号在库电机（还需 {request.quantity - request.executedCount} 台）
                  </span>
                )}
              </div>
            ) : null}
          </article>
        )})}
      </section>
      {requests.length === 0 ? <p className="muted empty-state">还没有提交过出库申请。</p> : null}
      <Link className="button" href="/mobile/outbound">提交新申请</Link>
      <Link className="button secondary" href="/mobile">返回手机端</Link>
    </main>
  );
}
