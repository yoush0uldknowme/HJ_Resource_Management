import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMotorOperator } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { motorStatusLabel } from "@/lib/status";

export default async function MobileMotorDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMotorOperator();
  const { id } = await params;
  const motor = await prisma.motor.findUnique({
    where: { id: Number(id) },
    include: {
      photos: {
        orderBy: { uploadedAt: "desc" },
        take: 3
      }
    }
  });

  if (!motor) notFound();

  return (
    <main className="mobile-shell">
      <div className="page-head mobile-page-head">
        <div>
          <h1>{motor.motorCode}</h1>
          <p>
            {motor.name} / {motor.model}
          </p>
        </div>
      </div>

      <section className="panel mobile-detail-panel">
        <div className="mobile-motor-meta">
          <span className={`badge ${motor.status === "draft" ? "warn" : ""}`}>
            {motorStatusLabel(motor.status)}
          </span>
          <span>{motor.currentLocation ?? "-"}</span>
        </div>
        <div className="kv">
          <strong>SN / 编码</strong>
          <span>{motor.snCode ?? motor.motorCode}</span>
        </div>
        <div className="kv">
          <strong>备注</strong>
          <span>{motor.remark ?? "-"}</span>
        </div>
      </section>

      {motor.photos.length ? (
        <section className="mobile-photo-list">
          {motor.photos.map((photo) => (
            <Image
              key={photo.id}
              src={photo.photoPath}
              alt={`${motor.motorCode} ${photo.photoType}`}
              width={360}
              height={270}
            />
          ))}
        </section>
      ) : null}

      <div className="mobile-actions">
        <Link
          className="button"
          href={`/mobile/inbound?code=${encodeURIComponent(motor.motorCode)}`}
        >
          入库
        </Link>
        <Link
          className="button"
          href={`/mobile/outbound?code=${encodeURIComponent(motor.motorCode)}`}
        >
          出库
        </Link>
        <Link className="button secondary" href="/mobile/motors">
          返回电机列表
        </Link>
      </div>
    </main>
  );
}
