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
    currentStatus: raw.currentStatus ?? raw.status ?? "DRAFT",
    images: Array.isArray(raw.images) ? raw.images : [],
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

export async function fetchRooms(propertyId, floorId) {
  const params = new URLSearchParams({ propertyId: String(propertyId), size: "500" });
  if (floorId) params.set("floorId", String(floorId));
  const data = await authenticatedFetch(
    `${API_BASE_URL}/rooms?${params.toString()}`,
    { method: "GET" },
  );
  return pageRows(data).map(normalizeRoom);
}

export async function fetchRoomById(roomId) {
  return authenticatedFetch(
    `${API_BASE_URL}/rooms/id/${encodeURIComponent(roomId)}`,
    { method: "GET" },
  );
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

export async function updateRoom(roomId, { floorId, roomCode, name, areaM2, listedPrice, maxOccupants, sortOrder, currentStatus, publicNote }) {
  const body = {
    floorId,
    roomCode,
    name,
    areaM2,
    listedPrice,
    maxOccupants,
    publicNote,
  };
  if (sortOrder !== undefined) body.sortOrder = sortOrder;
  if (currentStatus !== undefined) body.currentStatus = currentStatus;

  return authenticatedFetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function uploadImageFile(file, category) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  formData.append("isSensitive", "false");
  return authenticatedFetch(`${API_BASE_URL}/files/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function uploadRoomImage(file) {
  const data = await uploadImageFile(file, "ROOM_IMAGE");
  const fileId = data.fileId ?? data.file_id ?? data.id;
  if (!fileId) {
    throw new Error("Không nhận được mã file ảnh phòng.");
  }
  return {
    fileId,
    url: data.url || `/files/download/${fileId}`,
  };
}

export async function attachRoomImage(roomId, fileId, sortOrder) {
  return authenticatedFetch(`${API_BASE_URL}/rooms/${encodeURIComponent(roomId)}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, sortOrder }),
  });
}

export async function deleteRoomImage(roomId, imageId) {
  return authenticatedFetch(
    `${API_BASE_URL}/rooms/${encodeURIComponent(roomId)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" },
  );
}
