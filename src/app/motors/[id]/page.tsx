import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { canManageMotors, canOperateMotors, requireCurrentUser } from "@/lib/auth";
import { renderCode128Svg } from "@/lib/code128";
import { prisma } from "@/lib/db";
import { motorStatusLabel, transactionLabel } from "@/lib/status";

export default async function MotorDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCurrentUser();
  const canManage = canManageMotors(user);
  const canOperate = canOperateMotors(user);
  const { id } = await params;
  const motor = await prisma.motor.findUnique({
    where: { id: Number(id) },
    include: {
      photos: { orderBy: { uploadedAt: "desc" } },
      transactions: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!motor) notFound();

  const qr = await QRCode.toDataURL(motor.motorCode, { margin: 1, width: 220 });
  const code128Svg = renderCode128Svg(motor.motorCode);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{motor.motorCode}</h1>
          <p>
            {motor.name} / {motor.model}
          </p>
        </div>
        <div className="toolbar">
          <CopyButton value={motor.motorCode} />
          {canManage ? (
            <Link className="button secondary" href={`/motors/${motor.id}/label`}>
              打印标签
            </Link>
          ) : null}
          {canManage ? (
            <Link className="button secondary" href={`/motors/${motor.id}/edit`}>
              编辑
            </Link>
          ) : null}
          {canOperate ? (
            <Link className="button secondary" href="/motors/inbound">
              入库
            </Link>
          ) : null}
          {canOperate ? (
            <Link className="button secondary" href="/motors/outbound">
              出库
            </Link>
          ) : null}
        </div>
      </div>

      <section className="detail-grid">
        <div className="panel">
          <h2>基础信息</h2>
          <div className="kv">
            <strong>状态</strong>
            <span className="badge">{motorStatusLabel(motor.status)}</span>
          </div>
          <div className="kv">
            <strong>库位 / 去向</strong>
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
        </div>

        <div className="panel">
          <h2>标签码</h2>
          <div className="label-preview">
            <Image src={qr} alt={`${motor.motorCode} QR`} width={160} height={160} unoptimized />
            <div className="barcode-preview" dangerouslySetInnerHTML={{ __html: code128Svg }} />
          </div>
          <p className="muted">
            当前可以复制编码到本地打标软件按 Code128 打印；二维码作为后续小尺寸标签方案预留。
          </p>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>照片</h2>
        {motor.photos.length ? (
          <div className="photos">
            {motor.photos.map((photo) => (
              <Image
                key={photo.id}
                src={photo.photoPath}
                alt={`${motor.motorCode} ${photo.photoType}`}
                width={320}
                height={240}
              />
            ))}
          </div>
        ) : (
          <p className="muted">还没有上传照片。</p>
        )}
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <h2>流转记录</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>动作</th>
                <th>操作人</th>
                <th>出库人</th>
                <th>车辆 / 状态</th>
                <th>用途</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {motor.transactions.map((item) => (
                <tr key={item.id}>
                  <td>{item.createdAt.toLocaleString("zh-CN")}</td>
                  <td>{transactionLabel(item.transactionType)}</td>
                  <td>{item.operator}</td>
                  <td>{item.targetPerson ?? "-"}</td>
                  <td>{item.location ?? "-"}</td>
                  <td>{item.purpose ?? "-"}</td>
                  <td>{item.remark ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
