import { API_BASE_URL, authenticatedFetch, getAuthToken } from "@/services/identityAccessService";

const BASE = API_BASE_URL;

/**
 * Fetch batch status for meter readings
 * GET /api/v1/meter-readings/batch-status?period=MM-yyyy&propertyId=X
 */
export async function fetchBatchMeterReadingsStatus(period, propertyId, batchId) {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (propertyId) params.append("propertyId", propertyId);
    if (batchId) params.append("batchId", batchId);

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

/**
 * Mark unresolved reading warnings in one room as checked.
 * PUT /api/v1/meter-readings/batches/{batchId}/rooms/{roomId}/anomalies/resolve
 */
export async function resolveMeterReadingAnomalies(batchId, roomId) {
    return authenticatedFetch(`${BASE}/meter-readings/batches/${batchId}/rooms/${roomId}/anomalies/resolve`, {
        method: "PUT",
    });
}

/**
 * Import electricity readings from an .xlsx file into a draft batch.
 * POST /api/v1/meter-readings/batches/{batchId}/import-excel
 */
export async function importMeterReadingsFromExcel(batchId, file) {
    const formData = new FormData();
    formData.append("file", file);
    return authenticatedFetch(`${BASE}/meter-readings/batches/${batchId}/import-excel`, {
        method: "POST",
        body: formData,
    });
}

function templateDownloadName(period) {
    return period ? `Kỳ nhập ${period}.xlsx` : "Kỳ nhập.xlsx";
}

function readDownloadFilename(response, fallback) {
    const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition") || "";
    const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
        try {
            return decodeURIComponent(encodedMatch[1].replace(/^"|"$/g, ""));
        } catch {
            return fallback;
        }
    }

    const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
    return filenameMatch?.[1] || fallback;
}

export async function downloadMeterReadingImportTemplate({period, propertyId, batchId} = {}) {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (propertyId) params.append("propertyId", propertyId);
    if (batchId) params.append("batchId", batchId);

    const token = getAuthToken();
    const query = params.toString();
    const response = await fetch(`${BASE}/meter-readings/import-template${query ? `?${query}` : ""}`, {
        method: "GET",
        credentials: "include",
        headers: {
            Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
    });
    if (!response.ok) {
        throw new Error("Không thể tải file mẫu nhập chỉ số điện.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = readDownloadFilename(response, templateDownloadName(period));
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
