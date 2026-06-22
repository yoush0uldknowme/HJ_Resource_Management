import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { MobileScanButton } from "@/components/mobile-scan-button";
import { decodeFromSearchParams } from "@/lib/result";
import { mobileInboundMotorAction } from "@/lib/motor/actions";
import { requireOperator } from "@/lib/auth/index";

export default async function MobileInboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireOperator(true);
  const params = await searchParams;
  const result = decodeFromSearchParams(params);

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>INBOUND</span>
        <h1>入库 / 归还</h1>
        <p>扫码或输入电机编号，将电机状态更新为在库。</p>
      </div>
      <ResultPanel result={result} />
      <form className="panel form mobile-operation-form" action={mobileInboundMotorAction}>
        <ScanCodeField defaultValue={params.code?.trim()} />
        <div className="field">
          <label htmlFor="remark">备注（选填）</label>
          <textarea id="remark" name="remark" placeholder="记录归还情况或其他说明" />
        </div>
        <button className="button mobile-primary-action" type="submit">
          确认入库
        </button>
      </form>

      <MobileScanButton redirectTo="/mobile/inbound" label="📷 扫码入库" />

      <Link className="button secondary" href="/mobile">
        返回手机端
      </Link>
    </main>
  );
}
