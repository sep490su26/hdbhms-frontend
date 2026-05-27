export const floorPlans = [
  { floor: "Tầng 1", left: ["P102", "P101"], right: ["P103", "P104", "P105", "P106"] },
  { floor: "Tầng 2", left: ["P202", "P201"], right: ["P203", "P204", "P205", "P206", "P207", "P208"] },
  { floor: "Tầng 3", left: ["P302", "P301"], right: ["P303", "P304", "P305", "P306", "P307", "P308"] },
  { floor: "Tầng 4", left: ["P402", "P401"], right: ["P403", "P404", "P405", "P406", "P407", "P408"] },
  { floor: "Tầng 5", left: ["P502", "P501"], right: ["P503", "P504", "P505", "P506", "P507"] },
];

const availableRoomIds = ["P101", "P103", "P202", "P203", "P208", "P303", "P308", "P401", "P403", "P408", "P503", "P507"];
const maintenanceRoomIds = ["P204", "P306"];
const soonVacantRoomIds = ["P105", "P301"];
const premiumRoomIds = ["P101", "P102", "P201", "P202", "P301", "P302", "P401", "P402", "P501", "P502"];
const quietRoomIds = ["P103", "P203", "P208", "P303", "P308", "P403", "P408", "P503", "P507"];

const roomImages = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80&crop=entropy",
  "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=900&q=80",
];
const defaultRoomImage = roomImages[0];

const amenitiesByType = {
  premium: ["Ban công riêng", "Cửa sổ lớn", "Máy lạnh Inverter", "Tủ quần áo", "Bàn làm việc", "Wifi tốc độ cao"],
  standard: ["Cửa sổ thoáng", "Máy lạnh", "Nội thất cơ bản", "Vệ sinh khép kín", "Wifi tốc độ cao"],
  quiet: ["Cửa sổ lớn", "Khu yên tĩnh", "Máy lạnh", "Kệ bếp mini", "Vệ sinh khép kín", "Khóa vân tay"],
};

const sharedRoomArea = 25;

function resolveLastMeterReading(code, floorIndex, roomIndex) {
  const roomNumber = Number(code.replace(/\D/g, "")) || 0;
  const electric = 980 + floorIndex * 165 + roomIndex * 23 + roomNumber % 17;
  const water = 58 + floorIndex * 12 + roomIndex * 4 + roomNumber % 5;

  return {
    electric,
    water,
    recordedAt: "15/05/2026",
  };
}

function resolveStatus(code) {
  if (maintenanceRoomIds.includes(code)) return "maintenance";
  if (soonVacantRoomIds.includes(code)) return "soonVacant";
  if (availableRoomIds.includes(code)) return "available";
  return "occupied";
}

export const rooms = floorPlans.flatMap((plan, floorIndex) =>
  [...plan.left, ...plan.right].map((code, roomIndex) => {
    const isPremium = premiumRoomIds.includes(code);
    const isQuiet = quietRoomIds.includes(code);
    const status = resolveStatus(code);
    const type = isPremium ? "premium" : isQuiet ? "quiet" : "standard";
    const amenities = amenitiesByType[type];
    const price = isPremium ? 2200000 : isQuiet ? 2100000 : 2000000;
    const imageOffset = (floorIndex + roomIndex) % roomImages.length;
    const lastMeterReading = resolveLastMeterReading(code, floorIndex, roomIndex);

    return {
      id: code,
      floor: plan.floor,
      floorNumber: floorIndex + 1,
      position: plan.left.includes(code) ? "left" : "right",
      status,
      price,
      priceLabel: price.toLocaleString("vi-VN"),
      deposit: price,
      depositLabel: price.toLocaleString("vi-VN"),
      area: sharedRoomArea,
      maxPeople: isPremium ? 3 : 2,
      image: roomImages[imageOffset],
      images: [
        roomImages[imageOffset],
        roomImages[(imageOffset + 1) % roomImages.length],
        roomImages[(imageOffset + 2) % roomImages.length],
        roomImages[(imageOffset + 3) % roomImages.length],
      ],
      type,
      feature: isPremium ? "Ban công" : isQuiet ? "Cửa sổ lớn" : "Cửa sổ thoáng",
      listedPrice: price,
      amenities,
      buildingFacilities: ["An ninh 24/7", "Camera giám sát", "Bãi xe", "Khu giặt phơi", "Internet nhanh"],
      lastMeterReading,
      description: isPremium
        ? "Phòng rộng, nhiều ánh sáng tự nhiên, phù hợp khách muốn không gian thoáng và có góc làm việc riêng."
        : isQuiet
          ? "Phòng nằm ở vị trí ít ồn, tiện cho sinh hoạt cá nhân và nghỉ ngơi lâu dài."
          : "Phòng tiêu chuẩn, bố trí gọn, đầy đủ tiện ích thiết yếu cho khách vào ở nhanh.",
      electricEstimate: "300K - 500K VND",
      waterEstimate: "50K - 100K VND",
    };
  }),
);

export const floors = ["Tất cả", ...floorPlans.map((plan) => plan.floor)];

export const PUBLIC_ROOMS_API_URL = "http://localhost:8080/api/v1/rooms";
export const LANDLORD_CONTACT_PHONE = "09770011200";
export const CONTACT_PHONE_HREF = `tel:${LANDLORD_CONTACT_PHONE}`;
export const CONTACT_ZALO_HREF = `https://zalo.me/${LANDLORD_CONTACT_PHONE}`;

export function mapApiRoomStatus(currentStatus) {
  const statusLower = currentStatus?.toLowerCase() ?? "";

  if (statusLower === "vacant" || statusLower === "available") return "available";
  if (statusLower === "on_hold") return "onHold";
  if (statusLower === "reserved" || statusLower === "deposited") return "deposited";
  if (statusLower === "soon_vacant") return "soonVacant";
  if (statusLower === "maintenance") return "maintenance";
  if (statusLower === "expired") return "expired";
  return "occupied";
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
  const floorOrder = apiRoom.floor?.sort_order ?? apiRoom.floor?.sortOrder;
  const floorNumber = floorOrder ?? parseInt(floorName?.replace(/\D/g, "") || "1", 10);

  // Handle image collections
  const backendImages = (apiRoom.images || []).map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
  const imageUrls = [
    apiRoom.first_image_url,
    apiRoom.firstImageUrl,
    apiRoom.imageUrl,
    ...backendImages
  ].filter(Boolean);

  const uniqueImages = [...new Set(imageUrls)];
  const status = mapApiRoomStatus(apiRoom.current_status ?? apiRoom.currentStatus);

  const normalizedRoom = {
    id: roomCode, // Key for frontend routing/display (e.g., P101)
    roomId: apiRoom.id ?? null, // Numeric ID for API operations
    roomCode: roomCode,
    buildingId: apiRoom.floor?.property?.id ?? apiRoom.property_id ?? apiRoom.propertyId ?? null,
    buildingName: apiRoom.floor?.property?.name ?? apiRoom.property_name ?? "Hải Đăng House",
    name: apiRoom.name ?? roomCode,
    status,
    type: apiRoom.type ?? "standard",
    image: uniqueImages[0] ?? defaultRoomImage,
    images: uniqueImages.length > 0 ? uniqueImages : [defaultRoomImage],
    floor: floorName,
    floorNumber,
    priceLabel: listedPrice ? `${(listedPrice / 1000000).toLocaleString("vi-VN")} tr/tháng` : "Liên hệ",
    price: listedPrice,
    listedPrice,
    deposit: listedPrice,
    depositLabel: listedPrice ? (listedPrice / 1000000).toLocaleString("vi-VN") + "M" : "Liên hệ",
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
    position: (roomCode?.endsWith("01") || roomCode?.endsWith("02")) ? "left" : "right",
  };

  return {
    ...normalizedRoom,
    status: roomHolds[normalizedRoom.id] && normalizedRoom.status === "available" ? "deposited" : normalizedRoom.status,
    holdExpiresAt: roomHolds[normalizedRoom.id]?.expiresAt,
  };
}

export async function fetchPublicRooms({ size = 100 } = {}) {
  const res = await fetch(`${PUBLIC_ROOMS_API_URL}?size=${size}`);
  const json = await res.json();

  if (json.code !== 0) {
    throw new Error(json.message || "Không thể tải dữ liệu phòng");
  }

  return json.data?.data ?? [];
}

export async function fetchPublicRoomById(roomId) {
  try {
    const res = await fetch(`${PUBLIC_ROOMS_API_URL}/${roomId}`);
    const json = await res.json();

    if (json.code === 0 && json.data) {
      return json.data;
    }
  } catch {
    // The detail endpoint is planned; the list endpoint remains the supported fallback.
  }

  const roomsData = await fetchPublicRooms();
  return roomsData.find((room) => room.id === roomId || room.roomCode === roomId) ?? null;
}

export async function checkoutDeposit(formData) {
  // Use the global API base rather than PUBLIC_ROOMS_API_URL which ends in /rooms
  const baseUrl = PUBLIC_ROOMS_API_URL.replace("/rooms", "");
  const response = await fetch(`${baseUrl}/deposit/checkout`, {
    method: "POST",
    headers: {
      "X-Client-Type": "web",
    },
    // Chú ý: Không set Content-Type, trình duyệt tự sinh boundary cho FormData multipart
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || payload.details || "Không thể khởi tạo phiên đặt cọc.");
  }

  return payload.data ?? null;
}

export async function confirmMockPayment(paymentCode) {
  const baseUrl = PUBLIC_ROOMS_API_URL.replace("/rooms", "");
  const response = await fetch(`${baseUrl}/mock/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Type": "web",
    },
    body: JSON.stringify({ payment_code: paymentCode }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || payload.details || "Không thể xác nhận thanh toán.");
  }

  return payload.data ?? null;
}

export function getRoomDetailHref(room) {
  const buildingId = encodeURIComponent(room.buildingId || "hai-dang-house");
  // Always use room.id which is the roomCode (e.g., P101) for the public endpoint
  const roomId = encodeURIComponent(room.id);

  return `/rooms/${buildingId}/${roomId}`;
}

export function findRoomById(roomId) {
  return rooms.find((room) => room.id === roomId) || rooms.find((room) => room.id === "P503") || rooms[0];
}

export function statusCopy(status) {
  const copy = {
    available: "Trống",
    onHold: "Đang đặt cọc",
    deposited: "Đã đặt cọc",
    occupied: "Đã thuê",
    soonVacant: "Sắp trống",
    maintenance: "Bảo trì",
    expired: "Hết hạn",
  };

  return copy[status] || "Đang ở";
}
