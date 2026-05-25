import Image from "next/image";
import Link from "next/link";
import { requireMotorOperator } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { motorStatusLabel } from "@/lib/status";

export default async function MobileMotorsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireMotorOperator();
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
    <main className="mobile-shell">
      <div className="page-head mobile-page-head">
        <div>
          <h1>电机列表</h1>
          <p>按编码、型号、SN 或名称查找电机。</p>
        </div>
      </div>

      <form className="panel mobile-filter-form">
        <div className="field">
          <label htmlFor="q">搜索</label>
          <input id="q" name="q" placeholder="编码 / 型号 / SN / 名称" defaultValue={q} />
        </div>
        <div className="field">
          <label htmlFor="status">状态</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">全部状态</option>
            <option value="draft">待入库</option>
            <option value="in_stock">在库</option>
            <option value="checked_out">已领用</option>
          </select>
        </div>
        <button className="button" type="submit">
          查询
        </button>
      </form>

      <div className="mobile-list">
        {motors.length ? (
          motors.map((motor) => (
            <article className="mobile-motor-card" key={motor.id}>
              <div className="mobile-motor-card-main">
                {motor.photos[0] ? (
                  <Image
                    src={motor.photos[0].photoPath}
                    alt={motor.motorCode}
                    width={72}
                    height={72}
                    className="mobile-motor-thumb"
                  />
                ) : (
                  <div className="mobile-motor-thumb placeholder">无图</div>
                )}
                <div>
                  <strong>{motor.motorCode}</strong>
                  <span>{motor.name}</span>
                  <span>
                    {motor.model} / {motor.snCode ?? motor.motorCode}
                  </span>
                </div>
              </div>
              <div className="mobile-motor-meta">
                <span className={`badge ${motor.status === "draft" ? "warn" : ""}`}>
                  {motorStatusLabel(motor.status)}
                </span>
                <span>{motor.currentLocation ?? "-"}</span>
              </div>
              <div className="mobile-card-actions">
                <Link className="button secondary compact" href={`/mobile/motors/${motor.id}`}>
                  详情
                </Link>
                <Link
                  className="button secondary compact"
                  href={`/mobile/inbound?code=${encodeURIComponent(motor.motorCode)}`}
                >
                  入库
                </Link>
                <Link
                  className="button secondary compact"
                  href={`/mobile/outbound?code=${encodeURIComponent(motor.motorCode)}`}
                >
                  出库
                </Link>
              </div>
            </article>
          ))
        ) : (
          <section className="panel">
            <p className="muted">没有找到符合条件的电机。</p>
          </section>
        )}
      </div>

      <Link className="button secondary" href="/mobile">
        返回现场入口
      </Link>
    </main>
  );
}
