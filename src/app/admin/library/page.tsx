import Link from "next/link";
import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { getDiskUsage } from "@/lib/library/security";
import { formatBytes } from "@/lib/library/service";

export default async function LibraryAdminPage() {
  await requireAdmin();

  const [totalDocs, activeDocs, archivedDocs, totalCategories, disk] = await Promise.all([
    prisma.libraryDocument.count(),
    prisma.libraryDocument.count({ where: { status: "active" } }),
    prisma.libraryDocument.count({ where: { status: "archived" } }),
    prisma.libraryCategory.count(),
    getDiskUsage().catch(() => null),
  ]);

  return (
    <div className="workspace-page">
      <section className="workspace-hero admin-workspace">
        <div>
          <span className="eyebrow">LIBRARY ADMIN</span>
          <h1>资料库管理</h1>
          <p>管理分类、查看审计日志和磁盘使用情况。</p>
        </div>
        <div className="workspace-actions">
          <Link className="button" href="/library">查看资料库</Link>
        </div>
      </section>

      <section className="dashboard-band">
        <div className="metric-tile accent"><span>资料总数</span><strong>{totalDocs}</strong><small>全部文档</small></div>
        <div className="metric-tile"><span>正常</span><strong>{activeDocs}</strong><small>可访问</small></div>
        <div className="metric-tile"><span>已归档</span><strong>{archivedDocs}</strong><small>不可访问</small></div>
        <div className="metric-tile"><span>分类数</span><strong>{totalCategories}</strong><small>已创建</small></div>
      </section>

      {disk && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>磁盘使用</h2>
              <p>资料库所在磁盘的存储情况。</p>
            </div>
          </div>
          <div className="dashboard-band">
            <div className="metric-tile"><span>总容量</span><strong>{formatBytes(disk.totalBytes)}</strong></div>
            <div className="metric-tile"><span>已用</span><strong>{formatBytes(disk.usedBytes)}</strong></div>
            <div className="metric-tile"><span>可用</span><strong>{formatBytes(disk.freeBytes)}</strong><small>{disk.freePercent.toFixed(1)}% 空闲</small></div>
          </div>
        </section>
      )}

      <section className="module-panel">
        <div className="section-head">
          <div><h2>管理功能</h2><p>从这里进入分类管理和审计日志。</p></div>
        </div>
        <div className="module-grid">
          <Link className="module-card" href="/admin/library/categories">
            <span>01</span><strong>分类管理</strong><small>创建、编辑、删除分类</small>
          </Link>
          <Link className="module-card" href="/admin/library/audit">
            <span>02</span><strong>审计日志</strong><small>查看上传、下载、删除记录</small>
          </Link>
        </div>
      </section>
    </div>
  );
}
