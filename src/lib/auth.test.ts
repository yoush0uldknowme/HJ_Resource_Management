import { describe, expect, it } from "vitest";
import { canManageMotors } from "./auth";

describe("auth role helpers", () => {
  it("allows only admin users to manage motors", () => {
    expect(canManageMotors({ role: "admin" })).toBe(true);
    expect(canManageMotors({ role: "viewer" })).toBe(false);
    expect(canManageMotors(null)).toBe(false);
  });
});
