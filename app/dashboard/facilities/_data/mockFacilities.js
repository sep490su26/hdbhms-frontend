export const FACILITY_STATUS = {
  ACTIVE: "ACTIVE",
  TEMPORARILY_CLOSED: "TEMP_CLOSED",
  PERMANENTLY_CLOSED: "CLOSED",
};

export const facilityStatusOptions = [
  { value: FACILITY_STATUS.ACTIVE, label: "Đang hoạt động" },
  { value: FACILITY_STATUS.TEMPORARILY_CLOSED, label: "Tạm ngừng" },
  { value: FACILITY_STATUS.PERMANENTLY_CLOSED, label: "Ngừng hoạt động" },
];

export const initialFacilities = [];
