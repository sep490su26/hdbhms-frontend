import {ApiError, getAuthToken} from "@/services/identityAccessService";
import {API_BASE_URL} from "@/lib/apiConfig";
import {normalizePageResponse, readPageItems} from "@/lib/pageResponse";

async function request(path, options = {}) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "X-Client-Type": "web",
            ...options.headers,
        },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new ApiError(payload.message || payload.details || "Không xử lý được yêu cầu.", {
            code: payload.code,
            errorCode: payload.errorCode,
            details: payload.details,
            status: response.status,
            payload,
        });
    }
    if (Object.prototype.hasOwnProperty.call(payload, "code")) {
        if (payload.code !== 0) {
            throw new ApiError(payload.message || payload.details || "Không xử lý được yêu cầu.", {
                code: payload.code,
                errorCode: payload.errorCode,
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
        oldContractCode: data.oldContractCode,
        oldRoomId: data.oldRoomId,
        oldRoomName: data.oldRoomName,
        oldRoomCode: data.oldRoomCode,
        oldRoomPrice: data.oldRoomPrice,
        targetRoomId: data.targetRoomId,
        targetRoomName: data.targetRoomName,
        targetRoomCode: data.targetRoomCode,
        newRoomPrice: data.newRoomPrice,
        priceDifferenceAmount: data.priceDifferenceAmount,
        priceDifferenceToPay: data.priceDifferenceToPay,
        sourceRoomWillBeEmptyAfterTransfer: data.sourceRoomWillBeEmptyAfterTransfer,
        remainingOccupantCountAfterTransfer: data.remainingOccupantCountAfterTransfer,
        transferringTenantProfileIds: Array.isArray(data.transferringTenantProfileIds) ? data.transferringTenantProfileIds : [],
        transferringTenantNames: data.transferringTenantNames || {},
        sourceHolderCandidateProfileIds: Array.isArray(data.sourceHolderCandidateProfileIds) ? data.sourceHolderCandidateProfileIds : [],
        sourceHolderCandidateNames: data.sourceHolderCandidateNames || {},
        nominatedHolderProfileId: data.nominatedHolderProfileId ?? null,
        requestedTransferDate: data.expectedTransferDate || data.requestedTransferDate,
        expectedTransferDate: data.expectedTransferDate || data.requestedTransferDate,
        status: data.status,
        reason: data.reason,
        targetTransferType: data.targetTransferType,
        targetContractId: data.targetContractId,
        newContractId: data.newContractId,
        replacementOldContractId: data.replacementOldContractId,
        reservedSlots: data.reservedSlots ?? null,
        reservationExpiresAt: data.reservationExpiresAt ?? null,
        targetHolderApprovedById: data.targetHolderApprovedById ?? null,
        targetHolderApprovedAt: data.targetHolderApprovedAt ?? null,
        targetHolderRejectedAt: data.targetHolderRejectedAt ?? null,
        priceDifferenceSettlementType: data.priceDifferenceSettlementType ?? data.positiveDifferenceSettlementType ?? null,
        positiveDifferenceSettlementType: data.positiveDifferenceSettlementType ?? data.priceDifferenceSettlementType ?? null,
        transferDifferenceInvoiceId: data.transferDifferenceInvoiceId,
        oldRoomFinalInvoiceId: data.oldRoomFinalInvoiceId,
        depositTransferSummary: data.depositTransferSummary || null,
        approvedById: data.approvedById ?? null,
        approvedByName: data.approvedByName ?? data.approverName ?? data.managerName ?? data.approvedBy?.fullName ?? null,
        approvedAt: data.approvedAt ?? null,
        executedAt: data.executedAt ?? null,
        completedAt: data.completedAt ?? null,
        actualTransferDate: data.actualTransferDate ?? data.transferDate ?? data.executedAt ?? data.completedAt ?? null,
        tenantName: data.tenantName ?? data.requesterName ?? data.customerName ?? data.primaryTenantName ?? null,
        tenantPhone: data.tenantPhone ?? data.requesterPhone ?? data.customerPhone ?? data.primaryTenantPhone ?? null,
        oldRoomFloorId: data.oldRoomFloorId ?? data.sourceFloorId ?? data.oldRoom?.floorId ?? data.oldRoom?.floor?.id ?? null,
        targetRoomFloorId: data.targetRoomFloorId ?? data.targetFloorId ?? data.targetRoom?.floorId ?? data.targetRoom?.floor?.id ?? null,
        debtSummary: data.debtSummary || null,
        violationSummary: data.violationSummary || null,
        transferCountThisYear: data.transferCountThisYear ?? 0,
        eligibilityCheckedAt: data.eligibilityCheckedAt ?? null,
        eligibleAtCreation: data.eligibleAtCreation ?? null,
        eligibilitySnapshot: data.eligibilitySnapshot ?? null,
        violationSnapshot: data.violationSnapshot ?? null,
        transferHistorySnapshot: data.transferHistorySnapshot ?? null,
        eligibilityWarnings: Array.isArray(data.eligibilityWarnings) ? data.eligibilityWarnings : [],
        paymentBranch: data.paymentBranch ?? null,
        transferOutHandoverRequired: data.transferOutHandoverRequired ?? null,
        transferInHandoverRequired: data.transferInHandoverRequired ?? null,
        roomHandoverRequired: data.roomHandoverRequired ?? null,
        allowedActions: Array.isArray(data.allowedActions) ? data.allowedActions : [],
        blockingReasons: Array.isArray(data.blockingReasons) ? data.blockingReasons : [],
    };
}

async function requestRoomTransferHistory(path) {
    const data = await request(path);
    const items = readPageItems(data).map(mapRoomTransfer);
    return {
        ...normalizePageResponse(data, {items}),
        items,
    };
}

export async function fetchRoomTransferHistory({
                                                   page = 1,
                                                   size = 10,
                                                   floorId = "",
                                                   roomId = "",
                                                   fromDate = "",
                                                   toDate = "",
                                               } = {}) {
    const params = new URLSearchParams({
        page: String(Math.max(0, Number(page) - 1)),
        size: String(size),
        sort: "executedAt,desc",
        status: "EXECUTED",
    });
    if (floorId) params.set("floorId", String(floorId));
    if (roomId) params.set("roomId", String(roomId));
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);

    try {
        return await requestRoomTransferHistory(`/occupant-transfer-requests/history?${params.toString()}`);
    } catch (error) {
        if (error?.status && error.status !== 404) throw error;
        return requestRoomTransferHistory(`/occupant-transfer-requests?${params.toString()}`);
    }
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
    return request(`/occupant-transfer-requests/${requestId}/contract/confirm`, {method: "POST"});
}

export async function rejectTransferContract(requestId) {
    return request(`/occupant-transfer-requests/${requestId}/contract/reject`, {method: "POST"});
}

export async function signTransferContract(requestId) {
    return request(`/occupant-transfer-requests/${requestId}/contract/sign`, {method: "POST"});
}

export async function signTransferContractDocument(requestId, leaseContractId) {
    return request(`/occupant-transfer-requests/${requestId}/contracts/${leaseContractId}/sign`, {method: "POST"});
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
