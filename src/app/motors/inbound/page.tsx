import { ResultPanel } from "@/components/result-panel";
import { decodeActionResult } from "@/lib/action-result";
import { inboundMotorAction } from "@/lib/actions/motors";
import { requireMotorOperator } from "@/lib/auth";

function toURLSearchParams(params: Record<string, string | undefined>) {
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (value ? [[key, value]] : []))
  );
}

export default async function InboundPage({
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
          <h1>电机入库</h1>
          <p>扫码枪通常会把编码输入到当前输入框，也可以手动输入编码。</p>
        </div>
      </div>

      <ResultPanel result={result} />

      <form className="panel form" action={inboundMotorAction}>
        <div className="field">
          <label htmlFor="scannedCode">扫码编码</label>
          <input id="scannedCode" name="scannedCode" required autoFocus placeholder="例如 GM6020-0001" />
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
