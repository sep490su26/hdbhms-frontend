import { ApiError, getAuthToken } from "@/services/identityAccessService";
import { API_BASE_URL } from "@/lib/apiConfig";

const API_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

async function request(path, options = {}) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "X-Client-Type": "web",
            ...options.headers,
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new ApiError(payload.message || payload.details || "Không xử lý được yêu cầu.", {
            code: payload.code,
            details: payload.details,
            status: response.status,
            payload,
        });
    }
    if (Object.prototype.hasOwnProperty.call(payload, "code")) {
        if (payload.code !== 0) {
            throw new ApiError(payload.message || payload.details || "Không xử lý được yêu cầu.", {
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

export async function fetchChangeRequests(filters = {}) {
    const { page = 0, size = 8, type = "all", status = "all", search = "" } = filters;
    const params = new URLSearchParams({ 
        page: String(page), 
        size: String(size), 
        sort: "createdAt,desc" 
    });
    
    if (type && type !== "all") params.set("type", type.toUpperCase());
    if (status && status !== "all") params.set("status", status.toUpperCase());
    if (search.trim()) params.set("search", search.trim());

    const data = await request(`/change-requests?${params.toString()}`);
    return {
        requests: Array.isArray(data.data) ? data.data : [],
        total: data.totalElements ?? 0,
        currentPage: data.currentPage ?? 1,
        totalPages: data.totalPages ?? 1,
    };
}

export async function fetchChangeRequestStats() {
    return await request('/change-requests/stats');
}

export async function approveChangeRequest(id) {
    return await request(`/change-requests/${id}/approve`, { method: "POST" });
}

export async function rejectChangeRequest(id, resolutionNote) {
    return await request(`/change-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ resolutionNote }),
    });
}
