import Link from "next/link";
import Image from "next/image";
import { deleteMotorAction } from "@/lib/actions/motors";
import { canManageMotors, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { motorStatusLabel } from "@/lib/status";

export default async function MotorsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireCurrentUser();
  const canManage = canManageMotors(user);
  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status?.trim();

  const motors = await prisma.motor.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { motorCode: { contains: q } },
                { model: { contains: q } },
                { snCode: { contains: q } },
                { name: { contains: q } }
              ]
            }
          : {},
        status ? { status } : {}
      ]
    },
    include: {
      photos: {
        where: { photoType: "archive" },
        orderBy: { uploadedAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>电机列表</h1>
          <p>按编码、型号、SN、名称和状态查找当前电机。</p>
        </div>
        {canManage ? (
          <Link className="button" href="/motors/new">
            新建电机
          </Link>
        ) : null}
      </div>

      <form className="toolbar">
        <input name="q" placeholder="编码 / 型号 / SN / 名称" defaultValue={q} />
        <select name="status" defaultValue={status ?? ""}>
          <option value="">全部状态</option>
          <option value="draft">待入库</option>
          <option value="in_stock">在库</option>
          <option value="checked_out">已领用</option>
        </select>
        <button className="button secondary" type="submit">
          查询
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>内部编码</th>
              <th>照片</th>
              <th>名称</th>
              <th>型号</th>
              <th>SN</th>
              <th>状态</th>
              <th>库位 / 去向</th>
              <th>最近更新</th>
              {canManage ? <th>管理</th> : null}
            </tr>
          </thead>
          <tbody>
            {motors.map((motor) => (
              <tr key={motor.id}>
                <td>
                  <Link href={`/motors/${motor.id}`}>{motor.motorCode}</Link>
                </td>
                <td>
                  {motor.photos[0] ? (
                    <Image
                      src={motor.photos[0].photoPath}
                      alt={motor.motorCode}
                      width={72}
                      height={54}
                      className="thumb"
                    />
                  ) : (
                    <span className="muted">无照片</span>
                  )}
                </td>
                <td>{motor.name}</td>
                <td>{motor.model}</td>
                <td>{motor.snCode ?? "-"}</td>
                <td>
                  <span className={`badge ${motor.status === "draft" ? "warn" : ""}`}>
                    {motorStatusLabel(motor.status)}
                  </span>
                </td>
                <td>{motor.currentLocation ?? "-"}</td>
                <td>{motor.updatedAt.toLocaleString("zh-CN")}</td>
                {canManage ? (
                  <td>
                    <div className="row-actions">
                      <Link className="button secondary compact" href={`/motors/${motor.id}/edit`}>
                        编辑
                      </Link>
                      <form action={deleteMotorAction}>
                        <input type="hidden" name="id" value={motor.id} />
                        <button className="button danger compact" type="submit">
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
