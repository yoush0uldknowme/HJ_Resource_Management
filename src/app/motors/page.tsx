import Image from "next/image";
import Link from "next/link";
import { isAdmin, requireCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { motorStatusLabel } from "@/lib/motor/status";

export default async function MotorsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireCurrentUser();
  const admin = isAdmin(user);
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
    orderBy: [{ model: "asc" }, { motorCode: "asc" }]
  });

  const modelGroups = Array.from(
    motors.reduce((groups, motor) => {
      const list = groups.get(motor.model) ?? [];
      list.push(motor);
      groups.set(motor.model, list);
      return groups;
    }, new Map<string, typeof motors>())
  ).map(([model, items]) => ({
    model,
    items,
    inStock: items.filter((item) => item.status === "in_stock").length,
    checkedOut: items.filter((item) => item.status === "checked_out").length,
    draft: items.filter((item) => item.status === "draft").length
  }));

  const total = motors.length;
  const inStock = motors.filter((motor) => motor.status === "in_stock").length;
  const checkedOut = motors.filter((motor) => motor.status === "checked_out").length;

  return (
    <div className="motors-redesign">
      <section className="motors-hero">
        <div>
          <span className="eyebrow">MOTOR MODULE</span>
          <h1>电机型号库</h1>
          <p>按型号分组查看电机资源。点击型号卡片，筛选查看该型号下所有电机。</p>
        </div>
        <div className="motors-hero-stats">
          <span>
            <strong>{total}</strong>
            总数
          </span>
          <span>
            <strong>{inStock}</strong>
            在库
          </span>
          <span>
            <strong>{checkedOut}</strong>
            出库
          </span>
        </div>
      </section>

      <form className="toolbar motor-toolbar">
        <input name="q" placeholder="搜索编号 / 型号 / SN / 名称" defaultValue={q} />
        <select name="status" defaultValue={status ?? ""}>
          <option value="">全部状态</option>
          <option value="draft">待入库</option>
          <option value="in_stock">在库</option>
          <option value="checked_out">已领用</option>
        </select>
        <button className="button secondary" type="submit">
          查询
        </button>
        {admin ? (
          <Link className="button" href="/motors/new">
            新建电机
          </Link>
        ) : null}
      </form>

      <section className="model-grid">
        {modelGroups.map((group) => (
          <article className="model-card" key={group.model}>
            <Link
              href={`/motors?q=${encodeURIComponent(group.model)}`}
              className="model-card-visual"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              <div className="model-orbit" aria-hidden="true" />
              <div>
                <span className="eyebrow">MODEL</span>
                <h2>{group.model}</h2>
              </div>
              <strong>{group.items.length}</strong>
            </Link>
            <div className="model-metrics">
              <span>
                <strong>{group.inStock}</strong>
                在库
              </span>
              <span>
                <strong>{group.checkedOut}</strong>
                已领用
              </span>
              <span>
                <strong>{group.draft}</strong>
                待入库
              </span>
            </div>
            {/* 搜索结果时展开具体电机列表，否则只显示概览卡片 */}
            {q ? (
              <div className="model-motor-list">
                {group.items.map((motor) => (
                  <Link className="model-motor-row" href={`/motors/${motor.id}`} key={motor.id}>
                    {motor.photos[0] ? (
                      <Image
                        src={motor.photos[0].photoPath}
                        alt={motor.motorCode}
                        width={52}
                        height={52}
                        className="model-thumb"
                      />
                    ) : (
                      <div className="model-thumb placeholder">无图</div>
                    )}
                    <div>
                      <strong>{motor.motorCode}</strong>
                      <span>{motor.name}</span>
                    </div>
                    <span className={`badge ${motor.status === "draft" ? "warn" : ""}`}>
                      {motorStatusLabel(motor.status)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="row-actions">
              <Link className="button secondary compact" href={`/motors?q=${encodeURIComponent(group.model)}`}>
                {q ? "查看全部" : `查看 ${group.items.length} 台电机`}
              </Link>
              {admin ? (
                <Link className="button secondary compact" href="/motors/new">
                  新建
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      {motors.length === 0 ? <p className="muted empty-state">没有找到符合条件的电机。</p> : null}
    </div>
  );
}
