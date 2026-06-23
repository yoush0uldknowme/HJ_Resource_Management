export function ScanCodeField({
  placeholder = "输入电机编号（如 GM6020-0001）",
  defaultValue
}: {
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="scan-field">
      <label htmlFor="scannedCode">电机编号</label>
      <input
        id="scannedCode"
        name="scannedCode"
        required
        autoComplete="off"
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
      <p className="muted">输入电机编号，格式如 GM6020-0001。</p>
    </div>
  );
}
