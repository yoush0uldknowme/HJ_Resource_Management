import { createMotorAction } from "@/lib/motor/actions";
import { requireAdmin } from "@/lib/auth/index";

export default async function NewMotorPage() {
  await requireAdmin();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>新建电机</h1>
          <p>系统会按型号自动生成编号（如 GM6020-0001）。</p>
        </div>
      </div>
      <form className="panel form" action={createMotorAction} encType="multipart/form-data">
        <div className="form-grid">
          <div className="field"><label htmlFor="name">电机名称</label><input id="name" name="name" required placeholder="例如 GM6020 电机" /></div>
          <div className="field"><label htmlFor="model">型号</label><input id="model" name="model" required placeholder="例如 GM6020" /></div>
          <div className="field"><label htmlFor="photo">建档照片（可拍照）</label><input id="photo" name="photo" type="file" accept="image/*" capture="environment" /></div>
        </div>
        <div className="field"><label htmlFor="remark">备注</label><textarea id="remark" name="remark" /></div>
        <button className="button" type="submit">保存电机档案</button>
      </form>
    </>
  );
}
