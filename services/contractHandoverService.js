import { API_BASE_URL, authenticatedFetch, parseEnvelope } from "@/services/identityAccessService";

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
 * GET /api/v1/rooms/{roomId}/meter-readings/latest
 */
export async function fetchLatestReadings(roomId) {
  if (!roomId) throw new Error("Missing roomId");
  return authenticatedFetch(`${BASE}/rooms/${encodeURIComponent(roomId)}/meter-readings/latest`);
}

/**
 * Create handover readings
 * POST /api/v1/lease-contracts/{contractId}/handover/meter-readings
 */
export async function createHandoverReadings(contractId, body, type = "CHECK_IN") {
  if (!contractId) throw new Error("Missing contractId");
  return authenticatedFetch(`${BASE}/lease-contracts/${encodeURIComponent(contractId)}/handover/meter-readings?type=${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
