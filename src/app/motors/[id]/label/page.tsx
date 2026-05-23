import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requireCurrentUser } from "@/lib/auth";
import { renderCode128Svg } from "@/lib/code128";
import { prisma } from "@/lib/db";

export default async function MotorLabelPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCurrentUser();
  const { id } = await params;
  const motor = await prisma.motor.findUnique({ where: { id: Number(id) } });
  if (!motor) notFound();

  const qr = await QRCode.toDataURL(motor.motorCode, { margin: 1, width: 220 });
  const code128Svg = renderCode128Svg(motor.motorCode);

  return (
    <>
      <div className="page-head print-hidden">
        <div>
          <h1>打印标签</h1>
          <p>打印或复制编码到本地打标软件，标签内容为内部编码。</p>
        </div>
        <div className="toolbar">
          <Link className="button secondary" href={`/motors/${motor.id}`}>
            返回详情
          </Link>
          <PrintButton />
        </div>
      </div>

      <section className="label-sheet">
        <div className="print-label">
          <div className="label-title">{motor.model}</div>
          <div className="label-code">{motor.motorCode}</div>
          <Image src={qr} alt={`${motor.motorCode} QR`} width={130} height={130} unoptimized />
          <div className="barcode-preview" dangerouslySetInnerHTML={{ __html: code128Svg }} />
        </div>
      </section>
    </>
  );
}
