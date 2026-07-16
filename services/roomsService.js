export const ROOM_PLACEHOLDER_IMAGE = "/room-placeholder.svg";

import { API_BASE_URL } from "@/lib/apiConfig";
const API_ROOT = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

function resolveRoomImageUrl(url) {
  if (!url) return null;

  const normalized = String(url).trim();
  if (!normalized) return null;
  if (/^(data:|blob:)/i.test(normalized)) return normalized;
  if (
    normalized === ROOM_PLACEHOLDER_IMAGE ||
    normalized.startsWith(`${ROOM_PLACEHOLDER_IMAGE}?`) ||
    normalized.startsWith(`${ROOM_PLACEHOLDER_IMAGE}#`)
  ) {
    return normalized;
  }
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith("/api/v1")) return `${API_ROOT}${normalized}`;
  if (normalized.startsWith("/room-samples/")) return `${API_ROOT}${normalized}`;
  // Relative path without leading slash (e.g. "room-samples/P102/1.jpg")
  // must use API_ROOT (not API_BASE_URL which contains /api/v1)
  if (normalized.startsWith("room-samples/")) return `${API_ROOT}/${normalized}`;
  if (normalized.startsWith("/")) return `${API_BASE_URL}${normalized}`;
  return `${API_BASE_URL}/${normalized}`;
}
export const PUBLIC_ROOMS_API_URL = `${API_BASE_URL}/rooms`;
export const LANDLORD_CONTACT_PHONE = "0914339682";
export const CONTACT_PHONE_HREF = `tel:${LANDLORD_CONTACT_PHONE}`;
export const CONTACT_ZALO_HREF = `https://zalo.me/${LANDLORD_CONTACT_PHONE}`;

async function readApiResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || payload.details || fallbackMessage);
  }

  return payload.data;
}

export function mapApiRoomStatus(currentStatus) {
  const statusLower = String(currentStatus ?? "").trim().toLowerCase();

  if (statusLower === "draft") return "draft";
  if (statusLower === "vacant" || statusLower === "available") return "available";
  if (statusLower === "on_hold" || statusLower === "holding") return "onHold";
  if (statusLower === "reserved" || statusLower === "reserved_for_transfer" || statusLower === "deposited") return "deposited";
  if (statusLower === "soon_vacant") return "soonVacant";
  if (statusLower === "maintenance") return "maintenance";
  if (statusLower === "expired") return "expired";
  return "occupied";
}

function apiRoomStatus(apiRoom) {
  return apiRoom?.current_status ?? apiRoom?.currentStatus ?? apiRoom?.status;
}

function isPublicRoomVisible(apiRoom) {
  return mapApiRoomStatus(apiRoomStatus(apiRoom)) !== "draft";
}

function normalizeRoomImageValue(image) {
  if (!image) return null;
  if (typeof image === "string") {
    const trimmed = image.trim();
    return resolveRoomImageUrl(trimmed);
  }
  if (typeof image === "object") {
    return resolveRoomImageUrl(image.url ?? image.imageUrl ?? image.image_url ?? null);
  }
  return null;
}

export function normalizeRoomImages(apiRoom) {
  const rawImages = [
    apiRoom?.first_image_url,
    apiRoom?.firstImageUrl,
    apiRoom?.imageUrl,
    apiRoom?.image_url,
    ...(Array.isArray(apiRoom?.imageUrls) ? apiRoom.imageUrls : []),
    ...(Array.isArray(apiRoom?.image_urls) ? apiRoom.image_urls : []),
    ...(Array.isArray(apiRoom?.images) ? apiRoom.images : []),
  ];

  const uniqueImages = [...new Set(rawImages.map(normalizeRoomImageValue).filter(Boolean))];
  return uniqueImages.length > 0 ? uniqueImages : [ROOM_PLACEHOLDER_IMAGE];
}

export function normalizeApiRoom(apiRoom, roomHolds = {}) {
  const roomCode = apiRoom.room_code ?? apiRoom.roomCode ?? apiRoom.code ?? apiRoom.name ?? "";
  const listedPrice = apiRoom.listed_price ?? apiRoom.listedPrice ?? apiRoom.price ?? 0;

  // Extract floor and building info from nested response
  let floorName = apiRoom.floor?.name ?? apiRoom.floor_name ?? apiRoom.floorName ?? "Tầng 1";
  // Nếu floorName chỉ là con số (ví dụ: "1"), chuyển thành "Tầng 1" để khớp với logic FE
  if (/^\d+$/.test(floorName)) {
    floorName = `Tầng ${floorName}`;
  }
  const floorOrder = apiRoom.floor?.sort_order ?? apiRoom.floor?.sortOrder ?? apiRoom.floor_sort_order ?? apiRoom.floorSortOrder;
  const floorNumber = floorOrder ?? parseInt(floorName?.replace(/\D/g, "") || "1", 10);

  const imageUrls = normalizeRoomImages(apiRoom);
  const status = mapApiRoomStatus(apiRoomStatus(apiRoom));

  const normalizedRoom = {
    id: roomCode, // Key for frontend routing/display (e.g., P101)
    roomId: apiRoom.id ?? null, // Numeric ID for API operations
    roomCode: roomCode,
    floorId: apiRoom.floor?.id ?? apiRoom.floor_id ?? apiRoom.floorId ?? null,
    floorCode: apiRoom.floor?.floor_code ?? apiRoom.floor?.floorCode ?? apiRoom.floor_code ?? apiRoom.floorCode ?? null,
    buildingId: apiRoom.floor?.property?.id ?? apiRoom.property_id ?? apiRoom.propertyId ?? null,
    propertyId: apiRoom.floor?.property?.id ?? apiRoom.property_id ?? apiRoom.propertyId ?? null,
    buildingName: apiRoom.floor?.property?.name ?? apiRoom.property_name ?? apiRoom.propertyName ?? "Hải Đăng House",
    name: apiRoom.name ?? roomCode,
    status,
    createdAt: apiRoom.created_at ?? apiRoom.createdAt ?? null,
    updatedAt: apiRoom.updated_at ?? apiRoom.updatedAt ?? null,
    expectedVacantDate: apiRoom.expected_vacant_date ?? apiRoom.expectedVacantDate ?? null,
    type: apiRoom.type ?? "standard",
    image: imageUrls[0],
    images: imageUrls,
    imageUrls,
    floor: floorName,
    floorNumber,
    positionX: apiRoom.position_x ?? apiRoom.positionX ?? null,
    positionY: apiRoom.position_y ?? apiRoom.positionY ?? null,
    priceLabel: listedPrice ? `${listedPrice.toLocaleString("vi-VN")} VNĐ/tháng` : "Liên hệ",
    price: listedPrice,
    listedPrice,
    deposit: listedPrice,
    depositLabel: listedPrice ? `${listedPrice.toLocaleString("vi-VN")} VNĐ` : "Liên hệ",
    area: apiRoom.area_m2 ?? apiRoom.areaM2 ?? apiRoom.area ?? 0,
    feature: apiRoom.public_note ?? apiRoom.publicNote ?? "Tiện nghi",
    description: apiRoom.description ?? apiRoom.public_note ?? apiRoom.publicNote ?? "Không có mô tả",
    maxPeople: apiRoom.max_occupants ?? apiRoom.maxOccupants ?? 3,
    ownerName: "Hải Đăng House",
    ownerNote: "Chủ nhà hỗ trợ xem phòng và phản hồi yêu cầu đặt cọc trong giờ hành chính.",
    houseRules: [
      "Giữ yên tĩnh sau 22:00.",
      "Không tự ý cải tạo kết cấu phòng.",
      "Thông báo trước khi nuôi thú cưng hoặc ở thêm người.",
    ],
    lastMeterReading: { electric: 0, water: 0, recordedAt: "" },
    amenities: apiRoom.amenities?.length
      ? apiRoom.amenities
      : ["Wifi tốc độ cao", "Điều hòa", "Bình nóng lạnh", "Máy giặt", "Vệ sinh khép kín", "Khu phơi đồ"],
    buildingFacilities: ["An ninh 24/7", "Camera giám sát", "Bãi xe", "Khu giặt phơi", "Internet nhanh"],
  };

  return {
    ...normalizedRoom,
    status: roomHolds[normalizedRoom.id] && normalizedRoom.status === "available" ? "deposited" : normalizedRoom.status,
    holdExpiresAt: roomHolds[normalizedRoom.id]?.expiresAt,
  };
}

export async function fetchPublicProperties() {
  const response = await fetch(`${API_BASE_URL}/properties/simple`, { cache: "no-store" });
  return readApiResponse(response, "Không thể tải danh sách cơ sở");
}

function pageRows(pageResponse) {
  if (Array.isArray(pageResponse)) return pageResponse;
  if (Array.isArray(pageResponse?.data)) return pageResponse.data;
  return [];
}

export async function fetchPublicActiveProperties() {
  const params = new URLSearchParams({ status: "ACTIVE", size: "500" });
  const response = await fetch(`${API_BASE_URL}/properties?${params.toString()}`, { cache: "no-store" });
  const data = await readApiResponse(response, "Không thể tải danh sách cơ sở đang hoạt động");
  return pageRows(data);
}

export async function fetchPublicFloors(propertyId) {
  const response = await fetch(`${API_BASE_URL}/floors?propertyId=${encodeURIComponent(propertyId)}`, { cache: "no-store" });
  return readApiResponse(response, "Không thể tải danh sách tầng");
}

export async function fetchPublicRooms({ propertyId = 1, size = 100 } = {}) {
  const response = await fetch(
    `${PUBLIC_ROOMS_API_URL}?propertyId=${encodeURIComponent(propertyId)}&size=${encodeURIComponent(size)}`,
    { cache: "no-store" },
  );
  const data = await readApiResponse(response, "Không thể tải dữ liệu phòng");

  return data?.data ?? [];
}

function sameText(left, right) {
  return String(left ?? "").trim().toLowerCase() === String(right ?? "").trim().toLowerCase();
}

function enrichRoomWithFloor(room, floors, property) {
  const floor = floors.find((item) => sameText(item.name, room.floor_name ?? room.floorName))
    ?? floors.find((item) => sameText(item.floor_code ?? item.floorCode, room.floor_code ?? room.floorCode))
    ?? floors.find((item) => {
      const roomCode = String(room.room_code ?? room.roomCode ?? "");
      return roomCode.startsWith(String(item.sort_order ?? item.sortOrder ?? ""));
    })
    ?? null;

  return {
    ...room,
    property_id: property?.id ?? room.property_id ?? room.propertyId ?? null,
    propertyId: property?.id ?? room.property_id ?? room.propertyId ?? null,
    property_name: property?.name ?? room.property_name ?? room.propertyName ?? "",
    propertyName: property?.name ?? room.property_name ?? room.propertyName ?? "",
    floor_id: floor?.id ?? room.floor_id ?? room.floorId ?? null,
    floorId: floor?.id ?? room.floor_id ?? room.floorId ?? null,
    floor_code: floor?.floor_code ?? floor?.floorCode ?? room.floor_code ?? room.floorCode ?? null,
    floorCode: floor?.floor_code ?? floor?.floorCode ?? room.floor_code ?? room.floorCode ?? null,
    floor_name: floor?.name ?? room.floor_name ?? room.floorName ?? "",
    floorName: floor?.name ?? room.floor_name ?? room.floorName ?? "",
    floor_sort_order: floor?.sort_order ?? floor?.sortOrder ?? room.floor_sort_order ?? room.floorSortOrder ?? null,
    floorSortOrder: floor?.sort_order ?? floor?.sortOrder ?? room.floor_sort_order ?? room.floorSortOrder ?? null,
  };
}

export async function fetchPublicRoomCatalog({ propertyId } = {}) {
  const properties = await fetchPublicActiveProperties();
  const property = propertyId
    ? properties.find((item) => String(item.id) === String(propertyId))
    : properties[0];

  if (!property) {
    return { property: null, floors: [], rooms: [] };
  }

  const [floorsData, roomsData] = await Promise.all([
    fetchPublicFloors(property.id),
    fetchPublicRooms({ propertyId: property.id, size: 200 }),
  ]);

  const sortedFloors = [...floorsData].sort((a, b) => {
    const left = a.sort_order ?? a.sortOrder ?? 0;
    const right = b.sort_order ?? b.sortOrder ?? 0;
    return left - right;
  });
  const roomsWithFloor = roomsData
    .filter(isPublicRoomVisible)
    .map((room) => enrichRoomWithFloor(room, sortedFloors, property));
  const floorsWithRooms = sortedFloors.map((floor) => ({
    ...floor,
    rooms: roomsWithFloor.filter((room) => String(room.floor_id ?? room.floorId) === String(floor.id)),
  }));

  return {
    property,
    floors: floorsWithRooms,
    rooms: roomsWithFloor,
  };
}

function roomMatchesIdentifier(room, roomIdentifier) {
  const identifiers = [
    room?.id,
    room?.room_id,
    room?.roomId,
    room?.room_code,
    room?.roomCode,
    room?.code,
    room?.name,
  ];
  return identifiers.some((value) => String(value ?? "") === String(roomIdentifier));
}

function roomMatchesProperty(room, propertyId) {
  if (!propertyId) return true;
  const roomPropertyId =
    room?.property_id ??
    room?.propertyId ??
    room?.floor?.property?.id ??
    null;
  return String(roomPropertyId ?? "") === String(propertyId);
}

export async function fetchPublicRoomById(roomIdentifier, { propertyId } = {}) {
  if (!roomIdentifier) return null;

  if (propertyId) {
    const catalog = await fetchPublicRoomCatalog({ propertyId });
    const scopedRoom = catalog.rooms.find((room) =>
      roomMatchesIdentifier(room, roomIdentifier),
    );
    if (scopedRoom) return scopedRoom;
  }

  try {
    const response = await fetch(`${PUBLIC_ROOMS_API_URL}/${encodeURIComponent(roomIdentifier)}`, { cache: "no-store" });
    const data = await readApiResponse(response, "Không thể tải chi tiết phòng");

    if (data) {
      if (!isPublicRoomVisible(data)) return null;
      if (!roomMatchesProperty(data, propertyId)) return null;
      return data;
    }
  } catch {
    // Fallback to list lookup for temporary compatibility with old roomId links.
  }

  const catalog = await fetchPublicRoomCatalog();
  return catalog.rooms.find((room) => roomMatchesIdentifier(room, roomIdentifier)) ?? null;
}

export async function checkoutDeposit(formData) {
  // Use the global API base rather than PUBLIC_ROOMS_API_URL which ends in /rooms
  const checkoutUrl = `${API_BASE_URL}/deposit/checkout`;
  const fallbackCheckoutUrl = checkoutUrl.replace("http://localhost:", "http://127.0.0.1:");
  const createRequestOptions = () => ({
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    // Chú ý: Không set Content-Type, trình duyệt tự sinh boundary cho FormData multipart
    body: formData,
  });

  let response;
  try {
    response = await fetch(checkoutUrl, createRequestOptions());
  } catch {
    if (fallbackCheckoutUrl !== checkoutUrl) {
      try {
        response = await fetch(fallbackCheckoutUrl, createRequestOptions());
      } catch {
        throw new Error(
          `Không kết nối được tới API đặt cọc (${checkoutUrl} hoặc ${fallbackCheckoutUrl}). Vui lòng kiểm tra backend đang chạy và cấu hình NEXT_PUBLIC_API_BASE_URL.`
        );
      }
    } else {
      throw new Error(
        `Không kết nối được tới API đặt cọc (${checkoutUrl}). Vui lòng kiểm tra backend đang chạy và cấu hình NEXT_PUBLIC_API_BASE_URL.`
      );
    }
  }

  if (!response) {
    throw new Error(
      `Không kết nối được tới API đặt cọc (${checkoutUrl}). Vui lòng kiểm tra backend đang chạy và cấu hình NEXT_PUBLIC_API_BASE_URL.`
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    const error = new Error(payload.message || payload.details || "Không thể khởi tạo phiên đặt cọc.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload.data ?? null;
}

export async function checkoutBatchDeposit(formData) {
  const response = await fetch(`${API_BASE_URL}/public/deposits/batch-checkout`, {
    method: "POST",
    headers: {
      "X-Client-Type": "web",
    },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
    const error = new Error(payload.message || payload.details || "Không thể khởi tạo phiên đặt cọc nhiều phòng.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload.data ?? payload;
}

function depositAccessHeaders(accessToken, headers = {}) {
  return {
    ...headers,
    ...(accessToken ? { "X-Deposit-Access-Token": accessToken } : {}),
  };
}

export async function fetchBatchDepositStatus(batchId, accessToken) {
  if (!batchId) {
    throw new Error("Thiếu mã phiên đặt cọc nhiều phòng.");
  }

  const response = await fetch(
    `${API_BASE_URL}/public/deposits/batches/${encodeURIComponent(batchId)}/status`,
    {
      cache: "no-store",
      headers: depositAccessHeaders(accessToken, {
        "X-Client-Type": "web",
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
    throw new Error(payload.message || payload.details || "Không thể kiểm tra trạng thái thanh toán.");
  }

  return payload.data ?? payload;
}

export async function cancelBatchDeposit(batchId, accessToken) {
  if (!batchId) {
    throw new Error("Thiếu mã phiên đặt cọc để hủy giữ chỗ.");
  }

  const response = await fetch(
    `${API_BASE_URL}/public/deposits/batches/${encodeURIComponent(batchId)}/cancel`,
    {
      method: "POST",
      headers: depositAccessHeaders(accessToken, {
        "Content-Type": "application/json",
        "X-Client-Type": "web",
      }),
      body: JSON.stringify({}),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
    throw new Error(payload.message || payload.details || "Không thể hủy phiên giữ chỗ.");
  }

  return payload.data ?? payload;
}

export async function expireBatchDeposit(batchId, accessToken) {
  if (!batchId) {
    throw new Error("Thiếu mã phiên đặt cọc để xác nhận hết hạn.");
  }

  const response = await fetch(
    `${API_BASE_URL}/public/deposits/batches/${encodeURIComponent(batchId)}/expire`,
    {
      method: "POST",
      headers: depositAccessHeaders(accessToken, {
        "Content-Type": "application/json",
        "X-Client-Type": "web",
      }),
      body: JSON.stringify({}),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
    throw new Error(payload.message || payload.details || "Không thể xác nhận phiên giữ chỗ đã hết hạn.");
  }

  return payload.data ?? payload;
}

export async function fetchDepositRoomHoldStatus(roomId, dates = {}) {
  if (!roomId) return null;

  const params = new URLSearchParams();
  if (dates.expectedMoveInDate) params.set("expectedMoveInDate", dates.expectedMoveInDate);
  if (dates.expectedLeaseSignDate) params.set("expectedLeaseSignDate", dates.expectedLeaseSignDate);
  const queryString = params.toString();
  const response = await fetch(`${API_BASE_URL}/deposit/rooms/${encodeURIComponent(roomId)}/hold-status${queryString ? `?${queryString}` : ""}`, {
    cache: "no-store",
    headers: {
      "X-Client-Type": "web",
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || payload.details || "Không thể kiểm tra trạng thái giữ chỗ.");
  }

  return payload.data ?? null;
}

export async function fetchDepositPaymentStatus(paymentIntentId, accessToken) {
  if (!paymentIntentId) {
    throw new Error("Thiếu mã phiên thanh toán.");
  }

  const response = await fetch(`${API_BASE_URL}/deposit/payments/${encodeURIComponent(paymentIntentId)}/status`, {
    cache: "no-store",
    headers: depositAccessHeaders(accessToken, {
      "X-Client-Type": "web",
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || payload.details || "Không thể kiểm tra trạng thái thanh toán.");
  }

  return payload.data ?? null;
}

export async function cancelDepositPayment(paymentIntentId, accessToken) {
  if (!paymentIntentId) {
    throw new Error("Thiếu mã phiên thanh toán để hủy giữ chỗ.");
  }

  const response = await fetch(`${API_BASE_URL}/deposit/payments/${encodeURIComponent(paymentIntentId)}/cancel`, {
    method: "POST",
    headers: depositAccessHeaders(accessToken, {
      "Content-Type": "application/json",
      "X-Client-Type": "web",
    }),
    body: JSON.stringify({}),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || payload.details || "Không thể hủy phiên giữ chỗ.");
  }

  return payload.data ?? null;
}

export async function expireDepositPayment(paymentIntentId, accessToken) {
  if (!paymentIntentId) {
    throw new Error("Thiếu mã phiên thanh toán để xác nhận hết hạn.");
  }

  const response = await fetch(`${API_BASE_URL}/deposit/payments/${encodeURIComponent(paymentIntentId)}/expire`, {
    method: "POST",
    headers: depositAccessHeaders(accessToken, {
      "Content-Type": "application/json",
      "X-Client-Type": "web",
    }),
    body: JSON.stringify({}),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || payload.details || "Không thể xác nhận phiên giữ chỗ đã hết hạn.");
  }

  return payload.data ?? null;
}

export function getRoomDetailHref(room) {
  const buildingId = encodeURIComponent(room.buildingId || "hai-dang-house");
  // Always use room.id which is the roomCode (e.g., P101) for the public endpoint
  const roomId = encodeURIComponent(room.roomCode || room.id);

  return `/rooms/${buildingId}/${roomId}`;
}

export function findRoomById(roomId) {
  return rooms.find((room) => room.id === roomId || room.roomCode === roomId) ?? null;
}

export function statusCopy(status) {
  const copy = {
    draft: "Bản nháp",
    available: "Trống",
    onHold: "Đang đặt cọc",
    deposited: "Đã đặt cọc",
    occupied: "Đã thuê",
    soonVacant: "Sắp trống",
    maintenance: "Bảo trì",
    expired: "Hết hạn",
  };

  return copy[status] || "Chưa rõ";
}
