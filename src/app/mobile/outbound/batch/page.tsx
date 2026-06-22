import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ContinuousScanButton } from "@/components/continuous-scan-button";
import { decodeFromSearchParams } from "@/lib/result";
import { batchOutboundMotorAction } from "@/lib/motor/actions";
import { requireAdmin } from "@/lib/auth/index";

export default async function MobileBatchOutboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const result = decodeFromSearchParams(params);

  // 从 URL 参数读取出库人/车辆（连续扫码需要）
  const issuedBy = params.issuedBy?.trim() ?? "";
  const vehicle = params.vehicle?.trim() ?? "";
  const hasOperatorInfo = !!issuedBy && !!vehicle;

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>BATCH OUTBOUND</span>
        <h1>批量出库</h1>
        <p>输入多个在库电机编号，统一登记领用人和车辆，一次性完成出库。</p>
      </div>

      <ResultPanel result={result} />

      {/* 第一步：填写出库人/车辆（GET 表单，提交后刷新页面显示连续扫码按钮） */}
      <form className="panel form mobile-operation-form" method="GET" action="/mobile/outbound/batch">
        <div className="field">
          <label htmlFor="issuedBy">出库人</label>
          <input
            id="issuedBy"
            name="issuedBy"
            required
            placeholder="请输入姓名"
            defaultValue={issuedBy}
          />
        </div>
        <div className="field">
          <label htmlFor="vehicle">车辆 / 去向</label>
          <input
            id="vehicle"
            name="vehicle"
            required
            placeholder="例如：英雄车"
            defaultValue={vehicle}
          />
        </div>
        {!hasOperatorInfo ? (
          <button className="button mobile-primary-action" type="submit">
            下一步：开始扫码或批量输入
          </button>
        ) : null}
      </form>

      {/* 第二步：连续扫码或手动批量输入 */}
      {hasOperatorInfo ? (
        <>
          <div
            style={{
              padding: "10px 14px",
              background: "#e8f5f2",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--primary)"
            }}
          >
            出库人：{issuedBy} ｜ 车辆：{vehicle}
            <Link
              href="/mobile/outbound/batch"
              style={{ marginLeft: "12px", fontSize: "12px", textDecoration: "underline", fontWeight: 400 }}
            >
              修改
            </Link>
          </div>

          <ContinuousScanButton
            mode="outbound"
            issuedBy={issuedBy}
            vehicle={vehicle}
            label="📷 连续扫码出库"
          />

          <form className="panel form mobile-operation-form" action={batchOutboundMotorAction}>
            <input type="hidden" name="issuedBy" value={issuedBy} />
            <input type="hidden" name="vehicle" value={vehicle} />
            <div className="field">
              <label htmlFor="scannedCodes">电机编号（每行一个）</label>
              <textarea
                id="scannedCodes"
                name="scannedCodes"
                required
                placeholder={"GM6020-0001\nGM6020-0002\nGM6020-0003"}
                rows={6}
                style={{ fontFamily: "monospace", fontSize: "15px" }}
              />
              <small className="muted">支持换行、逗号、空格分隔</small>
            </div>
            <div className="field">
              <label htmlFor="remark">备注（选填）</label>
              <textarea
                id="remark"
                name="remark"
                placeholder="用途或其他说明"
                rows={2}
              />
            </div>
            <button className="button mobile-primary-action" type="submit">
              批量出库
            </button>
          </form>
        </>
      ) : null}

      <div className="panel" style={{ padding: "14px", fontSize: "14px", lineHeight: 1.6 }}>
        <strong style={{ display: "block", marginBottom: "8px", fontSize: "15px" }}>使用说明</strong>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--muted)" }}>
          <li><strong>连续扫码</strong>：打开摄像头，扫一个自动出库并提示，无需退出继续扫下一个</li>
          <li><strong>手动输入</strong>：在文本框每行输入一个编号，一次提交批量出库</li>
          <li>只有「在库」状态的电机可以出库</li>
        </ul>
      </div>

      <Link className="button secondary" href="/mobile/outbound">单个出库</Link>
      <Link className="button secondary" href="/mobile">返回手机端</Link>
    </main>
  );
}
