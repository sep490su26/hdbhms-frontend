import { fetchAllPageItems, normalizePageResponse, readPageItems } from "@/lib/pageResponse";
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

export function normalizeExpenseRequest(raw = {}) {
  const payment = read(raw, "payment") || {};
  return {
    id: read(raw, "id"),
    expenseCode: read(raw, "expenseCode", "expense_code") || "",
    expenseType: read(raw, "expenseType", "expense_type") || "",
    status: read(raw, "status") || "",
    amount: numberValue(read(raw, "amount")),
    description: read(raw, "description") || "",
    expenseDate: read(raw, "expenseDate", "expense_date") || "",
    expectedPaymentDate: read(raw, "expectedPaymentDate", "expected_payment_date") || "",
    paymentDate: read(payment, "paymentDate", "payment_date") || read(raw, "paymentDate", "payment_date") || "",
    createdAt: read(raw, "createdAt", "created_at") || "",
  };
}

export async function fetchExpenseRequests(filters = {}) {
  const page = Math.max(0, Number(filters.page) || 0);
  const size = Math.max(1, Number(filters.size) || 100);
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: filters.sort || "expenseDate,desc",
  });

  if (filters.status) params.set("status", filters.status);
  if (filters.expenseType) params.set("expenseType", filters.expenseType);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.propertyId) params.set("propertyId", filters.propertyId);

  const data = await authenticatedFetch(`${API_BASE_URL}/expense-requests?${params.toString()}`, {
    method: "GET",
  });
  const items = readPageItems(data).map(normalizeExpenseRequest);
  return {
    ...normalizePageResponse(data, { page: page + 1, size, items }),
    items,
  };
}

export async function fetchPaidExpenseRequests(filters = {}) {
  return fetchAllExpenseRequests({ ...filters, status: "PAID" });
}

export async function fetchAllExpenseRequests(filters = {}) {
  return fetchAllPageItems(
    ({ page, size }) => fetchExpenseRequests({
      ...filters,
      page,
      size,
    }),
    {
      size: Math.max(1, Number(filters.size) || 100),
      maxPages: Math.max(1, Number(filters.maxPages) || 100),
    },
  );
}
