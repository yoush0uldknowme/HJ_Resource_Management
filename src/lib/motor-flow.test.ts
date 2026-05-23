import { describe, expect, it } from "vitest";
import { applyInbound, applyOutbound } from "./motor-flow";

describe("motor flow transitions", () => {
  it("moves a motor into stock and records an inbound transaction", () => {
    const result = applyInbound(
      { status: "draft", currentLocation: null },
      { operator: "admin" }
    );

    expect(result.motor).toEqual({ status: "in_stock", currentLocation: "在库" });
    expect(result.transaction).toMatchObject({
      transactionType: "inbound",
      operator: "admin",
      location: "在库",
      remark: "扫码直接入库"
    });
  });

  it("moves a motor out of stock and records an outbound transaction", () => {
    const result = applyOutbound(
      { status: "in_stock", currentLocation: "A-01" },
      { operator: "admin", issuedBy: "张三", vehicle: "英雄车" }
    );

    expect(result.motor).toEqual({ status: "checked_out", currentLocation: "英雄车" });
    expect(result.transaction).toMatchObject({
      transactionType: "outbound",
      operator: "admin",
      targetPerson: "张三",
      purpose: "英雄车",
      location: "英雄车"
    });
  });

  it("rejects outbound when the motor is not in stock", () => {
    expect(() =>
      applyOutbound(
        { status: "checked_out", currentLocation: "Lab 2" },
        { operator: "admin", issuedBy: "张三", vehicle: "英雄车" }
      )
    ).toThrow("只有在库电机可以出库");
  });
});
