export const DEFAULT_UTILITY_TARIFFS = {
  electricity: { unitPrice: 3500, freeAllowance: 0 },
  water: { unitPrice: 20000, freeAllowance: 6 },
};

export function normalizeUtilityTariff(raw, fallback) {
  const unitPrice = Number(raw?.unitPrice ?? raw?.unit_price ?? fallback?.unitPrice ?? 0);
  const freeAllowance = Number(raw?.freeAllowance ?? raw?.free_allowance ?? fallback?.freeAllowance ?? 0);

  return {
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    freeAllowance: Number.isFinite(freeAllowance) ? freeAllowance : 0,
  };
}

export function calculateUtilityCharge(usage, tariff) {
  const numericUsage = Number(usage);
  if (!Number.isFinite(numericUsage)) return null;

  const unitPrice = Math.max(0, Number(tariff?.unitPrice ?? 0));
  const freeAllowance = Math.max(0, Number(tariff?.freeAllowance ?? 0));
  if (numericUsage < 0) {
    return { usage: numericUsage, unitPrice, freeAllowance, billableUsage: 0, amount: null, isInvalid: true };
  }

  const billableUsage = Math.max(0, Math.ceil(numericUsage - freeAllowance));
  return {
    usage: numericUsage,
    unitPrice,
    freeAllowance,
    billableUsage,
    amount: billableUsage * unitPrice,
    isInvalid: false,
  };
}

export function formatVnd(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${Math.round(amount).toLocaleString("vi-VN")} VNĐ`;
}
