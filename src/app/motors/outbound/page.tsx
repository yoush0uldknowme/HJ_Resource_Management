import Link from "next/link";
import { ResultPanel } from "@/components/result-panel";
import { ScanCodeField } from "@/components/scan-code-field";
import { decodeActionResult } from "@/lib/action-result";
import { outboundMotorAction } from "@/lib/actions/motors";
import { createOutboundRequestAction } from "@/lib/actions/requests";
import { canManageMotors, requireMotorOperator } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function OutboundPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireMotorOperator();
  const canManage = canManageMotors(user);
  const params = await searchParams;
  const result = decodeActionResult(
    new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v ? [[k, v]] : [])))
  );

  // admin 直接出库
  if (canManage) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>直接出库（管理员）</h1>
            <p>输入电机编号，直接完成出库登记，无需审批流程。</p>
          </div>
        </div>
        <ResultPanel result={result} />
        <form className="panel form" action={outboundMotorAction}>
          <ScanCodeField defaultValue={params.code?.trim()} />
          <div className="form-grid">
            <div className="field">
              <label htmlFor="issuedBy">出库人</label>
              <input id="issuedBy" name="issuedBy" required placeholder="请输入姓名" />
            </div>
            <div className="field">
              <label htmlFor="vehicle">使用车辆 / 去向</label>
              <input id="vehicle" name="vehicle" required placeholder="例如：英雄车、步兵1号" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="remark">备注（选填）</label>
            <textarea id="remark" name="remark" placeholder="填写用途或其他说明" />
          </div>
          <button className="button" type="submit">确认出库</button>
        </form>
      </>
    );
  }

  // 普通用户提交申请
  const models = await prisma.motor.groupBy({
    by: ["model"],
    where: { status: "in_stock" },
    _count: { model: true },
    orderBy: { model: "asc" }
  });

  return (
    <div className="request-page">
      <div className="page-head">
        <div>
          <h1>提交出库申请</h1>
          <p>只需要选择电机型号。管理员审批时会分配具体的在库电机。</p>
        </div>
        <Link className="button secondary" href="/requests">我的申请</Link>
      </div>
      <form className="panel form" action={createOutboundRequestAction}>
        <input type="hidden" name="returnPath" value="/requests" />
        <div className="form-grid">
          <div className="field">
            <label htmlFor="model">申请型号</label>
            <select id="model" name="model" required defaultValue="">
              <option value="" disabled>选择有库存的型号</option>
              {models.map((item) => (
                <option value={item.model} key={item.model}>
                  {item.model}（在库 {item._count.model} 台）
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="targetPerson">领用人</label>
            <input id="targetPerson" name="targetPerson" required />
          </div>
          <div className="field">
            <label htmlFor="destination">车辆 / 去向</label>
            <input id="destination" name="destination" required placeholder="例如：英雄车、步兵 1 号" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="remark">申请备注（选填）</label>
          <textarea id="remark" name="remark" placeholder="填写用途、预计使用时间或其他说明" />
        </div>
        <button className="button" type="submit">提交管理员审批</button>
      </form>
    </div>
  );
}
