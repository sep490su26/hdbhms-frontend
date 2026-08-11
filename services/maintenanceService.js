import { ApiError, getAuthToken } from "@/services/identityAccessService";
import { API_BASE_URL } from "@/lib/apiConfig";
import { normalizePageResponse, readPageItems } from "@/lib/pageResponse";

const API_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

function readField(source, ...keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStatus(value) {
  const status = String(value || "PENDING").toUpperCase();
  return status === "PENDING_ACCEPTANCE" ? "PENDING" : status;
}

function normalizeScope(value) {
  const scope = String(value || "ROOM").toUpperCase();
  return scope === "TENANT_ROOM" ? "ROOM" : scope;
}

function maintenanceDisplayText(value) {
  return String(value || "")
    .replaceAll("RESET_WIFI_PASSWORD", "Tự ý reset mật khẩu modem/wifi")
    .replaceAll("VIOLATION_FINE", "Phạt vi phạm nội quy")
    .replaceAll("MAINTENANCE_COMPENSATION", "Bồi thường chi phí bảo trì")
    .replaceAll("NO_CHARGE", "Không thu khách")
    .replaceAll("SCHEDULE_FAILED", "Lỗi lên lịch hóa đơn")
    .replaceAll("SCHEDULED", "Đã lên lịch gộp hóa đơn đầu tháng")
    .replaceAll("DRAFT", "Chờ phát hành")
    .replaceAll("PARTIALLY_PAID", "Thanh toán một phần")
    .replaceAll("VOIDED", "Đã hủy")
    .replaceAll("PENDING_PAYMENT", "Chờ thanh toán")
    .replaceAll("PAID", "Đã thanh toán")
    .replaceAll("NOT_INVOICED", "Chưa tạo hóa đơn");
}

export function resolveFileUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/v1")) return `${API_ROOT}${url}`;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

function normalizeUser(raw = {}) {
  if (!raw) return null;
  return {
    id: readField(raw, "id"),
    fullName: readField(raw, "fullName", "full_name", "displayName", "display_name", "name") || "",
    email: readField(raw, "email") || "",
    phone: readField(raw, "phone") || "",
    role: readField(raw, "role") || "",
  };
}

function normalizeAttachment(raw = {}) {
  const fileId = readField(raw, "fileId", "file_id");
  return {
    id: readField(raw, "id") ?? fileId,
    fileId,
    url: resolveFileUrl(readField(raw, "url") || (fileId ? `/files/download/${fileId}` : "")),
    mimeType: readField(raw, "mimeType", "mime_type") || "",
    name: readField(raw, "name") || "",
    phase: readField(raw, "phase") || "",
    sortOrder: toNumber(readField(raw, "sortOrder", "sort_order")),
  };
}

function splitAttachments(raw = {}) {
  const beforeAttachments = (readField(raw, "beforeAttachments", "before_attachments") || []).map(normalizeAttachment);
  const afterAttachments = (readField(raw, "afterAttachments", "after_attachments") || []).map(normalizeAttachment);
  const allAttachments = (readField(raw, "attachments") || []).map(normalizeAttachment);
  const before = beforeAttachments.length
    ? beforeAttachments
    : allAttachments.filter((attachment) => String(attachment.phase || "").toUpperCase() === "BEFORE");
  const after = afterAttachments.length
    ? afterAttachments
    : allAttachments.filter((attachment) => String(attachment.phase || "").toUpperCase() === "AFTER");
  return { before, after, all: allAttachments.length ? allAttachments : [...before, ...after] };
}

function normalizeEvent(raw = {}) {
  return {
    id: readField(raw, "id"),
    fromStatus: normalizeStatus(readField(raw, "fromStatus", "from_status")),
    toStatus: normalizeStatus(readField(raw, "toStatus", "to_status")),
    action: readField(raw, "action") || "",
    note: maintenanceDisplayText(readField(raw, "note") || ""),
    createdBy: normalizeUser(readField(raw, "createdBy", "created_by")),
    createdAt: readField(raw, "createdAt", "created_at") || "",
  };
}

function normalizeReview(raw = {}) {
  if (!raw || !readField(raw, "rating")) return null;
  return {
    id: readField(raw, "id"),
    rating: toNumber(readField(raw, "rating")),
    comment: readField(raw, "comment", "feedback") || "",
    reviewer: normalizeUser(readField(raw, "reviewer")),
    createdAt: readField(raw, "createdAt", "created_at") || "",
  };
}

export function normalizeTicket(raw = {}) {
  const id = readField(raw, "id");
  const attachments = splitAttachments(raw);
  return {
    id,
    ticketCode: readField(raw, "ticketCode", "ticket_code", "code") || `#SC-${id || ""}`,
    propertyId: readField(raw, "propertyId", "property_id"),
    propertyName: readField(raw, "propertyName", "property_name") || "",
    roomId: readField(raw, "roomId", "room_id"),
    roomCode: readField(raw, "roomCode", "room_code") || "",
    roomName: readField(raw, "roomName", "room_name") || "",
    ticketScope: normalizeScope(readField(raw, "scope", "ticketScope", "ticket_scope")),
    category: readField(raw, "category") || "OTHER",
    title: maintenanceDisplayText(readField(raw, "title") || "Phiếu sự cố"),
    description: maintenanceDisplayText(readField(raw, "description") || ""),
    repairRequested: readField(raw, "repairRequested", "repair_requested") !== false,
    status: normalizeStatus(readField(raw, "status")),
    ticketStatus: normalizeStatus(readField(raw, "ticketStatus", "ticket_status", "status")),
    ticketStatusLabel: readField(raw, "ticketStatusLabel", "ticket_status_label") || "",
    billingStatus: readField(raw, "billingStatus", "billing_status") || "",
    billingStatusLabel: readField(raw, "billingStatusLabel", "billing_status_label") || "",
    billingPeriod: readField(raw, "billingPeriod", "billing_period") || "",
    invoiceId: readField(raw, "invoiceId", "invoice_id"),
    invoiceCode: readField(raw, "invoiceCode", "invoice_code") || "",
    invoiceStatus: readField(raw, "invoiceStatus", "invoice_status") || "",
    paymentStatus: readField(raw, "paymentStatus", "payment_status") || "",
    chargeToTenant: Boolean(readField(raw, "chargeToTenant", "charge_to_tenant")),
    payer: readField(raw, "payer", "paidBy", "paid_by") || "",
    lineType: readField(raw, "lineType", "line_type") || "",
    chargeAmount: toNumber(readField(raw, "chargeAmount", "charge_amount")),
    checkoutUrl: readField(raw, "checkoutUrl", "checkout_url") || "",
    createdBy: normalizeUser(readField(raw, "createdBy", "created_by")),
    assignedTo: normalizeUser(readField(raw, "assignedTo", "assigned_to")),
    workerName: readField(raw, "repairmanName", "repairman_name", "workerName", "worker_name") || "",
    repairmanPhone: readField(raw, "repairmanPhone", "repairman_phone") || "",
    repairItems: readField(raw, "repairItems", "repair_items") || "",
    rootCause: readField(raw, "rootCause", "root_cause") || "",
    costAmount: toNumber(readField(raw, "actualCost", "actual_cost", "costAmount", "cost_amount")),
    costDescription: maintenanceDisplayText(readField(raw, "costDescription", "cost_description") || ""),
    costResponsibility: readField(raw, "costResponsibility", "cost_responsibility") || "UNDECIDED",
    rejectionReason: readField(raw, "rejectionReason", "rejection_reason") || "",
    createdAt: readField(raw, "createdAt", "created_at") || "",
    updatedAt: readField(raw, "updatedAt", "updated_at") || "",
    completedAt: readField(raw, "completedAt", "completed_at") || "",
    beforeAttachments: attachments.before,
    afterAttachments: attachments.after,
    attachments: attachments.all,
    events: (readField(raw, "events") || []).map(normalizeEvent),
    review: normalizeReview(readField(raw, "review")),
  };
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Client-Type": "web",
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.message || payload.details || "Không xử lý được phiếu sự cố.", {
      code: payload.code,
      errorCode: payload.errorCode,
      details: payload.details,
      status: response.status,
      payload,
    });
  }
  if (Object.prototype.hasOwnProperty.call(payload, "code")) {
    if (payload.code !== 0) {
      throw new ApiError(payload.message || payload.details || "Không xử lý được phiếu sự cố.", {
        code: payload.code,
        errorCode: payload.errorCode,
        details: payload.details,
        status: response.status,
        payload,
      });
    }
    return payload.data ?? {};
  }
  return payload;
}

export async function fetchMaintenanceTickets(filters = {}) {
  const {
    page = 0,
    size = 100,
    status = "all",
    keyword = "",
    category = "all",
    scope = "all",
    roomId = "",
    floorId = "",
    propertyId = "",
    fromDate = "",
    toDate = "",
  } = filters;
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: "createdAt,desc" });
  if (keyword.trim()) params.set("code", keyword.trim());
  if (status && status !== "all") params.set("status", status);
  if (category && category !== "all") params.set("category", category);
  if (scope && scope !== "all") params.set("scope", scope);
  if (roomId) params.set("roomId", String(roomId));
  if (floorId) params.set("floorId", String(floorId));
  if (propertyId) params.set("propertyId", String(propertyId));
  if (fromDate) params.set("fromDate", fromDate);
  if (toDate) params.set("toDate", toDate);

  const data = await request(`/maintenance/tickets?${params.toString()}`);
  const rows = Array.isArray(data.data) ? data.data : [];
  return {
    tickets: rows.map(normalizeTicket),
    total: toNumber(data.totalElements ?? rows.length, rows.length),
    currentPage: toNumber(data.currentPage, page + 1),
    totalPages: toNumber(data.totalPages, 1),
  };
}

export async function fetchMaintenanceTicket(id) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}`));
}

export async function createMaintenanceTicket(payload) {
  return normalizeTicket(await request("/maintenance/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function createInternalMaintenanceTicket(payload) {
  return normalizeTicket(await request("/maintenance/tickets/internal", {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function fetchInternalMaintenanceCosts({ page = 0, size = 10 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  const data = await request(`/maintenance/tickets/internal-costs?${params.toString()}`);
  const rows = readPageItems(data);
  const items = rows.map((item) => ({
    ticketId: readField(item, "ticketId", "ticket_id"),
    ticketCode: readField(item, "ticketCode", "ticket_code") || "",
    propertyId: readField(item, "propertyId", "property_id"),
    propertyName: readField(item, "propertyName", "property_name") || "",
    roomId: readField(item, "roomId", "room_id"),
    roomCode: readField(item, "roomCode", "room_code") || "",
    category: readField(item, "category") || "OTHER",
    ticketStatus: normalizeStatus(readField(item, "ticketStatus", "ticket_status")),
    amount: toNumber(readField(item, "amount")),
    payer: readField(item, "payer") || "LANDLORD",
    billingStatus: readField(item, "billingStatus", "billing_status") || "NO_CHARGE",
    accountingNote: readField(item, "accountingNote", "accounting_note") || "",
    recordedAt: readField(item, "recordedAt", "recorded_at"),
  }));
  return {
    ...normalizePageResponse(data, { page: page + 1, size, items }),
    items,
  };
}

export async function createMaintenanceViolation(payload) {
  return request("/maintenance/violations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function approveMaintenanceTicket(id) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/approve`, { method: "POST" }));
}

export async function declineMaintenanceTicket(id, reason) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/decline`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }));
}

export async function startMaintenanceProgress(id, payload = {}) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/progress`, {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function updateMaintenanceRepairInfo(id, payload = {}) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/repair-info`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }));
}

export async function completeMaintenanceTicket(id, payload = {}) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function issueMaintenanceInvoice(id) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/invoice/issue`, { method: "POST" }));
}

export async function confirmMaintenanceTicket(id) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/confirm`, { method: "POST" }));
}

export async function attachMaintenanceFiles(id, fileIds, phase = "AFTER", note = "") {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/attachments`, {
    method: "POST",
    body: JSON.stringify({ fileIds, phase, note }),
  }));
}

export async function uploadMaintenanceImage(file) {
  const form = new FormData();
  form.append("file", file);
  form.append("category", "TICKET_ATTACHMENT");
  form.append("isSensitive", "false");
  const data = await request("/files/upload", { method: "POST", body: form });
  return {
    fileId: readField(data, "fileId", "file_id", "id"),
    url: resolveFileUrl(readField(data, "url") || ""),
    originalFileName: readField(data, "originalFileName", "original_file_name") || file.name,
  };
}
