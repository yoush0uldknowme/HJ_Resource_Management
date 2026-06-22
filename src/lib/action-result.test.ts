import { describe, expect, it } from "vitest";
import { decodeActionResult, encodeActionResult } from "./result";

describe("action result query helpers", () => {
  it("round trips success result fields", () => {
    const query = encodeActionResult({
      type: "success",
      title: "入库成功",
      message: "60200001 已入库",
      motorId: 1,
      motorCode: "60200001"
    });

    expect(decodeActionResult(new URLSearchParams(query))).toEqual({
      type: "success",
      title: "入库成功",
      message: "60200001 已入库",
      motorId: 1,
      motorCode: "60200001"
    });
  });

  it("returns null when no result type exists", () => {
    expect(decodeActionResult(new URLSearchParams())).toBeNull();
  });
});
