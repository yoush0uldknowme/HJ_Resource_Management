import { describe, expect, it } from "vitest";
import { buildMotorCode, motorCodeRange, motorModelPrefix, expandScannedCode, normalizeMotorModel } from "./motor/code";

describe("model-prefixed motor codes", () => {
  it("uses normalized model followed by a four digit sequence", () => {
    expect(buildMotorCode("GM6020", 1)).toBe("GM6020-0001");
    expect(buildMotorCode("m3508", 42)).toBe("M3508-0042");
  });

  it("keeps the model prefix for range lookups", () => {
    expect(motorModelPrefix("DJI-GM6020")).toBe("6020");
    expect(motorCodeRange("M2006")).toEqual({ startsWith: "M2006" });
  });

  it("rejects empty models and invalid sequences", () => {
    expect(() => buildMotorCode(" ", 1)).toThrow("model is required");
    expect(() => buildMotorCode("GM6020", 0)).toThrow("sequence must be between 1 and 9999");
    expect(() => buildMotorCode("GM6020", 10000)).toThrow("sequence must be between 1 and 9999");
  });

  it("builds sequential codes", () => {
    expect(buildMotorCode("GM6020", 1)).toBe("GM6020-0001");
    expect(buildMotorCode("GM6020", 10)).toBe("GM6020-0010");
    expect(buildMotorCode("GM6020", 9999)).toBe("GM6020-9999");
  });
});

describe("normalizeMotorModel", () => {
  it("strips spaces and uppercases", () => {
    expect(normalizeMotorModel("gm 6020")).toBe("GM6020");
    expect(normalizeMotorModel("  m3508 ")).toBe("M3508");
  });

  it("rejects empty model", () => {
    expect(() => normalizeMotorModel("")).toThrow("model is required");
    expect(() => normalizeMotorModel("   ")).toThrow("model is required");
  });
});

describe("expandScannedCode", () => {
  it("returns empty for empty input", () => {
    expect(expandScannedCode("")).toEqual([]);
    expect(expandScannedCode("   ")).toEqual([]);
  });

  it("returns original and uppercase candidates", () => {
    const result = expandScannedCode("gm6020-0001");
    expect(result).toContain("gm6020-0001");
    expect(result).toContain("GM6020-0001");
  });
});
