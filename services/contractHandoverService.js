import { API_BASE_URL, ApiError, authenticatedFetch, getAuthToken, refreshTokenApi } from "@/services/identityAccessService";

const BASE = API_BASE_URL;

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

function extractFilenameFromContentDisposition(headerValue) {
  if (!headerValue) return "";

  const filenameStarMatch = headerValue.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    const encoded = filenameStarMatch[1].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  const filenameMatch = headerValue.match(/filename\s*=\s*("[^"]+"|[^;]+)/i);
  if (!filenameMatch?.[1]) return "";
  return filenameMatch[1].trim().replace(/^"|"$/g, "");
}

function toDatePart(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatBbbgFilenameDate(value) {
  const datePart = toDatePart(value);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "Chua-Ro-Ngay";
  return `${match[3]}_${match[2]}_${match[1]}`;
}

function sanitizeFilenamePart(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const sanitized = String(value).trim().replace(/[^a-zA-Z0-9_-]/g, "");
  return sanitized || fallback;
}

function withRoomPrefix(roomCode) {
  if (roomCode.startsWith("Phong")) return roomCode;
  if (/^p/i.test(roomCode)) return `P${roomCode.slice(1)}`;
  return `P${roomCode}`;
}

export function buildHandoverDocumentFilename(item = {}) {
  const roomCode = withRoomPrefix(sanitizeFilenamePart(
    item.roomCode ?? item.room_code ?? item.room?.roomCode ?? item.room?.room_code,
    "Phong-X",
  ));
  const date = formatBbbgFilenameDate(
    item.handoverDate ??
      item.handover_date ??
      item.startDate ??
      item.start_date ??
      item.expectedMoveInDate ??
      item.expected_move_in_date,
  );

  return `${roomCode}_BBBG_${date}.pdf`;
}

const DEFAULT_HANDOVER_DOCUMENT_FILENAME = buildHandoverDocumentFilename();

/**
 * Uploads a file to the generic file endpoint and returns the file metadata
 */
export async function uploadFile(file, category = "OTHER") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  formData.append("isSensitive", "false");

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

export async function fetchHandoverDraftPdfFile(contractId, handoverType = "MOVE_IN") {
  if (!contractId) throw new Error("Missing contractId");

  const response = await fetchWithAuth(
    `${BASE}/lease-contracts/${encodeURIComponent(contractId)}/handover/draft-pdf?type=${encodeURIComponent(handoverType)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to download handover draft PDF."));
  }

  const contentDisposition =
    response.headers?.get?.("content-disposition") ||
    response.headers?.get?.("Content-Disposition") ||
    "";

  return {
    blob: await response.blob(),
    filename: extractFilenameFromContentDisposition(contentDisposition),
  };
}

export async function fetchHandoverDraftPdfBlob(contractId, handoverType = "MOVE_IN") {
  const file = await fetchHandoverDraftPdfFile(contractId, handoverType);
  return file.blob;
}

export async function downloadHandoverDraftPdf(
  contractId,
  handoverType = "MOVE_IN",
  filename = DEFAULT_HANDOVER_DOCUMENT_FILENAME,
) {
  const { blob, filename: serverFilename } = await fetchHandoverDraftPdfFile(contractId, handoverType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = serverFilename || filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchHandoverSignedPdfFile(contractId, handoverType = "MOVE_IN") {
  if (!contractId) throw new Error("Missing contractId");

  const response = await fetchWithAuth(
    `${BASE}/lease-contracts/${encodeURIComponent(contractId)}/handover/signed-pdf?type=${encodeURIComponent(handoverType)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Unable to download signed handover PDF."));
  }

  const contentDisposition =
    response.headers?.get?.("content-disposition") ||
    response.headers?.get?.("Content-Disposition") ||
    "";

  return {
    blob: await response.blob(),
    filename: extractFilenameFromContentDisposition(contentDisposition),
  };
}

export async function fetchHandoverSignedPdfBlob(contractId, handoverType = "MOVE_IN") {
  const file = await fetchHandoverSignedPdfFile(contractId, handoverType);
  return file.blob;
}

export async function downloadHandoverSignedPdf(
  contractId,
  handoverType = "MOVE_IN",
  filename = DEFAULT_HANDOVER_DOCUMENT_FILENAME,
) {
  const { blob, filename: serverFilename } = await fetchHandoverSignedPdfFile(contractId, handoverType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = serverFilename || filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


export async function confirmHandover(contractId, body) {
  if (!contractId) throw new Error("Missing contractId");
  return authenticatedFetch(`${BASE}/lease-contracts/${encodeURIComponent(contractId)}/handover/confirm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}