import { API_BASE_URL } from "@/lib/apiConfig";
import { normalizePageResponse, readPageItems } from "@/lib/pageResponse";

export { API_BASE_URL };

export class ApiError extends Error {
    constructor(message, { code, errorCode, details, status, payload } = {}) {
        super(message || stringifyDetails(details) || messageForStatus(status));
        this.name = "ApiError";
        this.code = code;
        this.errorCode = errorCode ?? (code == null ? undefined : String(code));
        this.details = details;
        this.status = status;
        this.payload = payload;
        this.isApiError = true;
    }
}

export function getAuthToken() {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("token") || "";
}

export function clearAuthSession() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("userRole");
}

function getAuthHeaders(extraHeaders = {}) {
    const token = getAuthToken();
    return {
        Accept: "application/json",
        "X-Client-Type": "web",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
    };
}

function stringifyDetails(details) {
    if (!details) return "";
    if (typeof details === "string") return details;
    try {
        return JSON.stringify(details);
    } catch {
        return String(details);
    }
}

function messageForStatus(status) {
    if (status === 401) return "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập.";
    if (status === 403) return "Bạn không có quyền truy cập chức năng này.";
    if (status === 404) return "Không tìm thấy tài nguyên hoặc endpoint.";
    if (status >= 500) return "Lỗi hệ thống. Vui lòng thử lại sau.";
    return "Không thể xử lý yêu cầu.";
}

async function readResponsePayload(response) {
    if (response.status === 204) return { payload: null, rawText: "" };

    const rawText = await response.text().catch(() => "");
    if (!rawText) return { payload: null, rawText: "" };

    try {
        return { payload: JSON.parse(rawText), rawText };
    } catch {
        return { payload: parseXmlEnvelope(rawText), rawText };
    }
}

function parseXmlEnvelope(rawText) {
    const trimmed = rawText.trim();
    if (!trimmed.startsWith("<")) return null;

    const tagValue = (tag) => {
        const match = trimmed.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
        return match?.[1]?.trim();
    };

    const code = tagValue("code");
    const errorCode = tagValue("errorCode");
    const message = tagValue("message");
    const details = tagValue("details");

    if (code === undefined && message === undefined && details === undefined) {
        return null;
    }

    return {
        ...(code !== undefined ? { code: Number.isNaN(Number(code)) ? code : Number(code) } : {}),
        ...(errorCode !== undefined ? { errorCode } : {}),
        ...(message !== undefined ? { message } : {}),
        ...(details !== undefined ? { details } : {}),
    };
}

function isSuccessCode(code) {
    return code === undefined || code === null || code === 0 || code === "0";
}

function isEnvelopePayload(payload) {
    return (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        ("code" in payload || "data" in payload || "message" in payload || "details" in payload)
    );
}

async function safeFetch(url, options) {
    try {
        return await fetch(url, options);
    } catch (error) {
        throw new ApiError("Không thể kết nối máy chủ.", {
            details: error?.message,
        });
    }
}

function resolveApiUrl(url) {
    if (!url) return API_BASE_URL;
    if (/^https?:\/\//i.test(url)) return url;

    const baseUrl = API_BASE_URL.replace(/\/+$/, "");
    if (url === baseUrl || url.startsWith(`${baseUrl}/`)) return url;
    if (url === "/api/v1" || url.startsWith("/api/v1/")) {
        if (/^https?:\/\//i.test(baseUrl)) {
            return `${baseUrl.replace(/\/api\/v1$/i, "")}${url}`;
        }
        return url;
    }

    return url.startsWith("/") ? `${baseUrl}${url}` : url;
}

export async function parseEnvelope(response) {
    const { payload, rawText } = await readResponsePayload(response);
    const isEnvelope = isEnvelopePayload(payload);
    const code = isEnvelope ? payload.code : undefined;
    const errorCode = isEnvelope ? payload.errorCode : undefined;
    const details = isEnvelope ? payload.details : rawText;
    const message = isEnvelope ? payload.message : rawText;

    if (!response.ok || (isEnvelope && !isSuccessCode(code))) {
        throw new ApiError(message || stringifyDetails(details), {
            code,
            errorCode,
            details,
            status: response.status,
            payload,
        });
    }

    if (response.status === 204) return {};
    if (payload === null) return rawText || {};
    if (!isEnvelope) return payload ?? rawText;
    return payload.data ?? {};
}

export async function authenticatedFetch(url, options = {}) {
    const fullUrl = resolveApiUrl(url);
    const requestOptions = {
        ...options,
        credentials: "include",
        headers: getAuthHeaders(options.headers),
    };

    const res = await safeFetch(fullUrl, requestOptions);

    if (res.status !== 401) {
        return parseEnvelope(res);
    }

    let newToken;
    try {
        newToken = await refreshTokenApi();
    } catch (error) {
        clearAuthSession();
        if (error?.isApiError) {
            throw error;
        }
        throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", {
            status: 401,
            details: error?.message,
        });
    }

    const retryRes = await safeFetch(fullUrl, {
        ...options,
        credentials: "include",
        headers: {
            ...getAuthHeaders(options.headers),
            Authorization: `Bearer ${newToken}`,
        },
    });

    if (retryRes.status === 401) {
        clearAuthSession();
        throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", {
            status: 401,
        });
    }

    return parseEnvelope(retryRes);
}

export async function getCurrentUserProfile() {
    return authenticatedFetch(`${API_BASE_URL}/person-profiles/me`, {
        method: "GET",
    });
}

export async function loginWithPhonePassword({ phone, password }) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Client-Type": "web",
        },
        body: JSON.stringify({ phone, password }),
    });
    return parseEnvelope(response);
}

export async function requestPasswordReset({ email }) {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Client-Type": "web",
        },
        body: JSON.stringify({ email }),
    });
    return parseEnvelope(response);
}

export async function resetPasswordWithToken({ token, newPassword, confirmPassword }) {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Client-Type": "web",
        },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
    return parseEnvelope(response);
}

export async function logout() {
    const token = getAuthToken();
    try {
        return authenticatedFetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            body: JSON.stringify({ token }),
        });
    } catch {
        return null;
    }
}

export async function refreshTokenApi() {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Client-Type": "web"
        },
        body: JSON.stringify({}),
    });

    const data = await parseEnvelope(response);
    if (data?.token) {
        window.localStorage.setItem("token", data.token);
        return data.token;
    }
    throw new Error("Không thể làm mới phiên đăng nhập");
}

function normalizeUserAccount(item = {}) {
    const id = item.id ?? item.userId ?? item.user_id ?? null;
    const email = item.email ?? "";
    const phone = item.phone ?? "";
    const displayName =
        item.fullName ??
        item.full_name ??
        item.name ??
        "";
    const fullName =
        displayName ||
        email ||
        phone ||
        `Nhân viên #${id || ""}`.trim();

    const assignedProperties = normalizeAssignedProperties(item);

    return {
        ...item,
        id,
        userId: id,
        fullName,
        phone,
        email,
        role: item.role ?? item.roleName ?? item.role_name ?? "",
        status: item.status ?? item.accountStatus ?? item.account_status ?? "",
        mustChangePassword:
            item.mustChangePassword ?? item.must_change_password ?? false,
        lastLoginAt: item.lastLoginAt ?? item.last_login_at ?? null,
        createdAt: item.createdAt ?? item.created_at ?? null,
        updatedAt: item.updatedAt ?? item.updated_at ?? null,
        deletedAt: item.deletedAt ?? item.deleted_at ?? null,
        assignedProperties,
    };
}

function normalizeUserAccounts(data) {
    return readPageItems(data).map(normalizeUserAccount);
}

function normalizeAssignedProperties(item = {}) {
    const candidates =
        item.assignedProperties ??
        item.assigned_properties ??
        item.managedProperties ??
        item.managed_properties ??
        item.managerProperties ??
        item.manager_properties ??
        item.properties ??
        [];
    const source = Array.isArray(candidates) ? candidates : [candidates];
    const mapped = source
        .filter(Boolean)
        .map(normalizeSimpleProperty)
        .filter((property) => property.id);

    if (mapped.length) return mapped;

    const assignedProperty =
        item.assignedProperty ??
        item.assigned_property ??
        item.property ??
        null;
    if (assignedProperty) {
        const property = normalizeSimpleProperty(assignedProperty);
        return property.id ? [property] : [];
    }

    const flatPropertyId = item.propertyId ?? item.property_id ?? null;
    const flatPropertyName = item.propertyName ?? item.property_name ?? "";
    if (!flatPropertyId || !flatPropertyName) return [];
    return [
        {
            id: flatPropertyId,
            name: flatPropertyName,
            code: item.propertyCode ?? item.property_code ?? "",
        },
    ];
}

function normalizeSimpleProperty(item = {}) {
    return {
        id: item.id ?? item.propertyId ?? item.property_id ?? null,
        name: item.name ?? item.propertyName ?? item.property_name ?? "",
        code: item.propertyCode ?? item.property_code ?? item.code ?? "",
    };
}

export async function createStaffAccount({ phone, email, fullName, role, propertyId }) {
    const data = await authenticatedFetch(`${API_BASE_URL}/users/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            phone,
            email,
            fullName,
            initialRole: role,
            propertyId: propertyId || null,
        }),
    });
    return normalizeUserAccount(data);
}

export async function fetchUsers({ page = 0, size = 10, status, role, roles, search } = {}) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc",
    });
    if (status && status !== "all") params.set("status", status);
    if (Array.isArray(roles)) {
        roles.filter(Boolean).forEach((item) => params.append("roles", item));
    }
    if (role && role !== "all") params.set("role", role);
    if (search?.trim()) params.set("keyword", search.trim());

    const data = await authenticatedFetch(`${API_BASE_URL}/users/accounts?${params.toString()}`);
    const items = normalizeUserAccounts(data);
    return {
        ...normalizePageResponse(data, { page: page + 1, size, items }),
        items,
    };
}

export async function updateUserStatus(userId, { status }) {
    const data = await authenticatedFetch(`${API_BASE_URL}/users/${userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    return normalizeUserAccount(data);
}

export async function updateUserRole(userId, role) {
    const data = await authenticatedFetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
    });
    return normalizeUserAccount(data);
}

export async function updateUserAssignedProperty(userId, propertyId) {
    const data = await authenticatedFetch(`${API_BASE_URL}/users/${userId}/assigned-property`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
    });
    return normalizeUserAccount(data);
}

export async function fetchSimpleProperties() {
    const data = await authenticatedFetch(`${API_BASE_URL}/properties/simple`, {
        method: "GET",
    });
    return (Array.isArray(data) ? data : readPageItems(data)).map(normalizeSimpleProperty);
}

export async function deleteUser(userId) {
    return authenticatedFetch(`${API_BASE_URL}/users/${userId}`, {
        method: "DELETE",
    });
}

export async function restoreUser(userId) {
    return authenticatedFetch(`${API_BASE_URL}/users/${userId}/restore`, {
        method: "POST",
    });
}

function normalizeTenantAccountCandidate(item = {}) {
    return {
        ...item,
        contractId: item.contractId ?? item.contract_id ?? null,
        contractCode: item.contractCode ?? item.contract_code ?? "",
        contractStatus: item.contractStatus ?? item.contract_status ?? null,
        startDate: item.startDate ?? item.start_date ?? null,
        endDate: item.endDate ?? item.end_date ?? null,
        signedAt: item.signedAt ?? item.signed_at ?? null,
        propertyId: item.propertyId ?? item.property_id ?? null,
        propertyName: item.propertyName ?? item.property_name ?? "",
        roomId: item.roomId ?? item.room_id ?? null,
        roomCode: item.roomCode ?? item.room_code ?? "",
        roomStatus: item.roomStatus ?? item.room_status ?? null,
        occupantId: item.occupantId ?? item.occupant_id ?? null,
        profileId: item.profileId ?? item.profile_id ?? null,
        roomRole: item.roomRole ?? item.room_role ?? null,
        occupantStatus: item.occupantStatus ?? item.occupant_status ?? null,
        roomOccupantCount: item.roomOccupantCount ?? item.room_occupant_count ?? null,
        roomMaxOccupants: item.roomMaxOccupants ?? item.room_max_occupants ?? null,
        userId: item.userId ?? item.user_id ?? null,
        fullName: item.fullName ?? item.full_name ?? "",
        phone: item.phone ?? "",
        email: item.email ?? "",
        recipientEmail: item.recipientEmail ?? item.recipient_email ?? "",
        role: item.role ?? null,
        accountStatus: item.accountStatus ?? item.account_status ?? null,
        mustChangePassword: item.mustChangePassword ?? item.must_change_password ?? null,
        lastLoginAt: item.lastLoginAt ?? item.last_login_at ?? null,
        accountCreatedAt: item.accountCreatedAt ?? item.account_created_at ?? null,
        createdAt: item.createdAt ?? item.created_at ?? null,
        accountProvisioned: item.accountProvisioned ?? item.account_provisioned ?? false,
        emailAvailable: item.emailAvailable ?? item.email_available ?? Boolean(item.email),
        provisioningStatus:
            item.provisioningStatus ??
            item.provisioning_status ??
            "NOT_PROVISIONED",
        sentAt: item.sentAt ?? item.sent_at ?? null,
        failedAt: item.failedAt ?? item.failed_at ?? null,
        failureReason: item.failureReason ?? item.failure_reason ?? "",
        disabledReason: item.disabledReason ?? item.disabled_reason ?? "",
        disabledBy: item.disabledBy ?? item.disabled_by ?? null,
        disabledAt: item.disabledAt ?? item.disabled_at ?? null,
        attemptCount: item.attemptCount ?? item.attempt_count ?? 0,
        lastAttemptAt: item.lastAttemptAt ?? item.last_attempt_at ?? null,
        profileStatus: item.profileStatus ?? item.profile_status ?? null,
        missingIdentity: item.missingIdentity ?? item.missing_identity ?? false,
        missingPortrait: item.missingPortrait ?? item.missing_portrait ?? false,
        message: item.message ?? "",
    };
}

function normalizeTenantAccountCandidates(data) {
    return readPageItems(data).map(normalizeTenantAccountCandidate);
}

export async function fetchTenantAccountCandidates({ page = 0, size = 10 } = {}) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc",
    });
    const data = await authenticatedFetch(`${API_BASE_URL}/users/tenant-account-candidates?${params.toString()}`, {
        method: "GET",
    });
    const items = normalizeTenantAccountCandidates(data);
    return {
        ...normalizePageResponse(data, { page: page + 1, size, items }),
        items,
    };
}

export async function sendTenantAccountCredentials(contractId, { retry = false } = {}) {
    const params = retry ? "?retry=true" : "";
    const data = await authenticatedFetch(`${API_BASE_URL}/users/tenant-account-candidates/${contractId}/send${params}`, {
        method: "POST",
    });
    return normalizeTenantAccountCandidate(data);
}

export async function disableTenantAccountAccess(contractId, profileId, { reason } = {}) {
    const data = await authenticatedFetch(`${API_BASE_URL}/users/tenant-account-candidates/${contractId}/profiles/${profileId}/disable`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
    });
    return normalizeTenantAccountCandidate(data);
}

export async function updateCurrentUserProfile(payload) {
    return authenticatedFetch(`${API_BASE_URL}/person-profiles/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}

export async function uploadCurrentUserAvatar(file) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const data = await authenticatedFetch(`${API_BASE_URL}/files/upload`, {
            method: "POST",
            body: formData,
        });
        return { avatarUrl: data?.url };
    } catch {
        return { avatarUrl: "https://i.pravatar.cc/150?img=33" };
    }
}

export async function changeCurrentUserPassword({ oldPassword, currentPassword, newPassword }) {
    return authenticatedFetch(`${API_BASE_URL}/users/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            currentPassword: currentPassword ?? oldPassword,
            newPassword,
        }),
    });
}
