import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { MobileScanButton } from "@/components/mobile-scan-button";
import { ContinuousScanButton } from "@/components/continuous-scan-button";
import { decodeFromSearchParams } from "@/lib/result";
import { batchCreateOutboundRequestAction } from "@/lib/request/actions";
import { requireOperator } from "@/lib/auth/index";

export default async function MobileBatchRequestPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireOperator(true);
  const params = await searchParams;

  // 构建结果面板内容
  const result = decodeFromSearchParams(params);
  const successCount = params.success;
  const failedCount = params.failed;
  const submitted = params.submitted;

  let customResult = result;
  if (submitted && successCount) {
    customResult = {
      type: "success" as const,
      title: "批量申请已提交",
      message:
        failedCount
          ? `成功提交 ${successCount} 条申请，${failedCount} 条失败。`
          : `成功提交 ${successCount} 条出库申请，等待管理员审批。`
    };
  }

  // 从 URL 参数读取领用人/车辆（连续扫码需要）
  const targetPerson = params.targetPerson?.trim() ?? "";
  const destination = params.destination?.trim() ?? "";
  const hasOperatorInfo = !!targetPerson && !!destination;

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>BATCH REQUEST</span>
        <h1>批量申请出库</h1>
        <p>输入多个在库电机编号，统一填写领用人和车辆，一次提交多条出库申请。</p>
      </div>

      {customResult ? <ResultPanel result={customResult} /> : null}

      {/* 第一步：填写领用人/车辆（GET 表单，提交后刷新页面显示连续扫码按钮） */}
      <form className="panel form mobile-operation-form" method="GET" action="/mobile/outbound/batch-request">
        <div className="field">
          <label htmlFor="targetPerson">领用人</label>
          <input
            id="targetPerson"
            name="targetPerson"
            required
            placeholder="请输入姓名"
            defaultValue={targetPerson}
          />
        </div>
        <div className="field">
          <label htmlFor="destination">车辆 / 去向</label>
          <input
            id="destination"
            name="destination"
            required
            placeholder="例如：英雄车"
            defaultValue={destination}
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
            领用人：{targetPerson} ｜ 车辆：{destination}
            <Link
              href="/mobile/outbound/batch-request"
              style={{ marginLeft: "12px", fontSize: "12px", textDecoration: "underline", fontWeight: 400 }}
            >
              修改
            </Link>
          </div>

          <ContinuousScanButton
            mode="request"
            targetPerson={targetPerson}
            destination={destination}
            label="📷 连续扫码申请"
          />

          <form
            className="panel form mobile-operation-form"
            action={batchCreateOutboundRequestAction}
          >
            <input type="hidden" name="returnPath" value="/mobile/outbound/batch-request" />
            <input type="hidden" name="targetPerson" value={targetPerson} />
            <input type="hidden" name="destination" value={destination} />
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
              批量提交申请
            </button>
          </form>
        </>
      ) : null}

      <div className="panel" style={{ padding: "14px", fontSize: "14px", lineHeight: 1.6 }}>
        <strong style={{ display: "block", marginBottom: "8px", fontSize: "15px" }}>使用说明</strong>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--muted)" }}>
          <li><strong>连续扫码</strong>：打开摄像头，扫一个自动提交申请并提示，无需退出继续扫下一个</li>
          <li><strong>手动输入</strong>：在文本框每行输入一个编号，一次提交批量申请</li>
          <li>只有「在库」状态的电机可以申请出库</li>
          <li>提交后需等待管理员审批</li>
        </ul>
      </div>

      <Link className="button secondary" href="/mobile/outbound">单个申请</Link>
      <Link className="button secondary" href="/mobile/requests">查看我的申请</Link>
      <Link className="button secondary" href="/mobile">返回手机端</Link>
    </main>
  );
}
