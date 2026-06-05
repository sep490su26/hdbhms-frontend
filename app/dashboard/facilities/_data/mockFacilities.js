export const FACILITY_STATUS = {
  ACTIVE: "ACTIVE",
  TEMPORARILY_CLOSED: "TEMPORARILY_CLOSED",
  PERMANENTLY_CLOSED: "PERMANENTLY_CLOSED",
};

export const facilityStatusOptions = [
  { value: FACILITY_STATUS.ACTIVE, label: "Đang hoạt động" },
  { value: FACILITY_STATUS.TEMPORARILY_CLOSED, label: "Tạm ngừng" },
  { value: FACILITY_STATUS.PERMANENTLY_CLOSED, label: "Ngừng hoạt động" },
];

function createRooms(prefix, count, occupiedCount) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `Phòng ${prefix}${String(index + 1).padStart(2, "0")}`,
    status: index < occupiedCount ? "OCCUPIED" : "VACANT",
  }));
}

export const initialFacilities = [
  {
    id: "facility-central",
    code: "DCP-01",
    name: "Dorm Central Park",
    address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
    description: "Cơ sở trung tâm, gần khu văn phòng và tuyến metro.",
    status: FACILITY_STATUS.ACTIVE,
    hasActiveContracts: true,
    hasOutstandingDebts: false,
    floors: [
      { id: "central-f1", name: "Tầng 1", rooms: createRooms("1", 8, 7) },
      { id: "central-f2", name: "Tầng 2", rooms: createRooms("2", 8, 8) },
      { id: "central-f3", name: "Tầng 3", rooms: createRooms("3", 8, 6) },
    ],
  },
  {
    id: "facility-riverside",
    code: "DRV-02",
    name: "Dorm Riverside",
    address: "45 Lê Lợi, Quận 1, TP.HCM",
    description: "Khu nhà ở yên tĩnh với không gian sinh hoạt chung.",
    status: FACILITY_STATUS.TEMPORARILY_CLOSED,
    hasActiveContracts: false,
    hasOutstandingDebts: false,
    floors: [
      { id: "river-f1", name: "Tầng 1", rooms: createRooms("1A", 6, 2) },
      { id: "river-f2", name: "Tầng 2", rooms: createRooms("2A", 7, 4) },
    ],
  },
  {
    id: "facility-sky-view",
    code: "SVD-05",
    name: "Sky View Dorm",
    address: "88 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM",
    description: "Tòa nhà nhiều tầng dành cho sinh viên và người đi làm.",
    status: FACILITY_STATUS.ACTIVE,
    hasActiveContracts: true,
    hasOutstandingDebts: true,
    outstandingDebtAmount: 18450000,
    floors: [
      { id: "sky-f1", name: "Tầng 1", rooms: createRooms("S1", 10, 9) },
      { id: "sky-f2", name: "Tầng 2", rooms: createRooms("S2", 10, 8) },
      { id: "sky-f3", name: "Tầng 3", rooms: createRooms("S3", 10, 9) },
      { id: "sky-f4", name: "Tầng 4", rooms: createRooms("S4", 10, 7) },
    ],
  },
  {
    id: "facility-tech-park",
    code: "DTP-08",
    name: "Dorm Tech Park",
    address: "Khu Công Nghệ Cao, Quận 9, TP.HCM",
    description: "Cơ sở mới, phù hợp nhân sự làm việc tại khu công nghệ cao.",
    status: FACILITY_STATUS.ACTIVE,
    hasActiveContracts: false,
    hasOutstandingDebts: false,
    floors: [
      { id: "tech-f1", name: "Tầng 1", rooms: createRooms("T1", 8, 5) },
      { id: "tech-f2", name: "Tầng 2", rooms: createRooms("T2", 8, 4) },
      { id: "tech-f3", name: "Tầng 3", rooms: createRooms("T3", 8, 3) },
    ],
  },
];
