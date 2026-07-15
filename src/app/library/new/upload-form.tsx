"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Category {
  id: number;
  name: string;
}

export function UploadForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      setError("请选择文件");
      return;
    }

    // 添加标签（逗号分隔转多条）
    formData.delete("tagInput");
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    tagList.forEach((tag) => formData.append("tags", tag));

    setUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) {
        setProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.ok) {
          router.push(`/library/${res.documentId}`);
        } else {
          setError(res.message || "上传失败");
        }
      } catch {
        setError("服务器返回异常");
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setError("网络错误，上传失败");
    });

    xhr.open("POST", "/api/library/upload");
    xhr.send(formData);
  };

  const handleCancel = () => {
    xhrRef.current?.abort();
    setUploading(false);
    setProgress(0);
  };

  if (categories.length === 0) {
    return (
      <div className="panel">
        <p className="muted empty-state">
          还没有分类。上传资料前需要先创建分类。
        </p>
        <Link className="button secondary" href="/admin/library/categories">
          去创建分类
        </Link>
      </div>
    );
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="file">选择文件</label>
          <input id="file" name="file" type="file" required disabled={uploading} />
          <small className="muted">支持 PDF、Word、Excel、PPT、TXT、Markdown 等文档，最大 200 MiB</small>
        </div>
        <div className="field">
          <label htmlFor="title">标题</label>
          <input id="title" name="title" required placeholder="资料标题" disabled={uploading} />
        </div>
        <div className="field">
          <label htmlFor="categoryId">分类</label>
          <select id="categoryId" name="categoryId" required disabled={uploading}>
            <option value="">请选择分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="visibility">可见范围</label>
          <select id="visibility" name="visibility" required disabled={uploading} defaultValue="all_members">
            <option value="all_members">全体成员可见</option>
            <option value="admins_only">仅管理员可见</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">说明（可选）</label>
        <textarea id="description" name="description" rows={3} disabled={uploading} />
      </div>
      <div className="field">
        <label htmlFor="tagInput">标签（可选，逗号分隔）</label>
        <input
          id="tagInput"
          name="tagInput"
          placeholder="例如：培训, 2024赛季, 入门"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={uploading}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="muted">{progress}%</span>
          <button type="button" className="button secondary compact" onClick={handleCancel}>
            取消上传
          </button>
        </div>
      )}

      <div className="row-actions">
        <button className="button" type="submit" disabled={uploading}>
          {uploading ? "上传中..." : "上传"}
        </button>
        <Link className="button secondary" href="/library">返回</Link>
      </div>
    </form>
  );
}
