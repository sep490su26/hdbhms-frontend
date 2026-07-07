import { API_BASE_URL, authenticatedFetch, getAuthToken } from "@/services/identityAccessService";
import { normalizePageResponse, readPageItems } from "@/lib/pageResponse";

export async function fetchTenantProfiles({ page = 0, size = 10 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
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

export async function fetchMyTenantProfile() {
  const data = await authenticatedFetch(`${API_BASE_URL}/tenants/profiles/me`, {
    method: "GET",
  });

  return data;
}

export async function requestTenantProfileAccess(profileId) {
  return authenticatedFetch(`${API_BASE_URL}/tenant-profiles/${encodeURIComponent(profileId)}/access-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
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
