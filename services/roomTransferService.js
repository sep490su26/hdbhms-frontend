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
        requestCode: data.requestCode || data.request_code,
        requesterId: data.requesterId || data.requester_id,
        oldContractId: data.oldContractId || data.old_contract_id,
        oldRoomId: data.oldRoomId || data.old_room_id,
        oldRoomName: data.oldRoomName || data.old_room_name,
        targetRoomId: data.targetRoomId || data.target_room_id,
        targetRoomName: data.targetRoomName || data.target_room_name,
        requestedTransferDate: data.requestedTransferDate || data.requested_transfer_date,
        status: data.status,
        reason: data.reason,
    };
}
