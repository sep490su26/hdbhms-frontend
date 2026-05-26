const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
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

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new Error(`Không thể gọi API backend ${API_BASE_URL}. Kiểm tra backend đang chạy và CORS cho localhost:3000.`);
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(body.details || body.message || "Không thể kết nối API.");
  }

  if (body.code && body.code !== 1000 && body.code !== 0) {
    throw new Error(body.details || body.message || "API trả về lỗi.");
  }

  return body.data ?? body;
}

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
  const appointmentAt = readField(item, "appointmentAt", "appointment_at");
  const deletedAt = readField(item, "deletedAt", "deleted_at");
  const roomCode = readField(item, "roomCode", "room_code");

  return {
    id: readField(item, "id"),
    fullName: readField(item, "customerName", "customer_name"),
    phone: readField(item, "phone"),
    propertyId: readField(item, "propertyId", "property_id"),
    propertyName: readField(item, "propertyName", "property_name") || "—",
    interestedRoomId: readField(item, "roomId", "room_id"),
    interestedRoomName: roomCode ? `Phòng ${roomCode}` : "",
    appointmentAt,
    appointmentLabel: formatAppointment(appointmentAt),
    status: readField(item, "status"),
    note: readField(item, "note") || "",
    deletedAt,
    deletedLabel: deletedAt ? formatAppointment(deletedAt) : "",
  };
}

export async function fetchViewingCustomers({ filters, page, size }) {
  const data = await request(`/api/v1/tenants/${TENANT_ID}/visit-requests${toQuery({
    keyword: filters.keyword,
    propertyId: filters.propertyId,
    roomId: filters.roomId,
    status: filters.status,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    page,
    size,
  })}`);

  return {
    items: (data.items || []).map(mapVisitRequest),
    total: readField(data, "total") || 0,
    page: readField(data, "page") || 1,
    size: readField(data, "size") || size,
    totalPages: readField(data, "totalPages", "total_pages") || 0,
  };
}

export async function fetchViewingCustomerStats(filters) {
  const data = await request(`/api/v1/tenants/${TENANT_ID}/visit-requests/stats${toQuery({
    propertyId: filters.propertyId,
    roomId: filters.roomId,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  })}`);

  return {
    todayCount: readField(data, "todayCount", "today_count") || 0,
    pendingCount: readField(data, "pendingCount", "pending_count") || 0,
    viewedCount: readField(data, "viewedCount", "viewed_count") || 0,
    closingRate: readField(data, "closingRate", "closing_rate") || 0,
  };
}

export async function fetchViewingCustomerTrash({ filters, page, size }) {
  const data = await request(`/api/v1/tenants/${TENANT_ID}/visit-requests/trash${toQuery({
    keyword: filters.keyword,
    propertyId: filters.propertyId,
    roomId: filters.roomId,
    status: filters.status,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    page,
    size,
  })}`);

  return {
    items: (data.items || []).map(mapVisitRequest),
    total: readField(data, "total") || 0,
    page: readField(data, "page") || 1,
    size: readField(data, "size") || size,
    totalPages: readField(data, "totalPages", "total_pages") || 0,
  };
}

export async function createViewingCustomer(payload) {
  const data = await request(`/api/v1/tenants/${TENANT_ID}/visit-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapVisitRequest(data);
}

export async function updateViewingCustomer(id, payload) {
  const data = await request(`/api/v1/tenants/${TENANT_ID}/visit-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapVisitRequest(data);
}

export async function updateViewingCustomerStatus(id, status) {
  const data = await request(`/api/v1/tenants/${TENANT_ID}/visit-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return mapVisitRequest(data);
}

export async function deleteViewingCustomer(id) {
  await request(`/api/v1/tenants/${TENANT_ID}/visit-requests/${id}`, {
    method: "DELETE",
  });
}

export async function restoreViewingCustomer(id) {
  const data = await request(`/api/v1/tenants/${TENANT_ID}/visit-requests/${id}/restore`, {
    method: "POST",
  });
  return mapVisitRequest(data);
}

export async function forceDeleteViewingCustomer(id) {
  await request(`/api/v1/tenants/${TENANT_ID}/visit-requests/${id}/force`, {
    method: "DELETE",
  });
}

export async function fetchViewingProperties() {
  const data = await request("/api/v1/properties/simple");
  return (data || []).map((property) => ({
    id: readField(property, "id"),
    name: readField(property, "name"),
    propertyCode: readField(property, "propertyCode", "property_code"),
  }));
}

export async function fetchViewingRooms(propertyId) {
  if (!propertyId || propertyId === "all") return [];
  const data = await request(`/api/v1/properties/${propertyId}/rooms/simple`);
  return (data || []).map((room) => ({
    id: readField(room, "id"),
    propertyId: readField(room, "propertyId", "property_id") ?? Number(propertyId),
    roomCode: readField(room, "roomCode", "room_code"),
    name: readField(room, "name") || `Phòng ${readField(room, "roomCode", "room_code")}`,
    status: readField(room, "status"),
    listedPrice: readField(room, "listedPrice", "listed_price"),
  }));
}
