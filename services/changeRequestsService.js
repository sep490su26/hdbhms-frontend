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
    const rawItems = Array.isArray(data.data || data.content) ? (data.data || data.content) : [];
    
    // Normalize snake_case → camelCase for consistent frontend usage
    const requests = rawItems.map(r => ({
        id: r.id,
        requestCode: r.requestCode || r.request_code,
        requestType: r.requestType || r.request_type,
        title: r.title,
        description: r.description,
        status: r.status,
        requesterId: r.requesterId || r.requester_id,
        resolutionNote: r.resolutionNote || r.resolution_note,
        resolvedAt: r.resolvedAt || r.resolved_at,
        createdAt: r.createdAt || r.created_at,
        requestPayload: r.requestPayload || r.request_payload,
    }));
    
    return {
        requests,
        total: data.totalElements ?? data.total_elements ?? 0,
        currentPage: data.currentPage ?? data.current_page ?? 1,
        totalPages: data.totalPages ?? data.total_pages ?? 1,
    };
}

export async function fetchChangeRequestStats() {
    const data = await request('/change-requests/stats');
    return {
        pendingCount: data.pendingApproval ?? data.pending_approval ?? 0,
        approvedCount: data.approvedToday ?? data.approved_today ?? 0,
        rejectedCount: data.rejectedToday ?? data.rejected_today ?? 0,
        totalCount: data.thisMonthTotal ?? data.this_month_total ?? 0,
        breakdown: data.requestTypeBreakdown ?? data.request_type_breakdown
            ? Object.entries(data.requestTypeBreakdown || data.request_type_breakdown).map(([type, count]) => ({ type, count }))
            : [],
    };
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
