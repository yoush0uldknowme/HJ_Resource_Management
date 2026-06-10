import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { decodeActionResult } from "@/lib/action-result";
import { mobileLookupMotorAction } from "@/lib/actions/motors";
import { requireMotorOperator } from "@/lib/auth";

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
  await requireMotorOperator();
  const result = decodeActionResult(toURLSearchParams(await searchParams));

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>LOOKUP</span>
        <h1>编号查询</h1>
        <p>输入八位编号，确认电机身份、库存状态和当前位置。</p>
      </div>
      <ResultPanel result={result} />
      <form className="panel form mobile-operation-form" action={mobileLookupMotorAction}>
        <ScanCodeField />
        <button className="button mobile-primary-action" type="submit">
          查询电机
        </button>
      </form>
      <Link className="button secondary" href="/mobile">
        返回现场端
      </Link>
    </main>
  );
}
