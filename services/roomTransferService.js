import { ApiError, getAuthToken } from "@/services/identityAccessService";
import { API_BASE_URL } from "@/lib/apiConfig";

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

export async function getRoomTransferByCode(requestCode) {
    const data = await request(`/occupant-transfer-requests/code/${requestCode}`);
    return {
        id: data.id,
        requestCode: data.requestCode,
        requesterId: data.requesterId,
        oldContractId: data.oldContractId,
        oldRoomId: data.oldRoomId,
        oldRoomName: data.oldRoomName,
        targetRoomId: data.targetRoomId,
        targetRoomName: data.targetRoomName,
        requestedTransferDate: data.requestedTransferDate,
        status: data.status,
        reason: data.reason,
    };
}
