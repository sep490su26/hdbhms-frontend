import { refreshTokenApi } from "@/services/identityAccessService";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

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
    const error = new Error(payload.message || payload.details || fallbackMessage);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload.data ?? null;
}

export function toApiAssetUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const apiRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${apiRoot}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function previewDepositContract(metadata) {
  const response = await fetch(`${API_BASE_URL}/deposit/contracts/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Type": "web",
    },
    body: JSON.stringify(metadata),
  });

  return readEnvelope(response, "Không thể tạo bản xem trước hợp đồng đặt cọc.");
}

export async function fetchDepositAgreements({ page = 0, size = 50, status } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (status) params.set("status", status);

  const response = await authenticatedDepositFetch(`${API_BASE_URL}/deposit-agreements?${params.toString()}`, {
    method: "GET",
  });

  return readEnvelope(response, "Không thể tải danh sách hợp đồng cọc.");
}

export async function fetchDepositAgreementDetails(depositAgreementId) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }

  const response = await authenticatedDepositFetch(`${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}`, {
    method: "GET",
  });

  return readEnvelope(response, "Không thể tải chi tiết hợp đồng đặt cọc.");
}

export async function updateDepositAgreementStatus(depositAgreementId, status) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }
  if (!status) {
    throw new Error("Vui lòng chọn trạng thái cọc.");
  }

  const response = await authenticatedDepositFetch(`${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return readEnvelope(response, "Không thể cập nhật trạng thái cọc.");
}

export async function fetchDepositContractBlob(depositAgreementId) {
  if (!depositAgreementId) {
    throw new Error("Thiếu mã hợp đồng đặt cọc.");
  }

  const response = await authenticatedDepositFetch(`${API_BASE_URL}/deposit-agreements/${encodeURIComponent(depositAgreementId)}/contract`, {
    method: "GET",
  });

  if (response.status === 401) {
    throw new Error("Vui lòng đăng nhập để xem hợp đồng đặt cọc.");
  }
  if (response.status === 403) {
    throw new Error("Bạn không có quyền xem hợp đồng đặt cọc này.");
  }
  if (!response.ok) {
    throw new Error("Không thể tải hợp đồng đặt cọc.");
  }

  return response.blob();
}

export async function fetchDepositContractByPaymentBlob(paymentIntentId, paymentContent) {
  if (!paymentIntentId) {
    throw new Error("Thiếu mã phiên thanh toán.");
  }
  if (!paymentContent) {
    throw new Error("Thiếu nội dung thanh toán để xác thực hợp đồng đặt cọc.");
  }

  const params = new URLSearchParams({
    paymentContent: String(paymentContent),
  });
  const response = await fetch(`${API_BASE_URL}/deposit/payments/${encodeURIComponent(paymentIntentId)}/contract?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "X-Client-Type": "web",
    },
  });

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
  const popup = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  if (popup) {
    popup.document.write("<!doctype html><title>Đang tải hợp đồng</title><p style=\"font-family:Arial,sans-serif;padding:24px\">Đang tải hợp đồng đặt cọc...</p>");
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

export async function openDepositContractByPaymentPdf(paymentIntentId, paymentContent) {
  return openBlobInNewTab(() => fetchDepositContractByPaymentBlob(paymentIntentId, paymentContent));
}

export async function downloadDepositContractPdf(depositAgreementId, filename = "hop-dong-dat-coc.pdf") {
  const blob = await fetchDepositContractBlob(depositAgreementId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadDepositContractByPaymentPdf(paymentIntentId, paymentContent, filename = "hop-dong-dat-coc.pdf") {
  const blob = await fetchDepositContractByPaymentBlob(paymentIntentId, paymentContent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
