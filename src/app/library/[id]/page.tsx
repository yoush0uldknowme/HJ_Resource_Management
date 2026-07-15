import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, requireCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { formatBytes } from "@/lib/library/service";

export default async function LibraryDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCurrentUser();
  const admin = isAdmin(user);
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const doc = await prisma.libraryDocument.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      uploader: { select: { id: true, username: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  });

  if (!doc) notFound();
  // 权限校验
  if (doc.visibility === "admins_only" && !admin) notFound();
  if (doc.status === "archived" && !admin) notFound();

  return (
    <div className="workspace-page">
      <div className="page-head">
        <div>
          <Link href="/library" className="muted">← 返回资料库</Link>
          <h1>{doc.title}</h1>
          <p className="muted">{doc.originalFileName}</p>
        </div>
        <div className="toolbar">
          <a className="button" href={`/api/library/${doc.id}/download`}>下载文件</a>
          {admin && <Link className="button secondary" href={`/library/${doc.id}/edit`}>编辑</Link>}
        </div>
      </div>

      <section className="panel">
        <div className="detail-grid">
          <div className="field">
            <label>分类</label>
            <span>{doc.category.name}</span>
          </div>
          <div className="field">
            <label>文件类型</label>
            <span>{doc.fileExtension}</span>
          </div>
          <div className="field">
            <label>文件大小</label>
            <span>{formatBytes(doc.fileSize)}</span>
          </div>
          <div className="field">
            <label>上传人</label>
            <span>{doc.uploader.username}</span>
          </div>
          <div className="field">
            <label>上传时间</label>
            <span>{new Date(doc.createdAt).toLocaleString("zh-CN")}</span>
          </div>
          <div className="field">
            <label>可见范围</label>
            <span>{doc.visibility === "admins_only" ? "仅管理员" : "全体成员"}</span>
          </div>
          <div className="field">
            <label>状态</label>
            <span className={`badge ${doc.status === "archived" ? "warn" : ""}`}>
              {doc.status === "archived" ? "已归档" : "正常"}
            </span>
          </div>
          <div className="field">
            <label>SHA-256</label>
            <code className="sha256">{doc.sha256}</code>
          </div>
        </div>

        {doc.description && (
          <div className="field">
            <label>说明</label>
            <p>{doc.description}</p>
          </div>
        )}

        {doc.tags.length > 0 && (
          <div className="field">
            <label>标签</label>
            <div className="library-item-tags">
              {doc.tags.map((t) => (
                <span key={t.tag.id} className="tag-chip">{t.tag.name}</span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
