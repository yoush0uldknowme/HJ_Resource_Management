import { describe, expect, it } from "vitest";
import {
  extractExtension,
  normalizeExtension,
  isAllowedExtension,
  getMimeType,
  generateStoredFileName,
  buildSafeStoragePath,
  resolveLibraryPath,
} from "./security";
import { getMaxFileSizeBytes, DEFAULT_MAX_FILE_SIZE_MB } from "./constants";

// ── 扩展名提取 ──

describe("extractExtension", () => {
  it("提取常见扩展名并转为小写含点", () => {
    expect(extractExtension("report.pdf")).toBe(".pdf");
    expect(extractExtension("data.XLSX")).toBe(".xlsx");
    expect(extractExtension("notes.MD")).toBe(".md");
  });

  it("无扩展名返回空字符串", () => {
    expect(extractExtension("README")).toBe("");
    expect(extractExtension("")).toBe("");
  });

  it("多级点号只取最后一段", () => {
    expect(extractExtension("backup.2024.final.docx")).toBe(".docx");
  });
});

// ── 扩展名标准化 ──

describe("normalizeExtension", () => {
  it("去掉前导点并转小写", () => {
    expect(normalizeExtension(".PDF")).toBe("pdf");
    expect(normalizeExtension("DocX")).toBe("docx");
    expect(normalizeExtension(".csv")).toBe("csv");
  });

  it("去除首尾空格", () => {
    expect(normalizeExtension("  .pdf  ")).toBe("pdf");
  });

  it("空输入返回空字符串", () => {
    expect(normalizeExtension("")).toBe("");
    expect(normalizeExtension(".")).toBe("");
  });
});

// ── 扩展名白名单校验 ──

describe("isAllowedExtension", () => {
  it("接受白名单内的文档类型", () => {
    expect(isAllowedExtension(".pdf")).toBe(true);
    expect(isAllowedExtension(".docx")).toBe(true);
    expect(isAllowedExtension(".xlsx")).toBe(true);
    expect(isAllowedExtension(".pptx")).toBe(true);
    expect(isAllowedExtension(".md")).toBe(true);
    expect(isAllowedExtension(".csv")).toBe(true);
    expect(isAllowedExtension(".odt")).toBe(true);
    expect(isAllowedExtension(".rtf")).toBe(true);
    expect(isAllowedExtension(".txt")).toBe(true);
  });

  it("拒绝白名单外的类型", () => {
    expect(isAllowedExtension(".exe")).toBe(false);
    expect(isAllowedExtension(".jpg")).toBe(false);
    expect(isAllowedExtension(".mp4")).toBe(false);
    expect(isAllowedExtension(".dwg")).toBe(false);
    expect(isAllowedExtension(".js")).toBe(false);
    expect(isAllowedExtension(".html")).toBe(false);
    expect(isAllowedExtension(".zip")).toBe(false);
  });

  it("大小写不敏感", () => {
    expect(isAllowedExtension("PDF")).toBe(true);
    expect(isAllowedExtension(".DOCX")).toBe(true);
    expect(isAllowedExtension(".Md")).toBe(true);
  });
});

// ── MIME 类型判定 ──

describe("getMimeType", () => {
  it("返回已知类型的正确 MIME", () => {
    expect(getMimeType(".pdf")).toBe("application/pdf");
    expect(getMimeType(".docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(getMimeType(".csv")).toBe("text/csv");
    expect(getMimeType(".md")).toBe("text/markdown");
    expect(getMimeType(".odt")).toBe(
      "application/vnd.oasis.opendocument.text"
    );
  });

  it("未知类型返回 octet-stream", () => {
    expect(getMimeType(".unknown")).toBe("application/octet-stream");
    expect(getMimeType(".exe")).toBe("application/octet-stream");
  });
});

// ── UUID 存储文件名生成 ──

describe("generateStoredFileName", () => {
  it("生成 UUID 格式文件名并保留扩展名", () => {
    const name = generateStoredFileName(".pdf");
    expect(name).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/
    );
  });

  it("扩展名统一转小写", () => {
    const name = generateStoredFileName(".PDF");
    expect(name.endsWith(".pdf")).toBe(true);
    expect(name.endsWith(".PDF")).toBe(false);
  });

  it("接受不带前导点的扩展名", () => {
    const name = generateStoredFileName("docx");
    expect(name.endsWith(".docx")).toBe(true);
  });

  it("两次生成结果不同", () => {
    const name1 = generateStoredFileName(".pdf");
    const name2 = generateStoredFileName(".pdf");
    expect(name1).not.toBe(name2);
  });
});

// ── 路径穿越防护 ──

describe("buildSafeStoragePath", () => {
  it("接受纯文件名", () => {
    expect(buildSafeStoragePath("abc-123.pdf")).toBe("abc-123.pdf");
    expect(
      buildSafeStoragePath("550e8400-e29b-41d4-a716-446655440000.docx")
    ).toBe("550e8400-e29b-41d4-a716-446655440000.docx");
  });

  it("拒绝正斜杠路径分隔符", () => {
    expect(() => buildSafeStoragePath("dir/file.pdf")).toThrow(
      "路径分隔符"
    );
  });

  it("拒绝反斜杠路径分隔符", () => {
    expect(() => buildSafeStoragePath("dir\\file.pdf")).toThrow(
      "路径分隔符"
    );
  });

  it("拒绝 .. 目录穿越", () => {
    expect(() => buildSafeStoragePath("../etc/passwd")).toThrow();
    expect(() => buildSafeStoragePath("..\\secret")).toThrow();
  });
});

describe("resolveLibraryPath", () => {
  it("将简单文件名解析到资料库目录内", () => {
    const resolved = resolveLibraryPath("test-file.pdf");
    expect(resolved).toContain("storage");
    expect(resolved).toContain("library");
    expect(resolved).toContain("test-file.pdf");
  });

  it("拒绝 ../ 路径穿越", () => {
    expect(() => resolveLibraryPath("../../etc/passwd")).toThrow(
      "路径穿越"
    );
  });

  it("拒绝 ..\\ 路径穿越", () => {
    expect(() =>
      resolveLibraryPath("..\\..\\Windows\\System32")
    ).toThrow("路径穿越");
  });

  it("拒绝绝对路径逃逸", () => {
    expect(() => resolveLibraryPath("/etc/passwd")).toThrow("路径穿越");
  });

  it("拒绝多层嵌套穿越", () => {
    expect(() =>
      resolveLibraryPath("subdir/../../../etc/passwd")
    ).toThrow("路径穿越");
  });
});

// ── 文件大小限制 ──

describe("getMaxFileSizeBytes", () => {
  it("默认返回 200 MiB 对应的字节数", () => {
    expect(DEFAULT_MAX_FILE_SIZE_MB).toBe(200);
    delete process.env.LIBRARY_MAX_FILE_SIZE_MB;
    expect(getMaxFileSizeBytes()).toBe(200 * 1024 * 1024);
  });

  it("尊重环境变量覆盖", () => {
    process.env.LIBRARY_MAX_FILE_SIZE_MB = "500";
    expect(getMaxFileSizeBytes()).toBe(500 * 1024 * 1024);
    delete process.env.LIBRARY_MAX_FILE_SIZE_MB;
  });

  it("无效环境变量回退到默认值", () => {
    process.env.LIBRARY_MAX_FILE_SIZE_MB = "abc";
    expect(getMaxFileSizeBytes()).toBe(DEFAULT_MAX_FILE_SIZE_MB * 1024 * 1024);
    delete process.env.LIBRARY_MAX_FILE_SIZE_MB;
  });
});
