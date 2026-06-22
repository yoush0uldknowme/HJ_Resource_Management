import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { decodeFromSearchParams } from "@/lib/result";
import { createOutboundRequestAction } from "@/lib/request/actions";
import { isAdmin, requireOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

export default async function MobileOutboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireOperator(true);
  const admin = isAdmin(user);
  const params = await searchParams;
  const result = decodeFromSearchParams(params);

  // admin 直接出库
  if (admin) {
    return (
      <main className="mobile-shell">
        <div className="mobile-page-title">
          <span>ADMIN OUTBOUND</span>
          <h1>直接出库</h1>
          <p>管理员可直接出库。普通用户请使用下方申请入口。</p>
        </div>
        <ResultPanel result={result} />

        <Link className="button mobile-primary-action" href="/mobile/outbound/batch">
          📷 连续扫码出库 / 批量出库
        </Link>

        <Link className="button secondary" href="/admin/requests">审批出库申请</Link>
        <Link className="button secondary" href="/mobile">返回手机端</Link>
      </main>
    );
  }

  // ── 普通用户提交申请（选型号+数量）──

  const models = await prisma.motor.groupBy({
    by: ["model"],
    where: { status: "in_stock" },
    _count: { model: true },
    orderBy: { model: "asc" }
  });

  return (
    <main className="mobile-shell">
      <div className="mobile-page-title">
        <span>OUTBOUND REQUEST</span>
        <h1>申请出库</h1>
        <p>选择需要的电机型号和数量，提交后等待管理员审批。审批通过后到现场扫码即可出库。</p>
      </div>

      <ResultPanel result={result} />

      <form className="panel form mobile-operation-form" action={createOutboundRequestAction}>
        <input type="hidden" name="returnPath" value="/mobile/requests" />

        <div className="field">
          <label htmlFor="model">① 选择型号</label>
          <select id="model" name="model" required defaultValue="">
            <option value="" disabled>请选择型号</option>
            {models.map((item) => (
              <option value={item.model} key={item.model}>
                {item.model}（在库 {item._count.model} 台）
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="quantity">② 数量</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            max="99"
            defaultValue="1"
            required
          />
          <small className="muted">申请该型号几台电机</small>
        </div>

        <div className="field">
          <label htmlFor="targetPerson">③ 领用人</label>
          <input id="targetPerson" name="targetPerson" required placeholder="请输入姓名" />
        </div>
        <div className="field">
          <label htmlFor="destination">④ 车辆 / 去向</label>
          <input id="destination" name="destination" required placeholder="例如：英雄车" />
        </div>
        <div className="field">
          <label htmlFor="remark">备注（选填）</label>
          <textarea id="remark" name="remark" placeholder="用途或其他说明" />
        </div>
        <button className="button mobile-primary-action" type="submit">提交申请</button>
      </form>

      <Link className="button secondary" href="/mobile/outbound/batch-request">批量申请（多种型号）</Link>
      <Link className="button secondary" href="/mobile/requests">查看我的申请</Link>
      <Link className="button secondary" href="/mobile">返回手机端</Link>
    </main>
  );
}
