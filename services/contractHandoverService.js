import { API_BASE_URL, ApiError, authenticatedFetch, getAuthToken, refreshTokenApi } from "@/services/identityAccessService";

const BASE = API_BASE_URL;

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

/**
 * Single-shot submit: saves readings + assets + confirms handover atomically.
 * POST /api/v1/lease-contracts/{contractId}/handover/submit
 */
export async function submitHandover(contractId, payload) {
  return authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(contractId)}/handover/submit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export async function confirmHandover(contractId, body) {
  if (!contractId) throw new Error("Missing contractId");
  return authenticatedFetch(`${BASE}/lease-contracts/${encodeURIComponent(contractId)}/handover/confirm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

export async function downloadHandoverDraftPdf(contractId, handoverType = "MOVE_IN") {
  const popup = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  if (popup) {
    popup.document.write("<!doctype html><title>Đang xử lý PDF</title><p style=\"font-family:Arial,sans-serif;padding:24px\">Đang tải biên bản bàn giao...</p>");
  }

  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/lease-contracts/${encodeURIComponent(contractId)}/handover/draft-pdf?type=${encodeURIComponent(handoverType)}`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error("Không thể tải file PDF bàn giao.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    popup?.close();
    throw error;
  }
}

export async function uploadHandoverSignedDocument(contractId, file, handoverType = "MOVE_IN") {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithAuth(`${API_BASE_URL}/lease-contracts/${encodeURIComponent(contractId)}/handover/document?type=${encodeURIComponent(handoverType)}`, {
    method: "PATCH",
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || "Lỗi upload biên bản bàn giao");
  }
  return true;
}
