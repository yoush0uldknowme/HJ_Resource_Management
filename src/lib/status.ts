export const MOTOR_STATUS_LABEL: Record<string, string> = {
  draft: "待入库",
  in_stock: "在库",
  checked_out: "已领用",
  repairing: "维修中",
  retired: "已报废"
};

export const TRANSACTION_LABEL: Record<string, string> = {
  create: "建档",
  inbound: "入库",
  outbound: "出库"
};

export function motorStatusLabel(status: string): string {
  return MOTOR_STATUS_LABEL[status] ?? status;
}

export function transactionLabel(type: string): string {
  return TRANSACTION_LABEL[type] ?? type;
}
