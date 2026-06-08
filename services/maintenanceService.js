import { ApiError, getAuthToken } from "@/services/identityAccessService";
import { API_BASE_URL } from "@/lib/apiConfig";

function readField(source, ...keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTicket(raw = {}) {
  const id = readField(raw, "id");
  return {
    id,
    ticketCode: readField(raw, "ticketCode", "ticket_code", "code") || `#SC-${id || ""}`,
    propertyId: readField(raw, "propertyId", "property_id"),
    roomId: readField(raw, "roomId", "room_id"),
    roomCode: readField(raw, "roomCode", "room_code") || "",
    roomName: readField(raw, "roomName", "room_name") || "",
    ticketScope: readField(raw, "ticketScope", "ticket_scope") || "TENANT_ROOM",
    priority: readField(raw, "priority") || "MEDIUM",
    category: readField(raw, "category") || "OTHER",
    title: readField(raw, "title") || "Phiếu sự cố",
    description: readField(raw, "description") || "",
    status: readField(raw, "status") || "PENDING_ACCEPTANCE",
    workerName: readField(raw, "workerName", "worker_name") || "",
    repairItems: readField(raw, "repairItems", "repair_items") || "",
    rootCause: readField(raw, "rootCause", "root_cause") || "",
    costAmount: toNumber(readField(raw, "costAmount", "cost_amount")),
    costDescription: readField(raw, "costDescription", "cost_description") || "",
    paidBy: readField(raw, "paidBy", "paid_by") || "",
    rejectionReason: readField(raw, "rejectionReason", "rejection_reason") || "",
    createdAt: readField(raw, "createdAt", "created_at") || "",
    updatedAt: readField(raw, "updatedAt", "updated_at") || "",
    completedAt: readField(raw, "completedAt", "completed_at") || "",
    events: Array.isArray(raw.events) ? raw.events : [],
  };
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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

export async function fetchMaintenanceTickets({ page = 0, size = 100, status = "all", keyword = "", type = "" } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  if (keyword.trim()) params.set("code", keyword.trim());
  if (status && status !== "all") params.set("status", status);
  if (type && type !== "all") params.set("type", type);

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

export async function approveMaintenanceTicket(id) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/approve`, { method: "POST" }));
}

export async function declineMaintenanceTicket(id, reason) {
  return normalizeTicket(
    await request(`/maintenance/tickets/${id}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  );
}

export async function updateMaintenanceProgress(id, payload) {
  return normalizeTicket(
    await request(`/maintenance/tickets/${id}/progress`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export async function completeMaintenanceTicket(id, payload) {
  return normalizeTicket(
    await request(`/maintenance/tickets/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export async function confirmMaintenanceTicket(id) {
  return normalizeTicket(await request(`/maintenance/tickets/${id}/confirm`, { method: "POST" }));
}
