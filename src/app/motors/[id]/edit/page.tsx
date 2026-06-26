import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMotorAction } from "@/lib/motor/actions";
import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { MotorStatusSelect } from "@/components/motor-status-select";

export default async function EditMotorPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const motor = await prisma.motor.findUnique({ where: { id: Number(id) } });
  if (!motor) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>编辑电机</h1>
          <p>修改基础档案信息、SN 码和出入库状态。内部编码不会改变，避免标签和历史记录对不上。</p>
        </div>
        <Link className="button secondary" href={`/motors/${motor.id}`}>
          返回详情
        </Link>
      </div>

      {sp.error ? (
        <div className="result-panel error">
          <h2>{sp.error === "sn_duplicate" ? "SN 码重复" : "操作失败"}</h2>
          <p>{sp.message ?? "请检查输入后重试。"}</p>
        </div>
      ) : null}

      <form className="panel form" action={updateMotorAction}>
        <input type="hidden" name="id" value={motor.id} />
        <div className="form-grid">
          <div className="field">
            <label htmlFor="motorCode">内部编码</label>
            <input id="motorCode" value={motor.motorCode} disabled />
            <small className="muted">内部编码不可修改，保证标签和历史记录一致</small>
          </div>
          <div className="field">
            <label htmlFor="model">型号</label>
            <input id="model" name="model" required defaultValue={motor.model} />
          </div>
          <div className="field">
            <label htmlFor="name">电机名称</label>
            <input id="name" name="name" required defaultValue={motor.name} />
          </div>
          <div className="field">
            <label htmlFor="snCode">SN / 序列号编码</label>
            <input id="snCode" name="snCode" defaultValue={motor.snCode ?? ""} placeholder="可选，修改时系统会检查唯一性" />
            <small className="muted">SN 码在系统中必须唯一，重复的 SN 码将无法保存</small>
          </div>
        </div>
        <div className="field">
          <label htmlFor="remark">备注</label>
          <textarea id="remark" name="remark" defaultValue={motor.remark ?? ""} />
        </div>

        {/* 管理员可直接修改电机出入库状态 */}
        <div className="field" style={{ marginTop: 16 }}>
          <label>出入库状态（管理员可修改）</label>
          <MotorStatusSelect
            motorId={motor.id}
            currentStatus={motor.status}
            currentLocation={motor.currentLocation ?? ""}
          />
        </div>

        <button className="button" type="submit">
          保存修改
        </button>
      </form>
    </>
  );
}
