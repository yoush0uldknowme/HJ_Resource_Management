import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { MobileScanButton } from "@/components/mobile-scan-button";
import { decodeActionResult } from "@/lib/action-result";
import { mobileOutboundMotorAction } from "@/lib/actions/motors";
import { createOutboundRequestAction } from "@/lib/actions/requests";
import { canManageMotors, requireMotorOperator } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function MobileOutboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireMotorOperator();
  const canManage = canManageMotors(user);
  const params = await searchParams;
  const result = decodeActionResult(
    new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v ? [[k, v]] : [])))
  );

  // admin 直接出库
  if (canManage) {
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

        <Link className="button secondary" href="/mobile">返回现场端</Link>
      </main>
    );
  }

  // 普通用户提交申请
  const models = await prisma.motor.groupBy({
    by: ["model"],
    where: { status: "in_stock" },
    _count: { model: true },
    orderBy: { model: "asc" }
  });

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>OUTBOUND REQUEST</span>
        <h1>申请出库</h1>
        <p>选择型号并填写去向。审批通过后，管理员会分配具体电机。</p>
      </div>
      <form className="form mobile-operation-form" action={createOutboundRequestAction}>
        <input type="hidden" name="returnPath" value="/mobile/requests" />
        <div className="field">
          <label htmlFor="model">申请型号</label>
          <select id="model" name="model" required defaultValue="">
            <option value="" disabled>请选择型号</option>
            {models.map((item) => (
              <option value={item.model} key={item.model}>
                {item.model}（在库 {item._count.model}）
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="targetPerson">领用人</label>
          <input id="targetPerson" name="targetPerson" required placeholder="请输入姓名" />
        </div>
        <div className="field">
          <label htmlFor="destination">车辆 / 去向</label>
          <input id="destination" name="destination" required placeholder="例如：英雄车" />
        </div>
        <div className="field">
          <label htmlFor="remark">备注（选填）</label>
          <textarea id="remark" name="remark" placeholder="用途或其他说明" />
        </div>
        <button className="button mobile-primary-action" type="submit">提交申请</button>
      </form>
      <Link className="button secondary" href="/mobile/requests">查看我的申请</Link>
      <Link className="button secondary" href="/mobile">返回现场端</Link>
    </main>
  );
}
