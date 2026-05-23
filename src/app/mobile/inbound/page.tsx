import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { decodeActionResult } from "@/lib/action-result";
import { mobileInboundMotorAction } from "@/lib/actions/motors";
import { requireAdmin } from "@/lib/auth";

function toURLSearchParams(params: Record<string, string | undefined>) {
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (value ? [[key, value]] : []))
  );
}

export default async function MobileInboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const result = decodeActionResult(toURLSearchParams(await searchParams));

  return (
    <main className="mobile-shell">
      <div className="page-head">
        <div>
          <h1>扫码入库</h1>
          <p>扫描或输入编码后，电机会标记为在库。</p>
        </div>
      </div>

      <ResultPanel result={result} />

      <form className="panel form" action={mobileInboundMotorAction}>
        <ScanCodeField />
        <div className="field">
          <label htmlFor="remark">备注</label>
          <textarea id="remark" name="remark" />
        </div>
        <button className="button" type="submit">
          确认入库
        </button>
      </form>

      <Link className="button secondary" href="/mobile">
        返回现场入口
      </Link>
    </main>
  );
}
