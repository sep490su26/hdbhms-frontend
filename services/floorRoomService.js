import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFloor(raw = {}) {
  return {
    id: raw.id ?? null,
    propertyId: raw.propertyId ?? raw.property_id ?? raw.property?.id ?? null,
    floorCode: raw.floorCode ?? raw.floor_code ?? "",
    name: raw.name ?? "",
    sortOrder: numberValue(raw.sortOrder ?? raw.sort_order),
    status: raw.status ?? "ACTIVE",
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
  };
}

function normalizeRoom(raw = {}) {
  return {
    id: raw.id ?? null,
    floorId: raw.floorId ?? raw.floor_id ?? raw.floor?.id ?? null,
    propertyId: raw.propertyId ?? raw.property_id ?? raw.property?.id ?? null,
    roomCode: raw.roomCode ?? raw.room_code ?? "",
    name: raw.name ?? "",
    areaM2: numberValue(raw.areaM2 ?? raw.area_m2),
    listedPrice: numberValue(raw.listedPrice ?? raw.listed_price),
    maxOccupants: numberValue(raw.maxOccupants ?? raw.max_occupants),
    sortOrder: numberValue(raw.sortOrder ?? raw.sort_order),
    currentStatus: raw.currentStatus ?? raw.current_status ?? raw.status ?? "VACANT",
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
      property_id: propertyId,
      floor_code: floorCode,
      name,
      sort_order: sortOrder,
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
      property_id: propertyId,
      floor_id: floorId,
      room_code: roomCode,
      name,
      area_m2: areaM2,
      listed_price: listedPrice,
      max_occupants: maxOccupants,
      sort_order: sortOrder,
    }),
  }).then(normalizeRoom);
}
