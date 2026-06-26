import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { decodeFromSearchParams } from "@/lib/result";
import { outboundMotorAction, batchOutboundMotorAction } from "@/lib/motor/actions";
import { createOutboundRequestAction } from "@/lib/request/actions";
import { isAdmin, requireOperator } from "@/lib/auth/index";
import { findMotorByCode } from "@/lib/motor/lookup";
import { normalizeScannedCode } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function OutboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireOperator();
  const admin = isAdmin(user);
  const params = await searchParams;
  const result = decodeFromSearchParams(params);

  // admin 直接出库
  if (admin) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>直接出库（管理员）</h1>
            <p>逐台出库或批量出库，无需审批流程。</p>
          </div>
        </div>
        <ResultPanel result={result} />

        {/* 逐台出库 */}
        <form className="panel form" action={outboundMotorAction}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, margin: "0 0 var(--space-4)" }}>
            逐台出库
          </h2>
          <ScanCodeField defaultValue={params.code?.trim()} />
          <div className="form-grid">
            <div className="field">
              <label htmlFor="issuedBy">出库人</label>
              <input id="issuedBy" name="issuedBy" required placeholder="请输入姓名" />
            </div>
            <div className="field">
              <label htmlFor="vehicle">使用车辆 / 去向</label>
              <input id="vehicle" name="vehicle" required placeholder="例如：英雄车、步兵1号" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="remark">备注（选填）</label>
            <textarea id="remark" name="remark" placeholder="填写用途或其他说明" />
          </div>
          <button className="button" type="submit">确认出库</button>
        </form>

        {/* 批量出库 */}
        <form className="panel form" action={batchOutboundMotorAction}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, margin: "0 0 var(--space-4)" }}>
            批量出库
          </h2>
          <p className="muted" style={{ marginBottom: "var(--space-4)" }}>
            每行一个电机编号，或用逗号/空格分隔，一次提交批量处理多台电机。
          </p>
          <div className="field">
            <label htmlFor="batch-codes">电机编号列表</label>
            <textarea
              id="batch-codes"
              name="scannedCodes"
              rows={5}
              placeholder="GM6020-0001&#10;GM6020-0002&#10;GM6020-0003"
              required
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="batch-issuedBy">出库人</label>
              <input id="batch-issuedBy" name="issuedBy" required placeholder="请输入姓名" />
            </div>
            <div className="field">
              <label htmlFor="batch-vehicle">使用车辆 / 去向</label>
              <input id="batch-vehicle" name="vehicle" required placeholder="例如：英雄车、步兵1号" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="batch-remark">备注（选填）</label>
            <textarea id="batch-remark" name="remark" placeholder="填写用途或其他说明" />
          </div>
          <button className="button" type="submit">批量出库</button>
        </form>
      </>
    );
  }

  // ── 普通用户提交申请 ──
  const selectedModel = params.model?.trim();
  const scannedCode = normalizeScannedCode(params.code);
  const scannedMotor = scannedCode ? await findMotorByCode(prisma, scannedCode) : null;
  const effectiveModel = (scannedMotor && scannedMotor.status === "in_stock")
    ? scannedMotor.model
    : selectedModel;

  const models = await prisma.motor.groupBy({
    by: ["model"],
    where: { status: "in_stock" },
    _count: { model: true },
    orderBy: { model: "asc" }
  });

  const availableMotors = effectiveModel
    ? await prisma.motor.findMany({
        where: { model: effectiveModel, status: "in_stock" },
        orderBy: { motorCode: "asc" }
      })
    : [];

  return (
    <div className="request-page">
      <div className="page-head">
        <div>
          <h1>提交出库申请</h1>
          <p>选择型号后可指定具体电机，或由管理员分配。</p>
        </div>
        <Link className="button secondary" href="/requests">我的申请</Link>
      </div>

      <ResultPanel result={result} />

      {/* 第一步：选择型号 */}
      <form className="panel form" method="GET" action="/motors/outbound">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="model">① 选择型号</label>
            <select id="model" name="model" required defaultValue={effectiveModel ?? ""}>
              <option value="" disabled>选择有库存的型号</option>
              {models.map((item) => (
                <option value={item.model} key={item.model}>
                  {item.model}（在库 {item._count.model} 台）
                </option>
              ))}
            </select>
          </div>
        </div>
        {!effectiveModel ? (
          <button className="button" type="submit">下一步：选择具体电机</button>
        ) : null}
      </form>

      {/* 第二步：选择电机 + 填写信息 */}
      {effectiveModel && availableMotors.length > 0 ? (
        <form className="panel form" action={createOutboundRequestAction}>
          <input type="hidden" name="returnPath" value="/requests" />
          <input type="hidden" name="model" value={effectiveModel} />

          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "rgba(34, 197, 94, 0.06)", borderRadius: "12px", fontSize: "14px", fontWeight: 600, color: "#16a34a", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
            已选型号：{effectiveModel} — 共 {availableMotors.length} 台在库
            <Link href="/motors/outbound" style={{ marginLeft: "12px", fontSize: "13px", textDecoration: "underline", fontWeight: 400, color: "#6B6B6B" }}>重新选择</Link>
          </div>

          <div className="field">
            <label>② 选择具体电机（可选，不选则由管理员分配）</label>
            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", padding: "8px", background: "#FAFAF8" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", marginBottom: "4px", borderRadius: "8px", background: "#fff", cursor: "pointer", fontWeight: 500, border: "1px solid rgba(0,0,0,0.08)" }}>
                <input type="radio" name="motorId" value="" defaultChecked />由管理员分配（推荐）
              </label>
              {availableMotors.map((motor) => (
                <label key={motor.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", marginBottom: "4px", borderRadius: "8px", background: "#fff", cursor: "pointer", border: "1px solid rgba(0,0,0,0.08)" }}>
                  <input type="radio" name="motorId" value={motor.id} />
                  <span style={{ flex: 1 }}>
                    <strong>{motor.motorCode}</strong> · {motor.name}
                    {motor.currentLocation ? <small style={{ marginLeft: "8px", color: "#A0A0A0" }}>位置：{motor.currentLocation}</small> : null}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="quantity">③ 数量</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              max="99"
              defaultValue="1"
              required
            />
            <small className="muted">申请该型号几台电机</small>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="targetPerson">④ 领用人</label>
              <input id="targetPerson" name="targetPerson" required />
            </div>
            <div className="field">
              <label htmlFor="destination">⑤ 车辆 / 去向</label>
              <input id="destination" name="destination" required placeholder="例如：英雄车、步兵 1 号" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="remark">申请备注（选填）</label>
            <textarea id="remark" name="remark" placeholder="填写用途、预计使用时间或其他说明" />
          </div>
          <button className="button" type="submit">提交管理员审批</button>
        </form>
      ) : effectiveModel && availableMotors.length === 0 ? (
        <div className="result-panel error">
          <h2>无可用电机</h2>
          <p>型号 {effectiveModel} 下暂无在库电机，请选择其他型号。</p>
          <Link className="button secondary" href="/motors/outbound">重新选择</Link>
        </div>
      ) : null}
    </div>
  );
}
