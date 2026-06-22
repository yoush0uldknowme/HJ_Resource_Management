import { describe, expect, it } from "vitest";
import { buildMotorCode, motorCodeRange, motorModelPrefix } from "./motor/code";

describe("eight digit motor codes", () => {
  it("uses four model digits followed by a four digit sequence", () => {
    expect(buildMotorCode("GM6020", 1)).toBe("60200001");
    expect(buildMotorCode("M3508", 42)).toBe("35080042");
  });

  it("extracts the final four model digits", () => {
    expect(motorModelPrefix("DJI-GM6020")).toBe("6020");
    expect(motorCodeRange("M2006")).toEqual({ startsWith: "2006" });
  });

  it("rejects unsupported models and invalid sequences", () => {
    expect(() => buildMotorCode("GM", 1)).toThrow("model must contain at least four digits");
    expect(() => buildMotorCode("GM6020", 0)).toThrow("sequence must be between 1 and 9999");
  });
});
