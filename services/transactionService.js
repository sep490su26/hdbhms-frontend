import {
  API_BASE_URL,
  authenticatedFetch,
  getAuthToken,
  refreshTokenApi,
} from "@/services/identityAccessService";
import { normalizePageResponse, readPageItems } from "@/lib/pageResponse";

const read = (raw, ...keys) => {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null) return raw[key];
  }
  return null;
};

function buildParams(filters = {}) {
  const params = new URLSearchParams();
  if (filters.roomId) params.set("roomId", filters.roomId);
  if (filters.tenantName?.trim()) params.set("tenantName", filters.tenantName.trim());
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  return params;
}

function authHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return {
    "X-Client-Type": "web",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: authHeaders(options.headers),
  });
  if (response.status !== 401) return response;

  await refreshTokenApi();
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: authHeaders(options.headers),
  });
}

async function readErrorMessage(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  return payload.message || payload.details || fallbackMessage;
}

function extractFilenameFromContentDisposition(headerValue) {
  if (!headerValue) return "";
  const filenameStarMatch = headerValue.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    const encoded = filenameStarMatch[1].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  const filenameMatch = headerValue.match(/filename\s*=\s*("[^"]+"|[^;]+)/i);
  return filenameMatch?.[1]?.trim().replace(/^"|"$/g, "") || "";
}

export function normalizeTransaction(raw = {}) {
  return {
    id: read(raw, "id"),
    transactionId: read(raw, "transactionId", "transaction_id"),
    transactionCode: read(raw, "transactionCode", "transaction_code") || "",
    transactionTime: read(raw, "transactionTime", "transaction_time") || "",
    roomId: read(raw, "roomId", "room_id"),
    roomCode: read(raw, "roomCode", "room_code") || "",
    propertyName: read(raw, "propertyName", "property_name") || "",
    tenantName: read(raw, "tenantName", "tenant_name") || "",
    amount: Number(read(raw, "amount") || 0),
    paymentType: read(raw, "paymentType", "payment_type") || "",
    invoiceType: read(raw, "invoiceType", "invoice_type") || "",
    status: read(raw, "status") || "",
    provider: read(raw, "provider") || "",
    invoiceId: read(raw, "invoiceId", "invoice_id"),
    invoiceCode: read(raw, "invoiceCode", "invoice_code") || "",
    payerName: read(raw, "payerName", "payer_name") || "",
    content: read(raw, "content") || "",
  };
}

export async function fetchTransactionHistory(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const size = Math.max(1, Number(filters.size) || 10);
  const params = buildParams(filters);
  params.set("page", String(page - 1));
  params.set("size", String(size));

  const data = await authenticatedFetch(`${API_BASE_URL}/admin/transactions?${params.toString()}`);
  const items = readPageItems(data).map(normalizeTransaction);
  return {
    ...normalizePageResponse(data, { page, size, items }),
    items,
  };
}

export async function fetchTransactionHistoryExportFile(filters = {}, format = "excel") {
  const params = buildParams(filters);
  params.set("format", format);
  const response = await fetchWithAuth(`${API_BASE_URL}/admin/transactions/export?${params.toString()}`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Xuất file thất bại, vui lòng thử lại"));
  }

  const contentDisposition =
    response.headers?.get?.("content-disposition") ||
    response.headers?.get?.("Content-Disposition") ||
    "";

  return {
    blob: await response.blob(),
    filename: extractFilenameFromContentDisposition(contentDisposition),
  };
}

export async function downloadTransactionHistoryExport(filters = {}, format = "excel") {
  const { blob, filename } = await fetchTransactionHistoryExportFile(filters, format);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `lich-su-thanh-toan.${format === "pdf" ? "pdf" : "xlsx"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
