import Link from "next/link";
import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  upload: "上传",
  download: "下载",
  update: "更新",
  archive: "归档",
  restore: "恢复",
  delete: "删除",
};

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.libraryAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.libraryAuditLog.count(),
  ]);

  // LibraryAuditLog 无外键关联，手动查询用户名
  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, username: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, a.username]));

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="workspace-page">
      <div className="page-head">
        <div>
          <Link href="/admin/library" className="muted">← 返回资料库管理</Link>
          <h1>审计日志</h1>
          <p>资料库所有操作的记录。日志不随资料删除而清除。</p>
        </div>
      </div>

      <section className="panel">
        {logs.length === 0 ? (
          <p className="muted empty-state">暂无审计日志。</p>
        ) : (
          <div className="table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作</th>
                  <th>文档 ID</th>
                  <th>操作人</th>
                  <th>详情</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="nowrap">{new Date(log.createdAt).toLocaleString("zh-CN")}</td>
                    <td>
                      <span className={`badge ${log.action === "delete" ? "warn" : ""}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td>{log.documentId}</td>
                    <td>{actorMap.get(log.actorId) ?? `用户#${log.actorId}`}</td>
                    <td>{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            {page > 1 ? (
              <Link className="button secondary compact" href={`/admin/library/audit?page=${page - 1}`}>
                上一页
              </Link>
            ) : <span />}
            <span className="muted">第 {page} / {totalPages} 页（共 {total} 条）</span>
            {page < totalPages ? (
              <Link className="button secondary compact" href={`/admin/library/audit?page=${page + 1}`}>
                下一页
              </Link>
            ) : <span />}
          </div>
        )}
      </section>
    </div>
  );
}
