import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFloor(raw = {}) {
  return {
    id: raw.id ?? null,
    propertyId: raw.propertyId ?? raw.property?.id ?? null,
    floorCode: raw.floorCode ?? "",
    name: raw.name ?? "",
    sortOrder: numberValue(raw.sortOrder),
    status: raw.status ?? "ACTIVE",
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

function normalizeRoom(raw = {}) {
  return {
    id: raw.id ?? null,
    floorId: raw.floorId ?? raw.floor?.id ?? null,
    propertyId: raw.propertyId ?? raw.property?.id ?? raw.floor?.property?.id ?? null,
    roomCode: raw.roomCode ?? "",
    name: raw.name ?? "",
    areaM2: numberValue(raw.areaM2),
    listedPrice: numberValue(raw.listedPrice),
    maxOccupants: numberValue(raw.maxOccupants),
    sortOrder: numberValue(raw.sortOrder),
    currentStatus: raw.currentStatus ?? raw.status ?? "VACANT",
  };
}

function pageRows(pageResponse) {
  if (Array.isArray(pageResponse?.data)) return pageResponse.data;
  if (Array.isArray(pageResponse)) return pageResponse;
  return [];
}

export async function fetchFloors(propertyId) {
  const data = await authenticatedFetch(
    `${API_BASE_URL}/floors?propertyId=${encodeURIComponent(propertyId)}`,
    { method: "GET" },
  );
  return Array.isArray(data) ? data.map(normalizeFloor) : [];
}

export async function createFloor({ propertyId, floorCode, name, sortOrder }) {
  return authenticatedFetch(`${API_BASE_URL}/floors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId,
      floorCode,
      name,
      sortOrder,
    }),
  }).then(normalizeFloor);
}

export async function deleteFloor(floorId) {
  return authenticatedFetch(`${API_BASE_URL}/floors/${encodeURIComponent(floorId)}`, {
    method: "DELETE",
  });
}

export async function deleteRoom(roomId) {
  return authenticatedFetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomId)}`, {
    method: "DELETE",
  });
}

export async function updateRoomPrice(roomId, listedPrice) {
  const price = Math.max(0, Math.round(numberValue(listedPrice)));
  return authenticatedFetch(
    `${API_BASE_URL}/rooms/${encodeURIComponent(roomId)}/price?listedPrice=${encodeURIComponent(price)}`,
    { method: "PATCH" },
  );
}

export async function fetchRooms(propertyId, floorId) {
  const params = new URLSearchParams({ propertyId: String(propertyId), size: "500" });
  if (floorId) params.set("floorId", String(floorId));
  const data = await authenticatedFetch(
    `${API_BASE_URL}/rooms?${params.toString()}`,
    { method: "GET" },
  );
  return pageRows(data).map(normalizeRoom);
}

export async function createRoom({ propertyId, floorId, roomCode, name, areaM2, listedPrice, maxOccupants, sortOrder }) {
  return authenticatedFetch(`${API_BASE_URL}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId,
      floorId,
      roomCode,
      name,
      areaM2,
      listedPrice,
      maxOccupants,
      sortOrder,
    }),
  }).then(normalizeRoom);
}
