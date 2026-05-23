import { inboundMotorAction } from "@/lib/actions/motors";
import { requireCurrentUser } from "@/lib/auth";

export default async function InboundPage() {
  await requireCurrentUser();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>电机入库</h1>
          <p>扫码枪扫入二维码/条码后直接入库；扫码枪通常会把编码输入到当前输入框。</p>
        </div>
      </div>

      <form className="panel form" action={inboundMotorAction}>
        <div className="field">
          <label htmlFor="scannedCode">扫码编码</label>
          <input id="scannedCode" name="scannedCode" required autoFocus placeholder="扫描或输入 MTR-YYYYMM-XXXX" />
        </div>
        <div className="field">
          <label htmlFor="remark">备注</label>
          <textarea id="remark" name="remark" />
        </div>
        <button className="button" type="submit">
          确认入库
        </button>
      </form>
    </>
  );
}
