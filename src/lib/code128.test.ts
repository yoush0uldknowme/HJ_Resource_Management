import { describe, expect, it } from "vitest";
import { code128Values, renderCode128Svg } from "./code128";

describe("code128 rendering", () => {
  it("generates SVG for a valid code", () => {
    const svg = renderCode128Svg("60200001");
    expect(svg).toContain("<svg");
    expect(svg).toContain("60200001");
  });

  it("throws on empty input", () => {
    expect(() => code128Values("")).toThrow("barcode text is required");
  });
});
