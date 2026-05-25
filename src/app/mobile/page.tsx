import Link from "next/link";
import { requireMotorOperator } from "@/lib/auth";

export default async function MobileHomePage() {
  await requireMotorOperator();

  return (
    <main className="mobile-shell">
      <h1>现场扫码</h1>
      <p className="muted">用于手机端查询、入库和出库。摄像头扫码不可用时，可以手动输入编码。</p>
      <div className="mobile-actions">
        <Link className="button" href="/mobile/motors">
          电机列表
        </Link>
        <Link className="button" href="/mobile/scan">
          扫码查询
        </Link>
        <Link className="button" href="/mobile/inbound">
          扫码入库
        </Link>
        <Link className="button" href="/mobile/outbound">
          扫码出库
        </Link>
      </div>
    </main>
  );
}
