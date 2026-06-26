import Link from "next/link";
import { DeleteLogButton, ClearLogsButton } from "@/components/delete-log-buttons";
import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { transactionLabel } from "@/lib/motor/status";

export default async function LogsPage() {
  await requireAdmin();
  const logs = await prisma.motorTransaction.findMany({
    where: { deleted: false },
    include: { motor: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="logs-page">
      <div className="page-head">
        <div>
          <h1>操作记录</h1>
          <p>记录建档、入库和出库操作。删除日志需要二级密码验证。</p>
        </div>
        {logs.length ? (
          <ClearLogsButton />
        ) : null}
      </div>

      <div className="table-wrap logs-table">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>动作</th>
              <th>电机</th>
              <th>操作人</th>
              <th>出库人</th>
              <th>车辆 / 状态</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt.toLocaleString("zh-CN")}</td>
                <td>{transactionLabel(log.transactionType)}</td>
                <td>
                  {log.motor ? (
                    <Link href={`/motors/${log.motor.id}`}>{log.motor.motorCode}</Link>
                  ) : (
                    <span className="text-gray-400">已删除</span>
                  )}
                </td>
                <td>{log.operator}</td>
                <td>{log.targetPerson ?? "-"}</td>
                <td>{log.location ?? "-"}</td>
                <td>{log.remark ?? "-"}</td>
                <td>
                  <DeleteLogButton
                    logId={log.id}
                    motorCode={log.motor ? log.motor.motorCode : "已删除"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 ? <p className="muted empty-state">暂无操作日志。</p> : null}
    </div>
  );
}
