import { authenticatedFetch } from "./identityAccessService";

export async function fetchRequests(params) {
    const searchParams = new URLSearchParams();
    if (params.page !== undefined) searchParams.append("page", params.page);
    if (params.size !== undefined) searchParams.append("size", params.size);
    if (params.type && params.type !== "All Types") {
        // Map frontend type to backend RequestType enum
        const typeMap = {
            "Transfer Request": "ROOM_TRANSFER",
            "Move Out Request": "MOVE_OUT",
            "Contract Renewal": "CONTRACT_RENEWAL",
            "Contract Termination": "CONTRACT_TERMINATION",
            "Maintenance Request": "MAINTENANCE",
            "Complaint": "COMPLAINT",
            "Access Card Request": "ACCESS_CARD"
        };
        const backendType = typeMap[params.type];
        if (backendType) {
            searchParams.append("type", backendType);
        }
    }
    if (params.status && params.status !== "All") {
        searchParams.append("status", params.status.toUpperCase());
    }
    if (params.search) searchParams.append("search", params.search);

    return authenticatedFetch(`/change-requests?${searchParams.toString()}`);
}

export async function fetchRequestStats() {
    return authenticatedFetch(`/change-requests/stats`);
}

export async function approveRequest(id, resolutionNote) {
    return authenticatedFetch(`/change-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ resolutionNote }),
    });
}

export async function rejectRequest(id, resolutionNote) {
    return authenticatedFetch(`/change-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ resolutionNote }),
    });
}
