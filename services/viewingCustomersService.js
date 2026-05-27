import {
  API_BASE_URL,
  authenticatedFetch,
  parseEnvelope,
} from "./identityAccessService";

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "1";

export const VIEWING_STATUSES = {
  PENDING: "Chờ xem",
  VIEWED: "Đã xem",
  CANCELLED: "Hủy hẹn",
};

export const STATUS_OPTIONS = [
  { value: "PENDING", label: "Chờ xem" },
  { value: "VIEWED", label: "Đã xem" },
  { value: "CANCELLED", label: "Hủy hẹn" },
];



function readField(item, camelKey, snakeKey = camelKey) {
  return item?.[camelKey] ?? item?.[snakeKey];
}

function toQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    query.set(key, value);
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function getCurrentLocalDateTimeInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  now.setSeconds(0, 0);

  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function getAppointmentParts(value) {
  if (!value) return { appointmentDate: "", appointmentTime: "" };
  const [date = "", time = ""] = value.split("T");
  return {
    appointmentDate: date,
    appointmentTime: time.slice(0, 5),
  };
}

export function combineAppointmentParts(appointmentDate, appointmentTime) {
  if (!appointmentDate || !appointmentTime) return "";
  return `${appointmentDate}T${appointmentTime}:00`;
}

export function isFutureAppointment(appointmentDate, appointmentTime) {
  const value = combineAppointmentParts(appointmentDate, appointmentTime);
  if (!value) return false;

  const appointment = new Date(value);
  if (Number.isNaN(appointment.getTime())) return false;
  return appointment > new Date();
}

export function formatAppointment(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  if (sameDay) return `Hôm nay ${time}`;
  return `${date.toLocaleDateString("vi-VN")} ${time}`;
}

export function normalizePhone(value) {
  return value.replace(/\s+/g, "");
}

export function isValidVietnamPhone(value) {
  return /^(0|\+84)\d{9,10}$/.test(normalizePhone(value));
}

export function mapVisitRequest(item) {
  const preferredStart = readField(item, "preferredStart", "preferred_start");
  const createdAt = readField(item, "createdAt", "created_at");
  const property = readField(item, "property") || {};
  const room = readField(item, "room") || {};

  return {
    id: readField(item, "id"),
    fullName: readField(item, "visitorName", "visitor_name"),
    phone: readField(item, "visitorPhone", "visitor_phone"),
    email: readField(item, "visitorEmail", "visitor_email"),
    propertyId: readField(property, "id"),
    propertyName: readField(property, "name") || "—",
    interestedRoomId: readField(room, "id"),
    interestedRoomName: readField(room, "roomCode", "room_code") || readField(room, "name") || "",
    appointmentAt: preferredStart,
    appointmentLabel: formatAppointment(preferredStart),
    status: readField(item, "status"),
    note: readField(item, "notes") || "",
    createdAt,
    createdLabel: createdAt ? formatAppointment(createdAt) : "",
  };
}

export async function fetchViewingCustomers({ filters, page, size }) {
  const response = await authenticatedFetch(`/visit-requests${toQuery({
    keyword: filters.keyword,
    propertyCode: filters.propertyCode,
    roomCode: filters.roomCode,
    from: filters.fromDate,
    to: filters.toDate,
    page: page - 1, // Backend Pageable is 0-indexed
    size,
  })}`);
  const data = await parseEnvelope(response);

  return {
    items: (data.data || []).map(mapVisitRequest),
    total: readField(data, "totalElements", "total_elements") || 0,
    page: (readField(data, "currentPage", "current_page") || 0),
    size: readField(data, "pageSize", "page_size") || size,
    totalPages: readField(data, "totalPages", "total_pages") || 0,
  };
}

export async function fetchViewingCustomerStats(filters) {
  const response = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/stats${toQuery({
    propertyId: filters.propertyId,
    roomId: filters.roomId,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  })}`);
  const data = await parseEnvelope(response);

  return {
    todayCount: readField(data, "todayCount", "today_count") || 0,
    pendingCount: readField(data, "pendingCount", "pending_count") || 0,
    viewedCount: readField(data, "viewedCount", "viewed_count") || 0,
    closingRate: readField(data, "closingRate", "closing_rate") || 0,
  };
}

export async function fetchViewingCustomerTrash({ filters, page, size }) {
  const response = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/trash${toQuery({
    keyword: filters.keyword,
    propertyId: filters.propertyId,
    roomId: filters.roomId,
    status: filters.status,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    page,
    size,
  })}`);
  const data = await parseEnvelope(response);

  return {
    items: (data.items || []).map(mapVisitRequest),
    total: readField(data, "total") || 0,
    page: readField(data, "page") || 1,
    size: readField(data, "size") || size,
    totalPages: readField(data, "totalPages", "total_pages") || 0,
  };
}

// Logic hỗ trợ parse và mapping cho các service khác sử dụng
function getNumericId(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

export async function publicCreateViewingCustomer(payload) {
  const response = await fetch(`${API_BASE_URL}/visit-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
    body: JSON.stringify({
      visitor_name: payload.fullName,
      visitor_phone: payload.phone,
      visitor_email: payload.email || "",
      property_id: getNumericId(payload.propertyId),
      room_id: getNumericId(payload.roomId),
      preferred_start: payload.appointmentAt,
      notes: payload.note,
    }),
  });
  const data = await parseEnvelope(response);
  return mapVisitRequest(data);
}

export async function createViewingCustomer(payload) {
  const response = await authenticatedFetch("/visit-requests", {
    method: "POST",
    body: JSON.stringify({
      visitor_name: payload.fullName,
      visitor_phone: payload.phone,
      visitor_email: payload.email || "",
      property_id: getNumericId(payload.propertyId),
      room_id: getNumericId(payload.roomId),
      preferred_start: payload.appointmentAt,
      notes: payload.note,
    }),
  });
  const data = await parseEnvelope(response);
  return mapVisitRequest(data);
}

export async function updateViewingCustomer(id, payload) {
  const response = await authenticatedFetch(`/visit-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      visitor_name: payload.fullName,
      visitor_phone: payload.phone,
      visitor_email: payload.email || "",
      property_id: Number(payload.propertyId),
      room_id: payload.roomId ? Number(payload.roomId) : null,
      preferred_start: payload.appointmentAt,
      notes: payload.note,
    }),
  });
  const data = await parseEnvelope(response);
  return mapVisitRequest(data);
}

export async function updateViewingCustomerStatus(id, status) {
  const response = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const data = await parseEnvelope(response);
  return mapVisitRequest(data);
}

export async function deleteViewingCustomer(id) {
  const response = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/${id}`, {
    method: "DELETE",
  });
  await parseEnvelope(response);
}

export async function restoreViewingCustomer(id) {
  const response = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/${id}/restore`, {
    method: "POST",
  });
  const data = await parseEnvelope(response);
  return mapVisitRequest(data);
}

export async function forceDeleteViewingCustomer(id) {
  const response = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/${id}/force`, {
    method: "DELETE",
  });
  await parseEnvelope(response);
}

export async function fetchViewingProperties() {
  const response = await authenticatedFetch("/properties/simple");
  const data = await parseEnvelope(response);
  return (data || []).map((property) => ({
    id: readField(property, "id"),
    name: readField(property, "name"),
    propertyCode: readField(property, "propertyCode", "property_code"),
  }));
}

export async function fetchViewingRooms(propertyId) {
  if (!propertyId || propertyId === "all") return [];
  const response = await authenticatedFetch(`/properties/${propertyId}/rooms/simple`);
  const data = await parseEnvelope(response);
  return (data || []).map((room) => ({
    id: readField(room, "id"),
    propertyId: readField(room, "propertyId", "property_id") ?? Number(propertyId),
    roomCode: readField(room, "roomCode", "room_code"),
    name: readField(room, "name") || `Phòng ${readField(room, "roomCode", "room_code")}`,
    status: readField(room, "status"),
    listedPrice: readField(room, "listedPrice", "listed_price"),
  }));
}
