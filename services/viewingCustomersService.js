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
    {value: "PENDING", label: "Chờ xem"},
    {value: "VIEWED", label: "Đã xem"},
    {value: "CANCELLED", label: "Hủy hẹn"},
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

/**
 * Maps a VisitRequestResponse (list) or VisitRequestDetailsResponse (detail) to frontend shape.
 * List response: visitorName, visitorPhone, visitorEmail, preferredStart, createdAt (NO id, property, room)
 * Details response: id, property { id, name }, room { id, roomCode, name }, + all list fields
 */
export function mapVisitRequest(item) {
    const preferredStart = readField(item, "preferredStart", "preferred_start");
    const createdAt = readField(item, "createdAt", "created_at");


    return {
        id: readField(item, "id"),
        fullName: readField(item, "visitorName", "visitor_name") || "",
        phone: readField(item, "visitorPhone", "visitor_phone") || "",
        email: readField(item, "visitorEmail", "visitor_email") || "",
        // propertyId: readField(property, "id"),
        propertyName: readField(item, "propertyName", "property_name") || "—",
        interestedRoomName: readField(item, "roomName", "room_name") || "",
        appointmentAt: preferredStart,
        appointmentLabel: formatAppointment(preferredStart),
        status: readField(item, "status") || "PENDING",
        note: readField(item, "notes") || "",
        createdAt,
        createdLabel: createdAt ? formatAppointment(createdAt) : "",
    };
}

/**
 * GET /api/v1/visit-requests
 * Backend params: keyword, propertyCode, roomCode, from, to, page (0-indexed), size
 */
export async function fetchViewingCustomers({filters, page, size}) {
    const data = await authenticatedFetch(`/visit-requests${toQuery({
        keyword: filters.keyword,
        propertyCode: filters.propertyId !== "all" ? filters.propertyId : undefined,
        roomCode: filters.roomId !== "all" ? filters.roomId : undefined,
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
            if (item.status === "PENDING") pendingCount++;
            if (item.status === "VIEWED") viewedCount++;
        }

        return {todayCount, pendingCount, viewedCount};
    } catch {
        return {todayCount: 0, pendingCount: 0, viewedCount: 0};
    }
}

/**
 * Trash endpoint doesn't exist in the backend yet — return empty results gracefully.
 */
export async function fetchViewingCustomerTrash({page, size}) {
    try {
        const data = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/trash${toQuery({
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
    } catch {
        return {items: [], total: 0, page: 1, size, totalPages: 0};
    }
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
        const data = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({status}),
        });
        return mapVisitRequest(data);
    } catch {
        return null;
    }
}

/**
 * DELETE endpoint doesn't exist yet — stub gracefully.
 */
export async function deleteViewingCustomer(id) {
    try {
        await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/${id}`, {
            method: "DELETE",
        });
    } catch {
        // Endpoint not available yet
    }
}

export async function restoreViewingCustomer(id) {
    try {
        const data = await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/${id}/restore`, {
            method: "POST",
        });
        return mapVisitRequest(data);
    } catch {
        return null;
    }
}

export async function forceDeleteViewingCustomer(id) {
    try {
        await authenticatedFetch(`/tenants/${TENANT_ID}/visit-requests/${id}/force`, {
            method: "DELETE",
        });
    } catch {
        // Endpoint not available yet
    }
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
            propertyCode: property.property_code,   // snake_case → camelCase
        }));
    } catch {
        // Fallback only if the API truly fails (network error)
        return [{id: 1, name: 'Hải Đăng House', propertyCode: 'HDH'}];
    }
}

/**
 * Rooms by property — try the endpoint, fallback to empty.
 */
export async function fetchViewingRooms(propertyId) {
    if (!propertyId || propertyId === 'all') return [];
    try {
        const envelope = await authenticatedFetch(`/rooms?propertyId=${propertyId}`);
        const propertiesArray = envelope?.data?.data ?? envelope?.data ?? [];
        return propertiesArray.map((room) => ({
            id: room.id,
            propertyId: room.property?.id ?? propertyId,   // nested object
            roomCode: room.room_code,
            name: room.name || `Phòng ${room.room_code}`,
            status: room.current_status,
        }));
    } catch {
        return [];
    }
}
