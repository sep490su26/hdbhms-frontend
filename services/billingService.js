import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

const read = (raw, ...keys) => {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null) return raw[key];
  }
  return null;
};

function normalizeLine(raw = {}) {
  return {
    id: read(raw, "id"),
    lineType: read(raw, "lineType", "line_type") || "",
    description: read(raw, "description") || "",
    quantity: Number(read(raw, "quantity") || 0),
    unitPrice: Number(read(raw, "unitPrice", "unit_price") || 0),
    amount: Number(read(raw, "amount") || 0),
  };
}

function normalizePayment(raw = {}) {
  return {
    id: read(raw, "id"),
    transactionId: read(raw, "transactionId", "transaction_id"),
    amount: Number(read(raw, "amount") || 0),
    provider: read(raw, "provider") || "",
    status: read(raw, "status") || "",
    payerName: read(raw, "payerName", "payer_name") || "",
    content: read(raw, "content") || "",
    confirmedBy: read(raw, "confirmedBy", "confirmed_by"),
    confirmedAt: read(raw, "confirmedAt", "confirmed_at") || "",
    allocatedBy: read(raw, "allocatedBy", "allocated_by"),
    allocatedAt: read(raw, "allocatedAt", "allocated_at") || "",
  };
}

export function normalizeInvoice(raw = {}) {
  return {
    id: read(raw, "id"),
    invoiceCode: read(raw, "invoiceCode", "invoice_code") || "",
    invoiceType: read(raw, "invoiceType", "invoice_type") || "",
    billingPeriod: read(raw, "billingPeriod", "billing_period") || "",
    status: read(raw, "status") || "",
    propertyId: read(raw, "propertyId", "property_id"),
    propertyName: read(raw, "propertyName", "property_name") || "",
    roomId: read(raw, "roomId", "room_id"),
    roomCode: read(raw, "roomCode", "room_code") || "",
    contractId: read(raw, "contractId", "contract_id"),
    contractCode: read(raw, "contractCode", "contract_code") || "",
    tenantName: read(raw, "tenantName", "tenant_name") || "",
    issueDate: read(raw, "issueDate", "issue_date") || "",
    dueDate: read(raw, "dueDate", "due_date") || "",
    subtotalAmount: Number(read(raw, "subtotalAmount", "subtotal_amount") || 0),
    discountAmount: Number(read(raw, "discountAmount", "discount_amount") || 0),
    totalAmount: Number(read(raw, "totalAmount", "total_amount") || 0),
    paidAmount: Number(read(raw, "paidAmount", "paid_amount") || 0),
    remainingAmount: Number(read(raw, "remainingAmount", "remaining_amount") || 0),
    lines: Array.isArray(raw.lines) ? raw.lines.map(normalizeLine) : [],
    paymentHistory: Array.isArray(read(raw, "paymentHistory", "payment_history"))
      ? read(raw, "paymentHistory", "payment_history").map(normalizePayment)
      : [],
  };
}

export async function fetchBillingInvoices(filters = {}) {
  const params = new URLSearchParams();
  if (filters.billingPeriod) params.set("billingPeriod", filters.billingPeriod);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.invoiceType && filters.invoiceType !== "ALL") params.set("invoiceType", filters.invoiceType);
  if (filters.propertyId) params.set("propertyId", filters.propertyId);
  if (filters.roomId) params.set("roomId", filters.roomId);
  const query = params.toString();
  const data = await authenticatedFetch(`${API_BASE_URL}/admin/invoices${query ? `?${query}` : ""}`);
  return Array.isArray(data) ? data.map(normalizeInvoice) : [];
}

export async function applyRentOverride(payload) {
  return authenticatedFetch(`${API_BASE_URL}/admin/invoices/rent-overrides`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId: Number(payload.roomId),
      billingPeriod: payload.billingPeriod,
      overrideMonthlyRent: Number(payload.overrideMonthlyRent),
      reason: payload.reason || "",
    }),
  });
}

export async function confirmManualPayment(invoiceId, payload) {
  const data = await authenticatedFetch(`${API_BASE_URL}/admin/invoices/${encodeURIComponent(invoiceId)}/manual-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Number(payload.amount),
      payerName: payload.payerName || "",
      note: payload.note || "",
    }),
  });
  return {
    ...data,
    invoice: normalizeInvoice(data?.invoice || {}),
  };
}
