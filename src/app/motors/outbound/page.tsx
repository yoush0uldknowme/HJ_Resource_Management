import { outboundMotorAction } from "@/lib/actions/motors";
import { requireCurrentUser } from "@/lib/auth";

export default async function OutboundPage() {
  await requireCurrentUser();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>电机出库</h1>
          <p>扫码定位在库电机，登记谁出的、给哪个车使用。</p>
        </div>
      </div>

      <form className="panel form" action={outboundMotorAction}>
        <div className="field">
          <label htmlFor="scannedCode">扫码编码</label>
          <input id="scannedCode" name="scannedCode" required autoFocus placeholder="扫描或输入 MTR-YYYYMM-XXXX" />
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
