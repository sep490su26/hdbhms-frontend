import { API_BASE_URL, ApiError, authenticatedFetch } from "@/services/identityAccessService";

const BASE = API_BASE_URL;

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("token") || "";
}

/**
 * Uploads a file to the generic file endpoint and returns the file metadata
 */
export async function uploadFile(file, category = "OTHER") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  return authenticatedFetch(`${BASE}/files/upload`, {
    method: "POST",
    body: formData,
  });
}

/**
 * Fetch latest meter readings for a room
 * GET /api/v1/tenants/{tenantId}/rooms/{roomId}/meter-readings/latest
 */
export async function fetchLatestReadings(tenantId, roomId) {
  if (!tenantId || !roomId) return null;
  try {
    return await authenticatedFetch(
      `${BASE}/tenants/${encodeURIComponent(tenantId)}/rooms/${encodeURIComponent(roomId)}/meter-readings/latest`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Create handover readings
 * POST /api/v1/lease-contracts/{contractId}/handover/meter-readings
 */
export async function createHandoverReadings(contractId, payload, handoverType = "MOVE_IN") {
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(contractId)}/handover/meter-readings?type=${encodeURIComponent(handoverType)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return data;
}

export async function fetchContractHandover(contractId, handoverType = "MOVE_IN") {
  return authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(contractId)}/handover?type=${encodeURIComponent(handoverType)}`,
    { method: "GET" }
  );
}
/**
 * Confirm handover
 * PATCH /api/v1/lease-contracts/{contractId}/handover/confirm
 */
export async function confirmHandover(contractId, body) {
  if (!contractId) throw new Error("Missing contractId");
  return authenticatedFetch(`${BASE}/lease-contracts/${encodeURIComponent(contractId)}/handover/confirm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
