"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DocData {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  visibility: "all_members" | "admins_only";
  status: "active" | "archived";
  tags: string[];
}

interface Category {
  id: number;
  name: string;
}

export function EditForm({ doc, categories }: { doc: DocData; categories: Category[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState(doc.tags.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      const res = await fetch(`/api/library/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          categoryId: parseInt(formData.get("categoryId") as string, 10),
          visibility: formData.get("visibility"),
          tags: tagList,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/library/${doc.id}`);
        router.refresh();
      } else {
        setError(data.message || "保存失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: doc.status === "active" ? "archived" : "active" }),
      });
      const data = await res.json();
      if (data.ok) {
        router.refresh();
      } else {
        setError(data.message || "操作失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/documents/${doc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        router.push("/library");
        router.refresh();
      } else {
        setError(data.message || "删除失败");
        setConfirmDelete(false);
      }
    } catch {
      setError("网络错误");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form className="panel form" onSubmit={handleSave}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="title">标题</label>
          <input id="title" name="title" required defaultValue={doc.title} disabled={saving} />
        </div>
        <div className="field">
          <label htmlFor="categoryId">分类</label>
          <select id="categoryId" name="categoryId" required defaultValue={doc.categoryId} disabled={saving}>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="visibility">可见范围</label>
          <select id="visibility" name="visibility" required defaultValue={doc.visibility} disabled={saving}>
            <option value="all_members">全体成员可见</option>
            <option value="admins_only">仅管理员可见</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">说明</label>
        <textarea id="description" name="description" rows={3} defaultValue={doc.description} disabled={saving} />
      </div>
      <div className="field">
        <label htmlFor="tagInput">标签（逗号分隔）</label>
        <input
          id="tagInput"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={saving}
          placeholder="例如：培训, 2024赛季"
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="row-actions">
        <button className="button" type="submit" disabled={saving || deleting}>
          {saving ? "保存中..." : "保存修改"}
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={handleArchive}
          disabled={saving || deleting}
        >
          {doc.status === "active" ? "归档" : "恢复"}
        </button>
        <Link className="button secondary" href={`/library/${doc.id}`}>返回</Link>
      </div>

      <div className="danger-zone">
        <button
          type="button"
          className="button danger"
          onClick={handleDelete}
          disabled={saving || deleting}
        >
          {deleting ? "删除中..." : confirmDelete ? "确认删除？再次点击执行" : "删除资料"}
        </button>
      </div>
    </form>
  );
}
