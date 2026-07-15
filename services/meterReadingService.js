import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

const BASE = API_BASE_URL;

/**
 * Fetch batch status for meter readings
 * GET /api/v1/meter-readings/batch-status?period=MM-yyyy&propertyId=X
 */
export async function fetchBatchMeterReadingsStatus(period, propertyId) {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (propertyId) params.append("propertyId", propertyId);

    const queryString = params.toString();
    const url = `${BASE}/meter-readings/batch-status${queryString ? `?${queryString}` : ""}`;

    return authenticatedFetch(url, { method: "GET" });
}

/**
 * Fetch batch history
 * GET /api/v1/meter-readings/history?propertyId=X
 */
export async function fetchBatchHistory(propertyId) {
    const params = new URLSearchParams();
    if (propertyId) params.append("propertyId", propertyId);

    const queryString = params.toString();
    const url = `${BASE}/meter-readings/history${queryString ? `?${queryString}` : ""}`;

    return authenticatedFetch(url, { method: "GET" });
}

/**
 * Fetch utility dashboard
 * GET /api/v1/meter-readings/dashboard?propertyId=X
 */
export async function fetchUtilityDashboard(propertyId) {
    const params = new URLSearchParams();
    if (propertyId) params.append("propertyId", propertyId);

    const queryString = params.toString();
    const url = `${BASE}/meter-readings/dashboard${queryString ? `?${queryString}` : ""}`;

    return authenticatedFetch(url, { method: "GET" });
}

/**
 * Submit batch meter readings
 * POST /api/v1/meter-readings/batches
 */
export async function submitBatchMeterReadings(payload) {
    return authenticatedFetch(`${BASE}/meter-readings/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}

/**
 * Start a new batch
 * POST /api/v1/meter-readings/batches/start
 */
export async function startBatchReading(period, propertyId) {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (propertyId) params.append("propertyId", propertyId);

    return authenticatedFetch(`${BASE}/meter-readings/batches/start?${params.toString()}`, {
        method: "POST",
    });
}

/**
 * Save progressive room reading
 * PUT /api/v1/meter-readings/batches/{batchId}/rooms/{roomId}
 */
export async function saveProgressiveRoomReading(batchId, roomId, payload) {
    return authenticatedFetch(`${BASE}/meter-readings/batches/${batchId}/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}

export async function uploadMeterReadingPhoto(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "METER_PHOTO");
    formData.append("isSensitive", "false");

    return authenticatedFetch(`${BASE}/files/upload`, {
        method: "POST",
        body: formData,
    });
}

/**
 * Confirm batch
 * POST /api/v1/meter-readings/batches/{batchId}/confirm
 */
export async function confirmBatch(batchId) {
    return authenticatedFetch(`${BASE}/meter-readings/batches/${batchId}/confirm`, {
        method: "POST",
    });
}
