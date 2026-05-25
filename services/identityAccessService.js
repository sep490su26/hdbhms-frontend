const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";

export class ApiError extends Error {
  constructor(message, { code, details, status, payload } = {}) {
    super(message || details || "Khong the xu ly yeu cau.");
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
    this.payload = payload;
    this.isApiError = true;
  }
}

export function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("token") || "";
}

function getAuthHeaders(extraHeaders = {}) {
  return {
    Authorization: `Bearer ${getAuthToken()}`,
    ...extraHeaders,
  };
}

async function parseEnvelope(response) {
  const payload = await response.json().catch(() => ({}));

  // Backend always wraps successful payloads in { code: 0, data }.
  if (!response.ok || payload.code !== 0) {
    throw new ApiError(payload.message || payload.details, {
      code: payload.code,
      details: payload.details,
      status: response.status,
      payload,
    });
  }

  return payload.data ?? {};
}

export async function getCurrentUserProfile() {
  // Đổi thành false khi Backend đã sẵn sàng chạy thật
  const IS_MOCK_MODE = true; 

  if (IS_MOCK_MODE) {
    // fix cung
    await new Promise((resolve) => setTimeout(resolve, 400)); // Giả lập delay mạng

    return {
      id: 42,
      phone: "0901234567",
      email: "admin@haidang.vn", //
      role: "OWNER",
      status: "ACTIVE",
      emailVerified: true,
      fullName: "Phạm Thành Công", // Đổ lên Top-bar
      avatarUrl: "https://i.pravatar.cc/150?img=33", 
      lastLoginAt: "2026-05-25T12:10:00",
      createdAt: "2026-05-22T12:00:00"
    };
  } else {
    // thay false de ket noi voi backend
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return parseEnvelope(response);
  }
}

export async function loginWithPhonePassword({ phone, password }) {
  /*const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, password }),
  });

  return parseEnvelope(response);*/
  return {
    id: 42,
    phone: "0901234567",
    email: "admin@haidang.vn", // Khớp với email góc phải trên UI
    role: "OWNER",
    status: "ACTIVE",
    emailVerified: true,
    fullName: "Phạm Thành Công", // Đổ dữ liệu động thay cho chữ Chủ trọ tĩnh
    avatarUrl: "https://i.pravatar.cc/150?img=33", // Đổ ảnh lên Avatar góc phải/trái
    lastLoginAt: "2026-05-25T12:10:00",
    createdAt: "2026-05-22T12:00:00"
  };
}

export async function createStaffAccount({ phone, email, role }) {
  // OWNER-only endpoint. Business error codes are surfaced as ApiError.code.
  const response = await fetch(`${API_BASE_URL}/users/staff`, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ phone, email, role }),
  });

  return parseEnvelope(response);
}
