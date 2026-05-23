import { describe, expect, it } from "vitest";
import { buildMotorCode, motorCodeRange } from "./motor-code";

describe("buildMotorCode", () => {
  it("builds MODEL-XXXX codes with a four digit sequence", () => {
    expect(buildMotorCode("GM6020", 1)).toBe("GM6020-0001");
    expect(buildMotorCode("M3508", 42)).toBe("M3508-0042");
  });

  it("rejects non-positive sequences", () => {
    expect(() => buildMotorCode("GM6020", 0)).toThrow("sequence must be positive");
  });

  it("rejects blank models", () => {
    expect(() => buildMotorCode("   ", 1)).toThrow("model is required");
  });

  it("uses each model as its own sequence range", () => {
    expect(motorCodeRange("GM6020")).toEqual({ startsWith: "GM6020-" });
    expect(motorCodeRange("M3508")).toEqual({ startsWith: "M3508-" });
  });
});
