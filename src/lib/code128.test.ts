import { describe, expect, it } from "vitest";
import { code128Values, renderCode128Svg } from "./code128";

describe("code128", () => {
  it("encodes Code128-B values with checksum and stop code", () => {
    expect(code128Values("GM6020-0001")).toEqual([
      104, 39, 45, 22, 16, 18, 16, 13, 16, 16, 16, 17, 23, 106
    ]);
  });

  it("renders an SVG barcode", () => {
    const svg = renderCode128Svg("GM6020-0001");

    expect(svg).toContain("<svg");
    expect(svg).toContain("<rect");
    expect(svg).toContain("GM6020-0001");
  });
});
