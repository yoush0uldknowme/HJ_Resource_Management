import { describe, expect, it } from "vitest";
import { decodeActionResult, encodeActionResult } from "./action-result";

describe("action result query helpers", () => {
  it("round trips success result fields", () => {
    const query = encodeActionResult({
      type: "success",
      title: "入库成功",
      message: "GM6020-0001 已入库",
      motorId: 1,
      motorCode: "GM6020-0001"
    });

    expect(decodeActionResult(new URLSearchParams(query))).toEqual({
      type: "success",
      title: "入库成功",
      message: "GM6020-0001 已入库",
      motorId: 1,
      motorCode: "GM6020-0001"
    });
  });

  it("returns null when no result type exists", () => {
    expect(decodeActionResult(new URLSearchParams())).toBeNull();
  });
});
