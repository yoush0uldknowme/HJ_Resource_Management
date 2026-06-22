import type { PrismaClient } from "@prisma/client";
import { prisma as globalPrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resultUrl } from "@/lib/result";
import { redirect } from "next/navigation";

// ── 类型 ──

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

// ── 状态转换矩阵 ──

/** 允许入库的状态 */
const ALLOWED_INBOUND_STATUSES = new Set(["checked_out", "draft"]);

// ── 状态流转 ──

export function applyInbound(
  motor: MotorSnapshot,
  input: { operator: string; remark?: string }
): { motor: MotorSnapshot; transaction: TransactionDraft } {
  if (!ALLOWED_INBOUND_STATUSES.has(motor.status)) {
    throw new MotorFlowError(
      `当前状态为 ${motor.status}，不允许入库`,
      "INBOUND_NOT_ALLOWED"
    );
  }
  return {
    motor: { status: "in_stock", currentLocation: "在库" },
    transaction: {
      transactionType: "inbound",
      operator: input.operator,
      location: "在库",
      remark: input.remark || "编号确认入库"
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
    motor: { status: "checked_out", currentLocation: input.vehicle },
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

// ── 公共出库执行 ──

/**
 * 执行电机出库的数据库操作（公共函数，供直接出库和审批后出库复用）。
 * 使用事务确保数据一致性。
 */
export async function executeMotorOutbound(
  db: PrismaClient,
  motorId: number,
  transaction: TransactionDraft,
  motorUpdate: MotorSnapshot,
  paths: string[]
): Promise<void> {
  await db.motor.update({
    where: { id: motorId },
    data: {
      status: motorUpdate.status,
      currentLocation: motorUpdate.currentLocation,
      transactions: { create: transaction }
    }
  });

  for (const p of paths) {
    revalidatePath(p);
  }
}

// ── 扫码页操作判断 ──

export type ScanAction = {
  label: string;
  href?: string;
  formAction?: string;
  variant: "primary" | "secondary" | "outbound" | "inbound";
  isForm?: boolean;
};

export function getScanActions(
  motorStatus: string,
  hasApprovedRequest: boolean,
  isAdminUser: boolean
): ScanAction[] {
  const actions: ScanAction[] = [];

  if (motorStatus === "in_stock" && hasApprovedRequest) {
    // 已审批待出库：任何人都可以扫码执行出库
    actions.push({
      label: "执行出库",
      variant: "outbound",
      isForm: true,
      formAction: "executeApproved"
    });
  } else if (motorStatus === "in_stock" && isAdminUser) {
    actions.push({
      label: "直接出库",
      variant: "outbound",
      href: "/mobile/outbound"
    });
  } else if (motorStatus === "checked_out") {
    actions.push({
      label: "入库 / 归还",
      variant: "inbound",
      href: "/mobile/inbound"
    });
  } else if (motorStatus === "in_stock" && !isAdminUser) {
    actions.push({
      label: "申请出库",
      variant: "secondary",
      href: "/mobile/outbound"
    });
  }

  return actions;
}
