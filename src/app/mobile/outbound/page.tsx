import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { MobileScanButton } from "@/components/mobile-scan-button";
import { decodeFromSearchParams } from "@/lib/result";
import { mobileOutboundMotorAction } from "@/lib/motor/actions";
import { createOutboundRequestAction } from "@/lib/request/actions";
import { isAdmin, requireOperator } from "@/lib/auth/index";
import { findMotorByCode } from "@/lib/motor/lookup";
import { normalizeScannedCode } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function MobileOutboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireOperator(true);
  const admin = isAdmin(user);
  const params = await searchParams;
  const result = decodeFromSearchParams(params);

  // admin 直接出库
  if (admin) {
    return (
      <main className="mobile-shell">
        <div className="mobile-page-title">
          <span>ADMIN OUTBOUND</span>
          <h1>直接出库</h1>
          <p>扫码或输入电机编号，直接完成出库登记。</p>
        </div>
        <ResultPanel result={result} />
        <form className="form mobile-operation-form" action={mobileOutboundMotorAction}>
          <ScanCodeField defaultValue={params.code?.trim()} />
          <div className="field">
            <label htmlFor="issuedBy">出库人</label>
            <input id="issuedBy" name="issuedBy" required placeholder="请输入姓名" />
          </div>
          <div className="field">
            <label htmlFor="vehicle">车辆 / 去向</label>
            <input id="vehicle" name="vehicle" required placeholder="例如：英雄车" />
          </div>
          <div className="field">
            <label htmlFor="remark">备注（选填）</label>
            <textarea id="remark" name="remark" placeholder="用途或其他说明" />
          </div>
          <button className="button mobile-primary-action" type="submit">确认出库</button>
        </form>

        <MobileScanButton redirectTo="/mobile/outbound" label="📷 扫码出库" />

        <Link className="button secondary" href="/mobile">返回手机端</Link>
      </main>
    );
  }

  // ── 普通用户提交申请 ──

  // 查询所有在库电机型号（用于第一步）
  const models = await prisma.motor.groupBy({
    by: ["model"],
    where: { status: "in_stock" },
    _count: { model: true },
    orderBy: { model: "asc" }
  });

  // 从 URL 读取预选参数
  const selectedModel = params.model?.trim();
  const scannedCode = normalizeScannedCode(params.code);
  const scannedMotor = scannedCode ? await findMotorByCode(prisma, scannedCode) : null;
  // 如果扫码了电机且它在库，用它预填型号；否则用 URL model 参数
  const effectiveModel = (scannedMotor && scannedMotor.status === "in_stock")
    ? scannedMotor.model
    : selectedModel;

  // 第一步选了型号后，列出该型号下所有在库电机供用户选择
  const availableMotors = effectiveModel
    ? await prisma.motor.findMany({
        where: { model: effectiveModel, status: "in_stock" },
        orderBy: { motorCode: "asc" }
      })
    : [];

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>OUTBOUND REQUEST</span>
        <h1>申请出库</h1>
        <p>选择型号后可指定具体电机，或由管理员分配。</p>
      </div>

      {scannedMotor && scannedMotor.status !== "in_stock" ? (
        <div className="result-panel error">
          <h2>电机不可申请</h2>
          <p>电机 {scannedMotor.motorCode} 当前状态为「{scannedMotor.status === "checked_out" ? "已出库" : scannedMotor.status}」，无法申请出库。</p>
        </div>
      ) : null}

      <ResultPanel result={result} />

      {/* 第一步：选择型号（GET 表单，提交后刷新页面显示电机列表） */}
      <form className="panel form mobile-operation-form" method="GET" action="/mobile/outbound">
        {/* 如果有扫码编码一并保留 */}
        {params.code ? <input type="hidden" name="code" value={params.code} /> : null}
        <div className="field">
          <label htmlFor="model">① 选择型号</label>
          <select
            id="model"
            name="model"
            required
            defaultValue={effectiveModel ?? ""}
          >
            <option value="" disabled>请选择型号</option>
            {models.map((item) => (
              <option value={item.model} key={item.model}>
                {item.model}（在库 {item._count.model}）
              </option>
            ))}
          </select>
        </div>
        {!effectiveModel ? (
          <button className="button mobile-primary-action" type="submit">
            下一步：选择具体电机
          </button>
        ) : null}
      </form>

      {/* 第二步：选择具体电机 + 填写信息 */}
      {effectiveModel && availableMotors.length > 0 ? (
        <form className="panel form mobile-operation-form" action={createOutboundRequestAction}>
          <input type="hidden" name="returnPath" value="/mobile/requests" />
          <input type="hidden" name="model" value={effectiveModel} />

          {/* 已选型号显示 */}
          <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#e8f5f2", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "var(--primary)" }}>
            已选型号：{effectiveModel} — 共 {availableMotors.length} 台在库
            <Link
              href="/mobile/outbound"
              style={{ marginLeft: "12px", fontSize: "12px", textDecoration: "underline", fontWeight: 400 }}
            >
              重新选择
            </Link>
          </div>

          {/* 扫码到的电机高亮提示 */}
          {scannedMotor && scannedMotor.status === "in_stock" ? (
            <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#fef3c7", borderRadius: "8px", fontSize: "14px", fontWeight: 600 }}>
              已扫码：{scannedMotor.motorCode}（{scannedMotor.model}）
            </div>
          ) : null}

          <div className="field">
            <label>② 选择具体电机（可选，不选则由管理员分配）</label>
            <div style={{ maxHeight: scannedMotor ? "280px" : "200px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "8px", padding: "8px" }}>
              <label
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "10px 12px", marginBottom: "4px", borderRadius: "6px",
                  background: "var(--panel)", cursor: "pointer", fontWeight: 500,
                  border: "1px solid var(--line)"
                }}
              >
                <input type="radio" name="motorId" value="" defaultChecked={!scannedMotor} />
                由管理员分配（推荐）
              </label>
              {availableMotors.map((motor) => {
                const isScanned = scannedMotor?.id === motor.id;
                return (
                  <label
                    key={motor.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "10px 12px", marginBottom: "4px", borderRadius: "6px",
                      background: isScanned ? "#fef3c7" : "var(--panel)",
                      cursor: "pointer", fontWeight: isScanned ? 700 : 400,
                      border: isScanned ? "2px solid var(--amber)" : "1px solid var(--line)"
                    }}
                  >
                    <input
                      type="radio"
                      name="motorId"
                      value={motor.id}
                      defaultChecked={isScanned}
                    />
                    <span style={{ flex: 1 }}>
                      <strong>{motor.motorCode}</strong>
                      {motor.currentLocation ? <small style={{ marginLeft: "8px", color: "var(--muted)" }}>位置：{motor.currentLocation}</small> : null}
                      {isScanned ? <span style={{ marginLeft: "8px", color: "var(--amber)", fontSize: "12px" }}>已扫码</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label htmlFor="targetPerson">③ 领用人</label>
            <input id="targetPerson" name="targetPerson" required placeholder="请输入姓名" />
          </div>
          <div className="field">
            <label htmlFor="destination">④ 车辆 / 去向</label>
            <input id="destination" name="destination" required placeholder="例如：英雄车" />
          </div>
          <div className="field">
            <label htmlFor="remark">备注（选填）</label>
            <textarea id="remark" name="remark" placeholder="用途或其他说明" />
          </div>
          <button className="button mobile-primary-action" type="submit">提交申请</button>
        </form>
      ) : effectiveModel && availableMotors.length === 0 ? (
        <div className="result-panel error">
          <h2>无可用电机</h2>
          <p>型号 {effectiveModel} 下暂无在库电机，请选择其他型号。</p>
          <Link className="button secondary" href="/mobile/outbound">重新选择</Link>
        </div>
      ) : null}

      <MobileScanButton redirectTo="/mobile/outbound" label="📷 扫码选择电机" />

      <Link className="button secondary" href="/mobile/requests">查看我的申请</Link>
      <Link className="button secondary" href="/mobile">返回手机端</Link>
    </main>
  );
}
