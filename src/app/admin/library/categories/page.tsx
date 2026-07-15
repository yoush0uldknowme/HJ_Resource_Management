import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "./category-manager";

export default async function CategoriesPage() {
  await requireAdmin();

  const categories = await prisma.libraryCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { documents: true } },
    },
  });

  const initialCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    documentCount: c._count.documents,
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>分类管理</h1>
          <p>创建、编辑和删除资料分类。</p>
        </div>
      </div>
      <CategoryManager initialCategories={initialCategories} />
    </>
  );
}
