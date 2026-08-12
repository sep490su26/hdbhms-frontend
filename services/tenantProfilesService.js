import { API_BASE_URL, authenticatedFetch, getAuthToken, refreshTokenApi } from "@/services/identityAccessService";
import { normalizePageResponse, readPageItems } from "@/lib/pageResponse";

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
  if (response.status !== 401) return response;

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
  return filenameMatch?.[1]?.trim().replace(/^"|"$/g, "") || "";
}

export async function fetchTenantProfiles({ page = 0, size = 10 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  const data = await authenticatedFetch(`${API_BASE_URL}/tenant-profiles?${params.toString()}`, {
    method: "GET",
  });

  const items = readPageItems(data);
  return {
    ...normalizePageResponse(data, { page: page + 1, size, items }),
    items,
  };
}

export async function lookupPersonProfileByPhone(phone) {
  const params = new URLSearchParams({ phone: String(phone || "") });
  const response = await fetch(`${API_BASE_URL}/person-profiles/lookup?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Không kiểm tra được hồ sơ người ở cùng."));
  }

  const payload = await response.json().catch(() => ({}));
  return payload?.data || payload || {};
}

export async function fetchTenantProfilesPoliceReportExportFile(columns = []) {
  const params = new URLSearchParams();
  columns.filter(Boolean).forEach((column) => params.append("columns", column));
  const query = params.toString();
  const response = await fetchWithAuth(`${API_BASE_URL}/tenant-profiles/police-report/export${query ? `?${query}` : ""}`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Xuất file Excel thất bại, vui lòng thử lại."));
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

export async function downloadTenantProfilesPoliceReportExport(columns = []) {
  const { blob, filename } = await fetchTenantProfilesPoliceReportExportFile(columns);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "danh-sach-cu-dan-bao-cong-an.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchTenantProfilesPoliceReportPackageExportFile(columns = []) {
  const params = new URLSearchParams();
  columns.filter(Boolean).forEach((column) => params.append("columns", column));
  const query = params.toString();
  const response = await fetchWithAuth(`${API_BASE_URL}/tenant-profiles/police-report/export-package${query ? `?${query}` : ""}`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Xuất file ZIP thất bại, vui lòng thử lại."));
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

export async function downloadTenantProfilesPoliceReportPackageExport(columns = []) {
  const { blob, filename } = await fetchTenantProfilesPoliceReportPackageExportFile(columns);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "ho-so-bao-cong-an.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchMyTenantProfile() {
  const data = await authenticatedFetch(`${API_BASE_URL}/tenants/profiles/me`, {
    method: "GET",
  });

  return data;
}

export async function fetchPrivateFileObjectUrl(fileUrlOrId) {
  if (!fileUrlOrId) return "";

  const rawPath = String(fileUrlOrId);
  const url = rawPath.startsWith("http")
    ? rawPath
    : `${API_BASE_URL}${rawPath.startsWith("/api/v1") ? rawPath.slice("/api/v1".length) : rawPath}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "X-Client-Type": "web",
    },
  });

  if (!response.ok) {
    throw new Error("Không tải được ảnh hồ sơ.");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function fetchPrivateFile(fileUrlOrId, fileName = "image.jpg") {
  if (!fileUrlOrId) return null;

  const rawPath = String(fileUrlOrId);
  const url = rawPath.startsWith("http")
    ? rawPath
    : `${API_BASE_URL}${rawPath.startsWith("/api/v1") ? rawPath.slice("/api/v1".length) : rawPath}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "X-Client-Type": "web",
    },
  });

  if (!response.ok) {
    return null;
  }

  const blob = await response.blob();
  const fileType = blob.type || 'image/jpeg';
  const name = fileName.endsWith('.jpg') && fileType.includes('png') ? fileName.replace('.jpg', '.png') : fileName;
  
  return new File([blob], name, { type: fileType });
}
