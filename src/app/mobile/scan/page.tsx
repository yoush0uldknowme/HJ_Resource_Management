import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { MobileScanButton } from "@/components/mobile-scan-button";
import { ContinuousScanButton } from "@/components/continuous-scan-button";
import { decodeFromSearchParams } from "@/lib/result";
import { mobileLookupMotorAction } from "@/lib/motor/actions";
import { executeApprovedOutboundAction } from "@/lib/request/actions";
import { isAdmin, requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { findMotorByCodeWithPhoto } from "@/lib/motor/lookup";
import { normalizeScannedCode } from "@/lib/utils";

export default async function MobileScanPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireOperator(true);
  const admin = isAdmin(user);
  const params = await searchParams;
  const result = decodeFromSearchParams(params);

  // 如果 URL 中有 code 参数，直接查询电机
  const scannedCode = normalizeScannedCode(params.code);
  const motor = scannedCode ? await findMotorByCodeWithPhoto(prisma, scannedCode) : null;

  // 检查该电机是否有已审批的出库申请（指定了该电机的或同型号未指定的）
  let approvedRequest = null;
  if (motor) {
    approvedRequest = await prisma.outboundRequest.findFirst({
      where: { assignedMotorId: motor.id, status: "approved" }
    });
    if (!approvedRequest && motor.status === "in_stock") {
      approvedRequest = await prisma.outboundRequest.findFirst({
        where: { model: motor.model, assignedMotorId: null, status: "approved" },
        orderBy: { createdAt: "asc" }
      });
    }
  }

  // 查询是否有任何待执行的已审批申请
  const pendingApprovedCount = await prisma.outboundRequest.count({
    where: { status: "approved" }
  });

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>SCAN</span>
        <h1>扫码查询</h1>
        <p>扫描电机二维码，或手动输入编号查询。</p>
      </div>

      <ResultPanel result={result} />

      {/* 扫码结果展示 */}
      {motor ? (
        <div className="scan-result-card">
          <h3>{motor.motorCode}</h3>
          <dl className="scan-result-info">
            <div>
              <dt>型号</dt>
              <dd>{motor.model}</dd>
            </div>
            <div>
              <dt>名称</dt>
              <dd>{motor.name}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>
                {motor.status === "in_stock" && approvedRequest
                  ? "✅ 在库（已审批待出库）"
                  : motor.status === "in_stock"
                    ? "✅ 在库"
                    : motor.status === "checked_out"
                      ? "📤 已出库"
                      : motor.status}
              </dd>
            </div>
            <div>
              <dt>位置 / 去向</dt>
              <dd>{motor.currentLocation ?? "-"}</dd>
            </div>
          </dl>

          {/* 已审批申请信息 */}
          {approvedRequest ? (
            <div className="scan-result-info">
              <div>
                <dt>领用人</dt>
                <dd>{approvedRequest.targetPerson}</dd>
              </div>
              <div>
                <dt>车辆 / 去向</dt>
                <dd>{approvedRequest.destination}</dd>
              </div>
              <div>
                <dt>审批人</dt>
                <dd>{approvedRequest.reviewedBy ?? "-"}</dd>
              </div>
              <div>
                <dt>审批意见</dt>
                <dd>{approvedRequest.reviewRemark ?? "-"}</dd>
              </div>
            </div>
          ) : null}

          <div className="scan-result-actions">
            <Link className="button" href={`/motors/${motor.id}`}>
              查看详情
            </Link>

            {/* 已审批待出库：任何人都可以扫码执行出库 */}
            {motor.status === "in_stock" && approvedRequest ? (
              <form action={executeApprovedOutboundAction} style={{ display: "contents" }}>
                <input type="hidden" name="scannedCode" value={motor.motorCode} />
                <input type="hidden" name="returnPath" value="/mobile/scan" />
                <button className="button scan-action-outbound" type="submit">
                  执行出库
                </button>
              </form>
            ) : motor.status === "in_stock" && admin ? (
              <Link
                className="button scan-action-outbound"
                href={`/mobile/outbound?code=${encodeURIComponent(motor.motorCode)}`}
              >
                直接出库
              </Link>
            ) : motor.status === "checked_out" ? (
              <Link
                className="button scan-action-inbound"
                href={`/mobile/inbound?code=${encodeURIComponent(motor.motorCode)}`}
              >
                入库 / 归还
              </Link>
            ) : motor.status === "in_stock" && !admin ? (
              <Link
                className="button"
                href={`/mobile/outbound?code=${encodeURIComponent(motor.motorCode)}&model=${encodeURIComponent(motor.model)}`}
              >
                申请此电机出库
              </Link>
            ) : null}
          </div>
        </div>
      ) : scannedCode ? (
        <div className="result-panel error">
          <h2>未找到电机</h2>
          <p>没有找到编码为 {scannedCode} 的电机，请检查编号是否正确。</p>
        </div>
      ) : null}

      {/* 手动输入表单 */}
      <form className="panel form mobile-operation-form" action={mobileLookupMotorAction}>
        <ScanCodeField defaultValue={scannedCode} />
        <button className="button mobile-primary-action" type="submit">
          查询电机
        </button>
      </form>

      <MobileScanButton redirectTo="/mobile/scan" />

      {/* 如果有已审批待执行的申请，显示连续扫码出库按钮 */}
      {pendingApprovedCount > 0 ? (
        <>
          <div
            style={{
              padding: "10px 14px",
              background: "#fef3c7",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--warning)",
              textAlign: "center"
            }}
          >
            有 {pendingApprovedCount} 条已审批申请待执行出库
          </div>
          <ContinuousScanButton
            mode="executeApproved"
            label="📷 连续扫码执行出库"
          />
        </>
      ) : null}

      <Link className="button secondary" href="/mobile">
        返回手机端
      </Link>
    </main>
  );
}
