import { describe, expect, it } from "vitest";
import { buildMotorCode, motorCodeRange, motorModelPrefix } from "./motor/code";

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
  });
});
