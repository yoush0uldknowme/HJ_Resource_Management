import { describe, it, expect } from "vitest";
import { generateSlug, ensureUniqueSlug } from "./slug";

describe("generateSlug", () => {
  it("将英文名称转为小写连字符 slug", () => {
    expect(generateSlug("Mechanical Design")).toBe("mechanical-design");
    expect(generateSlug("Team Rules")).toBe("team-rules");
  });

  it("处理连续空白和下划线", () => {
    expect(generateSlug("  multiple   spaces  ")).toBe("multiple-spaces");
    expect(generateSlug("under_score_test")).toBe("under-score-test");
    expect(generateSlug("mix   _ - space")).toBe("mix-space");
  });

  it("移除特殊字符", () => {
    expect(generateSlug("hello!@#$%world")).toBe("helloworld");
    expect(generateSlug("CAT-2024!!")).toBe("cat-2024");
  });

  it("纯中文名称回退到 cat- 前缀随机 slug", () => {
    const slug = generateSlug("团队制度");
    expect(slug).toMatch(/^cat-[a-f0-9]{6}$/);
  });

  it("混合中英文名称保留英文部分", () => {
    expect(generateSlug("CAD 机械设计")).toBe("cad");
    expect(generateSlug("2024赛季 资料库")).toBe("2024");
  });

  it("空字符串回退到随机 slug", () => {
    expect(generateSlug("")).toMatch(/^cat-[a-f0-9]{6}$/);
    expect(generateSlug("   ")).toMatch(/^cat-[a-f0-9]{6}$/);
  });

  it("单个字符回退到随机 slug", () => {
    expect(generateSlug("a")).toMatch(/^cat-[a-f0-9]{6}$/);
  });

  it("数字开头的 slug 保留", () => {
    expect(generateSlug("2024 Rules")).toBe("2024-rules");
  });
});

describe("ensureUniqueSlug", () => {
  it("slug 不存在时直接返回", async () => {
    const exists = async () => false;
    expect(await ensureUniqueSlug("test-slug", exists)).toBe("test-slug");
  });

  it("slug 已存在时追加 -2", async () => {
    const existing = new Set(["test-slug"]);
    const exists = async (s: string) => existing.has(s);
    expect(await ensureUniqueSlug("test-slug", exists)).toBe("test-slug-2");
  });

  it("多个冲突时递增后缀", async () => {
    const existing = new Set(["rules", "rules-2", "rules-3"]);
    const exists = async (s: string) => existing.has(s);
    expect(await ensureUniqueSlug("rules", exists)).toBe("rules-4");
  });
});
