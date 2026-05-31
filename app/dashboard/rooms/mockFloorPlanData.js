export const floorTabs = [
  { id: 1, label: "Tầng 1" },
  { id: 2, label: "Tầng 2" },
  { id: 3, label: "Tầng 3" },
  { id: 4, label: "Tầng 4" },
  { id: 5, label: "Tầng 5" },
];

const floorRooms = {
  1: ["101", "102", "103", "104", "105", "106"],
  2: ["201", "202", "203", "204", "205", "206", "207", "208"],
  3: ["301", "302", "303", "304", "305", "306", "307", "308"],
  4: ["401", "402", "403", "404", "405", "406", "407", "408"],
  5: ["501", "502", "503", "504", "505", "506", "507"],
};

const statusByRoom = {
  101: "VACANT",
  102: "OCCUPIED",
  103: "RESERVED",
  104: "SOON_VACANT",
  105: "MAINTENANCE",
  106: "VACANT",
  201: "OCCUPIED",
  202: "OCCUPIED",
  203: "VACANT",
  204: "RESERVED",
  205: "OCCUPIED",
  206: "EXPIRED",
  207: "SOON_VACANT",
  208: "VACANT",
  301: "VACANT",
  302: "OCCUPIED",
  303: "OCCUPIED",
  304: "RESERVED",
  305: "VACANT",
  306: "MAINTENANCE",
  307: "OCCUPIED",
  308: "VACANT",
  401: "OCCUPIED",
  402: "VACANT",
  403: "RESERVED",
  404: "OCCUPIED",
  405: "SOON_VACANT",
  406: "VACANT",
  407: "OCCUPIED",
  408: "VACANT",
  501: "VACANT",
  502: "OCCUPIED",
  503: "RESERVED",
  504: "VACANT",
  505: "MAINTENANCE",
  506: "OCCUPIED",
  507: "VACANT",
};

const noteByStatus = {
  VACANT: "Sẵn sàng nhận khách mới.",
  OCCUPIED: "Khách đang thuê ổn định.",
  RESERVED: "Đã có khách giữ chỗ.",
  SOON_VACANT: "Khách báo trả phòng trong tháng.",
  MAINTENANCE: "Đang xử lý hạng mục bảo trì.",
  EXPIRED: "Hợp đồng cần gia hạn hoặc thanh lý.",
};

const roomImage =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80";

function buildMockRoom(code, floorNumber, index) {
  const status = statusByRoom[code] || "VACANT";
  const maxOccupants = index % 3 === 0 ? 3 : 2;
  const currentOccupants = status === "OCCUPIED" || status === "EXPIRED" ? Math.min(maxOccupants, 2) : 0;
  const badges = [];

  if (status === "RESERVED") badges.push("Đã có cọc");
  if (["204", "304", "503"].includes(code)) badges.push("Có đơn chờ");
  if (["206", "405"].includes(code)) badges.push("Nợ");

  return {
    id: `mock-${code}`,
    roomId: null,
    roomCode: code,
    displayCode: `P${code}`,
    name: `Phòng ${code}`,
    floorNumber,
    floorName: `Tầng ${floorNumber}`,
    area: 18 + floorNumber + (index % 3),
    listedPrice: 2200000 + floorNumber * 100000 + (index % 4) * 100000,
    currentOccupants,
    maxOccupants,
    status,
    badges,
    note: noteByStatus[status],
    image: roomImage,
    buildingName: "Hải Đăng House",
    buildingId: "hai-dang-house",
  };
}

export const mockFloorPlanData = Object.entries(floorRooms).flatMap(([floorNumber, codes]) =>
  codes.map((code, index) => buildMockRoom(code, Number(floorNumber), index)),
);
