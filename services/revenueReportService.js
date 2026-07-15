import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

const read = (raw, ...keys) => {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null) return raw[key];
  }
  return null;
};

const numberValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function normalizePeriod(raw = {}) {
  const room = numberValue(read(raw, "room"));
  const utilities = numberValue(read(raw, "utilities"));
  const service = numberValue(read(raw, "service"));
  const extra = numberValue(read(raw, "extra"));
  return {
    period: read(raw, "period") || "",
    label: read(raw, "label") || "",
    room,
    utilities,
    service,
    extra,
    total: numberValue(read(raw, "total")) || room + utilities + service + extra,
    previous: numberValue(read(raw, "previous")),
  };
}

function normalizeSource(raw = {}) {
  return {
    key: read(raw, "key") || "",
    amount: numberValue(read(raw, "amount")),
    percent: numberValue(read(raw, "percent")),
  };
}

export function normalizeRevenueReport(raw = {}) {
  const periods = Array.isArray(read(raw, "periods")) ? read(raw, "periods").map(normalizePeriod) : [];
  return {
    periodType: read(raw, "periodType", "period_type") || "month",
    endPeriod: read(raw, "endPeriod", "end_period") || "",
    totalRevenue: numberValue(read(raw, "totalRevenue", "total_revenue")),
    previousTotalRevenue: numberValue(read(raw, "previousTotalRevenue", "previous_total_revenue")),
    revenueGrowthPercent: numberValue(read(raw, "revenueGrowthPercent", "revenue_growth_percent")),
    periods,
    sources: Array.isArray(read(raw, "sources")) ? read(raw, "sources").map(normalizeSource) : [],
  };
}

export async function fetchRevenueReport(filters = {}) {
  const params = new URLSearchParams();
  if (filters.periodType) params.set("periodType", filters.periodType);
  if (filters.endPeriod) params.set("endPeriod", filters.endPeriod);

  const query = params.toString();
  const data = await authenticatedFetch(`${API_BASE_URL}/dashboard/revenue-report${query ? `?${query}` : ""}`, {
    method: "GET",
  });
  return normalizeRevenueReport(data);
}
