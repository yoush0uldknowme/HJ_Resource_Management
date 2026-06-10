export function ScanCodeField({
  placeholder = "输入八位电机编号",
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
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
      <p className="muted">输入电机上的八位数字编号，例如 60200001。</p>
    </div>
  );
}
