import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { transactionLabel } from "@/lib/status";

export default async function LogsPage() {
  await requireAdmin();
  const logs = await prisma.motorTransaction.findMany({
    include: { motor: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>操作记录</h1>
          <p>保留建档、入库、出库的操作人、时间、对象和备注。</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>动作</th>
              <th>对象</th>
              <th>操作人</th>
              <th>出库人</th>
              <th>车辆 / 状态</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt.toLocaleString("zh-CN")}</td>
                <td>{transactionLabel(log.transactionType)}</td>
                <td>
                  <Link href={`/motors/${log.motorId}`}>{log.motor.motorCode}</Link>
                </td>
                <td>{log.operator}</td>
                <td>{log.targetPerson ?? "-"}</td>
                <td>{log.location ?? "-"}</td>
                <td>{log.remark ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
