import { describe, expect, it } from "vitest";
import { hashPasswordLegacy } from "./auth/index";

describe("auth password hashing", () => {
  it("produces a deterministic SHA-256 hash for legacy compatibility", () => {
    expect(hashPasswordLegacy("admin123")).toBe(
      "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"
    );
  });
});
