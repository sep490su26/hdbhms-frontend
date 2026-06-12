import {
    API_BASE_URL,
    authenticatedFetch,
    parseEnvelope,
} from "./identityAccessService";

export const VIEWING_STATUSES = {
    NOT_VIEWED: "Chờ xem",
    VIEWED: "Đã xem",
    DISMISSED: "Hủy hẹn",
};

export const STATUS_OPTIONS = [
    {value: "NOT_VIEWED", label: "Chờ xem"},
    {value: "VIEWED", label: "Đã xem"},
    {value: "DISMISSED", label: "Hủy hẹn"},
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

function normalizeVisitStatus(status) {
    const normalized = String(status || "NOT_VIEWED").toUpperCase();
    if (normalized === "PENDING") return "NOT_VIEWED";
    if (normalized === "CANCELLED") return "DISMISSED";
    return normalized;
}

export function getCurrentLocalDateTimeInputValue() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    now.setSeconds(0, 0);

    const pad = (value) => String(value).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function getAppointmentParts(value) {
    if (!value) return {appointmentDate: "", appointmentTime: ""};
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
    const time = date.toLocaleTimeString("vi-VN", {hour: "2-digit", minute: "2-digit"});

    if (sameDay) return `Hôm nay ${time}`;
    return `${date.toLocaleDateString("vi-VN")} ${time}`;
}

export function normalizePhone(value) {
    return value.replace(/\s+/g, "");
}

export function isValidVietnamPhone(value) {
    return /^(0|\+84)\d{9,10}$/.test(normalizePhone(value));
}

export function getViewingCustomerErrorMessage(error, fallback = "Không thể tải dữ liệu khách xem phòng. Vui lòng thử lại.") {
    const rawMessage = String(error?.message || error?.details || "").trim();
    const normalized = rawMessage.toLowerCase();

    if (!rawMessage) return fallback;

    if (
        normalized.includes("unauthenticated") ||
        normalized.includes("unauthorized") ||
        normalized.includes("forbidden") ||
        error?.status === 401 ||
        error?.status === 403
    ) {
        return "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền truy cập. Vui lòng đăng nhập lại.";
    }

    if (
        normalized.includes("failed to fetch") ||
        normalized.includes("networkerror") ||
        normalized.includes("load failed")
    ) {
        return "Không thể kết nối máy chủ. Vui lòng kiểm tra backend hoặc thử lại sau.";
    }

    return rawMessage;
}

/**
 * Maps a VisitRequestResponse (list) or VisitRequestDetailsResponse (detail) to frontend shape.
 * List response: visitorName, visitorPhone, visitorEmail, preferredStart, createdAt (NO id, property, room)
 * Details response: id, property { id, name }, room { id, roomCode, name }, + all list fields
 */
export function mapVisitRequest(item) {
    const preferredStart = readField(item, "preferredStart", "preferred_start");
    const createdAt = readField(item, "createdAt", "created_at");
    const deletedAt = readField(item, "deletedAt", "deleted_at");
    const property = readField(item, "property") || {};
    const room = readField(item, "room") || {};


    return {
        id: readField(item, "id"),
        fullName: readField(item, "visitorName", "visitor_name") || "",
        phone: readField(item, "visitorPhone", "visitor_phone") || "",
        email: readField(item, "visitorEmail", "visitor_email") || "",
        propertyId: readField(item, "propertyId", "property_id") ?? readField(property, "id"),
        propertyName: readField(item, "propertyName", "property_name") || readField(property, "name") || "—",
        interestedRoomId: readField(item, "roomId", "room_id") ?? readField(room, "id"),
        interestedRoomName: readField(item, "roomName", "room_name") || readField(room, "name") || "",
        appointmentAt: preferredStart,
        appointmentLabel: formatAppointment(preferredStart),
        status: normalizeVisitStatus(readField(item, "status")),
        note: readField(item, "notes") ?? readField(item, "note") ?? "",
        createdAt,
        createdLabel: createdAt ? formatAppointment(createdAt) : "",
        deletedAt,
        deletedLabel: deletedAt ? formatAppointment(deletedAt) : "",
    };
}

/**
 * GET /api/v1/visit-requests
 * Backend params: keyword, propertyCode, roomCode, from, to, page (0-indexed), size
 */
export async function fetchViewingCustomers({filters, page, size}) {
    const data = await authenticatedFetch(`/visit-requests${toQuery({
        keyword: filters.keyword,
        propertyId: filters.propertyId !== "all" ? filters.propertyId : undefined,
        roomId: filters.roomId !== "all" ? filters.roomId : undefined,
        propertyCode: filters.propertyCode,
        roomCode: filters.roomCode,
        status: filters.status !== "all" ? filters.status : undefined,
        from: filters.fromDate ? `${filters.fromDate}T00:00:00` : undefined,
        to: filters.toDate ? `${filters.toDate}T23:59:59` : undefined,
        page: page - 1,
        size,
    })}`);

    return {
        items: (data.data || []).map(mapVisitRequest),
        total: readField(data, "totalElements", "total_elements") || 0,
        page: readField(data, "currentPage", "current_page") || 0,
        size: readField(data, "pageSize", "page_size") || size,
        totalPages: readField(data, "totalPages", "total_pages") || 0,
    };
}

/**
 * Compute stats client-side from the list data since /stats endpoint doesn't exist.
 */
export async function fetchViewingCustomerStats() {
    try {
        const data = await authenticatedFetch(`/visit-requests${toQuery({
            page: 0,
            size: 500,
        })}`);
        const items = (data.data || []).map(mapVisitRequest);

        const todayStr = new Date().toISOString().slice(0, 10);
        let todayCount = 0;
        let pendingCount = 0;
        let viewedCount = 0;

        for (const item of items) {
            if (item.appointmentAt && item.appointmentAt.startsWith(todayStr)) todayCount++;
            if (item.status === "NOT_VIEWED") pendingCount++;
            if (item.status === "VIEWED") viewedCount++;
        }

        return {todayCount, pendingCount, viewedCount};
    } catch {
        return {todayCount: 0, pendingCount: 0, viewedCount: 0};
    }
}

/**
 * GET /api/v1/visit-requests/trash
 */
export async function fetchViewingCustomerTrash({page, size}) {
    const data = await authenticatedFetch(`/visit-requests/trash${toQuery({
        page: page - 1,
        size,
    })}`);
    return {
        items: (data.data || []).map(mapVisitRequest),
        total: readField(data, "totalElements", "total_elements") || 0,
        page: readField(data, "currentPage", "current_page") || 1,
        size: readField(data, "pageSize", "page_size") || size,
        totalPages: readField(data, "totalPages", "total_pages") || 0,
    };
}

// Logic hỗ trợ parse và mapping cho các service khác sử dụng
function getNumericId(value) {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
}

/**
 * POST /api/v1/visit-requests (public, from room detail page)
 */
export async function publicCreateViewingCustomer(payload) {
    const response = await fetch(`${API_BASE_URL}/visit-requests`, {
        method: "POST",
        headers: {"Content-Type": "application/json", "X-Client-Type": "web"},
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

/**
 * POST /api/v1/visit-requests (authenticated, from dashboard)
 */
export async function createViewingCustomer(payload) {
    const data = await authenticatedFetch("/visit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            visitor_name: payload.customerName,
            visitor_phone: payload.phone,
            visitor_email: payload.email || "",
            property_id: getNumericId(payload.propertyId),
            room_id: getNumericId(payload.roomId),
            preferred_start: payload.appointmentAt,
            notes: payload.note,
        }),
    });
    return mapVisitRequest(data);
}

/**
 * PUT endpoint doesn't exist yet — stub with POST to create a new record.
 */
export async function updateViewingCustomer(id, payload) {
    return createViewingCustomer(payload);
}

/**
 * PATCH status endpoint doesn't exist yet — stub gracefully.
 */
export async function updateViewingCustomerStatus(id, status) {
    try {
        const data = await authenticatedFetch(`/visit-requests/${id}/status`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({status}),
        });
        return mapVisitRequest(data);
    } catch {
        return null;
    }
}

/**
 * DELETE /api/v1/visit-requests/{id} moves the visit request to trash.
 */
export async function deleteViewingCustomer(id) {
    return authenticatedFetch(`/visit-requests/${id}`, {
        method: "DELETE",
    });
}

export async function restoreViewingCustomer(id) {
    const data = await authenticatedFetch(`/visit-requests/${id}/restore`, {
        method: "POST",
    });
    return mapVisitRequest(data);
}

export async function forceDeleteViewingCustomer(id) {
    return authenticatedFetch(`/visit-requests/${id}/force`, {
        method: "DELETE",
    });
}

/**
 * Properties list — try the endpoint, fallback to a default property.
 */
export async function fetchViewingProperties() {
    try {
        const envelope = await authenticatedFetch('/properties');   // uses your existing endpoint
        // Unwrap the paginated response: { data: { data: [...], ... } }
        const propertiesArray = envelope?.data?.data ?? envelope?.data ?? [];

        return propertiesArray.map((property) => ({
            id: property.id,
            name: property.name,
            propertyCode: property.propertyCode ?? property.property_code,
        }));
    } catch {
        // Fallback only if the API truly fails (network error)
        return [];
    }
}

/**
 * Rooms by property — try the endpoint, fallback to empty.
 */
export async function fetchViewingRooms(propertyId) {
    if (!propertyId || propertyId === 'all') return [];
    try {
        const envelope = await authenticatedFetch(`/properties/${propertyId}/rooms/simple`);
        const propertiesArray = Array.isArray(envelope) ? envelope : (envelope?.data?.data ?? envelope?.data ?? []);
        return propertiesArray.map((room) => ({
            id: room.id,
            propertyId: room.propertyId ?? room.property_id ?? room.property?.id ?? propertyId,
            roomCode: room.roomCode ?? room.room_code,
            name: room.name || `Phòng ${room.roomCode ?? room.room_code}`,
            status: room.currentStatus ?? room.current_status,
        }));
    } catch {
        return [];
    }
}
