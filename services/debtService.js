import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

const read = (raw, ...keys) => {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null) return raw[key];
  }
  return null;
};

export function normalizeDebtSummary(raw = {}) {
  return {
    propertyId: read(raw, "propertyId", "property_id"),
    propertyName: read(raw, "propertyName", "property_name") || "",
    roomId: read(raw, "roomId", "room_id"),
    roomName: read(raw, "roomName", "room_name") || "",
    tenantName: read(raw, "tenantName", "tenant_name") || "",
    rentDebtAmount: Number(read(raw, "rentDebtAmount", "rent_debt_amount") || 0),
    utilityDebtAmount: Number(read(raw, "utilityDebtAmount", "utility_debt_amount") || 0),
    totalDebt: Number(read(raw, "totalDebt", "total_debt") || 0),
    monthsOverdue: Number(read(raw, "monthsOverdue", "months_overdue") || 0),
    debtType: read(raw, "debtType", "debt_type") || "OTHER",
    isWarning: Boolean(read(raw, "isWarning", "is_warning")),
  };
}

export async function fetchDebtSummary(filters = {}) {
  const params = new URLSearchParams();
  if (filters.propertyId) params.set("propertyId", filters.propertyId);
  const query = params.toString();
  const data = await authenticatedFetch(`${API_BASE_URL}/admin/debts/summary${query ? `?${query}` : ""}`);
  return Array.isArray(data) ? data.map(normalizeDebtSummary) : [];
}
