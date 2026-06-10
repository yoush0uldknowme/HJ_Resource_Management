import { describe, expect, it } from "vitest";
import { canManageMotors, canOperateMotors, defaultLandingPath, sanitizeRedirectPath } from "./auth";

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

  it("routes admin users to admin and operators to user workspace", () => {
    expect(defaultLandingPath({ role: "admin" })).toBe("/admin");
    expect(defaultLandingPath({ role: "viewer" })).toBe("/user");
    expect(defaultLandingPath(null)).toBe("/user");
  });

  it("only accepts same-site redirect paths", () => {
    expect(sanitizeRedirectPath("/mobile")).toBe("/mobile");
    expect(sanitizeRedirectPath("/motors")).toBe("/motors");
    expect(sanitizeRedirectPath("/login")).toBeNull();
    expect(sanitizeRedirectPath("//evil.example")).toBeNull();
    expect(sanitizeRedirectPath("https://evil.example")).toBeNull();
    expect(sanitizeRedirectPath("")).toBeNull();
  });
});
