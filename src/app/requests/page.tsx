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
  searchParams: Promise<{ submitted?: string; error?: string; available?: string; total?: string; reserved?: string }>;
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

      {params.submitted ? (
        <div className="result-panel success"><h2>申请已提交</h2><p>管理员工作台已收到您的出库申请，等待审批。</p></div>
      ) : null}

      {params.error === "insufficient_stock" ? (
        <div className="result-panel error">
          <h2>库存不足</h2>
          <p>
            当前可用库存 {params.available ?? "?"} 台
            {params.reserved ? `（在库 ${params.total} 台，其中 ${params.reserved} 台已被预占）` : ""}
            ，无法满足您的申请数量。
          </p>
        </div>
      ) : null}

      {params.error === "invalid_motor" ? (
        <div className="result-panel error"><h2>电机不可用</h2><p>您选择的电机已不在库或型号不匹配。</p></div>
      ) : null}

      <section className="request-list">
        {requests.map((request) => {
          const isPartial = request.status === "approved" && request.executedCount > 0 && request.executedCount < request.quantity;
          const isApproved = request.status === "approved";
          return (
          <article className="request-card" key={request.id}>
            <div className="request-card-head">
              <div>
                <span>型号</span>
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
                {statusLabel[request.status] ?? request.status}
                {isPartial ? " (部分完成)" : ""}
              </span>
            </div>
            <dl>
              <div><dt>领用人</dt><dd>{request.targetPerson}</dd></div>
              <div><dt>去向</dt><dd>{request.destination}</dd></div>
              <div><dt>申请时间</dt><dd>{request.createdAt.toLocaleString("zh-CN")}</dd></div>
              <div><dt>分配电机</dt><dd>{request.assignedMotor?.motorCode ?? "-"}</dd></div>
              <div><dt>申请备注</dt><dd>{request.remark ?? "-"}</dd></div>
              <div><dt>审批意见</dt><dd>{request.reviewRemark ?? "-"}</dd></div>
            </dl>
            {isApproved ? (
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {request.assignedMotor ? (
                  <Link
                    className="button"
                    style={{ fontSize: "14px", padding: "8px 16px" }}
                    href={`/mobile/scan?code=${encodeURIComponent(request.assignedMotor.motorCode)}`}
                  >
                    前往手机端扫码出库 ({request.assignedMotor.motorCode})
                  </Link>
                ) : request.status === "approved" && request.executedCount < request.quantity ? (
                  <span style={{ padding: "8px 16px", background: "rgba(34,197,94,0.08)", borderRadius: 8, fontSize: 14, color: "#16a34a", fontWeight: 600 }}>
                    已批准，请前往手机端扫码任意同型号在库电机（还需 {request.quantity - request.executedCount} 台）
                  </span>
                ) : null}
              </div>
            ) : null}
          </article>
        )})}
      </section>
      {requests.length === 0 ? <p className="muted empty-state">还没有提交过出库申请。</p> : null}
    </div>
  );
}
