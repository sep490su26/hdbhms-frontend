import { API_BASE_URL, ApiError, authenticatedFetch, refreshTokenApi } from "@/services/identityAccessService";

const BASE = API_BASE_URL;

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("token") || "";
}

function authHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return {
    "X-Client-Type": "web",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: authHeaders(options.headers),
  });

  if (response.status !== 401) {
    return response;
  }

  await refreshTokenApi();
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: authHeaders(options.headers),
  });
}

async function readErrorMessage(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  return payload.message || payload.details || fallbackMessage;
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
  if (!roomId) return null;
  try {
    return await authenticatedFetch(
      `${BASE}/rooms/${encodeURIComponent(roomId)}/meter-readings/latest`,
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

export async function submitHandover(contractId, payload) {
  if (!contractId) throw new Error("Missing contractId");

  return authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(contractId)}/handover/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function uploadHandoverDocument(contractId, file, handoverType = "MOVE_IN") {
  if (!contractId) throw new Error("Missing contractId");
  if (!file) throw new Error("Missing handover document file");

  const formData = new FormData();
  formData.append("file", file);

  return authenticatedFetch(
    `${BASE}/lease-contracts/${encodeURIComponent(contractId)}/handover/document?type=${encodeURIComponent(handoverType)}`,
    {
      method: "PATCH",
      body: formData,
    },
  );
}

export const uploadHandoverSignedDocument = uploadHandoverDocument;

export async function fetchHandoverDraftPdfBlob(contractId, handoverType = "MOVE_IN") {
  if (!contractId) throw new Error("Missing contractId");

  const response = await fetchWithAuth(
    `${BASE}/lease-contracts/${encodeURIComponent(contractId)}/handover/draft-pdf?type=${encodeURIComponent(handoverType)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to download handover draft PDF."));
  }

  return response.blob();
}

export async function downloadHandoverDraftPdf(
  contractId,
  handoverType = "MOVE_IN",
  filename = "bien-ban-ban-giao.pdf",
) {
  const blob = await fetchHandoverDraftPdfBlob(contractId, handoverType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
