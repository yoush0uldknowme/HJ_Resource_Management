export function normalizeMotorModel(model: string): string {
  const normalized = model.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) {
    throw new Error("model is required");
  }

  return normalized;
}

export function buildMotorCode(model: string, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error("sequence must be positive");
  }

  const prefix = normalizeMotorModel(model);
  const suffix = String(sequence).padStart(4, "0");

  return `${prefix}-${suffix}`;
}

export function motorCodeRange(model: string): { startsWith: string } {
  return { startsWith: `${normalizeMotorModel(model)}-` };
}
