"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  Bell,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardCheck,
  CloudUpload,
  DoorOpen,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  Gauge,
  Grid3X3,
  Home,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Mail,
  Map,
  Moon,
  Phone,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRoundCog,
  UsersRound,
  WalletCards,
  Wrench,
  Menu,
  X,
} from "lucide-react";
import {
  allRooms,
  collectionItems,
  contractTemplates,
  depositContracts,
  invoices,
  maintenanceTickets,
  roles,
  systemUsers,
  tenants,
} from "../../services/dashboardService";
import { floors, statusCopy } from "../../services/roomsService";
import { AccountManagement } from "./_components/account-management/AccountManagement";
import { AuthProvider } from "./_contexts/AuthContext";
import { PermissionGuard } from "./_components/PermissionGuard";
import {
  ROLE_LABELS,
  ROLES,
  ACTION_PERMISSIONS,
  SECTION_PERMISSIONS,
  canAccessSection,
  getFirstAllowedSection,
} from "./_lib/rbac";
import {
  ROOM_HOLD_DURATION_MS,
  formatHoldCountdown,
  getActiveRoomHolds,
  getHoldRemainingMs,
} from "../../lib/roomHoldStorage";

const money = new Intl.NumberFormat("vi-VN");

const navigation = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "floor", label: "Sơ đồ tầng", icon: Map },
  { id: "rooms", label: "Quản lý phòng", icon: Building2 },
  { id: "tenants", label: "Khách thuê", icon: UsersRound },
  { id: "accounts", label: "Quản lý Tài khoản", icon: UserRoundCog },
  { id: "meterReadings", label: "Nhập số điện nước", icon: Gauge },
  { id: "maintenance", label: "Bảo trì", icon: Wrench },
  { id: "deposits", label: "Danh sách cọc", icon: FileCheck2 },
  { id: "contract", label: "Mẫu hợp đồng", icon: FileText },
  { id: "finance", label: "Báo cáo Tài chính", icon: WalletCards },
  { id: "settings", label: "Cấu hình hệ thống", icon: Settings },
];

const depositStatus = {
  pending: ["Chờ duyệt", "bg-amber-50 text-amber-700 ring-amber-100"],
  approved: ["Đã nhận phòng", "bg-emerald-50 text-emerald-700 ring-emerald-100"],
  cancelled: ["Đã hủy", "bg-rose-50 text-rose-700 ring-rose-100"],
  overdue: ["Quá hạn", "bg-slate-100 text-slate-600 ring-slate-200"],
  refunded: ["Đã hoàn cọc", "bg-blue-50 text-blue-700 ring-blue-100"],
  forfeited: ["Mất cọc", "bg-red-50 text-red-700 ring-red-100"],
};

const roomStatus = {
  occupied:   ["Đang thuê",    "bg-blue-50 text-blue-800"],
  available:  ["Trống",         "bg-emerald-50 text-emerald-700"],
  maintenance:["Bảo trì",       "bg-red-50 text-red-700"],
  soonVacant: ["Sắp trống",     "bg-orange-50 text-orange-700"],
  deposited:  ["Đang đặt cọc", "bg-amber-50 text-amber-700"],
  expired:    ["Hết hạn",       "bg-purple-50 text-purple-700"],
};

const ticketStatus = {
  pending: ["Chờ xử lý", "bg-red-50 text-red-700"],
  inProgress: ["Đang làm", "bg-amber-50 text-amber-700"],
  scheduled: ["Đã lên lịch", "bg-blue-50 text-blue-700"],
  done: ["Hoàn tất", "bg-emerald-50 text-emerald-700"],
};

const invoiceStatus = {
  paid: ["Đã thu", "bg-emerald-50 text-emerald-700"],
  unpaid: ["Chưa thu", "bg-amber-50 text-amber-700"],
  overdue: ["Quá hạn", "bg-rose-50 text-rose-700"],
};

const initialAccountApprovals = [
  {
    id: "APP-2401",
    name: "Đặng Minh Khang",
    phone: "0977001122",
    email: "khang.dang@example.com",
    roomId: "P203",
    requestedAt: "19/05/2026 08:15",
    status: "pending",
  },
];

function formatMoney(value) {
  return `${money.format(value)} đ`;
}

function parseVNDate(value) {
  if (!value) return null;
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function parseVNDateTime(value) {
  if (!value) return 0;
  const [datePart, timePart = "00:00"] = value.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime();
}

function downloadTextFile(filename, content, type = "text/csv;charset=utf-8") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Modal({ title, children, onClose, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <h2 className="text-lg font-bold text-[#091426]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-md p-2 text-[#505f76] hover:bg-[#f2f4f6]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-6 custom-scrollbar">{children}</div>
        {footer && <div className="border-t border-[#e2e8f0] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function ExportConfirm({ title, filename, description, onClose, onConfirm }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6b7280]">File sẽ được tải về máy: <span className="font-bold text-[#091426]">{filename}</span></p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]">Hủy</button>
            <button type="button" onClick={onConfirm} className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white">Xuất file</button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-[#45474c]">{description}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {["CSV", "Dữ liệu đang lọc", "Tải về máy"].map((item) => (
            <div key={item} className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4 text-sm font-bold text-[#091426]">{item}</div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function StatusBadge({ value, map }) {
  const [label, className] = map[value] || ["Không rõ", "bg-slate-100 text-slate-700"];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>{label}</span>;
}

function IconButton({ label, icon: Icon, onClick, tone = "neutral" }) {
  const tones = {
    neutral: "text-[#505f76] hover:bg-[#f2f4f6] hover:text-[#091426]",
    good: "text-emerald-600 hover:bg-emerald-50",
    warn: "text-blue-600 hover:bg-blue-50",
    bad: "text-rose-600 hover:bg-rose-50",
  };

  return (
    <button type="button" onClick={onClick} aria-label={label} className={`rounded-md p-2 transition ${tones[tone]}`}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Sidebar({ activeSection, onSectionChange, isOpen, onClose }) {
  return (
    <>
      {/* Mobile menu backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#091426]/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-[#172235] bg-[#091426] px-5 py-6 text-white transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:flex`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#091426]">
              <Home className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xl font-bold leading-7">Hải Đăng</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8590a6]">Property management</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#8590a6] hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-11 text-xs font-semibold uppercase tracking-[0.12em] text-[#3c475a]">Main menu</div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <PermissionGuard key={item.id} allowedRoles={SECTION_PERMISSIONS[item.id]}>
                <button
                  type="button"
                  onClick={() => {
                    onSectionChange(item.id);
                    onClose();
                  }}
                  className={`flex items-center gap-3 rounded-r-lg border-l-4 px-4 py-3 text-left text-sm transition ${
                    isActive
                      ? "border-emerald-400 bg-[#1e293b] text-white"
                      : "border-transparent text-[#647089] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </button>
              </PermissionGuard>
            );
          })}
        </nav>

        <div className="border-t border-[#172235] pt-5">
          <div className="flex items-center justify-between rounded-lg px-3 py-3 text-[#647089]">
            <span className="inline-flex items-center gap-3 text-sm">
              <Bell className="h-5 w-5" />
              Thông báo
            </span>
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">5</span>
          </div>
          <div className="mt-3 flex items-center gap-3 px-3 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-[#091426]">A</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-white">Admin User</span>
              <span className="block truncate text-xs text-[#647089]">admin@haidang.vn</span>
            </span>
          </div>
          <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#647089] hover:bg-white/5 hover:text-white">
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ activeRole, onRoleChange, search, onSearchChange, onToggleMobileMenu }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-[#e2e8f0] bg-white px-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:px-6 lg:ml-[280px]">
      <div className="flex min-w-0 items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="rounded-lg border border-[#e2e8f0] p-1.5 text-[#505f76] hover:bg-[#f2f4f6]"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#091426] text-white">
          <Home className="h-5 w-5" />
        </span>
        <span className="truncate text-sm font-bold text-[#091426]">Hải Đăng</span>
      </div>

      <label className="relative hidden w-full max-w-sm md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm phòng, khách thuê, mã cọc..."
          className="h-9 w-full rounded-full bg-[#f2f4f6] pl-10 pr-4 text-sm font-semibold text-[#091426] outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#091426]/10"
        />
      </label>

      <div className="ml-auto flex items-center gap-3">
        <PermissionGuard
          allowedRoles={ACTION_PERMISSIONS.changeOwnRole}
          fallback={
            <div className="rounded-full border border-[#e2e8f0] bg-[#f7f9fb] px-3 py-2 text-xs font-bold text-[#091426]">
              {ROLE_LABELS[activeRole] || "Không rõ quyền"}
            </div>
          }
          mode="disabled"
        >
          <div className="flex rounded-full border border-[#e2e8f0] bg-[#f7f9fb] p-1">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => onRoleChange(role.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  activeRole === role.id ? "bg-[#091426] text-white shadow-sm" : "text-[#505f76] hover:text-[#091426]"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </PermissionGuard>
        <button type="button" aria-label="Thông báo" className="relative rounded-full p-2 text-[#505f76] hover:bg-[#f2f4f6]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="hidden items-center gap-2 border-l border-[#e2e8f0] pl-3 sm:flex">
          <span className="text-xs font-bold text-[#505f76]">{ROLE_LABELS[activeRole] || "User"}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d3e4fe] text-xs font-bold text-[#091426]">A</span>
        </div>
      </div>
    </header>
  );
}

function PageHeader({ title, description, actionLabel, actionIcon: ActionIcon = Check, onAction }) {
  return (
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">{description}</p>
      </div>
      {actionLabel && (
        <button type="button" onClick={onAction} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a]">
          <ActionIcon className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function KpiCard({ icon: Icon, label, value, subtext, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <article className="flex min-h-[104px] items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#191c1e]">{value}</p>
        {subtext && <p className="mt-1 truncate text-xs text-[#6b7280]">{subtext}</p>}
      </div>
    </article>
  );
}

function Card({ children, className = "" }) {
  return <section className={`rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}>{children}</section>;
}

function FilterBar({ children }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">{children}</div>;
}

function SelectPill({ icon: Icon, children }) {
  return (
    <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#191c1e] hover:border-[#091426]">
      {Icon && <Icon className="h-4 w-4 text-[#505f76]" />}
      {children}
    </button>
  );
}

function DashboardOverview({ selectedRole, deposits }) {
  const occupiedRooms = allRooms.filter((room) => room.status === "occupied").length;
  const availableRooms = allRooms.filter((room) => room.status === "available").length;
  const pendingDeposits = deposits.filter((deposit) => deposit.status === "pending").length;
  const riskyDeposits = deposits.filter((deposit) => ["overdue", "cancelled", "forfeited"].includes(deposit.status)).length;
  const monthlyRevenue = allRooms.filter((room) => room.status === "occupied").reduce((total, room) => total + room.price, 0);

  return (
    <>
      <PageHeader title="Dashboard quản lý nhà trọ" description={selectedRole.description} actionLabel="Tạo phiếu xử lý" actionIcon={ShieldCheck} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Gauge} label="Công suất thuê" value={`${Math.round((occupiedRooms / allRooms.length) * 100)}%`} subtext={`${occupiedRooms}/${allRooms.length} phòng đang thuê`} />
        <KpiCard icon={DoorOpen} label="Phòng còn trống" value={availableRooms} subtext="Có thể tạo hợp đồng cọc" tone="emerald" />
        <KpiCard icon={BadgeDollarSign} label="Cọc chờ duyệt" value={pendingDeposits} subtext="Cần kế toán đối soát" tone="amber" />
        <KpiCard icon={AlertTriangle} label="Hồ sơ rủi ro" value={riskyDeposits} subtext="Quá hạn, hủy hoặc mất cọc" tone="rose" />
      </section>
      <FinanceSummary />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FloorOccupancy compact />
        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">Doanh thu dự kiến</p>
          <p className="mt-3 text-3xl font-bold text-[#091426]">{formatMoney(monthlyRevenue)}</p>
          <p className="mt-4 text-sm leading-6 text-[#45474c]">Tính từ các phòng đang ở, giúp chủ trọ kiểm tra nhanh hiệu suất khai thác.</p>
        </Card>
      </section>
    </>
  );
}

function FinanceSummary() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {collectionItems.map((item) => (
        <Card key={item.label} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">{item.label}</p>
              <p className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[#091426]">{formatMoney(item.value)}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{item.delta}</span>
          </div>
        </Card>
      ))}
    </section>
  );
}

function FloorOccupancy({ compact = false }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-[#191c1e]">Tình trạng phòng theo tầng</h2>
        <Map className="h-5 w-5 text-[#505f76]" />
      </div>
      <div className={`mt-6 grid gap-3 ${compact ? "sm:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-5"}`}>
        {[1, 2, 3, 4, 5].map((floor) => {
          const floorRooms = allRooms.filter((room) => room.floorNumber === floor);
          const occupied = floorRooms.filter((room) => room.status === "occupied").length;
          const percent = Math.round((occupied / floorRooms.length) * 100);

          return (
            <div key={floor} className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#091426]">Tầng {floor}</p>
                <p className="text-xs font-bold text-[#505f76]">{percent}%</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#091426]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-3 text-xs text-[#45474c]">{floorRooms.length - occupied} phòng trống / {floorRooms.length} phòng</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Floor-map status config ────────────────────────────────────────────────
const FLOOR_STATUSES = [
  { key: "available",   label: "Trống",          dot: "bg-emerald-500" },
  { key: "occupied",    label: "Đang thuê",      dot: "bg-blue-500"    },
  { key: "soonVacant",  label: "Sắp trống",      dot: "bg-orange-500"  },
  { key: "deposited",   label: "Đặt cọc",        dot: "bg-amber-400"   },
  { key: "maintenance", label: "Bảo trì",        dot: "bg-red-500"     },
  { key: "expired",     label: "Hết hạn",        dot: "bg-purple-500"  },
];

const STATUS_DOT = {
  available:   "bg-emerald-500",
  occupied:    "bg-blue-500",
  soonVacant:  "bg-orange-500",
  deposited:   "bg-amber-400",
  maintenance: "bg-red-500",
  expired:     "bg-purple-500",
};

function roomCellBg(room) {
  if (room.price >= 2200000) return "bg-[#1e3a5f]";
  if (room.price >= 2100000) return "bg-[#1a3352]";
  return "bg-[#16253a]";
}

function priceTierLabel(price) {
  const m = price / 1000000;
  return `${Number.isInteger(m) ? m : m.toFixed(1)} trđ/th`;
}

function RoomDetailPanel({ room, tenantList, onClose }) {
  const tenant = room ? tenantList.find((t) => t.roomId === room.id) : null;
  const [detailTab, setDetailTab] = useState("info");
  
  const [roomDetail, setRoomDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    if (!room?.roomId) return;
    const fetchStaffDetail = async () => {
      try {
        setIsDetailLoading(true);
        const res = await fetch(`http://localhost:8080/api/v1/rooms/id/${room.roomId}`, {
          headers: { "Authorization": "Bearer <STAFF_JWT>" }
        });
        const json = await res.json();
        if (json.code === 0) setRoomDetail(json.data);
      } finally {
        setIsDetailLoading(false);
      }
    };
    fetchStaffDetail();
  }, [room?.roomId]);

  if (!room) return null;

  const statusLabel = roomStatus[room.status]?.[0] ?? "Không rõ";
  const statusCls   = roomStatus[room.status]?.[1] ?? "";

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-lg">
      <div className="flex items-start justify-between border-b border-[#e2e8f0] bg-[#091426] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">{room.id}</span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${statusCls}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8590a6]">
            Tầng {room.floorNumber} &middot; {room.area} m² &middot; {roomDetail?.publicNote ?? "Không có"}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-md p-1 text-[#8590a6] hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-[#e2e8f0]">
        {[
          { id: "info",   label: "Thông tin" },
          { id: "tenant", label: "Khách thuê" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setDetailTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-bold transition ${
              detailTab === tab.id
                ? "border-b-2 border-[#091426] text-[#091426]"
                : "text-[#505f76] hover:text-[#091426]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {detailTab === "info" && (
          <div className="space-y-4">
            {isDetailLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-[#e2e8f0] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#45474c]">Giá thuê</p>
                  <p className="mt-1 text-2xl font-bold text-[#091426]">{formatMoney(roomDetail?.listedPrice ?? room.price)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Diện tích", value: `${roomDetail?.areaM2 ?? room.area} m²` },
                    { label: "Sức chứa", value: `${roomDetail?.maxOccupants ?? 3} người` },
                    { label: "Đặc điểm", value: roomDetail?.publicNote ?? "Không có" },
                    { label: "Trạng thái xóa", value: roomDetail?.deletedAt ? "Đã xóa mềm" : "Hoạt động" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-[#f7f9fb] p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#6b7280]">{label}</p>
                      <p className={`mt-0.5 text-sm font-bold ${roomDetail?.deletedAt && label === "Trạng thái xóa" ? "text-rose-600 line-through" : "text-[#191c1e]"}`}>{value}</p>
                    </div>
                  ))}
                </div>
                
                <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
                   <p className="text-[10px] font-semibold uppercase text-amber-800">Ghi chú nội bộ (Staff Only)</p>
                   <p className="mt-0.5 text-sm text-amber-900">{roomDetail?.internalNote ?? "Không có ghi chú"}</p>
                </div>

                <div className="mt-4">
                   <label className="text-[10px] font-bold uppercase tracking-wider text-[#45474c]">Mã phòng (Cập nhật)</label>
                   <input 
                     type="text" 
                     value={roomDetail?.roomCode ?? room.id} 
                     readOnly 
                     disabled 
                     className="w-full bg-[#f7f9fb] border border-[#e2e8f0] text-[#6b7280] cursor-not-allowed rounded-lg px-3 py-2 mt-1 text-sm font-bold" 
                     title="Mã phòng không thể thay đổi sau khi khởi tạo"
                   />
                </div>
              </>
            )}
          </div>
        )}

        {detailTab === "tenant" && (
          <div className="space-y-4">
            {tenant ? (
              <>
                <div className="flex items-center gap-3 rounded-lg bg-[#f7f9fb] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#091426] text-sm font-bold text-white">
                    {tenant.initials}
                  </span>
                  <div>
                    <p className="font-bold text-[#191c1e]">{tenant.name}</p>
                    <p className="text-xs text-[#6b7280]">Vào ở: {tenant.moveInDate}</p>
                  </div>
                </div>
                {[
                  { label: "SĐT",   value: tenant.phone },
                  { label: "Email",  value: tenant.email },
                  { label: "CCCD",   value: tenant.citizenId },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3 rounded-lg bg-[#f7f9fb] px-4 py-3">
                    <p className="w-10 shrink-0 text-[10px] font-semibold uppercase text-[#6b7280]">{label}</p>
                    <p className="text-sm text-[#191c1e]">{value}</p>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <UsersRound className="h-8 w-8 text-[#c8d0dc]" />
                <p className="text-sm font-medium text-[#6b7280]">Chưa có khách thuê</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-[#e2e8f0] p-4">
        <button type="button" className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e2e8f0] py-2 text-xs font-bold text-[#505f76] hover:border-[#091426] hover:text-[#091426]">
          <Edit3 className="h-3.5 w-3.5" />Chỉnh sửa
        </button>
        <button type="button" className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#091426] py-2 text-xs font-bold text-white hover:bg-[#16253a]">
          <Eye className="h-3.5 w-3.5" />Xem đầy đủ
        </button>
      </div>
    </aside>
  );
}

function RoomCell({ room, isSelected, onClick, isLarge }) {
  const dot = STATUS_DOT[room.status] ?? "bg-slate-400";
  const bg  = roomCellBg(room);
  return (
    <button
      type="button"
      onClick={() => onClick(room)}
      aria-label={`Phòng ${room.id}`}
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border text-left transition-all
        ${isLarge ? "min-h-[110px] p-4" : "min-h-[76px] p-3"} ${bg}
        ${isSelected
          ? "border-brand-primary ring-2 ring-brand-primary/40 scale-[1.03] shadow-lg"
          : "border-white/10 hover:border-white/30 hover:shadow-md"
        }
      `}
    >
      <span className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${dot} ring-2 ring-[#091426]`} />
      <span className={`font-bold text-white ${isLarge ? "text-base" : "text-sm"}`}>{room.id}</span>
      <div className="mt-2">
        <p className="text-[10px] font-semibold text-white/60">{priceTierLabel(room.price)}</p>
        {isLarge && <p className="text-[10px] text-white/40">{room.area} m²</p>}
      </div>
    </button>
  );
}

function FloorMapPage({ tenants: tenantList = [] }) {
  const [apiRooms, setApiRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchStaffRooms = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("http://localhost:8080/api/v1/rooms?size=100", {
          headers: {
            "Authorization": "Bearer <STAFF_JWT>",
            "Content-Type": "application/json"
          }
        });
        const json = await res.json();
        if (json.code === 0) {
          setApiRooms(json.data?.content ?? []);
          setIsSuccess(true);
        } else {
          setIsError(true);
        }
      } catch (e) {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaffRooms();
  }, []);

  const floorRoomsData = useMemo(() => {
    return apiRooms.map((apiRoom) => {

      const statusLower = apiRoom.currentStatus?.toLowerCase() ?? "";
      let mappedStatus = "occupied";
      if (statusLower === "vacant") mappedStatus = "available";
      else if (statusLower === "soon_vacant") mappedStatus = "soonVacant";
      else if (statusLower === "reserved") mappedStatus = "deposited";
      else if (statusLower === "maintenance") mappedStatus = "maintenance";

      return {
        id: apiRoom.roomCode ?? "",
        roomId: apiRoom.id ?? null,
        status: mappedStatus,
        price: apiRoom.listedPrice ?? 0,
        area: apiRoom.areaM2 ?? 0,
        floorNumber: parseInt(apiRoom.floorName?.replace(/\D/g, '') || "1", 10),
        position: (apiRoom.positionX ?? 0) < 50 ? "left" : "right"
      };
    });
  }, [apiRooms]);

  const [activeFloor, setActiveFloor] = useState(2);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const floorRooms  = useMemo(() => floorRoomsData.filter((r) => r.floorNumber === activeFloor), [floorRoomsData, activeFloor]);
  const leftRooms   = useMemo(() => floorRooms.filter((r) => r.position === "left"),  [floorRooms]);
  const rightRooms  = useMemo(() => floorRooms.filter((r) => r.position === "right"), [floorRooms]);

  const stats = useMemo(() => ({
    total:       floorRoomsData.length,
    occupied:    floorRoomsData.filter((r) => r.status === "occupied").length,
    available:   floorRoomsData.filter((r) => r.status === "available").length,
    maintenance: floorRoomsData.filter((r) => r.status === "maintenance").length,
  }), [floorRoomsData]);

  function handleRoomClick(room) {
    setSelectedRoom((prev) => (prev?.id === room.id ? null : room));
  }

  return (
    <>
      <PageHeader
        title="Sơ đồ tầng"
        description="Xem nhanh trạng thái từng phòng theo tầng. Màu nền = mức giá, chấm tròn = trạng thái."
      />

      {isLoading && <div className="py-10 text-center text-[#505f76] font-bold">Đang tải sơ đồ tầng...</div>}
      {isError && <div className="p-4 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 font-semibold text-sm mt-4">Không thể tải dữ liệu sơ đồ tầng. Vui lòng thử lại.</div>}
      {isSuccess && (
        <div className="space-y-6 mt-6">
      {/* KPI bar */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tổng phòng",   value: stats.total,       bg: "bg-blue-50",    text: "text-blue-700"    },
          { label: "Đang thuê",    value: stats.occupied,    bg: "bg-slate-100",  text: "text-slate-700"   },
          { label: "Phòng trống", value: stats.available,   bg: "bg-emerald-50", text: "text-emerald-700" },
          { label: "Bảo trì",     value: stats.maintenance, bg: "bg-rose-50",    text: "text-rose-700"    },
        ].map(({ label, value, bg, text }) => (
          <article key={label} className={`flex flex-col rounded-xl border border-[#e2e8f0] ${bg} px-5 py-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${text}`}>{label}</p>
            <p className={`mt-1 text-3xl font-bold ${text}`}>{value}</p>
          </article>
        ))}
      </section>

      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] bg-[#f7f9fb] px-5 py-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setActiveFloor(n);
                  setSelectedRoom(null);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  activeFloor === n
                    ? "bg-white text-[#091426] shadow-sm ring-1 ring-[#e2e8f0]"
                    : "text-[#505f76] hover:text-[#091426]"
                }`}
              >
                Tầng {n}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-4 xl:flex">
            {FLOOR_STATUSES.map(({ key, label, dot }) => (
              <span key={key} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#45474c]">
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 border-b border-[#e2e8f0] bg-[#091426]/[0.03] px-5 py-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">Màu ô:</span>
          {[
            { bg: "bg-[#1e3a5f]", label: "2.200.000 đ" },
            { bg: "bg-[#1a3352]", label: "2.100.000 đ" },
            { bg: "bg-[#16253a]", label: "2.000.000 đ" },
          ].map(({ bg, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#45474c]">
              <span className={`h-3 w-5 rounded ${bg}`} />
              {label}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-0 xl:flex-row">
          <div className="flex-1 p-5">
            <div className="mx-auto grid max-w-[920px] grid-cols-1 gap-5 lg:grid-cols-[214px_1fr]">
              <div className="grid gap-3 content-start">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">Phòng lớn</p>
                {leftRooms.map((room) => (
                  <RoomCell
                    key={room.id}
                    room={room}
                    isSelected={selectedRoom?.id === room.id}
                    onClick={handleRoomClick}
                    isLarge
                  />
                ))}
                <div className="flex min-h-[62px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-4">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Cầu thang</span>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">Phòng tiêu chuẩn</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rightRooms.map((room) => (
                    <RoomCell
                      key={room.id}
                      room={room}
                      isSelected={selectedRoom?.id === room.id}
                      onClick={handleRoomClick}
                      isLarge={false}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 xl:hidden">
              {FLOOR_STATUSES.map(({ key, label, dot }) => (
                <span key={key} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#45474c]">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {selectedRoom && (
            <>
              <div
                className="fixed inset-0 z-30 bg-[#091426]/60 backdrop-blur-sm xl:hidden"
                onClick={() => setSelectedRoom(null)}
              />
              <div className="fixed inset-y-0 right-0 z-40 flex w-[340px] max-w-[90vw] flex-col bg-[#f7f9fb] p-3 shadow-2xl xl:static xl:z-0 xl:w-auto xl:bg-transparent xl:p-3 xl:shadow-none xl:shrink-0 xl:border-l xl:border-[#e2e8f0]">
                <RoomDetailPanel
                  room={selectedRoom}
                  tenantList={tenantList}
                  onClose={() => setSelectedRoom(null)}
                />
              </div>
            </>
          )}
        </div>
      </div>
      </div>
      )}
    </>
  );
}

function RoomsPage({ query }) {
  const [exportPrompt, setExportPrompt] = useState(false);
  const filteredRooms = allRooms.filter((room) => {
    const normalizedQuery = query.trim().toLowerCase();
    return !normalizedQuery || room.id.toLowerCase().includes(normalizedQuery) || room.floor.toLowerCase().includes(normalizedQuery);
  });

  const exportRooms = () => {
    const rows = ["Ma phong,Tang,Dien tich,Gia niem yet,Trang thai"];
    filteredRooms.forEach((room) => rows.push([room.id, room.floor, `${room.area} m2`, room.listedPrice, statusCopy(room.status)].join(",")));
    downloadTextFile("danh-sach-phong.csv", rows.join("\n"));
  };

  return (
    <>
      <PageHeader title="Quản lý phòng" description={`Manage ${allRooms.length} rooms across 5 floors`} actionLabel="Tạo phòng mới" actionIcon={Building2} />
      <FilterBar>
        <SelectPill icon={Map}>Tất cả các tầng</SelectPill>
        <SelectPill icon={ListFilter}>Tất cả trạng thái</SelectPill>
        <button type="button" onClick={() => setExportPrompt(true)} aria-label="Xuất danh sách phòng" className="ml-auto rounded-lg border border-[#e2e8f0] p-2 text-[#505f76] hover:border-[#091426]">
          <Download className="h-4 w-4" />
        </button>
        <button type="button" className="rounded-lg border border-[#e2e8f0] p-2 text-[#505f76] hover:border-[#091426]">
          <Grid3X3 className="h-4 w-4" />
        </button>
      </FilterBar>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-[#f2f4f6]">
              <tr className="text-xs font-bold uppercase tracking-[0.08em] text-[#505f76]">
                <th className="px-6 py-4">Mã phòng</th>
                <th className="px-6 py-4">Đặc điểm</th>
                <th className="px-6 py-4">Tầng</th>
                <th className="px-6 py-4">Diện tích</th>
                <th className="px-6 py-4">Giá niêm yết</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.slice(0, 10).map((room) => (
                <tr key={room.id} className="border-t border-[#e2e8f0]">
                  <td className="px-6 py-4 text-sm font-bold text-[#091426]">{room.id}</td>
                  <td className="px-6 py-4"><span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-[#3c475a]">{room.feature}</span></td>
                  <td className="px-6 py-4 text-sm text-[#45474c]">{room.floor}</td>
                  <td className="px-6 py-4 text-sm text-[#45474c]">{room.area} m²</td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#091426]">{formatMoney(room.listedPrice)}</td>
                  <td className="px-6 py-4"><StatusBadge value={room.status} map={roomStatus} /></td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <IconButton label={`Xem ${room.id}`} icon={Eye} />
                      <IconButton label={`Sửa ${room.id}`} icon={Edit3} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#e2e8f0] px-6 py-4 text-sm text-[#505f76]">
          <span>Showing 1 to {Math.min(filteredRooms.length, 10)} of {allRooms.length} entries</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((page) => <span key={page} className={`rounded px-3 py-1 ${page === 1 ? "bg-[#d8e3fb] text-[#111c2d]" : "border border-[#e2e8f0]"}`}>{page}</span>)}
          </div>
        </div>
      </Card>
      {exportPrompt && (
        <ExportConfirm
          title="Xuất danh sách phòng"
          filename="danh-sach-phong.csv"
          description="Xuất danh sách phòng theo bộ lọc hiện tại, gồm mã phòng, tầng, diện tích, giá niêm yết và trạng thái."
          onClose={() => setExportPrompt(false)}
          onConfirm={() => {
            exportRooms();
            setExportPrompt(false);
          }}
        />
      )}
    </>
  );
}

function TenantsPage({ selectedTenantId, onSelectTenant }) {
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) || tenants[0];

  return (
    <>
      <PageHeader title="Khách thuê" description="Quản lý danh sách và hồ sơ khách thuê đang ở tại Hải Đăng." actionLabel="Thêm khách thuê" actionIcon={UserPlus} />
      <div className="flex flex-wrap gap-2">
        {["Tất cả", "Đang ở", "Nợ phí", "Sắp hết hạn", "Thiếu hồ sơ", "Đã rời"].map((filter, index) => (
          <button key={filter} type="button" className={`rounded-lg px-5 py-2 text-sm font-bold ${index === 0 ? "bg-[#091426] text-white" : "border border-[#e2e8f0] bg-white text-[#505f76]"}`}>
            {filter}
          </button>
        ))}
      </div>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,626px)_minmax(360px,1fr)]">
        <div className="grid gap-4">
          {tenants.map((tenant, index) => {
            const active = tenant.id === selectedTenant.id;
            return (
              <button
                key={tenant.id}
                type="button"
                onClick={() => onSelectTenant(tenant.id)}
                className={`rounded-xl border bg-white p-5 text-left shadow-[0_1px_2px_rgba(9,20,38,0.06)] transition ${active ? "border-[#091426] ring-2 ring-[#091426]/5" : "border-[#e2e8f0] hover:border-[#091426]"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d3e4fe] text-sm font-bold text-[#091426]">{tenant.initials}</span>
                    <span>
                      <span className="block font-bold text-[#091426]">{tenant.name}</span>
                      <span className="mt-1 block text-xs text-[#45474c]">{tenant.roomId} · {tenant.phone}</span>
                    </span>
                  </div>
                  <span className="text-right">
                    <span className="block font-bold text-[#091426]">{formatMoney(tenant.monthlyRent)}</span>
                    <span className="text-xs text-[#6b7280]">/ tháng</span>
                  </span>
                </div>
                {index === 0 && (
                  <div className="mt-5 grid gap-3 border-t border-[#e2e8f0] pt-5 sm:grid-cols-2">
                    <InfoMetric icon={CalendarClock} label="Ngày vào ở" value={tenant.moveInDate} />
                    <InfoMetric icon={WalletCards} label="Tiền cọc" value={formatMoney(tenant.deposit)} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <TenantProfile tenant={selectedTenant} />
      </section>
    </>
  );
}

function InfoMetric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f2f4f6] text-[#505f76]"><Icon className="h-4 w-4" /></span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">{label}</span>
        <span className="block text-sm font-bold text-[#091426]">{value}</span>
      </span>
    </div>
  );
}

function TenantProfile({ tenant }) {
  const [preview, setPreview] = useState(null);
  const contract = {
    code: `HD-${tenant.roomId}-2025`,
    landlord: "Hải Đăng Boarding House",
    startDate: tenant.moveInDate,
    endDate: "14/01/2026",
    paymentCycle: "Thanh toán hàng tháng, trước ngày 05",
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-[#091426] p-6 text-white">
        <div className="flex items-start justify-between">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-xl font-bold">{tenant.initials}</span>
          <div className="flex gap-2">
            <IconButton label="Sửa khách thuê" icon={Edit3} />
            <IconButton label="Xóa khách thuê" icon={Trash2} tone="bad" />
          </div>
        </div>
        <h2 className="mt-5 text-2xl font-bold">{tenant.name}</h2>
        <p className="mt-1 text-sm text-slate-300">ID: {tenant.citizenId}</p>
      </div>
      <div className="grid gap-6 p-6">
        <SectionTitle>Thông tin cơ bản</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoBlock label="Ngày sinh" value={tenant.birthDate} />
          <InfoBlock label="Ngày vào ở" value={tenant.moveInDate} />
          <InfoBlock label="SĐT người thân" value={tenant.relativePhone} />
          <InfoBlock label="Biển số xe" value={tenant.vehiclePlate} />
        </div>
        <SectionTitle>Liên hệ</SectionTitle>
        <div className="grid gap-3">
          <InfoMetric icon={Phone} label="Số điện thoại" value={tenant.phone} />
          <InfoMetric icon={Mail} label="Email" value={tenant.email} />
        </div>
        <SectionTitle>Hồ sơ đính kèm</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: "front", label: "CCCD mặt trước", meta: tenant.citizenId },
            { id: "back", label: "CCCD mặt sau", meta: "Ngày sinh " + tenant.birthDate },
            { id: "contract", label: "Hợp đồng thuê", meta: contract.code },
          ].map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setPreview(doc.id)}
              className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4 text-left hover:border-[#091426]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#505f76]">
                <FileText className="h-4 w-4" />
              </span>
              <span className="mt-3 block text-sm font-bold text-[#091426]">{doc.label}</span>
              <span className="mt-1 block text-xs text-[#6b7280]">{doc.meta}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 border-t border-[#e2e8f0] pt-5 sm:grid-cols-2">
          <button type="button" className="h-12 rounded-lg border border-[#c5c6cd] text-sm font-bold text-[#091426] hover:border-[#091426]">Gia hạn hợp đồng</button>
          <button type="button" className="h-12 rounded-lg bg-[#091426] text-sm font-bold text-white hover:bg-[#16253a]">Gửi thông báo</button>
        </div>
      </div>
      {preview && (
        <Modal
          title={preview === "contract" ? "Chi tiết hợp đồng thuê" : `Xem ${preview === "front" ? "CCCD mặt trước" : "CCCD mặt sau"}`}
          onClose={() => setPreview(null)}
        >
          {preview === "contract" ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f7f9fb] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">Thông tin hai bên</p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <InfoBlock label="Bên cho thuê" value={contract.landlord} />
                  <InfoBlock label="Bên thuê" value={tenant.name} />
                  <InfoBlock label="SĐT bên thuê" value={tenant.phone} />
                  <InfoBlock label="Email bên thuê" value={tenant.email} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="Phòng" value={tenant.roomId} />
                <InfoBlock label="Ngày bắt đầu" value={contract.startDate} />
                <InfoBlock label="Ngày kết thúc" value={contract.endDate} />
                <InfoBlock label="Giá thuê" value={formatMoney(tenant.monthlyRent)} />
                <InfoBlock label="Chu kỳ thanh toán" value={contract.paymentCycle} />
                <InfoBlock label="Tiền cọc" value={formatMoney(tenant.deposit)} />
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
              <div className="flex aspect-[1.58] items-center justify-center rounded-xl border border-[#c5c6cd] bg-[#eef2f7]">
                <div className="w-[82%] rounded-lg border border-[#c5c6cd] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">Căn cước công dân</p>
                  <p className="mt-8 text-xl font-bold text-[#091426]">{tenant.name}</p>
                  <p className="mt-2 text-sm text-[#45474c]">Số: {tenant.citizenId}</p>
                  <p className="mt-1 text-sm text-[#45474c]">Ngày sinh: {tenant.birthDate}</p>
                </div>
              </div>
              <div className="grid content-start gap-3">
                <InfoBlock label="Họ tên" value={tenant.name} />
                <InfoBlock label="CCCD" value={tenant.citizenId} />
                <InfoBlock label="Phòng" value={tenant.roomId} />
                <InfoBlock label="SĐT" value={tenant.phone} />
              </div>
            </div>
          )}
        </Modal>
      )}
    </Card>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#091426]">{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#45474c]">{children}</h3>;
}

function MaintenancePage({ selectedTicketId, onSelectTicket }) {
  const [tickets, setTickets] = useState(maintenanceTickets);
  const [statusView, setStatusView] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [ticketDraft, setTicketDraft] = useState({
    type: "Phòng",
    roomId: "P203",
    description: "Mô tả hiện tượng, thời điểm xảy ra và mức độ ảnh hưởng.",
    attachments: [],
    uploadStatus: "idle",
    uploadError: "",
  });
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0];
  const visibleTickets = statusView === "all" ? tickets : tickets.filter((ticket) => ticket.status !== "done");
  const pending = tickets.filter((ticket) => ticket.status === "pending").length;
  const done = tickets.filter((ticket) => ticket.status === "done").length;

  const uploadTicketAttachments = async (files) => {
    const selectedFiles = Array.from(files || []).slice(0, 3);
    if (selectedFiles.length === 0) return;
    setTicketDraft((current) => ({ ...current, uploadStatus: "uploading", uploadError: "" }));
    try {
      const result = await uploadFiles(selectedFiles);
      setTicketDraft((current) => ({
        ...current,
        attachments: result.fileResponses || [],
        uploadStatus: "success",
      }));
    } catch (error) {
      setTicketDraft((current) => ({
        ...current,
        uploadStatus: "error",
        uploadError: error.message || "Không thể tải file lên.",
      }));
    }
  };

  const createTicket = () => {
    const nextTicket = {
      id: `DM-${9000 + tickets.length + 1}`,
      roomId: ticketDraft.roomId,
      issue: "Sự cố mới từ quản lý",
      tenant: `Khách ${ticketDraft.roomId}`,
      category: ticketDraft.type,
      priority: "Cao",
      status: "pending",
      reportedAt: "19/05/2026 09:00",
      assignee: "Chờ tiếp nhận",
      estimatedCost: 0,
      description: ticketDraft.description,
      attachments: ticketDraft.attachments,
    };
    setTickets((current) => [nextTicket, ...current]);
    onSelectTicket(nextTicket.id);
    setShowCreate(false);
    setTicketDraft({
      type: "Phòng",
      roomId: "P203",
      description: "Mô tả hiện tượng, thời điểm xảy ra và mức độ ảnh hưởng.",
      attachments: [],
      uploadStatus: "idle",
      uploadError: "",
    });
  };

  const updateTicketStatus = (nextStatus) => {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? {
              ...ticket,
              status: nextStatus,
              assignee: nextStatus === "inProgress" && ticket.assignee === "Chờ tiếp nhận" ? "Nguyễn Văn Hùng" : ticket.assignee,
            }
          : ticket,
      ),
    );
  };

  return (
    <>
      <PageHeader title="Báo cáo sự cố & Bảo trì" description="Theo dõi phiếu sự cố, chi phí sửa chữa và tiến độ xử lý." actionLabel="Tạo phiếu bảo trì" actionIcon={Wrench} onAction={() => setShowCreate(true)} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ClipboardCheck} label="Tổng phiếu" value={tickets.length} subtext="Trong tháng này" />
        <KpiCard icon={AlertTriangle} label="Đang chờ" value={pending} subtext="Cần phân công" tone="rose" />
        <KpiCard icon={Wrench} label="Đã hoàn tất" value={done} subtext="Đã ghi chi phí" tone="emerald" />
        <KpiCard icon={Banknote} label="Chi phí dự kiến" value={formatMoney(tickets.reduce((sum, item) => sum + item.estimatedCost, 0))} tone="amber" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
            <h2 className="font-bold text-[#091426]">Maintenance List</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStatusView("all")} className={`rounded-full px-3 py-1 text-xs font-bold ${statusView === "all" ? "bg-[#091426] text-white" : "border border-[#e2e8f0] text-[#505f76]"}`}>All</button>
              <button type="button" onClick={() => setStatusView("open")} className={`rounded-full px-3 py-1 text-xs font-bold ${statusView === "open" ? "bg-[#091426] text-white" : "border border-[#e2e8f0] text-[#505f76]"}`}>Open</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
                <tr>
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Phòng</th>
                  <th className="px-6 py-4">Ưu tiên</th>
                  <th className="px-6 py-4">Người xử lý</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-[#e2e8f0]">
                    <td className="px-6 py-4 text-sm font-bold text-[#091426]">{ticket.id}</td>
                    <td className="px-6 py-4 text-sm">{ticket.roomId}</td>
                    <td className="px-6 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#505f76]">{ticket.priority}</span></td>
                    <td className="px-6 py-4 text-sm">{ticket.assignee}</td>
                    <td className="px-6 py-4"><StatusBadge value={ticket.status} map={ticketStatus} /></td>
                    <td className="px-6 py-4 text-right">
                      <IconButton label={`Xem ${ticket.id}`} icon={ChevronRight} onClick={() => onSelectTicket(ticket.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <MaintenanceDetail ticket={selectedTicket} onStatusChange={updateTicketStatus} />
      </section>
      {showCreate && (
        <Modal
          title="Tạo phiếu sự cố"
          onClose={() => setShowCreate(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]">Hủy</button>
              <button type="button" onClick={createTicket} className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white">Xác nhận gửi</button>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#45474c]">Loại sự cố</span>
                <select value={ticketDraft.type} onChange={(event) => setTicketDraft((current) => ({ ...current, type: event.target.value }))} className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]">
                  <option>Phòng</option>
                  <option>Tài sản chung</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#45474c]">Phòng / khu vực</span>
                <input value={ticketDraft.roomId} onChange={(event) => setTicketDraft((current) => ({ ...current, roomId: event.target.value }))} className="h-10 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]" />
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-[#45474c]">Mô tả vấn đề</span>
              <textarea value={ticketDraft.description} onChange={(event) => setTicketDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-28 rounded-lg border border-[#c5c6cd] p-3 text-sm text-[#091426]" />
            </label>
            <div className="rounded-xl border border-dashed border-[#c5c6cd] bg-[#f7f9fb] p-5">
              <div className="flex items-center gap-3">
                <CloudUpload className="h-5 w-5 text-[#505f76]" />
                <div>
                  <p className="text-sm font-bold text-[#091426]">Đính kèm ảnh/video tối đa 3 ảnh</p>
                  <p className="text-xs text-[#6b7280]">Sau khi gửi, hệ thống tạo mã ticket và thông báo cho các bên.</p>
                </div>
              </div>
              <input type="file" multiple accept="image/*,video/*" onChange={(event) => uploadTicketAttachments(event.target.files)} className="mt-4 block w-full text-sm text-[#45474c] file:mr-4 file:rounded-lg file:border-0 file:bg-[#091426] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white" />
              {ticketDraft.uploadStatus === "uploading" && <p className="mt-3 text-xs font-bold text-blue-700">Đang tải file lên backend...</p>}
              {ticketDraft.uploadError && <p className="mt-3 text-xs font-bold text-rose-700">{ticketDraft.uploadError}</p>}
              {ticketDraft.attachments.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {ticketDraft.attachments.map((file) => (
                    <a key={file.url || file.originalFileName} href={file.downloadUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#091426] hover:underline">
                      {file.originalFileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function MaintenanceDetail({ ticket, onStatusChange }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[#e2e8f0] p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">Incident Detail</p>
          <StatusBadge value={ticket.status} map={ticketStatus} />
        </div>
        <h2 className="mt-2 text-2xl font-bold text-[#091426]">#{ticket.id}</h2>
        <p className="mt-2 text-sm leading-6 text-[#45474c]">Reported on {ticket.reportedAt} by {ticket.tenant}</p>
      </div>
      <div className="grid gap-6 p-6">
        <SectionTitle>Issue description</SectionTitle>
        <p className="rounded-lg bg-[#f7f9fb] p-4 text-sm leading-6 text-[#45474c]">{ticket.description}</p>
        <SectionTitle>Maintenance action</SectionTitle>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-[#45474c]">Technician Name</span>
          <input value={ticket.assignee} readOnly className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-[#45474c]">Actual Repair Cost (VND)</span>
          <input value={money.format(ticket.estimatedCost)} readOnly className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]" />
        </label>
        {ticket.attachments?.length > 0 && (
          <div className="grid gap-2">
            <SectionTitle>Attachments</SectionTitle>
            {ticket.attachments.map((file) => (
              <a key={file.url || file.originalFileName} href={file.downloadUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-bold text-[#091426] hover:bg-[#f7f9fb]">
                {file.originalFileName}
              </a>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 border-t border-[#e2e8f0] pt-5">
          <button type="button" onClick={() => onStatusChange("inProgress")} className="h-11 rounded-lg border border-[#c5c6cd] text-sm font-bold text-[#091426]">Tiếp nhận</button>
          <button type="button" onClick={() => onStatusChange("done")} className="h-11 rounded-lg bg-[#091426] text-sm font-bold text-white">Hoàn tất</button>
        </div>
      </div>
    </Card>
  );
}

function DepositTable({ deposits, statusFilter, onStatusFilter, dateFrom, dateTo, onDateFromChange, onDateToChange, onAction, selectedDeposit, onSelectDeposit }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[#e2e8f0] bg-[#f7f9fb] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-[#45474c]">
          <ListFilter className="h-4 w-4" />
          Lọc:
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "Tất cả"],
            ["pending", "Chờ duyệt"],
            ["approved", "Đã nhận phòng"],
            ["overdue", "Quá hạn"],
            ["refunded", "Đã hoàn"],
            ["forfeited", "Mất cọc"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onStatusFilter(value)}
              className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm transition ${
                statusFilter === value ? "border-[#091426] bg-[#091426] text-white" : "border-[#c5c6cd] bg-white text-[#191c1e] hover:border-[#091426]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e2e8f0] bg-white px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">Khoảng thời gian nhận cọc</span>
        <label className="grid gap-1 text-xs font-semibold text-[#45474c]">
          Từ ngày
          <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} className="h-9 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#45474c]">
          Đến ngày
          <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} className="h-9 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]" />
        </label>
        {(dateFrom || dateTo) && (
          <button type="button" onClick={() => { onDateFromChange(""); onDateToChange(""); }} className="mt-5 h-9 rounded-lg border border-[#c5c6cd] px-3 text-sm font-bold text-[#091426]">
            Xóa lọc
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">
              <th className="px-6 py-3">Mã phòng</th>
              <th className="px-6 py-3">Tên khách hàng</th>
              <th className="px-6 py-3 text-right">Số tiền cọc</th>
              <th className="px-6 py-3">Ngày nhận</th>
              <th className="px-6 py-3">Trạng thái</th>
              <th className="px-6 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-[#6b7280]">
                  Không có hợp đồng cọc phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : deposits.map((deposit) => (
              <tr key={deposit.id} className={`border-b border-[#e2e8f0] last:border-0 ${selectedDeposit?.id === deposit.id ? "bg-blue-50/45" : "bg-white"}`}>
                <td className="px-6 py-4 text-sm font-bold text-[#091426]">{deposit.roomId}</td>
                <td className="px-6 py-4">
                  <button type="button" onClick={() => onSelectDeposit(deposit)} className="text-left">
                    <span className="block text-sm font-semibold text-[#191c1e]">{deposit.tenantName}</span>
                    <span className="block text-xs text-[#45474c]">{deposit.phone}</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-[#191c1e]">{formatMoney(deposit.amount)}</td>
                <td className="px-6 py-4 text-sm text-[#191c1e]">{deposit.paidAt}</td>
                <td className="px-6 py-4"><StatusBadge value={deposit.status} map={depositStatus} /></td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1.5">
                    <IconButton label={`Xem ${deposit.id}`} icon={Eye} onClick={() => onSelectDeposit(deposit)} />
                    <IconButton label={`Duyệt ${deposit.id}`} icon={Check} onClick={() => onAction(deposit.id, "approved")} tone="good" />
                    <IconButton label={`Hoàn cọc ${deposit.id}`} icon={RotateCcw} onClick={() => onAction(deposit.id, "refunded")} tone="warn" />
                    <IconButton label={`Mất cọc ${deposit.id}`} icon={X} onClick={() => onAction(deposit.id, "forfeited")} tone="bad" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DepositDetail({ deposit }) {
  if (!deposit) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <FileCheck2 className="h-8 w-8 text-[#c8d0dc]" />
          <p className="text-sm font-semibold text-[#6b7280]">Chưa chọn hợp đồng cọc để xem chi tiết.</p>
        </div>
      </Card>
    );
  }

  const room = allRooms.find((item) => item.id === deposit.roomId);
  const tenant = tenants.find((item) => item.roomId === deposit.roomId);
  const handoverItems = ["Giường", "Tủ quần áo", "Máy lạnh", "Bàn học", "Khóa cửa"];

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-[#191c1e]">
        <UserRoundCog className="h-5 w-5 text-[#091426]" />
        Hồ sơ đang xử lý
      </h2>
      <div className="mt-5 grid gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">{deposit.id}</p>
          <h3 className="mt-1 text-xl font-bold text-[#091426]">{deposit.tenantName}</h3>
          <p className="mt-1 text-sm text-[#45474c]">{deposit.phone}</p>
        </div>
        <div className="grid gap-3 rounded-lg bg-[#f7f9fb] p-4 text-sm">
          <Row label="Phòng" value={deposit.roomId} />
          <Row label="Tiền cọc" value={formatMoney(deposit.amount)} />
          <Row label="Hẹn nhận phòng" value={deposit.moveInDate} />
          <Row label="Giá thuê" value={room ? formatMoney(room.price) : "N/A"} />
        </div>
        {["approved", "pending"].includes(deposit.status) && (
          <div className="grid gap-4 rounded-lg border border-[#e2e8f0] p-4">
            <SectionTitle>Chi tiết nhận phòng / đặt phòng</SectionTitle>
            <div className="grid gap-3 text-sm">
              <Row label="Bên cho thuê" value="Hải Đăng Boarding House" />
              <Row label="Bên thuê" value={tenant?.name || deposit.tenantName} />
              <Row label="Ngày bắt đầu" value={deposit.moveInDate} />
              <Row label="Ngày kết thúc" value="20/10/2024" />
              <Row label="Chu kỳ thanh toán" value="Hàng tháng" />
              <Row label="Điện ban đầu" value="128 kWh" />
              <Row label="Nước ban đầu" value="34 m3" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">Bảng bàn giao thiết bị</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {handoverItems.map((item) => (
                  <span key={item} className="rounded-full bg-[#f2f4f6] px-3 py-1 text-xs font-bold text-[#505f76]">{item}</span>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-amber-700">Ghi chú kế toán</p>
          <p className="mt-2 text-sm leading-6 text-amber-800">{deposit.accountantNote}</p>
        </div>
        <Link href={`/rooms/deposit?roomId=${deposit.roomId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a]">
          Mở luồng đặt cọc khách
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#45474c]">{label}</span>
      <span className="font-bold text-[#091426]">{value}</span>
    </div>
  );
}

function DepositExportBar({ deposits }) {
  const [exportPrompt, setExportPrompt] = useState(false);
  const exportDeposits = () => {
    const rows = ["Ma coc,Phong,Khach hang,So dien thoai,So tien,Ngay nhan,Trang thai"];
    deposits.forEach((d) => {
      const [statusLabel] = depositStatus[d.status] || ["Không rõ"];
      rows.push([d.id, d.roomId, d.tenantName, d.phone, d.amount, d.paidAt, statusLabel].join(","));
    });
    downloadTextFile("danh-sach-coc.csv", rows.join("\n"));
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white px-5 py-3 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="flex items-center gap-2 text-sm text-[#45474c]">
          <Download className="h-4 w-4 text-[#505f76]" />
          <span className="font-semibold">Xuất dữ liệu hợp đồng cọc</span>
          <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-xs font-bold text-[#505f76]">{deposits.length} bản ghi</span>
        </div>
        <button
          type="button"
          onClick={() => setExportPrompt(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a]"
        >
          <Download className="h-4 w-4" />
          Xuất CSV về máy
        </button>
      </div>
      {exportPrompt && (
        <ExportConfirm
          title="Xuất danh sách hợp đồng cọc"
          filename="danh-sach-coc.csv"
          description="Xuất toàn bộ hợp đồng cọc đang lọc ra file CSV, gồm mã cọc, phòng, khách hàng, số tiền và trạng thái."
          onClose={() => setExportPrompt(false)}
          onConfirm={() => { exportDeposits(); setExportPrompt(false); }}
        />
      )}
    </>
  );
}

function DepositsPage({ filteredDeposits, statusFilter, onStatusFilter, dateFrom, dateTo, onDateFromChange, onDateToChange, onDepositAction, selectedDeposit, onSelectDeposit }) {
  const [approvals, setApprovals] = useState(initialAccountApprovals);
  const [rejecting, setRejecting] = useState(null);
  const [notice, setNotice] = useState("");
  const [roomHolds, setRoomHolds] = useState(() => getActiveRoomHolds());
  const [holdClock, setHoldClock] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHoldClock(Date.now());
      setRoomHolds(getActiveRoomHolds());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const holdApprovals = useMemo(() => {
    return Object.values(roomHolds).map((hold) => ({
      id: hold.id,
      name: hold.customerName || "Khách vãng lai",
      phone: hold.phone || "Chưa cung cấp",
      email: hold.email || "Chưa cung cấp",
      roomId: hold.roomId,
      requestedAt: new Date(hold.createdAt).toLocaleString("vi-VN"),
      status: "pending",
      holdExpiresAt: hold.expiresAt,
    }));
  }, [roomHolds]);

  const approvalRows = useMemo(() => {
    const holdRoomIds = new Set(holdApprovals.map((approval) => approval.roomId));
    return [
      ...holdApprovals,
      ...approvals
        .filter((approval) => !holdRoomIds.has(approval.roomId))
        .map((approval) => ({
          ...approval,
          holdExpiresAt: parseVNDateTime(approval.requestedAt) + ROOM_HOLD_DURATION_MS,
        })),
    ];
  }, [approvals, holdApprovals]);

  const approveAccount = (approvalId) => {
    setApprovals((current) => current.map((item) => item.id === approvalId ? { ...item, status: "approved" } : item));
    const account = approvalRows.find((item) => item.id === approvalId);
    setNotice(`Đã kích hoạt tài khoản ${account?.name || ""} và gửi thông báo cho khách.`);
  };

//loi nhieu vai lon phan nay 

  const rejectAccount = (reason) => {
  // 1. Lệnh bảo vệ: Nếu không có dữ liệu rejecting thì dừng hàm luôn
  if (!rejecting) return;

  // 2. Xử lý logic như cũ (lúc này Javascript hiểu rejecting chắc chắn tồn tại)
  setApprovals((current) => 
    current.map((item) => 
      item?.id === rejecting.id 
        ? { ...item, status: "rejected", rejectReason: reason } 
        : item
    )
  );
  
  setNotice(`Đã từ chối tài khoản ${rejecting.name}. Lý do đã được gửi cho khách.`);
  
  // 3. Reset state
  setRejecting(null);
};

  return (
    <>
      <PageHeader title="Danh sách Hợp đồng Cọc" description="Quản lý và theo dõi trạng thái các khoản tiền cọc phòng." actionLabel="Tạo hợp đồng mới" actionIcon={FileCheck2} />
      <DepositExportBar deposits={filteredDeposits} />
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] bg-[#f7f9fb] px-6 py-4">
          <div>
            <h2 className="font-bold text-[#091426]">Yêu cầu đặt cọc cần duyệt</h2>
            <p className="mt-1 text-sm text-[#6b7280]">Sau khi đọc thông tin xét duyệt đặt cọc, quản lý kiểm tra thông tin rồi đồng ý hoặc từ chối kèm lý do.</p>
          </div>
          <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">{approvalRows.filter((item) => item.status === "pending").length}</span>
        </div>
        <div className="grid gap-3 p-4">
          {approvalRows.map((approval) => {
            const countdownClock = holdClock || Math.max(0, Number(approval.holdExpiresAt) - ROOM_HOLD_DURATION_MS);
            const remainingMs = getHoldRemainingMs({ expiresAt: approval.holdExpiresAt }, countdownClock);

            return (
            <div key={approval.id} className="grid gap-4 rounded-lg border border-[#e2e8f0] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid gap-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  <InfoBlock label="Họ tên" value={approval.name} />
                  <InfoBlock label="SĐT" value={approval.phone} />
                  <InfoBlock label="Email" value={approval.email} />
                  <InfoBlock label="Phòng đăng ký" value={approval.roomId} />
                </div>
                <p className={`text-sm font-bold ${remainingMs > 0 ? "text-amber-700" : "text-rose-700"}`}>
                  {remainingMs > 0
                    ? `Thời gian giữ phòng còn lại: ${formatHoldCountdown(remainingMs)}`
                    : "Thời gian giữ phòng đã hết hạn"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={approval.status === "pending" ? "pending" : approval.status === "approved" ? "approved" : "cancelled"} map={depositStatus} />
                {approval.status === "pending" && (
                  <>
                    <IconButton label={`Duyệt ${approval.name}`} icon={Check} onClick={() => approveAccount(approval.id)} tone="good" />
                    <IconButton label={`Từ chối ${approval.name}`} icon={X} onClick={() => setRejecting(approval)} tone="bad" />
                  </>
                )}
              </div>
            </div>
            );
          })}
          {notice && <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div>}
        </div>
      </Card>
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={FileCheck2} label="Tổng hợp đồng" value={depositContracts.length} />
        <KpiCard icon={CalendarClock} label="Sắp hết hạn nhận phòng" value={depositContracts.filter((item) => item.status === "overdue").length} tone="amber" />
        <KpiCard icon={X} label="Đã hủy / mất cọc" value={depositContracts.filter((item) => ["cancelled", "forfeited"].includes(item.status)).length} tone="rose" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <DepositTable deposits={filteredDeposits} statusFilter={statusFilter} onStatusFilter={onStatusFilter} dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={onDateFromChange} onDateToChange={onDateToChange} onAction={onDepositAction} selectedDeposit={selectedDeposit} onSelectDeposit={onSelectDeposit} />
        <DepositDetail deposit={selectedDeposit} />
      </section>
      {rejecting && (
        <RejectAccountModal approval={rejecting} onClose={() => setRejecting(null)} onReject={rejectAccount} />
      )}
    </>
  );
}

function RejectAccountModal({ approval, onClose, onReject }) {
  const [reason, setReason] = useState("Thông tin đặt cọc chưa khớp với phòng đăng ký.");

  return (
    <Modal
      title={`Từ chối tài khoản ${approval.name}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]">Hủy</button>
          <button type="button" onClick={() => onReject(reason)} className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white">Gửi lý do từ chối</button>
        </div>
      }
    >
      <label className="grid gap-2">
        <span className="text-sm font-bold text-[#45474c]">Lý do gửi cho khách</span>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-28 rounded-lg border border-[#c5c6cd] p-3 text-sm text-[#091426]" />
      </label>
    </Modal>
  );
}

function ContractSettingsPage({ selectedTemplateId, onSelectTemplate }) {
  const selectedTemplate = contractTemplates.find((template) => template.id === selectedTemplateId) || contractTemplates[0];
  const [uploadedName, setUploadedName] = useState("");
  const [recognizedContract, setRecognizedContract] = useState(null);
  const [docxHtml, setDocxHtml] = useState("");
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [uploadState, setUploadState] = useState({ status: "idle", error: "" });
  const [uploadedContractFile, setUploadedContractFile] = useState(null);
  const [exportPrompt, setExportPrompt] = useState(false);
  const exportVariables = () => {
    downloadTextFile("bien-mau-hop-dong.csv", "Bien,Mo ta\n{{Ma_Phong}},Ma phong\n{{Ten_Khach_Thue}},Ho ten khach\n{{So_CCCD}},So CCCD\n{{So_Tien_Coc}},Tien coc\n{{Ngay_Nhan_Phong}},Ngay nhan phong");
  };
  const previewContract = recognizedContract || {
    name: selectedTemplate.name,
    scope: selectedTemplate.scope,
    source: "Mẫu đang lưu trong hệ thống",
    detectedFields: ["{{Mã_Phòng}}", "{{Tên_Khách_Thuê}}", "{{Số_CCCD}}", "{{Số_Tiền_Cọc}}", "{{Ngày_Nhận_Phòng}}"],
  };

  const handleTemplateUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isDocx = /\.docx$/i.test(file.name);
    setUploadedName(file.name);
    setDocxHtml("");
    setUploadedContractFile(null);
    setUploadState({ status: "uploading", error: "" });
    let uploadedFile = null;
    try {
      uploadedFile = await uploadFile(file);
      setUploadedContractFile(uploadedFile);
      setUploadState({ status: "success", error: "" });
    } catch (error) {
      setUploadState({ status: "error", error: error.message || "Khong the tai file len backend." });
    }
    if (isDocx) {
      setIsParsingDocx(true);
      try {
        const mammoth = (await import("mammoth/mammoth.browser")).default;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const variables = [...(result.value.match(/\{\{[^}]+\}\}/g) || [])];
        const uniqueVars = [...new Set(variables)];
        setDocxHtml(result.value);
        setRecognizedContract({
          name: file.name,
          scope: "Nhận diện từ file tải lên",
          source: `Word contract · ${(file.size / 1024).toFixed(1)} KB`,
          detectedFields: uniqueVars.length > 0 ? uniqueVars : ["{{Mã_Phòng}}", "{{Tên_Khách_Thuê}}", "{{Số_CCCD}}", "{{Giá_Thuê}}", "{{Chu_Kỳ_Thanh_Toán}}"],
        });
      } catch {
        setRecognizedContract({
          name: file.name,
          scope: "Nhận diện từ file tải lên",
          source: `Word contract · ${(file.size / 1024).toFixed(1)} KB`,
          detectedFields: ["{{Mã_Phòng}}", "{{Tên_Khách_Thuê}}", "{{Số_CCCD}}"],
        });
      } finally {
        setIsParsingDocx(false);
      }
    } else {
      setRecognizedContract({
        name: file.name,
        scope: "Nhận diện từ file tải lên",
        source: `Tệp hợp đồng · ${(file.size / 1024).toFixed(1)} KB`,
        detectedFields: ["{{Mã_Phòng}}", "{{Tên_Khách_Thuê}}", "{{Số_CCCD}}", "{{Giá_Thuê}}"],
      });
    }
  };

  return (
    <>
      <PageHeader title="Mẫu hợp đồng đặt cọc" description="Quản lý mẫu Word và cấu hình biến áp dụng cho hợp đồng cọc mới." />
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        Mẫu cũ của hợp đồng đã tạo không bị ảnh hưởng khi chỉnh sửa. Mẫu mới áp dụng cho các hợp đồng tạo sau thời điểm cập nhật.
      </div>
      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-6">
          <Card className="flex min-h-64 flex-col items-center justify-center border-dashed p-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f2f4f6] text-[#505f76]"><CloudUpload className="h-7 w-7" /></span>
            <h2 className="mt-4 text-xl font-bold text-[#091426]">Tải lên mẫu hợp đồng mới</h2>
            <p className="mt-2 text-sm leading-6 text-[#45474c]">Kéo thả file Word (.docx) vào đây hoặc click để chọn file.</p>
            <label className="mt-5 inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a]">
              Chọn file
              <input
                type="file"
                accept=".doc,.docx"
                className="sr-only"
                onChange={handleTemplateUpload}
              />
            </label>
            {uploadedName && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Đã chọn: {uploadedName}</p>}
            {uploadState.status === "uploading" && <p className="mt-3 text-xs font-bold text-blue-700">Đang upload lên File Storage API...</p>}
            {uploadState.error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{uploadState.error}</p>}
            {uploadedContractFile?.downloadUrl && (
              <a href={uploadedContractFile.downloadUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-bold text-emerald-700 underline">
                Mở file đã upload
              </a>
            )}
          </Card>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] p-5">
              <h2 className="font-bold text-[#091426]">Mẫu hợp đồng tồn tại</h2>
              <span className="rounded-full bg-[#091426] px-3 py-1 text-sm font-bold text-white">{contractTemplates.length}</span>
            </div>
            <div className="grid gap-3 p-4">
              {contractTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelectTemplate(template.id)}
                  className={`rounded-lg border p-4 text-left ${selectedTemplate.id === template.id ? "border-[#091426] bg-[#f7f9fb]" : "border-[#e2e8f0] bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-[#091426]">{template.name}</p>
                    {template.active && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Active</span>}
                  </div>
                  <p className="mt-2 text-sm text-[#45474c]">Mức giá áp dụng: {template.scope}</p>
                  <p className="mt-3 border-t border-[#e2e8f0] pt-3 text-xs text-[#6b7280]">Cập nhật: {template.updatedAt}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#e2e8f0] p-6 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-[#091426]">Xem trước: {previewContract.name}</h2>
            <div className="flex gap-3">
              <button type="button" onClick={() => setExportPrompt(true)} className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]">Xuất biến mẫu</button>
              <button type="button" onClick={() => setUploadedName(uploadedName || selectedTemplate.name)} className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white">Lưu cấu hình</button>
            </div>
          </div>
          <div className="bg-[#eef2f7] p-8">
            <div className="mx-auto min-h-[760px] max-w-[680px] bg-white p-12 text-[#091426] shadow-xl">
              {isParsingDocx && (
                <div className="mb-8 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <p className="text-sm font-semibold text-blue-700">Đang đọc nội dung file Word...</p>
                </div>
              )}
              {recognizedContract && !isParsingDocx && (
                <div className="mb-8 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">Đã nhận diện hợp đồng tải lên</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900">{recognizedContract.source}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recognizedContract.detectedFields.map((field) => (
                      <span key={field} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">{field}</span>
                    ))}
                  </div>
                </div>
              )}
              {docxHtml ? (
                <div
                  className="prose prose-sm max-w-none leading-7 text-[#091426] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#c5c6cd] [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-[#c5c6cd] [&_th]:px-3 [&_th]:py-2"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              ) : (
                <>
                  <p className="text-center text-lg font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="mt-2 text-center text-sm font-semibold">Độc lập - Tự do - Hạnh phúc</p>
                  <h3 className="mt-10 text-center text-2xl font-bold">HỢP ĐỒNG ĐẶT CỌC THUÊ PHÒNG</h3>
                  <p className="mt-8 leading-7">Bên A đồng ý cho Bên B thuê phòng số <strong>{"{{Mã_Phòng}}"}</strong> tại địa chỉ Hải Đăng Boarding House.</p>
                  <p className="mt-5 font-bold">Bên B (Bên thuê):</p>
                  <ul className="mt-3 list-disc pl-6 leading-8">
                    <li>Ông/Bà: {"{{Tên_Khách_Thuê}}"}</li>
                    <li>CMND/CCCD: {"{{Số_CCCD}}"}</li>
                    <li>Số điện thoại: {"{{SĐT_Khách}}"}</li>
                  </ul>
                  <p className="mt-5 font-bold">Điều 1: Thông tin phòng thuê và tiền cọc</p>
                  <p className="mt-3 leading-7">Tiền cọc: <strong>{"{{Số_Tiền_Cọc}}"}</strong>. Ngày nhận phòng dự kiến: <strong>{"{{Ngày_Nhận_Phòng}}"}</strong>.</p>
                </>
              )}
            </div>
          </div>
        </Card>
      </section>
      {exportPrompt && (
        <ExportConfirm
          title="Xuất biến mẫu hợp đồng"
          filename="bien-mau-hop-dong.csv"
          description="Xuất danh sách biến nhận diện được để đối chiếu trước khi tải file về máy."
          onClose={() => setExportPrompt(false)}
          onConfirm={() => {
            exportVariables();
            setExportPrompt(false);
          }}
        />
      )}
    </>
  );
}

function MeterReadingsPage() {
  const editableRooms = allRooms.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Nhập số điện nước"
        description="Quản lý và Chủ trọ được nhập chỉ số điện nước thủ công theo từng phòng. Dữ liệu này dùng để đối soát hóa đơn cuối kỳ."
        actionLabel="Lưu chỉ số"
        actionIcon={Check}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={Gauge} label="Phòng cần nhập" value={editableRooms.length} />
        <KpiCard icon={CalendarClock} label="Kỳ ghi chỉ số" value="05/2026" tone="amber" />
        <KpiCard icon={ClipboardCheck} label="Đã rà soát" value="4/6" tone="emerald" />
      </section>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] p-5">
          <h2 className="font-bold text-[#091426]">Bảng nhập chỉ số thủ công</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Manager/Admin</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
              <tr>
                <th className="px-5 py-4">Phòng</th>
                <th className="px-5 py-4">Tầng</th>
                <th className="px-5 py-4">Điện kỳ trước</th>
                <th className="px-5 py-4">Điện kỳ này</th>
                <th className="px-5 py-4">Nước kỳ trước</th>
                <th className="px-5 py-4">Nước kỳ này</th>
                <th className="px-5 py-4">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {editableRooms.map((room, index) => (
                <tr key={room.id} className="border-t border-[#e2e8f0]">
                  <td className="px-5 py-4 font-bold text-[#091426]">{room.id}</td>
                  <td className="px-5 py-4 text-[#45474c]">{room.floor}</td>
                  <td className="px-5 py-4 text-[#45474c]">{1200 + index * 18}</td>
                  <td className="px-5 py-4">
                    <input className="h-10 w-28 rounded-lg border border-[#c5c6cd] px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]" defaultValue={1236 + index * 18} />
                  </td>
                  <td className="px-5 py-4 text-[#45474c]">{80 + index * 3}</td>
                  <td className="px-5 py-4">
                    <input className="h-10 w-28 rounded-lg border border-[#c5c6cd] px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]" defaultValue={86 + index * 3} />
                  </td>
                  <td className="px-5 py-4">
                    <input className="h-10 w-full min-w-44 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426] outline-none focus:border-[#091426]" placeholder="Nhập ghi chú" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function FinancePage() {
  const [exportPrompt, setExportPrompt] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoices[0]?.id ?? null);
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) || invoices[0];
  const exportInvoices = () => {
    const rows = ["Ma hoa don,Khach thue,Phong,Han thu,So tien,Trang thai"];
    invoices.forEach((invoice) => rows.push([invoice.id, invoice.tenant, invoice.roomId, invoice.dueDate, invoice.amount, invoiceStatus[invoice.status]?.[0] || invoice.status].join(",")));
    downloadTextFile("hoa-don-thang-nay.csv", rows.join("\n"));
  };

  return (
    <>
      <PageHeader title="Báo cáo Tài chính" description="Theo dõi doanh thu, chi phí vận hành, thu chi tổng hợp và danh sách hóa đơn." actionLabel="Xuất Excel/PDF" actionIcon={Download} onAction={() => setExportPrompt(true)} />
      <FinanceSummary />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="border-b border-[#e2e8f0] p-6">
            <h2 className="font-bold text-[#091426]">Hóa đơn tháng này</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
                <tr>
                  <th className="px-6 py-4">Mã hóa đơn</th>
                  <th className="px-6 py-4">Khách thuê</th>
                  <th className="px-6 py-4">Phòng</th>
                  <th className="px-6 py-4">Hạn thu</th>
                  <th className="px-6 py-4 text-right">Số tiền</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-[#e2e8f0]">
                    <td className="px-6 py-4 font-bold text-[#091426]">{invoice.id}</td>
                    <td className="px-6 py-4">{invoice.tenant}</td>
                    <td className="px-6 py-4">{invoice.roomId}</td>
                    <td className="px-6 py-4">{invoice.dueDate}</td>
                    <td className="px-6 py-4 text-right font-bold">{formatMoney(invoice.amount)}</td>
                    <td className="px-6 py-4"><StatusBadge value={invoice.status} map={invoiceStatus} /></td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" onClick={() => setSelectedInvoiceId(invoice.id)} className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-[#091426] hover:border-[#091426]">
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">Chi tiết hóa đơn</p>
              <h2 className="mt-2 text-xl font-bold text-[#091426]">{selectedInvoice.id}</h2>
            </div>
            <StatusBadge value={selectedInvoice.status} map={invoiceStatus} />
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[#e2e8f0] pb-3">
              <span className="text-[#6b7280]">Khách thuê</span>
              <span className="font-bold text-[#091426]">{selectedInvoice.tenant}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#e2e8f0] pb-3">
              <span className="text-[#6b7280]">Phòng</span>
              <span className="font-bold text-[#091426]">{selectedInvoice.roomId}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#e2e8f0] pb-3">
              <span className="text-[#6b7280]">Số tiền</span>
              <span className="font-bold text-[#091426]">{formatMoney(selectedInvoice.amount)}</span>
            </div>
          </div>
          <div className="mt-6 grid gap-2">
            <PermissionGuard
              allowedRoles={ACTION_PERMISSIONS.mutateInvoice}
              fallback={
                <div className="grid gap-2">
                  <button type="button" disabled className="h-10 cursor-not-allowed rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] px-4 text-sm font-bold text-[#94a3b8]">
                    Chỉnh sửa hóa đơn
                  </button>
                  <button type="button" disabled className="h-10 cursor-not-allowed rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] px-4 text-sm font-bold text-[#94a3b8]">
                    Xác nhận/Hủy hóa đơn
                  </button>
                  <p className="text-xs font-semibold text-[#6b7280]">Kế toán chỉ có quyền xem và xuất dữ liệu.</p>
                </div>
              }
              mode="disabled"
            >
              <div className="grid gap-2">
                <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426] hover:border-[#091426]">
                  <Edit3 className="h-4 w-4" />
                  Chỉnh sửa hóa đơn
                </button>
                <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white">
                  <Check className="h-4 w-4" />
                  Xác nhận hóa đơn
                </button>
                <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-100 px-4 text-sm font-bold text-rose-700 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                  Hủy hóa đơn
                </button>
              </div>
            </PermissionGuard>
          </div>
        </Card>
      </section>
      {exportPrompt && (
        <ExportConfirm
          title="Xuất dữ liệu hóa đơn"
          filename="bao-cao-hoa-don.csv"
          description="Xuất danh sách hóa đơn hiện tại cho nghiệp vụ Excel/PDF, gồm mã hóa đơn, khách thuê, phòng, hạn thu, số tiền và trạng thái."
          onClose={() => setExportPrompt(false)}
          onConfirm={() => {
            exportInvoices();
            setExportPrompt(false);
          }}
        />
      )}
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your account and application preferences" />
      <Card className="overflow-hidden">
        <div className="bg-[#091426] p-8 text-white">
          <div className="flex items-center gap-6">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">A</span>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Admin User</h2>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">Owner</span>
              </div>
              <p className="mt-1 text-sm text-slate-300">admin@dormmanager.vn</p>
            </div>
          </div>
        </div>
        <SettingRow icon={UserRoundCog} title="Personal Information" description="Update name, phone and email." />
        <SettingRow icon={ShieldCheck} title="Security & Password" description="Manage login security and two-factor authentication." />
      </Card>
      <section className="grid gap-6 xl:grid-cols-2">
        <SettingsGroup title="PROPERTY SETTINGS">
          <SettingRow icon={Building2} title="Property Profile" description="Address, branding and operating contacts." />
          <SettingRow icon={UsersRound} title="Tenant Portal" description="Configure tenant self-service permissions." />
          <SettingRow icon={ReceiptText} title="Billing Rules" description="Late fees, billing cycle and invoice template." />
        </SettingsGroup>
        <SettingsGroup title="USER & ROLE MANAGEMENT">
          <div className="grid gap-3 p-5">
            {systemUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-4 rounded-lg border border-[#e2e8f0] p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d3e4fe] text-xs font-bold text-[#091426]">{user.name.slice(0, 1)}</span>
                  <span>
                    <span className="block text-sm font-bold text-[#091426]">{user.name}</span>
                    <span className="block text-xs text-[#6b7280]">{user.role}</span>
                  </span>
                </div>
                <span className="text-xs font-bold text-[#505f76]">{user.status}</span>
              </div>
            ))}
          </div>
        </SettingsGroup>
        <SettingsGroup title="NOTIFICATIONS">
          <SettingRow icon={Bell} title="Push Notifications" description="New deposit and maintenance alerts." toggle />
          <SettingRow icon={Mail} title="Email Summary" description="Daily financial and occupancy digest." toggle />
        </SettingsGroup>
        <SettingsGroup title="APPEARANCE">
          <SettingRow icon={Moon} title="Dark Mode" description="Use dark theme for management screens." toggle off />
          <SettingRow icon={Grid3X3} title="Density" description="Compact table display." action="Compact" />
        </SettingsGroup>
      </section>
    </>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.08em] text-[#45474c]">{title}</h2>
      <Card className="overflow-hidden">{children}</Card>
    </section>
  );
}

function SettingRow({ icon: Icon, title, description, toggle = false, off = false, action }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] p-5 last:border-b-0">
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2f4f6] text-[#505f76]"><Icon className="h-5 w-5" /></span>
        <span>
          <span className="block text-sm font-bold text-[#091426]">{title}</span>
          <span className="block text-sm text-[#6b7280]">{description}</span>
        </span>
      </div>
      {toggle ? (
        <span className={`relative h-6 w-11 rounded-full ${off ? "bg-slate-300" : "bg-[#091426]"}`}>
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${off ? "left-1" : "left-6"}`} />
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[#505f76]">
          {action || "Open"}
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

function AccessDeniedPage() {
  return (
    <Card className="p-8">
      <div className="flex max-w-2xl items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#091426]">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm leading-6 text-[#45474c]">Màn hình này đang bị ẩn theo phân quyền hiện tại. Vui lòng chọn chức năng phù hợp với vai trò của bạn.</p>
        </div>
      </div>
    </Card>
  );
}

export function ManagementDashboard() {
  const [activeRole, setActiveRole] = useState("owner");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [depositDateFrom, setDepositDateFrom] = useState("");
  const [depositDateTo, setDepositDateTo] = useState("");
  const [deposits, setDeposits] = useState(depositContracts);
  const [selectedDepositId, setSelectedDepositId] = useState(depositContracts[0]?.id ?? null);
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id ?? null);
  const [selectedTicketId, setSelectedTicketId] = useState(maintenanceTickets[0]?.id ?? null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(contractTemplates[0]?.id ?? null);

  const selectedRole = roles.find((role) => role.id === activeRole) || roles[0];
  const selectedDeposit = (selectedDepositId ? deposits.find((deposit) => deposit.id === selectedDepositId) : null) ?? deposits[0] ?? null;
  const effectiveActiveSection = canAccessSection(activeRole, activeSection)
    ? activeSection
    : getFirstAllowedSection(activeRole, navigation);

  const filteredDeposits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return deposits.filter((deposit) => {
      const matchStatus = statusFilter === "all" || deposit.status === statusFilter;
      const paidAt = parseVNDate(deposit.paidAt);
      const from = depositDateFrom ? new Date(`${depositDateFrom}T00:00:00`) : null;
      const to = depositDateTo ? new Date(`${depositDateTo}T23:59:59`) : null;
      const matchDate = (!from || (paidAt && paidAt >= from)) && (!to || (paidAt && paidAt <= to));
      const matchQuery =
        !normalizedQuery ||
        deposit.roomId.toLowerCase().includes(normalizedQuery) ||
        deposit.tenantName.toLowerCase().includes(normalizedQuery) ||
        deposit.phone.includes(normalizedQuery) ||
        deposit.id.toLowerCase().includes(normalizedQuery);
      return matchStatus && matchDate && matchQuery;
    });
  }, [deposits, depositDateFrom, depositDateTo, query, statusFilter]);

  const handleDepositAction = (depositId, nextStatus) => {
    setDeposits((current) =>
      current.map((deposit) =>
        deposit.id === depositId
          ? {
              ...deposit,
              status: nextStatus,
              accountantNote:
                nextStatus === "approved"
                  ? "Đã duyệt cọc và chuyển sang lịch nhận phòng."
                  : nextStatus === "refunded"
                    ? "Đã đánh dấu hoàn cọc, chờ đối soát ngân hàng."
                    : nextStatus === "forfeited"
                      ? "Đã ghi nhận mất cọc do quá hạn hoặc hủy lịch."
                      : deposit.accountantNote,
            }
          : deposit,
      ),
    );
    setSelectedDepositId(depositId);
  };

  function renderSection() {
    if (!canAccessSection(activeRole, effectiveActiveSection)) {
      return <AccessDeniedPage />;
    }

    switch (effectiveActiveSection) {
      case "dashboard":
        return <DashboardOverview selectedRole={selectedRole} deposits={deposits} />;
      case "floor":
        return <FloorMapPage tenants={tenants} />;
      case "rooms":
        return <RoomsPage query={query} />;
      case "tenants":
        return <TenantsPage selectedTenantId={selectedTenantId} onSelectTenant={setSelectedTenantId} />;
      case "accounts":
        return <AccountManagement />;
      case "meterReadings":
        return <MeterReadingsPage />;
      case "maintenance":
        return <MaintenancePage selectedTicketId={selectedTicketId} onSelectTicket={setSelectedTicketId} />;
      case "deposits":
        return (
          <DepositsPage
            filteredDeposits={filteredDeposits}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            dateFrom={depositDateFrom}
            dateTo={depositDateTo}
            onDateFromChange={setDepositDateFrom}
            onDateToChange={setDepositDateTo}
            onDepositAction={handleDepositAction}
            selectedDeposit={selectedDeposit && filteredDeposits.find((d) => d?.id === selectedDeposit?.id) || null}
            onSelectDeposit={(deposit) => deposit && setSelectedDepositId(deposit.id)}
          />
        );
      case "contract":
        return <ContractSettingsPage selectedTemplateId={selectedTemplateId} onSelectTemplate={setSelectedTemplateId} />;
      case "finance":
        return <FinancePage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardOverview selectedRole={selectedRole} deposits={deposits} />;
    }
  }

  return (
    <AuthProvider user={{ role: activeRole, name: "Admin User", email: "admin@haidang.vn" }}>
      <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
        <Sidebar
          activeSection={effectiveActiveSection}
          onSectionChange={setActiveSection}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <Topbar
          activeRole={activeRole}
          onRoleChange={setActiveRole}
          search={query}
          onSearchChange={setQuery}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        <main className="px-4 py-6 sm:px-6 lg:ml-[280px]">
          <div className="mx-auto grid max-w-[1440px] gap-8">{renderSection()}</div>
        </main>
      </div>
    </AuthProvider>
  );
}
