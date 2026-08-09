import {
  API_BASE_URL,
  authenticatedFetch,
  getAuthToken,
  refreshTokenApi,
} from "@/services/identityAccessService";

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
    createdAt: read(raw, "createdAt", "created_at") || "",
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
    createdAt: read(raw, "createdAt", "created_at") || "",
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

function normalizeUtilityBillingRunItem(raw = {}) {
  return {
    itemId: read(raw, "itemId", "item_id"),
    roomId: read(raw, "roomId", "room_id"),
    roomCode: read(raw, "roomCode", "room_code") || "",
    contractId: read(raw, "contractId", "contract_id"),
    contractCode: read(raw, "contractCode", "contract_code") || "",
    electricityUsage: Number(read(raw, "electricityUsage", "electricity_usage") || 0),
    electricityAmount: Number(read(raw, "electricityAmount", "electricity_amount") || 0),
    serviceFeeAmount: Number(read(raw, "serviceFeeAmount", "service_fee_amount") || 0),
    subtotalAmount: Number(read(raw, "subtotalAmount", "subtotal_amount") || 0),
    discountAmount: Number(read(raw, "discountAmount", "discount_amount") || 0),
    totalAmount: Number(read(raw, "totalAmount", "total_amount") || 0),
    warningMessage: read(raw, "warningMessage", "warning_message") || "",
    adjustmentReason: read(raw, "adjustmentReason", "adjustment_reason") || "",
    status: read(raw, "status") || "",
    invoiceId: read(raw, "invoiceId", "invoice_id"),
    invoiceCode: read(raw, "invoiceCode", "invoice_code") || "",
  };
}

export function normalizeUtilityBillingRun(raw = {}) {
  return {
    runId: read(raw, "runId", "run_id"),
    propertyId: read(raw, "propertyId", "property_id"),
    propertyName: read(raw, "propertyName", "property_name") || "",
    billingPeriod: read(raw, "billingPeriod", "billing_period") || "",
    invoiceReason: read(raw, "invoiceReason", "invoice_reason") || "",
    status: read(raw, "status") || "",
    totalRooms: Number(read(raw, "totalRooms", "total_rooms") || 0),
    readyCount: Number(read(raw, "readyCount", "ready_count") || 0),
    warningCount: Number(read(raw, "warningCount", "warning_count") || 0),
    skippedCount: Number(read(raw, "skippedCount", "skipped_count") || 0),
    generatedInvoiceCount: Number(read(raw, "generatedInvoiceCount", "generated_invoice_count") || 0),
    subtotalAmount: Number(read(raw, "subtotalAmount", "subtotal_amount") || 0),
    discountAmount: Number(read(raw, "discountAmount", "discount_amount") || 0),
    totalAmount: Number(read(raw, "totalAmount", "total_amount") || 0),
    generatedAt: read(raw, "generatedAt", "generated_at") || "",
    items: Array.isArray(read(raw, "items")) ? read(raw, "items").map(normalizeUtilityBillingRunItem) : [],
  };
}

export async function fetchBillingInvoices(filters = {}) {
  const params = new URLSearchParams();
  if (filters.billingPeriod) params.set("billingPeriod", filters.billingPeriod);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.invoiceType && filters.invoiceType !== "ALL") params.set("invoiceType", filters.invoiceType);
  if (filters.propertyId) params.set("propertyId", filters.propertyId);
  if (filters.roomId) params.set("roomId", filters.roomId);
  params.set("sort", "createdAt,desc");
  const query = params.toString();
  const data = await authenticatedFetch(`${API_BASE_URL}/admin/invoices${query ? `?${query}` : ""}`);
  return Array.isArray(data) ? data.map(normalizeInvoice) : [];
}

function extractFilenameFromContentDisposition(headerValue) {
  if (!headerValue) return "";
  const encodedMatch = headerValue.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (encodedMatch?.[1]) {
    const encoded = encodedMatch[1].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  const plainMatch = headerValue.match(/filename\s*=\s*("[^"]+"|[^;]+)/i);
  return plainMatch?.[1]?.trim().replace(/^"|"$/g, "") || "";
}

export async function downloadBillingInvoicesExcel(filters = {}) {
  const params = new URLSearchParams();
  if (filters.billingPeriod) params.set("billingPeriod", filters.billingPeriod);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters.invoiceType && filters.invoiceType !== "ALL") params.set("invoiceType", filters.invoiceType);
  if (filters.propertyId) params.set("propertyId", filters.propertyId);
  if (filters.roomId) params.set("roomId", filters.roomId);

  const request = async () => fetch(`${API_BASE_URL}/admin/invoices/export?${params.toString()}`, {
    credentials: "include",
    headers: {
      "X-Client-Type": "web",
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
    },
  });

  let response = await request();
  if (response.status === 401) {
    await refreshTokenApi();
    response = await request();
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.details || "Xuất file Excel thất bại");
  }

  const contentDisposition = response.headers.get("content-disposition") || "";
  const filename = extractFilenameFromContentDisposition(contentDisposition)
    || `Thông báo đóng tiền trọ Hải Đăng 1${filters.billingPeriod ? ` ${filters.billingPeriod}` : ""}.xlsx`;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchUtilityBillingRuns(filters = {}) {
  const params = new URLSearchParams();
  if (filters.billingPeriod) params.set("billingPeriod", filters.billingPeriod);
  if (filters.propertyId) params.set("propertyId", filters.propertyId);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  const query = params.toString();
  const data = await authenticatedFetch(`${API_BASE_URL}/admin/utility-billing-runs${query ? `?${query}` : ""}`);
  return Array.isArray(data) ? data.map(normalizeUtilityBillingRun) : [];
}

export async function fetchUtilityBillingRun(runId) {
  const data = await authenticatedFetch(`${API_BASE_URL}/admin/utility-billing-runs/${encodeURIComponent(runId)}`);
  return normalizeUtilityBillingRun(data || {});
}

export async function createUtilityBillingRun({ propertyId, billingPeriod, invoiceReason = "MONTHLY" }) {
  const params = new URLSearchParams();
  params.set("billingPeriod", billingPeriod);
  if (invoiceReason) params.set("invoiceReason", invoiceReason);
  const data = await authenticatedFetch(
    `${API_BASE_URL}/admin/utility-billing-runs/properties/${encodeURIComponent(propertyId)}?${params.toString()}`,
    { method: "POST" },
  );
  return normalizeUtilityBillingRun(data || {});
}

export async function publishUtilityBillingRun(runId, { dueDays } = {}) {
  const params = new URLSearchParams();
  if (dueDays) params.set("dueDays", dueDays);
  const query = params.toString();
  const data = await authenticatedFetch(
    `${API_BASE_URL}/admin/utility-billing-runs/${encodeURIComponent(runId)}/publish${query ? `?${query}` : ""}`,
    { method: "POST" },
  );
  return normalizeUtilityBillingRun(data || {});
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

export async function sendOverdueInvoiceWarning(invoiceId) {
  return authenticatedFetch(`${API_BASE_URL}/admin/invoices/${encodeURIComponent(invoiceId)}/overdue-warning`, {
    method: "POST",
  });
}
