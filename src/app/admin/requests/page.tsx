import { approveOutboundRequestAction, rejectOutboundRequestAction } from "@/lib/request/actions";
import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

export default async function AdminRequestsPage({
  searchParams
}: {
  searchParams: Promise<{ approved?: string; rejected?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [requests, availableMotors] = await Promise.all([
    prisma.outboundRequest.findMany({
      include: { requester: true, assignedMotor: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.motor.findMany({
      where: { status: "in_stock" },
      orderBy: [{ model: "asc" }, { motorCode: "asc" }]
    })
  ]);

  return (
    <div className="request-page">
      <div className="page-head">
        <div>
          <h1>出库申请审批</h1>
          <p>审批后，申请人可在手机端扫码执行出库。指定电机为选填——不指定时，申请人可拿任意同型号电机。</p>
        </div>
      </div>
      {params.approved ? <div className="result-panel success"><h2>审批完成</h2><p>已批准申请，请通知领用人前往手机端扫码出库。</p></div> : null}
      {params.rejected ? <div className="result-panel success"><h2>申请已拒绝</h2><p>申请人可在"我的申请"中查看审批意见。</p></div> : null}
      {params.error ? <div className="result-panel error"><h2>无法批准</h2><p>所选电机可能已经出库、型号不匹配或不存在。</p></div> : null}

      <section className="request-list">
        {requests.map((request) => {
          const candidates = availableMotors.filter((motor) => motor.model === request.model);
          return (
            <article className="request-card admin-request-card" key={request.id}>
              <div className="request-card-head">
                <div>
                  <span>申请型号</span>
                  <strong>{request.model} × {request.quantity}</strong>
                  <small>{request.requester.username} · {request.createdAt.toLocaleString("zh-CN")}</small>
                </div>
                <span className={`badge request-${request.status}`}>
                  {request.status === "pending" ? "待审批" : request.status === "approved" ? "已批准·待扫码" : request.status === "completed" ? "已完成" : "已拒绝"}
                </span>
              </div>
              <dl>
                <div><dt>领用人</dt><dd>{request.targetPerson}</dd></div>
                <div><dt>车辆 / 去向</dt><dd>{request.destination}</dd></div>
                <div><dt>备注</dt><dd>{request.remark ?? "-"}</dd></div>
                <div><dt>已指定电机</dt><dd>{request.assignedMotor?.motorCode ?? "未指定（可拿任意同型号）"}</dd></div>
                <div><dt>审批人</dt><dd>{request.reviewedBy ?? "-"}</dd></div>
                <div><dt>审批意见</dt><dd>{request.reviewRemark ?? "-"}</dd></div>
              </dl>
              {request.status === "pending" ? (
                <div className="approval-actions">
                  <form action={approveOutboundRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <div className="field">
                      <label htmlFor={`motor-${request.id}`}>
                        指定电机（选填，不指定则用户可拿任意 {request.model}）
                      </label>
                      <select
                        id={`motor-${request.id}`}
                        name="motorId"
                        defaultValue={request.assignedMotorId && request.assignedMotor?.status === "in_stock" ? String(request.assignedMotorId) : "none"}
                      >
                        <option value="none">不指定（推荐）</option>
                        {candidates.map((motor) => {
                          const isPreSelected = motor.id === request.assignedMotorId;
                          return (
                            <option value={motor.id} key={motor.id}>
                              {motor.motorCode} · {motor.name}{isPreSelected ? " [申请人预选]" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`approve-remark-${request.id}`}>审批意见（选填）</label>
                      <input id={`approve-remark-${request.id}`} name="reviewRemark" />
                    </div>
                    <button className="button" type="submit">批准申请</button>
                  </form>
                  <form action={rejectOutboundRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <div className="field">
                      <label htmlFor={`reject-remark-${request.id}`}>拒绝原因</label>
                      <input id={`reject-remark-${request.id}`} name="reviewRemark" required />
                    </div>
                    <button className="button danger" type="submit">拒绝申请</button>
                  </form>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
      {requests.length === 0 ? <p className="muted empty-state">暂无出库申请。</p> : null}
    </div>
  );
}
