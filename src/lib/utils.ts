/** 规范化扫码输入：trim 空白字符 */
export function normalizeScannedCode(value: FormDataEntryValue | null | undefined): string {
  return String(value ?? "").trim();
}
