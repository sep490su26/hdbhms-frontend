import { API_BASE_URL } from "@/lib/apiConfig";

export { API_BASE_URL };

export class ApiError extends Error {
    constructor(message, { code, details, status, payload } = {}) {
        super(message || details || "Khong the xu ly yeu cau.");
        this.name = "ApiError";
        this.code = code;
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
        "X-Client-Type": "web",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
    };
}

export async function parseEnvelope(response) {
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.code !== 0) {
        throw new ApiError(payload.message || payload.details, {
            code: payload.code,
            details: payload.details,
            status: response.status,
            payload,
        });
    }

    return payload.data ?? {};
}

export async function authenticatedFetch(url, options = {}) {
    const fullUrl = url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
    const requestOptions = {
        ...options,
        credentials: "include",
        headers: getAuthHeaders(options.headers),
    };

    const res = await fetch(fullUrl, requestOptions);

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

    const retryRes = await fetch(fullUrl, {
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
    // Đổi thành false khi Backend đã sẵn sàng chạy thật
    const IS_MOCK_MODE = false;

    if (IS_MOCK_MODE) {
        // fix cung
        await new Promise((resolve) => setTimeout(resolve, 400)); // Giả lập delay mạng

        return {
            id: 42,
            phone: "0901234567",
            email: "admin@haidang.vn", //
            role: "OWNER",
            status: "ACTIVE",
            emailVerified: true,
            fullName: "Phạm Thành Công", // Đổ lên Top-bar
            avatarUrl: "https://i.pravatar.cc/150?img=33",
            lastLoginAt: "2026-05-25T12:10:00",
            createdAt: "2026-05-22T12:00:00"
        };
    } else {
        return authenticatedFetch(`${API_BASE_URL}/person-profiles/me`, {
            method: "GET",
        });
    }
}

export async function loginWithPhonePassword({ phone, password }) {
    const IS_MOCK_MODE = false;

    if (IS_MOCK_MODE) {
        return {
            id: 42,
            phone: "0901234567",
            email: "admin@haidang.vn", // Khớp với email góc phải trên UI
            role: "OWNER",
            status: "ACTIVE",
            emailVerified: true,
            fullName: "Phạm Thành Công", // Đổ dữ liệu động thay cho chữ Chủ trọ tĩnh
            avatarUrl: "https://i.pravatar.cc/150?img=33", // Đổ ảnh lên Avatar góc phải/trái
            lastLoginAt: "2026-05-25T12:10:00",
            createdAt: "2026-05-22T12:00:00"
        };
    } else {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-Client-Type": "web",
            },
            body: JSON.stringify({ phone, password }),
        });
        return parseEnvelope(response);
    }
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

export async function createStaffAccount({ phone, email, fullName, role }) {
    return authenticatedFetch(`${API_BASE_URL}/users/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            phone,
            email,
            full_name: fullName,
            initial_role: role,
        }),
    });
}

export async function fetchUsers({ page, size, status, role, search }) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });
    if (status && status !== "all") params.set("status", status);
    if (role && role !== "all") params.set("role", role);
    if (search?.trim()) params.set("keyword", search.trim());

    return authenticatedFetch(`${API_BASE_URL}/users?${params.toString()}`);
}

export async function updateUserStatus(userId, { status }) {
    return authenticatedFetch(`${API_BASE_URL}/users/${userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
}

export async function updateUserRole(userId, role) {
    return authenticatedFetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
    });
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
        accountProvisioned: item.accountProvisioned ?? item.account_provisioned ?? false,
        emailAvailable: item.emailAvailable ?? item.email_available ?? Boolean(item.email),
        provisioningStatus:
            item.provisioningStatus ??
            item.provisioning_status ??
            "NOT_PROVISIONED",
        sentAt: item.sentAt ?? item.sent_at ?? null,
        failedAt: item.failedAt ?? item.failed_at ?? null,
        failureReason: item.failureReason ?? item.failure_reason ?? "",
        attemptCount: item.attemptCount ?? item.attempt_count ?? 0,
        lastAttemptAt: item.lastAttemptAt ?? item.last_attempt_at ?? null,
        profileStatus: item.profileStatus ?? item.profile_status ?? null,
        missingIdentity: item.missingIdentity ?? item.missing_identity ?? false,
        missingPortrait: item.missingPortrait ?? item.missing_portrait ?? false,
        missingEmergencyContact:
            item.missingEmergencyContact ?? item.missing_emergency_contact ?? false,
        message: item.message ?? "",
    };
}

function normalizeTenantAccountCandidates(data) {
    return Array.isArray(data) ? data.map(normalizeTenantAccountCandidate) : [];
}

export async function fetchTenantAccountCandidates() {
    const data = await authenticatedFetch(`${API_BASE_URL}/users/tenant-account-candidates`, {
        method: "GET",
    });
    return normalizeTenantAccountCandidates(data);
}

export async function sendTenantAccountCredentials(contractId, { retry = false } = {}) {
    const params = retry ? "?retry=true" : "";
    const data = await authenticatedFetch(`${API_BASE_URL}/users/tenant-account-candidates/${contractId}/send${params}`, {
        method: "POST",
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
    // If backend doesn't support changing profile picture yet, we mock its return format
    // or upload to generic file storage and mock the updating process.
    try {
        const formData = new FormData();
        formData.append("file", file);
        const data = await authenticatedFetch(`${API_BASE_URL}/files/upload`, {
            method: "POST",
            body: formData,
        });
        return { avatarUrl: data?.url };
    } catch {
        // Mock fallback if /files/upload is not available
        return { avatarUrl: "https://i.pravatar.cc/150?img=33" };
    }
}

