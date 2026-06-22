import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
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
          <h1>电机入库 / 归还</h1>
          <p>输入电机的八位编号，将电机状态更新为在库。</p>
        </div>
      </div>
      <ResultPanel result={result} />
      <form className="panel form" action={inboundMotorAction}>
        <ScanCodeField defaultValue={params.code?.trim()} />
        <div className="field">
          <label htmlFor="remark">备注（选填）</label>
          <textarea id="remark" name="remark" />
        </div>
        <button className="button" type="submit">确认入库</button>
      </form>
    </>
  );
}
