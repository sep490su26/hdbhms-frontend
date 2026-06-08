import { API_BASE_URL, authenticatedFetch, getAuthToken } from "@/services/identityAccessService";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

export async function fetchTenantProfiles() {
  const data = await authenticatedFetch(`${API_BASE_URL}/tenant-profiles`, {
    method: "GET",
  });

  return toArray(data);
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
