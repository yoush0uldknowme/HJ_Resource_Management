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
  const params = await searchParams;
  const result = decodeActionResult(toURLSearchParams(params));

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>OUTBOUND</span>
        <h1>电机出库</h1>
        <p>输入电机编号和领用信息，登记电机当前去向。</p>
      </div>
      <ResultPanel result={result} />
      <form className="panel form mobile-operation-form" action={mobileOutboundMotorAction}>
        <ScanCodeField defaultValue={params.code?.trim()} />
        <div className="field">
          <label htmlFor="issuedBy">领用人</label>
          <input id="issuedBy" name="issuedBy" required placeholder="请输入姓名" />
        </div>
        <div className="field">
          <label htmlFor="vehicle">使用车辆 / 去向</label>
          <input id="vehicle" name="vehicle" required placeholder="例如：英雄车、步兵 1 号" />
        </div>
        <div className="field">
          <label htmlFor="remark">备注（选填）</label>
          <textarea id="remark" name="remark" placeholder="填写用途或其他说明" />
        </div>
        <button className="button mobile-primary-action" type="submit">
          确认出库
        </button>
      </form>
      <Link className="button secondary" href="/mobile">
        返回现场端
      </Link>
    </main>
  );
}
