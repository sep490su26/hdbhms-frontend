import { API_BASE_URL } from "@/lib/apiConfig";
import { refreshTokenApi } from "@/services/identityAccessService";
import { normalizePageResponse, readPageItems } from "@/lib/pageResponse";

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

function withoutAuthorization(headers = {}) {
  const nextHeaders = { ...headers };
  delete nextHeaders.Authorization;
  delete nextHeaders.authorization;
  return nextHeaders;
}

async function authenticatedDepositFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: authHeaders(options.headers),
  });

  if (response.status !== 401) {
    return response;
  }

  try {
    await refreshTokenApi();
  } catch {
    return response;
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers: authHeaders(withoutAuthorization(options.headers)),
  });
}

async function readEnvelope(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== 0) {
    const error = new Error(
      payload.message || payload.details || fallbackMessage,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload.data ?? null;
}

async function readPageEnvelope(
  response,
  fallbackMessage,
  { page = 0, size = 10 } = {},
) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== 0) {
    const error = new Error(
      payload.message || payload.details || fallbackMessage,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const data = payload.data ?? {};
  const items = readPageItems(data);
  const pagination = normalizePageResponse(data, {
    page: page + 1,
    size,
    items,
  });
  return {
    ...data,
    ...pagination,
    data: items,
    items,
    currentPage: pagination.page,
    pageSize: pagination.size,
  };
}

function extractFilenameFromContentDisposition(headerValue) {
  if (!headerValue) return "";

  const filenameStarMatch = headerValue.match(
    /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i,
  );
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

function sanitizeFilenamePart(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const sanitized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return sanitized || fallback;
}

function toDatePart(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatDocumentFilenameDate(value) {
  const datePart = toDatePart(value);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "Chua-Ro-Ngay";
  return `${match[3]}_${match[2]}_${match[1]}`;
}

function withRoomPrefix(roomCode) {
  if (roomCode.startsWith("Phong")) return roomCode;
  if (/^p/i.test(roomCode)) return `P${roomCode.slice(1)}`;
  return `P${roomCode}`;
}

export function buildDepositContractDocumentFilename(item = {}) {
  const roomCode = withRoomPrefix(
    sanitizeFilenamePart(
      item.roomCode ??
        item.room_code ??
        item.room?.roomCode ??
        item.room?.room_code,
      "Phong-X",
    ),
  );
  const date = formatDocumentFilenameDate(
    item.expectedMoveInDate ??
      item.expected_move_in_date ??
      item.startDate ??
      item.start_date ??
      item.expectedLeaseSignDate ??
      item.expected_lease_sign_date,
  );
  return `HDC_${roomCode}_${date}.pdf`;
}

const DEFAULT_DEPOSIT_CONTRACT_DOCUMENT_FILENAME =
  buildDepositContractDocumentFilename();

function normalizeDepositContractPreviewMetadata(metadata = {}) {
  return {
    roomId: metadata?.roomId ?? null,
    fullName: metadata?.fullName ?? null,
    dob: metadata?.dob ?? null,
    phone: metadata?.phone ?? null,
    email: metadata?.email ?? null,
    idNumber: metadata?.idNumber ?? null,
    idIssueDate: metadata?.idIssueDate ?? null,
    idIssuePlace: metadata?.idIssuePlace ?? null,
    permanentAddress: metadata?.permanentAddress ?? null,
    expectedMoveInDate: metadata?.expectedMoveInDate ?? null,
    expectedLeaseSignDate: metadata?.expectedLeaseSignDate ?? null,
    paymentCycleMonths: metadata?.paymentCycleMonths ?? null,
  };
}

export function toApiAssetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const apiRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchDepositAssetObjectUrl(path) {
  const url = toApiAssetUrl(path);
  if (!url) return "";

  const response = await authenticatedDepositFetch(url, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Không thể tải ảnh giấy tờ.");
  }

  return URL.createObjectURL(await response.blob());
}

export async function previewDepositContract(metadata) {
  const response = await fetch(`${API_BASE_URL}/deposit/contracts/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Type": "web",
    },
    body: JSON.stringify(normalizeDepositContractPreviewMetadata(metadata)),
  });

  return readEnvelope(
    response,
    "Không thể tạo bản xem trước hợp đồng đặt cọc.",
  );
}

export async function fetchDepositAgreements({
  page = 1,
  size = 10,
  status,
  statuses,
  search,
  floorId,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  if (status) params.set("status", status);
  if (Array.isArray(statuses)) {
    statuses
      .filter(Boolean)
      .forEach((nextStatus) => params.append("statuses", nextStatus));
  }
  if (search?.trim()) params.set("q", search.trim());
  if (floorId) params.set("floorId", String(floorId));

  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements?${params.toString()}`,
    {
      method: "GET",
    },
  );

  return readPageEnvelope(response, "Không thể tải danh sách hợp đồng cọc.", {
    page,
    size,
  });
}

export async function fetchDepositDashboardSummary() {
  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/summary`,
    {
      method: "GET",
    },
  );
  return readEnvelope(response, "Không thể tải thống kê hợp đồng cọc.");
}

export async function fetchDepositFilterOptions() {
  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/filter-options`,
    {
      method: "GET",
    },
  );
  return readEnvelope(response, "Không thể tải bộ lọc hợp đồng cọc.");
}

export async function fetchDepositAgreementDetails(depositAgreementId) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }

  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}`,
    {
      method: "GET",
    },
  );

  return readEnvelope(response, "Không thể tải chi tiết hợp đồng đặt cọc.");
}

export async function updateDepositAgreementStatus(depositAgreementId, status) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }
  if (!status) {
    throw new Error("Vui lòng chọn trạng thái cọc.");
  }

  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );

  return readEnvelope(response, "Không thể cập nhật trạng thái cọc.");
}

export async function updateDepositAgreementManagementInfo(
  depositAgreementId,
  payload,
) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }

  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/management-info`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return readEnvelope(response, "Không thể cập nhật thông tin hợp đồng cọc.");
}

export async function recordDepositContact(depositAgreementId, payload) {
  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/contact-events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return readEnvelope(response, "Không thể ghi nhận kết quả liên hệ khách.");
}

export async function extendDepositAgreement(depositAgreementId, payload) {
  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/extensions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return readEnvelope(response, "Không thể gia hạn khoản cọc.");
}

export async function forfeitDepositAgreement(depositAgreementId, payload) {
  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/forfeit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return readEnvelope(response, "Không thể xử lý mất cọc.");
}

export async function fetchDepositContractFile(depositAgreementId) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }

  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/draft-pdf`,
    {
      method: "GET",
    },
  );

  if (response.status === 401) {
    throw new Error("Vui lòng đăng nhập để xem hợp đồng đặt cọc.");
  }
  if (response.status === 403) {
    throw new Error("Bạn không có quyền xem hợp đồng đặt cọc này.");
  }
  if (!response.ok) {
    throw new Error("Không thể tải hợp đồng đặt cọc.");
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

export async function fetchDepositContractBlob(depositAgreementId) {
  const file = await fetchDepositContractFile(depositAgreementId);
  return file.blob;
}

export async function fetchSignedDepositContractBlob(depositAgreementId) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }

  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/signed-file`,
    {
      method: "GET",
    },
  );

  if (response.status === 401) {
    throw new Error("Vui lòng đăng nhập để xem hợp đồng đặt cọc đã ký.");
  }
  if (response.status === 403) {
    throw new Error("Bạn không có quyền xem hợp đồng đặt cọc đã ký này.");
  }
  if (response.status === 404) {
    throw new Error("Chưa có bản hợp đồng đặt cọc đã ký.");
  }
  if (!response.ok) {
    throw new Error("Không thể tải hợp đồng đặt cọc đã ký.");
  }

  return response.blob();
}

export async function uploadSignedDepositContractFile(
  depositAgreementId,
  file,
) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }
  if (!file) {
    throw new Error("Vui lòng chọn file hợp đồng đặt cọc đã ký.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await authenticatedDepositFetch(
    `${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/signed-file`,
    {
      method: "POST",
      body: formData,
    },
  );

  return readEnvelope(response, "Không thể upload bản hợp đồng đặt cọc đã ký.");
}

export async function fetchDepositContractByPaymentBlob(
  paymentIntentId,
  paymentContent,
) {
  if (!paymentIntentId) {
    throw new Error("Thiếu mã phiên thanh toán.");
  }
  if (!paymentContent) {
    throw new Error("Thiếu nội dung thanh toán để xác thực hợp đồng đặt cọc.");
  }

  const params = new URLSearchParams({
    paymentContent: String(paymentContent),
  });
  const response = await fetch(
    `${API_BASE_URL}/deposit/payments/${encodeURIComponent(paymentIntentId)}/contract?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "X-Client-Type": "web",
      },
    },
  );

  if (response.status === 403) {
    throw new Error("Thông tin phiên thanh toán không hợp lệ.");
  }
  if (response.status === 409) {
    throw new Error("Phiên thanh toán chưa hoàn tất.");
  }
  if (!response.ok) {
    throw new Error("Không thể tải hợp đồng đặt cọc.");
  }

  return response.blob();
}

async function openBlobInNewTab(loadBlob) {
  const popup =
    typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  if (popup) {
    popup.document.write(
      '<!doctype html><title>Đang tải hợp đồng</title><p style="font-family:Arial,sans-serif;padding:24px">Đang tải hợp đồng đặt cọc...</p>',
    );
  }

  try {
    const blob = await loadBlob();
    const url = URL.createObjectURL(blob);
    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      window.open(url, "_blank");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    if (popup) {
      popup.close();
    }
    throw error;
  }
}

export async function openDepositContractPdf(depositAgreementId) {
  return openBlobInNewTab(() => fetchDepositContractBlob(depositAgreementId));
}

export async function openSignedDepositContractPdf(depositAgreementId) {
  return openBlobInNewTab(() =>
    fetchSignedDepositContractBlob(depositAgreementId),
  );
}

export async function openDepositContractByPaymentPdf(
  paymentIntentId,
  paymentContent,
) {
  return openBlobInNewTab(() =>
    fetchDepositContractByPaymentBlob(paymentIntentId, paymentContent),
  );
}

export async function downloadDepositContractPdf(
  depositAgreementId,
  filename = DEFAULT_DEPOSIT_CONTRACT_DOCUMENT_FILENAME,
) {
  const { blob, filename: serverFilename } =
    await fetchDepositContractFile(depositAgreementId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = serverFilename || filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSignedDepositContractPdf(
  depositAgreementId,
  filename = DEFAULT_DEPOSIT_CONTRACT_DOCUMENT_FILENAME,
) {
  const blob = await fetchSignedDepositContractBlob(depositAgreementId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadDepositContractByPaymentPdf(
  paymentIntentId,
  paymentContent,
  filename = DEFAULT_DEPOSIT_CONTRACT_DOCUMENT_FILENAME,
) {
  const blob = await fetchDepositContractByPaymentBlob(
    paymentIntentId,
    paymentContent,
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
