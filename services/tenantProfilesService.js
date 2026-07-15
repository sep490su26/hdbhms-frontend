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

export async function requestTenantProfileAccess(profileId, reason = "") {
  return authenticatedFetch(`${API_BASE_URL}/tenant-profiles/${profileId}/access-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

function normalizePermissionGrant(item = {}) {
  return {
    ...item,
    id: item.id ?? item.grantId ?? item.grant_id ?? null,
    granteeUserId: item.granteeUserId ?? item.grantee_user_id ?? null,
    granteeFullName: item.granteeFullName ?? item.grantee_full_name ?? "",
    granteePhone: item.granteePhone ?? item.grantee_phone ?? "",
    granteeEmail: item.granteeEmail ?? item.grantee_email ?? "",
    targetType: item.targetType ?? item.target_type ?? "",
    targetId: item.targetId ?? item.target_id ?? null,
    sourceChangeRequestId: item.sourceChangeRequestId ?? item.source_change_request_id ?? null,
    grantedBy: item.grantedBy ?? item.granted_by ?? null,
    reason: item.reason ?? "",
    durationCode: item.durationCode ?? item.duration_code ?? "",
    grantedAt: item.grantedAt ?? item.granted_at ?? null,
    expiresAt: item.expiresAt ?? item.expires_at ?? null,
    revokedAt: item.revokedAt ?? item.revoked_at ?? null,
    revokedBy: item.revokedBy ?? item.revoked_by ?? null,
    revokeReason: item.revokeReason ?? item.revoke_reason ?? "",
    status: item.status ?? "",
  };
}

export async function fetchTenantProfilePermissionGrants(profileId) {
  if (!profileId) return [];
  const data = await authenticatedFetch(`${API_BASE_URL}/permission-grants?targetType=TENANT_PROFILE&targetId=${encodeURIComponent(profileId)}`, {
    method: "GET",
  });
  return (Array.isArray(data) ? data : readPageItems(data)).map(normalizePermissionGrant);
}

export async function revokeTenantProfilePermissionGrant(grantId, reason = "") {
  const data = await authenticatedFetch(`${API_BASE_URL}/permission-grants/${encodeURIComponent(grantId)}/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return normalizePermissionGrant(data);
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
