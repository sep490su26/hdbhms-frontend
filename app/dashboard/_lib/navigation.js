import {
    ArrowRightLeft,
    BellRing,
    Building2,
    FileCheck2,
    FileText,
    Gauge,
    Inbox,
    LayoutDashboard,
    ReceiptText,
    SendToBack,
    Settings,
    UserRoundCog,
    UsersRound,
    WalletCards,
    Wrench,
} from "lucide-react";

export const navigation = [
    { path: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { path: "/dashboard/rooms", label: "Quản lý Phòng & Tầng", icon: Building2 },
    { path: "/dashboard/tenants", label: "Quản lý khách thuê", icon: UsersRound },
    { path: "/dashboard/accounts", label: "Quản lý nhân sự", icon: UserRoundCog },
    { path: "/dashboard/meter-readings", label: "Nhập số điện nước", icon: Gauge },
    { path: "/dashboard/maintenance", label: "Bảo trì", icon: Wrench },
    { path: "/dashboard/billing", label: "Hóa đơn & Thu tiền", icon: ReceiptText },
    { path: "/dashboard/debt", label: "Công nợ", icon: WalletCards },
    { path: "/dashboard/deposits", label: "Danh sách cọc", icon: FileCheck2 },
    { path: "/dashboard/contract-management", label: "Quản lý hợp đồng", icon: FileText },
    { path: "/dashboard/requests", label: "Hộp thư yêu cầu", icon: Inbox },
    { path: "/dashboard/room-transfer-history", label: "Lịch sử chuyển phòng", icon: SendToBack },
    { path: "/dashboard/notification-templates", label: "Template thông báo", icon: BellRing },
    { path: "/dashboard/finance", label: "Báo cáo doanh thu", icon: WalletCards },
    { path: "/dashboard/settings", label: "Cấu hình hệ thống", icon: Settings },
];

export const navigationPermissionKeys = {
    "/dashboard": "dashboard",
    "/dashboard/rooms": "rooms",
    "/dashboard/tenants": "tenants",
    "/dashboard/accounts": "accounts",
    "/dashboard/meter-readings": "meterReadings",
    "/dashboard/maintenance": "maintenance",
    "/dashboard/billing": "billing",
    "/dashboard/debt": "debt",
    "/dashboard/deposits": "deposits",
    "/dashboard/contract-management": "contract",
    "/dashboard/requests": "requests",
    "/dashboard/room-transfer-history": "roomTransferHistory",
    "/dashboard/notification-templates": "notificationTemplates",
    "/dashboard/finance": "finance",
    "/dashboard/settings": "settings",
};

export function isNavigationPathActive(pathname, path) {
    if (path === "/dashboard") {
        return pathname === path;
    }

    return pathname === path || pathname?.startsWith(`${path}/`);
}

export function getNavigationItemForPath(pathname) {
    return navigation
        .filter((item) => isNavigationPathActive(pathname, item.path))
        .sort((a, b) => b.path.length - a.path.length)[0];
}
