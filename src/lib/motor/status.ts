export const MOTOR_STATUS_LABEL: Record<string, string> = {
  draft: "待入库",
  in_stock: "在库",
  checked_out: "已领用"
  // repairing / retired 预留，暂不启用
};

export const TRANSACTION_LABEL: Record<string, string> = {
  create: "建档",
  inbound: "入库",
  outbound: "出库",
  status_change: "状态变更"
};

export function motorStatusLabel(status: string): string {
  return MOTOR_STATUS_LABEL[status] ?? status;
}

export function transactionLabel(type: string): string {
  return TRANSACTION_LABEL[type] ?? type;
}
