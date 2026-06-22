import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { MobileScanButton } from "@/components/mobile-scan-button";
import { ContinuousScanButton } from "@/components/continuous-scan-button";
import { decodeFromSearchParams } from "@/lib/result";
import { batchInboundMotorAction } from "@/lib/motor/actions";
import { requireOperator } from "@/lib/auth/index";

export default async function MobileBatchInboundPage({
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
        <span>BATCH INBOUND</span>
        <h1>批量入库</h1>
        <p>输入多个电机编号（每行一个），一次性完成入库登记。</p>
      </div>

      <ResultPanel result={result} />

      <form className="panel form mobile-operation-form" action={batchInboundMotorAction}>
        <div className="field">
          <label htmlFor="scannedCodes">电机编号（每行一个）</label>
          <textarea
            id="scannedCodes"
            name="scannedCodes"
            required
            placeholder={"GM6020-0001\nGM6020-0002\nGM6020-0003"}
            rows={8}
            style={{ fontFamily: "monospace", fontSize: "15px" }}
          />
          <small className="muted">支持换行、逗号、空格分隔，可混合使用</small>
        </div>
        <div className="field">
          <label htmlFor="remark">备注（选填，所有电机共用）</label>
          <textarea
            id="remark"
            name="remark"
            placeholder="记录归还情况或其他说明"
            rows={2}
          />
        </div>
        <button className="button mobile-primary-action" type="submit">
          批量入库
        </button>
      </form>

      <ContinuousScanButton mode="inbound" label="📷 连续扫码入库" />

      <div className="panel" style={{ padding: "14px", fontSize: "14px", lineHeight: 1.6 }}>
        <strong style={{ display: "block", marginBottom: "8px", fontSize: "15px" }}>使用说明</strong>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--muted)" }}>
          <li><strong>连续扫码</strong>：打开摄像头，扫一个自动入库并提示，无需退出继续扫下一个</li>
          <li><strong>手动输入</strong>：在上方文本框每行输入一个编号，一次提交批量入库</li>
          <li>只有「已出库」或「待入库」状态的电机可以入库</li>
        </ul>
      </div>

      <Link className="button secondary" href="/mobile/inbound">单个入库</Link>
      <Link className="button secondary" href="/mobile">返回手机端</Link>
    </main>
  );
}
