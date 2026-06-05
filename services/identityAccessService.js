export const API_BASE_URL = "http://localhost:8080/api/v1";

export class ApiError extends Error {
    constructor(message, {code, details, status, payload} = {}) {
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

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

function onTokenRefreshed(newToken) {
    refreshSubscribers.forEach((cb) => cb(newToken));
    refreshSubscribers = [];
}

function getAuthHeaders(extraHeaders = {}) {
    return {
        "Authorization": `Bearer ${getAuthToken()}`,
        "X-Client-Type": "web",
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

    const res = await fetch(fullUrl, {
        ...options,
        credentials: "include",
        headers: getAuthHeaders(options.headers),
    });

    if (res.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshTokenApi()
                .then((newToken) => {
                    isRefreshing = false;
                    onTokenRefreshed(newToken);
                })
                .catch(() => {
                    isRefreshing = false;
                    window.localStorage.removeItem("token");
                    window.localStorage.removeItem("userRole");
                    window.location.href = "/login?reason=expired";
                });
        }

        return new Promise((resolve) => {
            subscribeTokenRefresh(async (newToken) => {
                const retryRes = await fetch(fullUrl, {
                    ...options,
                    credentials: "include",
                    headers: {
                        ...getAuthHeaders(options.headers),
                        Authorization: `Bearer ${newToken}`,
                    },
                });
                resolve(parseEnvelope(retryRes));
            });
        });
    }

    return parseEnvelope(res);
}

export async function getCurrentUserProfile() {
    // Đổi thành false khi Backend đã sẵn sàng chạy thật
    const IS_MOCK_MODE = true;

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

export async function loginWithPhonePassword({phone, password}) {
    const IS_MOCK_MODE = true;

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
            body: JSON.stringify({phone, password}),
        });
        return parseEnvelope(response);
    }
}

export async function logout() {
    const token = getAuthToken();
    try {
        return authenticatedFetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            body: JSON.stringify({token}),
        });
    } catch {
        return null;
    }
}

export async function refreshTokenApi() {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "X-Client-Type": "web"
        },
        body: JSON.stringify({token}),
    });

    const data = await parseEnvelope(response);
    if (data?.token) {
        window.localStorage.setItem("token", data.token);
        return data.token;
    }
    throw new Error("Không thể làm mới phiên đăng nhập");
}

export async function createStaffAccount({phone, email, fullName, role}) {
    return authenticatedFetch(`${API_BASE_URL}/users/staff`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            phone,
            email,
            full_name: fullName,
            initial_role: role,
        }),
    });
}

export async function fetchUsers({page, size, status, role, search}) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
    });
    if (status && status !== "all") params.set("status", status);
    if (role && role !== "all") params.set("role", role);
    if (search?.trim()) params.set("keyword", search.trim());

    return authenticatedFetch(`${API_BASE_URL}/users?${params.toString()}`);
}

export async function updateUserStatus(userId, {status}) {
    return authenticatedFetch(`${API_BASE_URL}/users/${userId}/status`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({status}),
    });
}

export async function updateUserRole(userId, role) {
    return authenticatedFetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({role}),
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
