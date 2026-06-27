import { ApiError, getAuthToken } from "@/services/identityAccessService";
import { API_BASE_URL } from "@/lib/apiConfig";

const API_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

function readField(source, key) {
  if (source && source[key] !== undefined && source[key] !== null) return source[key];
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
    email: readField(raw, "email") || "",
    phone: readField(raw, "phone") || "",
    role: readField(raw, "role") || "",
  };
}

function normalizeAttachment(raw = {}) {
  const fileId = readField(raw, "fileId");
  return {
    id: readField(raw, "id") ?? fileId,
    fileId,
    url: resolveFileUrl(readField(raw, "url") || (fileId ? `/files/download/${fileId}` : "")),
    mimeType: readField(raw, "mimeType") || "",
    name: readField(raw, "name") || "",
    phase: readField(raw, "phase") || "",
    sortOrder: toNumber(readField(raw, "sortOrder")),
  };
}

function splitAttachments(raw = {}) {
  const beforeAttachments = (readField(raw, "beforeAttachments") || []).map(normalizeAttachment);
  const afterAttachments = (readField(raw, "afterAttachments") || []).map(normalizeAttachment);
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
    fromStatus: normalizeStatus(readField(raw, "fromStatus")),
    toStatus: normalizeStatus(readField(raw, "toStatus")),
    action: readField(raw, "action") || "",
    note: maintenanceDisplayText(readField(raw, "note") || ""),
    createdBy: normalizeUser(readField(raw, "createdBy")),
    createdAt: readField(raw, "createdAt") || "",
  };
}

function normalizeReview(raw = {}) {
  if (!raw || !readField(raw, "rating")) return null;
  return {
    id: readField(raw, "id"),
    rating: toNumber(readField(raw, "rating")),
    comment: readField(raw, "comment") || "",
    reviewer: normalizeUser(readField(raw, "reviewer")),
    createdAt: readField(raw, "createdAt") || "",
  };
}

export function normalizeTicket(raw = {}) {
  const id = readField(raw, "id");
  const attachments = splitAttachments(raw);
  return {
    id,
    ticketCode: readField(raw, "ticketCode") || readField(raw, "code") || `#SC-${id || ""}`,
    propertyId: readField(raw, "propertyId"),
    propertyName: readField(raw, "propertyName") || "",
    roomId: readField(raw, "roomId"),
    roomCode: readField(raw, "roomCode") || "",
    roomName: readField(raw, "roomName") || "",
    ticketScope: normalizeScope(readField(raw, "scope") ?? readField(raw, "ticketScope")),
    priority: readField(raw, "severity", "priority") || "MEDIUM",
    category: readField(raw, "category") || "OTHER",
    title: maintenanceDisplayText(readField(raw, "title") || "Phiếu sự cố"),
    description: maintenanceDisplayText(readField(raw, "description") || ""),
    status: normalizeStatus(readField(raw, "status")),
    ticketStatus: normalizeStatus(readField(raw, "ticketStatus") ?? readField(raw, "status")),
    ticketStatusLabel: readField(raw, "ticketStatusLabel") || "",
    billingStatus: readField(raw, "billingStatus") || "",
    billingStatusLabel: readField(raw, "billingStatusLabel") || "",
    billingPeriod: readField(raw, "billingPeriod") || "",
    invoiceId: readField(raw, "invoiceId"),
    invoiceCode: readField(raw, "invoiceCode") || "",
    invoiceStatus: readField(raw, "invoiceStatus") || "",
    lineType: readField(raw, "lineType") || "",
    chargeAmount: toNumber(readField(raw, "chargeAmount")),
    checkoutUrl: readField(raw, "checkoutUrl") || "",
    createdBy: normalizeUser(readField(raw, "createdBy")),
    assignedTo: normalizeUser(readField(raw, "assignedTo")),
    workerName: readField(raw, "repairmanName") || readField(raw, "workerName") || "",
    repairmanPhone: readField(raw, "repairmanPhone") || "",
    repairItems: readField(raw, "repairItems") || "",
    rootCause: readField(raw, "rootCause") || "",
    costAmount: toNumber(readField(raw, "actualCost") ?? readField(raw, "costAmount")),
    costDescription: maintenanceDisplayText(readField(raw, "costDescription") || ""),
    costResponsibility: readField(raw, "costResponsibility") || "UNDECIDED",
    rejectionReason: readField(raw, "rejectionReason") || "",
    createdAt: readField(raw, "createdAt") || "",
    updatedAt: readField(raw, "updatedAt") || "",
    completedAt: readField(raw, "completedAt") || "",
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
      details: payload.details,
      status: response.status,
      payload,
    });
  }
  if (Object.prototype.hasOwnProperty.call(payload, "code")) {
    if (payload.code !== 0) {
      throw new ApiError(payload.message || payload.details || "Không xử lý được phiếu sự cố.", {
        code: payload.code,
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
    severity = "all",
    scope = "all",
    roomId = "",
    propertyId = "",
  } = filters;
  const params = new URLSearchParams({ page: String(page), size: String(size), sort: "createdAt,desc" });
  if (keyword.trim()) params.set("code", keyword.trim());
  if (status && status !== "all") params.set("status", status);
  if (category && category !== "all") params.set("category", category);
  if (severity && severity !== "all") params.set("severity", severity);
  if (scope && scope !== "all") params.set("scope", scope);
  if (roomId) params.set("roomId", String(roomId));
  if (propertyId) params.set("propertyId", String(propertyId));

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
    fileId: readField(data, "fileId") ?? readField(data, "id"),
    url: resolveFileUrl(readField(data, "url") || ""),
    originalFileName: readField(data, "originalFileName") || file.name,
  };
}
