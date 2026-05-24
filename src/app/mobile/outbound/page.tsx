import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { decodeActionResult } from "@/lib/action-result";
import { mobileOutboundMotorAction } from "@/lib/actions/motors";
import { requireMotorOperator } from "@/lib/auth";

function toURLSearchParams(params: Record<string, string | undefined>) {
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (value ? [[key, value]] : []))
  );
}

export default async function MobileOutboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireMotorOperator();
  const result = decodeActionResult(toURLSearchParams(await searchParams));

  return (
    <main className="mobile-shell">
      <div className="page-head">
        <div>
          <h1>扫码出库</h1>
          <p>扫描或输入编码，填写出库人和使用车辆。</p>
        </div>
      </div>

      <ResultPanel result={result} />

      <form className="panel form" action={mobileOutboundMotorAction}>
        <ScanCodeField />
        <div className="field">
          <label htmlFor="issuedBy">出库人</label>
          <input id="issuedBy" name="issuedBy" required />
        </div>
        <div className="field">
          <label htmlFor="vehicle">使用车辆</label>
          <input id="vehicle" name="vehicle" required placeholder="例如 英雄车 / 步兵1号" />
        </div>
        <div className="field">
          <label htmlFor="remark">备注</label>
          <textarea id="remark" name="remark" />
        </div>
        <button className="button" type="submit">
          确认出库
        </button>
      </form>

      <Link className="button secondary" href="/mobile">
        返回现场入口
      </Link>
    </main>
  );
}
