"use client";

export function PrintButton() {
  return (
    <button className="button" type="button" onClick={() => window.print()}>
      打印
    </button>
  );
}
