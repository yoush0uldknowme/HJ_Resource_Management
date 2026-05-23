import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMotorAction } from "@/lib/actions/motors";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EditMotorPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const motor = await prisma.motor.findUnique({ where: { id: Number(id) } });
  if (!motor) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>编辑电机</h1>
          <p>只能修改基础档案信息；内部编码不会改变，避免标签和历史记录对不上。</p>
        </div>
        <Link className="button secondary" href={`/motors/${motor.id}`}>
          返回详情
        </Link>
      </div>

      <form className="panel form" action={updateMotorAction}>
        <input type="hidden" name="id" value={motor.id} />
        <div className="form-grid">
          <div className="field">
            <label htmlFor="motorCode">内部编码</label>
            <input id="motorCode" value={motor.motorCode} disabled />
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
            <label htmlFor="status">当前状态</label>
            <input id="status" value={motor.status} disabled />
          </div>
        </div>
        <div className="field">
          <label htmlFor="remark">备注</label>
          <textarea id="remark" name="remark" defaultValue={motor.remark ?? ""} />
        </div>
        <button className="button" type="submit">
          保存修改
        </button>
      </form>
    </>
  );
}
