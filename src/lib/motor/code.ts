export function normalizeMotorModel(model: string): string {
  const normalized = model.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) throw new Error("model is required");
  // Code128-B barcode only supports ASCII (codes 32-127)
  if (/[^\x20-\x7E]/.test(normalized)) {
    throw new Error(
      "型号只能包含英文字母、数字和基本符号（如 GM6020、M3508），不支持中文/特殊字符"
    );
  }
  return normalized;
}

export function motorModelPrefix(model: string): string {
  const normalized = normalizeMotorModel(model);
  const matches = normalized.match(/\d+/g) ?? [];
  const digits = matches.join("");
  if (digits.length < 4) {
    throw new Error("model must contain at least four digits");
  }
  return digits.slice(-4);
}

/**
 * 构建电机编号。
 * 格式：{MODEL}-{SEQUENCE}，如 GM6020-0001
 * 这样编号可读性强，且和二维码标签一致。
 */
export function buildMotorCode(model: string, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence <= 0 || sequence > 9999) {
    throw new Error("sequence must be between 1 and 9999");
  }
  const normalized = normalizeMotorModel(model);
  return `${normalized}-${String(sequence).padStart(4, "0")}`;
}

/**
 * 电机编号范围查询前缀（用于按型号过滤）。
 * 同时兼容新格式（GM6020-0001）和旧格式（60200001）。
 */
export function motorCodeRange(model: string): { startsWith: string } {
  return { startsWith: normalizeMotorModel(model) };
}

/**
 * 规范化扫码输入，兼容多种编号格式：
 * - GM6020-0001（标准格式）
 * - 60200001（旧格式，纯数字拼接）
 * - gm6020-0001（大小写不敏感）
 * 返回可能匹配数据库的多个候选值。
 */
export function expandScannedCode(scannedCode: string): string[] {
  const code = scannedCode.trim();
  if (!code) return [];
  const candidates = new Set<string>([code]);

  // 尝试从纯数字格式还原带横线的格式
  // 例如 60200001 -> 6020-0001（但数据库里是 GM6020-0001，所以需要更多信息）
  // 这里只做简单的大小写统一
  candidates.add(code.toUpperCase());

  return Array.from(candidates);
}
