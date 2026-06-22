import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { BatchRequestForm } from "@/components/batch-request-form";
import { decodeFromSearchParams } from "@/lib/result";
import { requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

export default async function MobileBatchRequestPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireOperator(true);
  const params = await searchParams;

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

  // 查询所有在库型号
  const models = await prisma.motor.groupBy({
    by: ["model"],
    where: { status: "in_stock" },
    _count: { model: true },
    orderBy: { model: "asc" }
  });

  const modelInfos = models.map((m) => ({ model: m.model, stock: m._count.model }));

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>BATCH REQUEST</span>
        <h1>批量申请出库</h1>
        <p>选择需要的电机型号和数量，一次提交多种型号的出库申请。</p>
      </div>

      {customResult ? <ResultPanel result={customResult} /> : null}

      <BatchRequestForm models={modelInfos} />

      <div className="panel" style={{ padding: "14px", fontSize: "14px", lineHeight: 1.6 }}>
        <strong style={{ display: "block", marginBottom: "8px", fontSize: "15px" }}>使用说明</strong>
        <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--muted)" }}>
          <li>选择型号并填写数量，可添加多种型号</li>
          <li>所有申请统一登记给同一个领用人和车辆</li>
          <li>提交后需等待管理员审批</li>
          <li>审批通过后到现场扫码即可出库</li>
        </ul>
      </div>

      <Link className="button secondary" href="/mobile/outbound">单个申请</Link>
      <Link className="button secondary" href="/mobile/requests">查看我的申请</Link>
      <Link className="button secondary" href="/mobile">返回手机端</Link>
    </main>
  );
}
