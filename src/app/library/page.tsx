import Link from "next/link";
import { isAdmin, requireCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { formatBytes } from "@/lib/library/service";

export default async function LibraryPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; page?: string }>;
}) {
  const user = await requireCurrentUser();
  const admin = isAdmin(user);
  const params = await searchParams;
  const q = params.q?.trim();
  const categoryId = params.categoryId ? parseInt(params.categoryId, 10) : undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  // 权限过滤：非管理员只能看 all_members 的 active 文档
  const where: Record<string, unknown> = { status: "active" };
  if (!admin) where.visibility = "all_members";
  if (categoryId) where.categoryId = categoryId;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { originalFileName: { contains: q } },
    ];
  }

  const [documents, total, categories] = await Promise.all([
    prisma.libraryDocument.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        uploader: { select: { id: true, username: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
    }),
    prisma.libraryDocument.count({ where }),
    prisma.libraryCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const buildQuery = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoryId) sp.set("categoryId", String(categoryId));
    if (p > 1) sp.set("page", String(p));
    return sp.toString();
  };

  return (
    <div className="workspace-page">
      <section className="workspace-hero">
        <div>
          <span className="eyebrow">LIBRARY</span>
          <h1>资料库</h1>
          <p>团队资料文件的集中管理。支持文档上传、分类浏览和鉴权下载。</p>
        </div>
        <div className="workspace-actions">
          <Link className="button" href="/library/new">上传资料</Link>
        </div>
      </section>

      <form className="toolbar">
        <input name="q" placeholder="搜索标题 / 说明 / 文件名" defaultValue={q} />
        <select name="categoryId" defaultValue={categoryId ? String(categoryId) : ""}>
          <option value="">全部分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button className="button secondary" type="submit">查询</button>
        {admin && (
          <Link className="button secondary" href="/admin/library">资料库管理</Link>
        )}
      </form>

      <section className="panel">
        {documents.length === 0 ? (
          <p className="muted empty-state">
            {categories.length === 0
              ? "还没有分类。请先让管理员创建分类，然后就可以上传资料了。"
              : "没有找到符合条件的资料。"}
          </p>
        ) : (
          <div className="library-list">
            {documents.map((doc) => (
              <article className="library-item" key={doc.id}>
                <div className="library-item-main">
                  <Link href={`/library/${doc.id}`}>
                    <strong>{doc.title}</strong>
                  </Link>
                  {doc.description && <p className="muted">{doc.description}</p>}
                  <div className="library-item-meta">
                    <span className="badge">{doc.category.name}</span>
                    <span className="muted">{doc.fileExtension}</span>
                    <span className="muted">{formatBytes(doc.fileSize)}</span>
                    <span className="muted">{doc.uploader.username}</span>
                    <span className="muted">{new Date(doc.createdAt).toLocaleDateString("zh-CN")}</span>
                    {admin && doc.visibility === "admins_only" && (
                      <span className="badge warn">管理员可见</span>
                    )}
                  </div>
                  {doc.tags.length > 0 && (
                    <div className="library-item-tags">
                      {doc.tags.map((t) => (
                        <span key={t.tag.id} className="tag-chip">{t.tag.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <a
                  className="button secondary compact"
                  href={`/api/library/${doc.id}/download`}
                >
                  下载
                </a>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            {page > 1 ? (
              <Link className="button secondary compact" href={`/library?${buildQuery(page - 1)}`}>
                上一页
              </Link>
            ) : <span />}
            <span className="muted">第 {page} / {totalPages} 页（共 {total} 条）</span>
            {page < totalPages ? (
              <Link className="button secondary compact" href={`/library?${buildQuery(page + 1)}`}>
                下一页
              </Link>
            ) : <span />}
          </div>
        )}
      </section>
    </div>
  );
}
