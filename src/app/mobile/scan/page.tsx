import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { decodeActionResult } from "@/lib/action-result";
import { mobileLookupMotorAction } from "@/lib/actions/motors";
import { requireCurrentUser } from "@/lib/auth";

function toURLSearchParams(params: Record<string, string | undefined>) {
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (value ? [[key, value]] : []))
  );
}

export default async function MobileScanPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireCurrentUser();
  const result = decodeActionResult(toURLSearchParams(await searchParams));

  return (
    <main className="mobile-shell">
      <div className="page-head">
        <div>
          <h1>扫码查询</h1>
          <p>扫描或输入编码，确认电机身份和当前状态。</p>
        </div>
      </div>

      <ResultPanel result={result} />

      <form className="panel form" action={mobileLookupMotorAction}>
        <ScanCodeField />
        <button className="button" type="submit">
          查询电机
        </button>
      </form>

      <Link className="button secondary" href="/mobile">
        返回现场入口
      </Link>
    </main>
  );
}
