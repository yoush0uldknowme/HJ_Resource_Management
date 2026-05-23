export type MotorSnapshot = {
  status: string;
  currentLocation: string | null;
};

export type TransactionDraft = {
  transactionType: "inbound" | "outbound";
  operator: string;
  targetPerson?: string;
  location?: string;
  purpose?: string;
  remark?: string;
};

export class MotorFlowError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export function applyInbound(
  motor: MotorSnapshot,
  input: { operator: string; remark?: string }
): { motor: MotorSnapshot; transaction: TransactionDraft } {
  return {
    motor: {
      status: "in_stock",
      currentLocation: "在库"
    },
    transaction: {
      transactionType: "inbound",
      operator: input.operator,
      location: "在库",
      remark: input.remark || "扫码直接入库"
    }
  };
}

export function applyOutbound(
  motor: MotorSnapshot,
  input: { operator: string; issuedBy: string; vehicle: string; remark?: string }
): { motor: MotorSnapshot; transaction: TransactionDraft } {
  if (motor.status !== "in_stock") {
    throw new MotorFlowError("只有在库电机可以出库", "OUTBOUND_NOT_IN_STOCK");
  }

  return {
    motor: {
      status: "checked_out",
      currentLocation: input.vehicle
    },
    transaction: {
      transactionType: "outbound",
      operator: input.operator,
      targetPerson: input.issuedBy,
      purpose: input.vehicle,
      location: input.vehicle,
      remark: input.remark
    }
  };
}
