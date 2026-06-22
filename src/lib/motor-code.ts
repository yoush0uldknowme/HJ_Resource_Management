export function normalizeMotorModel(model: string): string {
  const normalized = model.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) throw new Error("model is required");
  return normalized;
}

export function motorModelPrefix(model: string): string {
  const normalized = normalizeMotorModel(model);
  const matches = normalized.match(/\d+/g) ?? [];
  const digits = matches.join("");
  if (digits.length < 4) {
    throw new Error("model must contain at least four digits");
  }
  return digits.slice(-4);
}

export function buildMotorCode(model: string, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence <= 0 || sequence > 9999) {
    throw new Error("sequence must be between 1 and 9999");
  }
  return `${motorModelPrefix(model)}${String(sequence).padStart(4, "0")}`;
}

export function motorCodeRange(model: string): { startsWith: string } {
  return { startsWith: motorModelPrefix(model) };
}
