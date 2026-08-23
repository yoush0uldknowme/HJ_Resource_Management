import Busboy from "busboy";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";

export interface ParsedMultipartFile {
  fieldname: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ParsedMultipart {
  fields: Record<string, string[]>;
  files: ParsedMultipartFile[];
}

/**
 * 使用 busboy 解析 multipart/form-data。
 *
 * 背景：Next.js App Router 的 `request.formData()` 在文件名含非 ASCII 字符
 * （如中文）或包体较大时可能解析失败，返回 "Failed to parse body as FormData"。
 * 该 helper 绕过原生解析，直接用 busboy 处理流，兼容中文文件名与大文件。
 */
export async function parseMultipart(
  request: NextRequest,
  options: { maxFileSize?: number; maxFiles?: number } = {}
): Promise<ParsedMultipart> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Error("请求格式错误，需要 multipart/form-data");
  }

  const maxFileSize = options.maxFileSize ?? 200 * 1024 * 1024; // 默认 200 MiB
  const maxFiles = options.maxFiles ?? 10;

  // 把 Web Request 的 ArrayBuffer 转成 Node Readable 流供 busboy 消费
  const arrayBuffer = await request.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const stream = Readable.from(buffer);

  return new Promise((resolve, reject) => {
    const fields: Record<string, string[]> = {};
    const files: ParsedMultipartFile[] = [];
    let rejected = false;

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: maxFileSize, files: maxFiles },
    });

    busboy.on("file", (fieldname, file, info) => {
      const chunks: Buffer[] = [];

      file.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        files.push({
          fieldname,
          filename: info.filename,
          mimetype: info.mimeType,
          buffer: Buffer.concat(chunks),
          size: chunks.reduce((sum, c) => sum + c.length, 0),
        });
      });

      file.on("limit", () => {
        if (!rejected) {
          rejected = true;
          reject(new Error(`单个文件超过 ${formatBytes(maxFileSize)} 限制`));
        }
      });
    });

    busboy.on("field", (fieldname, value) => {
      if (!fields[fieldname]) fields[fieldname] = [];
      fields[fieldname].push(value);
    });

    busboy.on("finish", () => {
      resolve({ fields, files });
    });

    busboy.on("error", (err) => {
      reject(err);
    });

    stream.pipe(busboy);
  });
}

/**
 * 从 buffer 构建一个标准 File 对象，供现有上传服务使用。
 */
export function createFileFromBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): File {
  // 显式转成 Uint8Array，避免某些环境对 Buffer 直接作为 BlobPart 的兼容性问题
  return new File([new Uint8Array(buffer)], filename, { type: mimeType });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
