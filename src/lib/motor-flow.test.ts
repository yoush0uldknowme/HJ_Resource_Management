import { describe, expect, it } from "vitest";
import { applyInbound, applyOutbound } from "./motor/flow";

describe("motor flow transitions", () => {
  it("moves a motor into stock from checked_out and records an inbound transaction", () => {
    const result = applyInbound(
      { status: "checked_out", currentLocation: "英雄车" },
      { operator: "admin" }
    );

    expect(result.motor).toEqual({ status: "in_stock", currentLocation: "在库" });
    expect(result.transaction).toMatchObject({
      transactionType: "inbound",
      operator: "admin",
      location: "在库",
      remark: "编号确认入库"
    });
  });

  it("rejects inbound when motor is not in allowed status", () => {
    expect(() =>
      applyInbound(
        { status: "retired", currentLocation: null },
        { operator: "admin" }
      )
    ).toThrow("不允许入库");
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

  it("allows inbound from draft status (建档后首次入库)", () => {
    const result = applyInbound(
      { status: "draft", currentLocation: null },
      { operator: "admin" }
    );
    expect(result.motor).toEqual({ status: "in_stock", currentLocation: "在库" });
    expect(result.transaction.transactionType).toBe("inbound");
  });

  it("rejects inbound from in_stock (已在库)", () => {
    expect(() =>
      applyInbound(
        { status: "in_stock", currentLocation: "A-01" },
        { operator: "admin" }
      )
    ).toThrow("不允许入库");
  });

  it("outbound records targetPerson and vehicle in transaction", () => {
    const result = applyOutbound(
      { status: "in_stock", currentLocation: "A-01" },
      { operator: "admin", issuedBy: "李四", vehicle: "步兵2号", remark: "测试出库" }
    );
    expect(result.motor.currentLocation).toBe("步兵2号");
    expect(result.transaction.targetPerson).toBe("李四");
    expect(result.transaction.purpose).toBe("步兵2号");
    expect(result.transaction.remark).toBe("测试出库");
  });
});
