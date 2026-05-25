export function ScanCodeField({
  placeholder = "扫描或输入电机编码",
  defaultValue
}: {
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="scan-field">
      <label htmlFor="scannedCode">电机编码</label>
      <input
        id="scannedCode"
        name="scannedCode"
        required
        autoFocus
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
      <p className="muted">当前 demo 保留手动输入；接入摄像头扫码后仍复用这个编码输入。</p>
    </div>
  );
}
