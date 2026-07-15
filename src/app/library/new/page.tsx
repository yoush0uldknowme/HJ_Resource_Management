import { redirect } from "next/navigation";
import { requireCurrentUser, isOperator } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { UploadForm } from "./upload-form";

export default async function NewLibraryPage() {
  const user = await requireCurrentUser();
  if (!isOperator(user)) {
    redirect("/library");
  }

  const categories = await prisma.libraryCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>上传资料</h1>
          <p>支持文档格式，单文件最大 200 MiB。</p>
        </div>
      </div>
      <UploadForm categories={categories} />
    </>
  );
}
