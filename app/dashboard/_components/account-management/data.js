export const accountTypeOptions = [
  { value: "all", label: "Tất cả loại tài khoản" },
  { value: "manager", label: "Quản lý" },
];

export const accountStatusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hoạt động" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "locked", label: "Đã khóa" },
];

export const accountTypeLabels = {
  manager: "Quản lý",
};

export const accountStatusMeta = {
  active: {
    label: "Đang hoạt động",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  pending: {
    label: "Chờ duyệt",
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  locked: {
    label: "Đã khóa",
    className: "bg-rose-50 text-rose-700 ring-rose-100",
  },
};

export const facilityOptions = [
  { value: "CS-TP", label: "Cơ sở Tân Phú" },
  { value: "CS-Q7", label: "Cơ sở Quận 7" },
  { value: "CS-TD", label: "Cơ sở Thủ Đức" },
  { value: "CS-BT", label: "Cơ sở Bình Thạnh" },
];

export const initialEmployeeAccounts = [
  {
    id: "EMP-001",
    fullName: "Nguyễn Hoàng Hùng",
    accountType: "manager",
    phone: "0902 118 456",
    email: "hung.nguyen@haidang.vn",
    status: "active",
    createdAt: "02/05/2026",
    lastLoginAt: "19/05/2026 08:40",
    assignedFacility: "CS-TP",
  },
  {
    id: "EMP-003",
    fullName: "Lê Gia Bảo",
    accountType: "manager",
    phone: "0937 441 009",
    email: "bao.le@haidang.vn",
    status: "pending",
    createdAt: "17/05/2026",
    lastLoginAt: "Chưa đăng nhập",
    assignedFacility: "",
  },
  {
    id: "EMP-005",
    fullName: "Đặng Quốc Việt",
    accountType: "manager",
    phone: "0966 340 711",
    email: "viet.dang@haidang.vn",
    status: "locked",
    createdAt: "25/04/2026",
    lastLoginAt: "10/05/2026 21:15",
    assignedFacility: "CS-Q7",
    lockedReason: "Không còn phụ trách vận hành cơ sở.",
  },
];
