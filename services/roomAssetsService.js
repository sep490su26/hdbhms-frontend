import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

const BASE = API_BASE_URL;

/** GET /api/v1/rooms/{roomId}/assets */
export async function fetchRoomAssets(roomId) {
  if (!roomId) return [];
  const payload = await authenticatedFetch(`${BASE}/rooms/${encodeURIComponent(roomId)}/assets`);
  // The authenticatedFetch already unwraps the { code, data } envelope
  return payload;
}

/** GET /api/v1/rooms/{roomId}/assets/{assetId} */
export async function fetchRoomAsset(roomId, assetId) {
  return authenticatedFetch(`${BASE}/rooms/${encodeURIComponent(roomId)}/assets/${encodeURIComponent(assetId)}`);
}

/** POST /api/v1/rooms/{roomId}/assets */
export async function createRoomAsset(roomId, body) {
  return authenticatedFetch(`${BASE}/rooms/${encodeURIComponent(roomId)}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** PUT /api/v1/rooms/{roomId}/assets/{assetId} */
export async function updateRoomAsset(roomId, assetId, body) {
  return authenticatedFetch(`${BASE}/rooms/${encodeURIComponent(roomId)}/assets/${encodeURIComponent(assetId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** DELETE /api/v1/rooms/{roomId}/assets/{assetId} */
export async function deleteRoomAsset(roomId, assetId) {
  return authenticatedFetch(
    `${BASE}/rooms/${encodeURIComponent(roomId)}/assets/${encodeURIComponent(assetId)}`,
    {
      method: "DELETE",
    },
  );
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
