import { describe, expect, it } from "vitest";
import { canManageMotors, canOperateMotors } from "./auth";

describe("auth role helpers", () => {
  it("allows only admin users to manage motors", () => {
    expect(canManageMotors({ role: "admin" })).toBe(true);
    expect(canManageMotors({ role: "viewer" })).toBe(false);
    expect(canManageMotors(null)).toBe(false);
  });

  it("allows admin and viewer users to operate motor flows", () => {
    expect(canOperateMotors({ role: "admin" })).toBe(true);
    expect(canOperateMotors({ role: "viewer" })).toBe(true);
    expect(canOperateMotors({ role: "guest" })).toBe(false);
    expect(canOperateMotors(null)).toBe(false);
  });
});
