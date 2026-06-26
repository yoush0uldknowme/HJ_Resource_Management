import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { decodeFromSearchParams } from "@/lib/result";
import { inboundMotorAction } from "@/lib/motor/actions";
import { requireOperator } from "@/lib/auth/index";

export default async function InboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireOperator();
  const params = await searchParams;
  const result = decodeFromSearchParams(params);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>电机入库 / 归还</h1>
          <p>输入电机编号（如 GM6020-0001），将电机状态更新为在库。</p>
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
