import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

import { normalizePageResponse } from "@/lib/pageResponse";

const API_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export const FACILITY_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  TEMPORARILY_CLOSED: "TEMP_CLOSED",
  PERMANENTLY_CLOSED: "CLOSED",
};

export const facilityStatusOptions = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "TEMP_CLOSED", label: "Tạm ngừng" },
  { value: "CLOSED", label: "Ngừng hoạt động" },
];

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRoom(room = {}) {
  return {
    id: room.id ?? null,
    name: room.name ?? room.roomCode ?? room.room_code ?? "",
    status: room.currentStatus ?? room.current_status ?? room.status ?? "VACANT",
  };
}

function normalizeFloor(floor = {}) {
  const rooms = Array.isArray(floor.rooms) ? floor.rooms.map(normalizeRoom) : [];
  return {
    id: floor.id ?? null,
    name: floor.name ?? "",
    sortOrder: numberValue(floor.sortOrder ?? floor.sort_order),
    roomCount: numberValue(floor.roomCount ?? floor.room_count ?? rooms.length),
    occupiedRoomCount: numberValue(floor.occupiedRoomCount ?? floor.occupied_room_count),
    rooms,
  };
}

export function resolveFacilityImageUrl(url) {
  if (!url) return "";
  const normalized = String(url).trim();
  if (!normalized) return "";
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  if (normalized.startsWith("/api/v1")) return `${API_ROOT}${normalized}`;
  if (normalized.startsWith("/")) return `${API_BASE_URL}${normalized}`;
  return `${API_BASE_URL}/${normalized}`;
}

function normalizeImage(image = {}) {
  const fileId = image.fileId ?? image.file_id ?? null;
  return {
    id: image.id ?? fileId,
    fileId,
    url: resolveFacilityImageUrl(image.url || (fileId ? `/files/download/${fileId}` : "")),
    sortOrder: numberValue(image.sortOrder ?? image.sort_order),
    createdAt: image.createdAt ?? image.created_at ?? null,
  };
}

function normalizeFacility(facility = {}) {
  const floors = Array.isArray(facility.floors) ? facility.floors.map(normalizeFloor) : [];
  return {
    id: facility.id ?? facility.propertyId ?? facility.property_id ?? null,
    code: facility.code ?? facility.propertyCode ?? facility.property_code ?? "",
    name: facility.name ?? "",
    propertyType: facility.propertyType ?? facility.property_type ?? "BOARDING_HOUSE",
    address: facility.address ?? facility.addressLine ?? facility.address_line ?? "",
    description: facility.description ?? "",
    status: facility.status ?? "DRAFT",
    floorCount: numberValue(facility.floorCount ?? facility.floor_count ?? floors.length),
    roomCount: numberValue(facility.roomCount ?? facility.room_count),
    occupiedRoomCount: numberValue(facility.occupiedRoomCount ?? facility.occupied_room_count),
    vacantRoomCount: numberValue(facility.vacantRoomCount ?? facility.vacant_room_count),
    createdAt: facility.createdAt ?? facility.created_at ?? null,
    updatedAt: facility.updatedAt ?? facility.updated_at ?? null,
    hasFloorPlan: Boolean(facility.hasFloorPlan ?? facility.has_floor_plan ?? false),
    hasActiveContracts: Boolean(facility.hasActiveContracts ?? facility.has_active_contracts ?? false),
    hasOutstandingDebts: Boolean(facility.hasOutstandingDebts ?? facility.has_outstanding_debts ?? false),
    outstandingDebtAmount: numberValue(facility.outstandingDebtAmount ?? facility.outstanding_debt_amount),
    images: Array.isArray(facility.images) ? facility.images.map(normalizeImage).filter((image) => image.url) : [],
    floors,
  };
}

function dashboardItems(data) {
  if (Array.isArray(data?.facilities)) return data.facilities;
  if (Array.isArray(data?.properties)) return data.properties;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

export async function getFacilitiesDashboard({ keyword = "", status = "", page = 0, size = 10 } = {}) {
  const params = new URLSearchParams();
  if (keyword.trim()) params.set("keyword", keyword.trim());
  if (status && status !== "ALL") params.set("status", status);
  params.set("page", String(page));
  params.set("size", String(size));
  params.set("sort", "createdAt,desc");

  const query = params.toString();
  const data = await authenticatedFetch(
    `${API_BASE_URL}/dashboard/facilities${query ? `?${query}` : ""}`,
    { method: "GET" },
  );

  const facilities = dashboardItems(data).map(normalizeFacility);
  const pagination = normalizePageResponse(data?.page ?? data?.pagination ?? data, {
    page: page + 1,
    size,
    items: facilities,
  });

  return {
    summary: {
      totalProperties: numberValue(data?.summary?.totalProperties ?? data?.summary?.total_properties),
      activeProperties: numberValue(data?.summary?.activeProperties ?? data?.summary?.active_properties),
      totalFloors: numberValue(data?.summary?.totalFloors ?? data?.summary?.total_floors),
      totalRooms: numberValue(data?.summary?.totalRooms ?? data?.summary?.total_rooms),
      occupiedRooms: numberValue(data?.summary?.occupiedRooms ?? data?.summary?.occupied_rooms),
      vacantRooms: numberValue(data?.summary?.vacantRooms ?? data?.summary?.vacant_rooms),
      vacancyRate: numberValue(data?.summary?.vacancyRate ?? data?.summary?.vacancy_rate),
    },
    facilities,
    pagination,
  };
}

export async function createFacility(payload) {
  const data = await authenticatedFetch(`${API_BASE_URL}/properties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      propertyType: payload.propertyType ?? "BOARDING_HOUSE",
      addressLine: payload.address,
      description: payload.description ?? "",
    }),
  });

  return normalizeFacility(data);
}

export async function updateFacility(id, payload) {
  const data = await authenticatedFetch(`${API_BASE_URL}/properties/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      propertyType: payload.propertyType ?? "BOARDING_HOUSE",
      addressLine: payload.address,
      description: payload.description ?? "",
      status: payload.status ?? "ACTIVE",
    }),
  });

  return normalizeFacility(data);
}

export async function updateFacilityStatus(id, status) {
  const data = await authenticatedFetch(`${API_BASE_URL}/properties/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  return normalizeFacility(data);
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

export async function uploadPropertyImage(file) {
  const data = await uploadImageFile(file, "PROPERTY_IMAGE");
  const fileId = data.fileId ?? data.file_id ?? data.id;
  if (!fileId) {
    throw new Error("Không nhận được mã file ảnh cơ sở.");
  }
  return {
    fileId,
    url: resolveFacilityImageUrl(data.url || `/files/download/${fileId}`),
  };
}

export async function attachPropertyImage(propertyId, fileId, sortOrder) {
  const data = await authenticatedFetch(`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, sortOrder }),
  });
  return normalizeImage(data);
}

export async function deletePropertyImage(propertyId, imageId) {
  return authenticatedFetch(
    `${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE" },
  );
}
