import { describe, expect, it } from "vitest";
import { motorStatusLabel, transactionLabel } from "./motor/status";

describe("motorStatusLabel", () => {
  it("returns Chinese labels for known statuses", () => {
    expect(motorStatusLabel("draft")).toBe("待入库");
    expect(motorStatusLabel("in_stock")).toBe("在库");
    expect(motorStatusLabel("checked_out")).toBe("已领用");
  });

  it("returns original string for unknown status", () => {
    expect(motorStatusLabel("unknown")).toBe("unknown");
    expect(motorStatusLabel("")).toBe("");
  });
});

describe("transactionLabel", () => {
  it("returns Chinese labels for known transaction types", () => {
    expect(transactionLabel("create")).toBe("建档");
    expect(transactionLabel("inbound")).toBe("入库");
    expect(transactionLabel("outbound")).toBe("出库");
    expect(transactionLabel("status_change")).toBe("状态变更");
  });

  it("returns original string for unknown type", () => {
    expect(transactionLabel("repair")).toBe("repair");
  });
});
