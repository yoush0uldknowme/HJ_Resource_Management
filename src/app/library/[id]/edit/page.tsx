import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { EditForm } from "./edit-form";

export default async function EditLibraryPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [doc, categories] = await Promise.all([
    prisma.libraryDocument.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
    }),
    prisma.libraryCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!doc) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>编辑资料</h1>
          <p>{doc.originalFileName}</p>
        </div>
      </div>
      <EditForm
        doc={{
          id: doc.id,
          title: doc.title,
          description: doc.description ?? "",
          categoryId: doc.categoryId,
          visibility: doc.visibility as "all_members" | "admins_only",
          status: doc.status as "active" | "archived",
          tags: doc.tags.map((t) => t.tag.name),
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </>
  );
}
