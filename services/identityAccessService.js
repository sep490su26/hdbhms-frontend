export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

let mockCurrentUser = {
    id: 42,
    phone: "0901234567",
    email: "admin@haidang.vn",
    role: "OWNER",
    status: "ACTIVE",
    emailVerified: true,
    fullName: "Phạm Thành Công",
    avatarUrl: "https://i.pravatar.cc/300?img=33",
    assignedBranch: "Cơ sở Quận 7 - Sky Tower",
    position: "Chủ quản hệ thống",
    startDate: "2022-06-15",
    lastLoginAt: "2026-05-25T12:10:00",
    createdAt: "2026-05-22T12:00:00",
};

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
    if (IS_MOCK_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return {...mockCurrentUser};
    }

    return authenticatedFetch("/users/me", {
        method: "GET",
    });
}

export async function updateCurrentUserProfile({phone, email}) {
    if (IS_MOCK_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 650));
        mockCurrentUser = {
            ...mockCurrentUser,
            phone,
            email,
            updatedAt: new Date().toISOString(),
        };
        return {...mockCurrentUser};
    }

    return authenticatedFetch("/users/me", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({phone, email}),
    });
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Khong the doc file anh."));
        reader.readAsDataURL(file);
    });
}

export async function uploadCurrentUserAvatar(file) {
    if (IS_MOCK_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 900));
        const avatarUrl = await fileToDataUrl(file);
        mockCurrentUser = {...mockCurrentUser, avatarUrl};
        return {avatarUrl};
    }

    const formData = new FormData();
    formData.append("avatar", file);

    const result = await authenticatedFetch("/person-profiles/me/avatar", {
        method: "POST",
        body: formData,
    });
    const avatarUrl =
        result.avatarUrl ||
        result.avatar_url ||
        result.url ||
        await fileToDataUrl(file);

    return {...result, avatarUrl};
}

export async function loginWithPhonePassword({phone, password}) {
    if (IS_MOCK_MODE) {
        return {...mockCurrentUser};
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
