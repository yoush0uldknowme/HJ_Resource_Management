import { approveOutboundRequestAction, rejectOutboundRequestAction, cancelApprovalAction } from "@/lib/request/actions";
import { DeleteRequestButton } from "@/components/delete-request-button";
import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

export default async function AdminRequestsPage({
  searchParams
}: {
  searchParams: Promise<{ approved?: string; rejected?: string; cancelled?: string; deleted?: string; error?: string; count?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [requests, availableMotors] = await Promise.all([
    prisma.outboundRequest.findMany({
      include: { requester: true, assignedMotor: true },
      orderBy: { createdAt: "desc" }
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
          <p>
            审批后，申请人可在手机端扫码执行出库。
            {requests.some(r => r.quantity > 1)
              ? " 数量 > 1 的申请可不指定电机，扫码时按型号自动匹配。"
              : " 审批时必须指定一台在库电机。"}
          </p>
        </div>
      </div>
      {params.approved ? <div className="result-panel success"><h2>审批完成</h2><p>已批准申请，请通知领用人前往手机端扫码出库。</p></div> : null}
      {params.rejected ? <div className="result-panel success"><h2>申请已拒绝</h2><p>申请人可在"我的申请"中查看审批意见。</p></div> : null}
      {params.cancelled ? <div className="result-panel success"><h2>已撤销审批</h2><p>该申请已退回待审批状态，可重新审批。</p></div> : null}
      {params.deleted ? <div className="result-panel success"><h2>已删除</h2><p>该申请记录已从系统中移除。</p></div> : null}
      {params.error ? <div className="result-panel error"><h2>操作失败</h2><p>{
        params.error === "cancel_failed" ? "该申请已非已批准状态，无法撤销。" :
        params.error === "already_executed" ? `已执行 ${params.count ?? "?"} 台出库，无法撤销审批。如需清理请删除。` :
        params.error === "cannot_delete_pending" ? "不允许删除待审批的申请，请先拒绝再删除。" :
        params.error === "not_found" ? "未找到该申请记录。" :
        "所选电机可能已经出库、型号不匹配或不存在。"
      }</p></div> : null}

      <section className="request-list">
        {[...requests].sort((a, b) => {
          // pending 状态优先显示
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return 0;
        }).map((request) => {
          const candidates = availableMotors.filter((motor) => motor.model === request.model);
          return (
            <article className="request-card admin-request-card" key={request.id}>
              <div className="request-card-head">
                <div>
                  <span>申请型号</span>
                  <strong>
                    {request.model} × {request.quantity}
                    {request.status === "approved" && request.executedCount > 0
                      ? <span style={{ fontWeight: 400, fontSize: "0.85em", color: "#6B6B6B" }}>（已执行 {request.executedCount}/{request.quantity}）</span>
                      : null}
                  </strong>
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
                <div><dt>已指定电机</dt><dd>{request.assignedMotor?.motorCode ?? "未指定"}</dd></div>
                <div><dt>审批人</dt><dd>{request.reviewedBy ?? "-"}</dd></div>
                <div><dt>审批意见</dt><dd>{request.reviewRemark ?? "-"}</dd></div>
              </dl>
              {request.status === "pending" ? (
                <div className="approval-actions">
                  <form action={approveOutboundRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <div className="field">
                      <label htmlFor={`motor-${request.id}`}>
                        {request.quantity === 1 ? "指定电机（必选）" : "指定电机（可选，不选则扫码时按型号匹配）"}
                      </label>
                      <select
                        id={`motor-${request.id}`}
                        name="motorId"
                        defaultValue={request.assignedMotorId && request.assignedMotor?.status === "in_stock" ? String(request.assignedMotorId) : request.quantity === 1 ? "none" : ""}
                      >
                        {request.quantity > 1 ? <option value="">不指定（扫码时自动匹配型号）</option> : null}
                        <option value="none" disabled={request.quantity === 1}>请选择具体电机</option>
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
              ) : (
                <div className="approval-actions">
                  {request.status === "approved" && request.executedCount === 0 ? (
                    <form action={cancelApprovalAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button className="button secondary" type="submit">撤销审批</button>
                    </form>
                  ) : null}
                  {request.status === "approved" && request.executedCount > 0 ? (
                    <p className="muted" style={{ fontSize: 13, margin: 0 }}>已执行 {request.executedCount}/{request.quantity} 台，无法撤销，可直接删除。</p>
                  ) : null}
                  <DeleteRequestButton requestId={request.id} model={request.model} quantity={request.quantity} />
                </div>
              )}
            </article>
          );
        })}
      </section>
      {requests.length === 0 ? <p className="muted empty-state">暂无出库申请。</p> : null}
    </div>
  );
}
