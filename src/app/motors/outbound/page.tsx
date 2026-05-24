import { ResultPanel } from "@/components/result-panel";
import { decodeActionResult } from "@/lib/action-result";
import { outboundMotorAction } from "@/lib/actions/motors";
import { requireMotorOperator } from "@/lib/auth";

function toURLSearchParams(params: Record<string, string | undefined>) {
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (value ? [[key, value]] : []))
  );
}

export default async function OutboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireMotorOperator();
  const params = await searchParams;
  const result = decodeActionResult(toURLSearchParams(params));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>电机出库</h1>
          <p>扫码定位在库电机，登记出库人和使用车辆。</p>
        </div>
      </div>

      <ResultPanel result={result} />

      <form className="panel form" action={outboundMotorAction}>
        <div className="field">
          <label htmlFor="scannedCode">扫码编码</label>
          <input id="scannedCode" name="scannedCode" required autoFocus placeholder="例如 GM6020-0001" />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="issuedBy">出库人</label>
            <input id="issuedBy" name="issuedBy" required />
          </div>
          <div className="field">
            <label htmlFor="vehicle">使用车辆</label>
            <input id="vehicle" name="vehicle" required placeholder="例如 英雄车 / 步兵1号" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="remark">备注</label>
          <textarea id="remark" name="remark" />
        </div>
        <button className="button" type="submit">
          确认出库
        </button>
      </form>
    </>
  );
}
