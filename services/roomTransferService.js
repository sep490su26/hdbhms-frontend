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

function mapRoomTransfer(data) {
    return {
        id: data.id,
        requestCode: data.requestCode,
        requesterId: data.requesterId,
        oldContractId: data.oldContractId,
        oldRoomId: data.oldRoomId,
        oldRoomName: data.oldRoomName,
        oldRoomCode: data.oldRoomCode,
        oldRoomPrice: data.oldRoomPrice,
        targetRoomId: data.targetRoomId,
        targetRoomName: data.targetRoomName,
        targetRoomCode: data.targetRoomCode,
        newRoomPrice: data.newRoomPrice,
        priceDifferenceToPay: data.priceDifferenceToPay,
        sourceRoomWillBeEmptyAfterTransfer: data.sourceRoomWillBeEmptyAfterTransfer,
        remainingOccupantCountAfterTransfer: data.remainingOccupantCountAfterTransfer,
        requestedTransferDate: data.expectedTransferDate || data.requestedTransferDate,
        expectedTransferDate: data.expectedTransferDate || data.requestedTransferDate,
        status: data.status,
        reason: data.reason,
        targetTransferType: data.targetTransferType,
        targetContractId: data.targetContractId,
        newContractId: data.newContractId,
        replacementOldContractId: data.replacementOldContractId,
        positiveDifferenceSettlementType: data.positiveDifferenceSettlementType,
        transferDifferenceInvoiceId: data.transferDifferenceInvoiceId,
        oldRoomFinalInvoiceId: data.oldRoomFinalInvoiceId,
        allowedActions: Array.isArray(data.allowedActions) ? data.allowedActions : [],
        blockingReasons: Array.isArray(data.blockingReasons) ? data.blockingReasons : [],
    };
}

export async function getRoomTransferByCode(requestCode) {
    const data = await request(`/occupant-transfer-requests/code/${requestCode}`);
    return mapRoomTransfer(data);
}

export async function getRoomTransferById(requestId) {
    const data = await request(`/occupant-transfer-requests/${requestId}`);
    return mapRoomTransfer(data);
}

export async function confirmTransferContract(requestId) {
    return request(`/occupant-transfer-requests/${requestId}/contract/confirm`, { method: "POST" });
}

export async function rejectTransferContract(requestId) {
    return request(`/occupant-transfer-requests/${requestId}/contract/reject`, { method: "POST" });
}

export async function signTransferContract(requestId) {
    return request(`/occupant-transfer-requests/${requestId}/contract/sign`, { method: "POST" });
}

export async function executeTransfer(requestId, payload) {
    return request(`/occupant-transfer-requests/${requestId}/execute`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function estimateTransferOutUtility(requestId, payload) {
    return request(`/occupant-transfer-requests/${requestId}/transfer-out-utility-estimate`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function completeTransfer(requestId, payload) {
    return request(`/occupant-transfer-requests/${requestId}/complete-with-handover`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
