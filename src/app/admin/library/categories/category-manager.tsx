"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  documentCount: number;
}

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSort, setEditSort] = useState(0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/library/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewName("");
        setNewDesc("");
        router.refresh();
        // 重新获取列表
        const listRes = await fetch("/api/library/categories");
        const listData = await listRes.json();
        if (listData.ok) {
          setCategories(listData.categories.map((c: Category & { _count?: { documents: number } }) => ({
            id: c.id,
            name: c.name,
            description: c.description ?? "",
            sortOrder: c.sortOrder,
            isActive: c.isActive,
            documentCount: c._count?.documents ?? 0,
          })));
        }
      } else {
        setError(data.message || "创建失败");
      }
    } catch {
      setError("网络错误");
    }
  };

  const handleUpdate = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/library/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          sortOrder: editSort,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setEditing(null);
        router.refresh();
        // 更新本地状态
        setCategories((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, name: editName, description: editDesc, sortOrder: editSort }
              : c
          )
        );
      } else {
        setError(data.message || "更新失败");
      }
    } catch {
      setError("网络错误");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确认删除分类「${name}」？`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/library/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        router.refresh();
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        setError(data.message || "删除失败");
      }
    } catch {
      setError("网络错误");
    }
  };

  const startEdit = (cat: Category) => {
    setEditing(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description);
    setEditSort(cat.sortOrder);
  };

  return (
    <div className="panel">
      {/* 创建表单 */}
      <form className="form-grid" onSubmit={handleCreate}>
        <div className="field">
          <label htmlFor="newName">分类名称</label>
          <input
            id="newName"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例如：团队制度"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="newDesc">说明（可选）</label>
          <input
            id="newDesc"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="分类说明"
          />
        </div>
        <div className="field">
          <button className="button" type="submit">添加分类</button>
        </div>
      </form>

      {error && <p className="error-text">{error}</p>}

      {/* 分类列表 */}
      <div className="library-list">
        {categories.length === 0 ? (
          <p className="muted empty-state">还没有分类，请在上方创建。</p>
        ) : (
          categories.map((cat) => (
            <article className="library-item" key={cat.id}>
              {editing === cat.id ? (
                <div className="library-item-main">
                  <div className="form-grid">
                    <div className="field">
                      <label>名称</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>说明</label>
                      <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>排序</label>
                      <input
                        type="number"
                        value={editSort}
                        onChange={(e) => setEditSort(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  </div>
                  <div className="row-actions">
                    <button className="button compact" onClick={() => handleUpdate(cat.id)}>保存</button>
                    <button className="button secondary compact" onClick={() => setEditing(null)}>取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="library-item-main">
                    <strong>{cat.name}</strong>
                    <div className="library-item-meta">
                      <span className="muted">{cat.documentCount} 个文档</span>
                      <span className="muted">排序: {cat.sortOrder}</span>
                      {!cat.isActive && <span className="badge warn">已停用</span>}
                    </div>
                    {cat.description && <p className="muted">{cat.description}</p>}
                  </div>
                  <div className="row-actions">
                    <button className="button secondary compact" onClick={() => startEdit(cat)}>编辑</button>
                    <button
                      className="button secondary compact"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={cat.documentCount > 0}
                      title={cat.documentCount > 0 ? "分类下有文档，无法删除" : ""}
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
