import { API_BASE_URL, ApiError, authenticatedFetch } from "@/services/identityAccessService";

const BASE = API_BASE_URL;

function roomAssetsUrl(tenantId, roomId, assetId = null) {
  if (!tenantId || !roomId) {
    throw new Error("Missing tenantId or roomId");
  }
  const base = `${BASE}/tenants/${encodeURIComponent(tenantId)}/rooms/${encodeURIComponent(roomId)}/assets`;
  return assetId ? `${base}/${encodeURIComponent(assetId)}` : base;
}

function isNotFound(error) {
  return error instanceof ApiError && error.status === 404;
}

/** GET /api/v1/tenants/{tenantId}/rooms/{roomId}/assets */
export async function fetchRoomAssets(tenantId, roomId) {
  if (!tenantId || !roomId) return [];
  try {
    return await authenticatedFetch(roomAssetsUrl(tenantId, roomId));
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

/** GET /api/v1/tenants/{tenantId}/rooms/{roomId}/assets/{assetId} */
export async function fetchRoomAsset(tenantId, roomId, assetId) {
  return authenticatedFetch(roomAssetsUrl(tenantId, roomId, assetId));
}

/** POST /api/v1/tenants/{tenantId}/rooms/{roomId}/assets */
export async function createRoomAsset(tenantId, roomId, body) {
  return authenticatedFetch(roomAssetsUrl(tenantId, roomId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** PUT /api/v1/tenants/{tenantId}/rooms/{roomId}/assets/{assetId} */
export async function updateRoomAsset(tenantId, roomId, assetId, body) {
  return authenticatedFetch(roomAssetsUrl(tenantId, roomId, assetId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** DELETE /api/v1/tenants/{tenantId}/rooms/{roomId}/assets/{assetId} */
export async function deleteRoomAsset(tenantId, roomId, assetId) {
  return authenticatedFetch(roomAssetsUrl(tenantId, roomId, assetId), {
    method: "DELETE",
  });
}

// Map backend AssetCondition enum → Vietnamese display label
export const ASSET_CONDITION_LABELS = {
  GOOD: "Hoạt động bình thường",
  ATTENTION: "Có trầy xước nhẹ",
  BROKEN: "Hỏng cần sửa",
  MISSING: "Thiếu thiết bị",
};

// Map Vietnamese label → backend enum value
export const ASSET_CONDITION_VALUES = {
  "Hoạt động bình thường": "GOOD",
  "Còn nguyên vẹn": "GOOD",
  "Có trầy xước nhẹ": "ATTENTION",
  "Hỏng cần sửa": "BROKEN",
  "Thiếu thiết bị": "MISSING",
};

export function normalizeAsset(raw) {
  return {
    id: raw.id ?? null,
    roomId: raw.roomId ?? raw.room_id ?? null,
    assetName: raw.assetName ?? raw.asset_name ?? "",
    assetCategory: raw.assetCategory ?? raw.asset_category ?? "",
    quantity: raw.quantity ?? 1,
    currentCondition: raw.currentCondition ?? raw.current_condition ?? "GOOD",
    description: raw.description ?? "",
    fileImageId: raw.fileImageId ?? raw.file_image_id ?? null,
  };
}
