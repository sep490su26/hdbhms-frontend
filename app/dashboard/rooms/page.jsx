"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarClock,
  Check,
  Download,
  Edit3,
  Eye,
  FileText,
  Grid3X3,
  Home,
  ListFilter,
  LoaderCircle,
  Map,
  Save,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import {
  ROOM_PLACEHOLDER_IMAGE,
  normalizeApiRoom,
  normalizeRoomImages,
  statusCopy,
} from "@/services/roomsService";
import { fetchFloors, updateRoom } from "@/services/floorRoomService";
import { useDashboardLayout } from "../_contexts/DashboardLayoutContext";
import { authenticatedFetch } from "@/services/identityAccessService";
import { fetchManagementRoomRentalHistory } from "@/services/leaseContractsService";
import { formatDate as formatDisplayDate } from "@/lib/dateFormat";
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const money = new Intl.NumberFormat("vi-VN");

// ponytail: local search covers the first 1000 rooms; move keyword search into /rooms when properties exceed that.
const ROOM_LIST_FETCH_SIZE = 1000;

const roomStatus = {
  occupied: [
    "Đang thuê",
    "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300",
  ],
  available: [
    "Trống",
    "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ],
  maintenance: [
    "Bảo trì",
    "bg-red-50 dark:bg-rose-500/10 text-red-700 dark:text-rose-300",
  ],
  soonVacant: [
    "Sắp trống",
    "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300",
  ],
  onHolde: [
    "Đang giữ cọc",
    "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300",
  ],
  deposited: [
    "Đã đặt cọc",
    "bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300",
  ],
  expired: [
    "Hết hạn",
    "bg-purple-50 dark:bg-blue-500/10 text-purple-700 dark:text-blue-300",
  ],
};

const views = [
  { value: "floor-map", label: "Sơ đồ tầng", icon: Map },
  { value: "room-list", label: "Danh sách phòng", icon: Building2 },
];

function formatMoney(value) {
  return `${money.format(value)} VNĐ`;
}

function formatDate(value) {
  return formatDisplayDate(value, "Chưa có");
}

function formatCycle(value) {
  const cycle = Number(value);
  if (cycle === 1) return "1 tháng/lần";
  if (cycle === 3) return "3 tháng/lần";
  return "Chưa có";
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white dark:bg-[#0f172a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-2 text-slate-600 dark:text-slate-300 hover:bg-[#f2f4f6] dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="border-t border-[#e2e8f0] dark:border-white/10 px-6 py-4">
            {footer}
          </div>
        )}
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
          <p className="text-sm text-slate-500 dark:text-slate-400">
            File sẽ được tải về máy:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {filename}
            </span>
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-[#c5c6cd] dark:border-white/10 px-4 text-sm font-bold text-slate-900 dark:text-white"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-10 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white"
            >
              Xuất file
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {["CSV", "Dữ liệu đang lọc", "Tải về máy"].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#f7f9fb] dark:bg-white/5 p-4 text-sm font-bold text-slate-900 dark:text-white"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function StatusBadge({ value, map }) {
  const [label, className] = map[value] || [
    "Không rõ",
    "bg-slate-100 text-slate-700",
  ];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

function IconButton({ label, icon: Icon, onClick, tone = "neutral" }) {
  const tones = {
    neutral:
      "text-slate-600 dark:text-slate-300 hover:bg-[#f2f4f6] dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
    good: "text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10",
    warn: "text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10",
    bad: "text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-md p-2 transition ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function RoomsBreadcrumb({ facilityName }) {
  return (
    <Breadcrumb className="-mb-3">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard/facilities">Quản lý cơ sở</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {facilityName ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {facilityName}
              </span>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function PageHeader({
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon = Check,
  onAction,
}) {
  return (
    <DashboardPageHeader
      title={title}
      description={description}
      actions={
        actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8]"
          >
            <ActionIcon className="h-4 w-4" />
            {actionLabel}
          </button>
        ) : null
      }
    />
  );
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

function FilterBar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      {children}
    </div>
  );
}

function SelectPill({ icon: Icon, children }) {
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-slate-900 dark:text-white hover:border-[#1e40af]"
    >
      {Icon && <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />}
      {children}
    </button>
  );
}

const STATUS_META = {
  DRAFT: {
    label: "Bản nháp",
    dot: "bg-slate-400",
    badge:
      "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-white/10",
    card: "border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/5 text-slate-900 dark:text-slate-300",
    icon: "text-slate-500 dark:text-slate-300",
  },
  VACANT: {
    label: "Trống",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20",
    card: "border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-slate-800/80 text-emerald-900 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  OCCUPIED: {
    label: "Đang thuê",
    dot: "bg-blue-500",
    badge:
      "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20",
    card: "border-blue-100 dark:border-blue-500/20 bg-blue-50/80 text-blue-900 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-300",
  },
  RESERVED: {
    label: "Đang đặt cọc",
    dot: "bg-amber-400",
    badge:
      "bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300 ring-amber-200 dark:ring-yellow-500/20",
    card: "border-amber-100 dark:border-yellow-500/20 bg-amber-50/90 text-amber-900 dark:text-yellow-300",
    icon: "text-amber-600 dark:text-yellow-300",
  },
  SOON_VACANT: {
    label: "Sắp trống",
    dot: "bg-orange-500",
    badge:
      "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-200 dark:ring-orange-500/20",
    card: "border-orange-100 dark:border-orange-500/20 bg-orange-50/90 text-orange-900 dark:text-orange-300",
    icon: "text-orange-600 dark:text-orange-300",
  },
  MAINTENANCE: {
    label: "Bảo trì",
    dot: "bg-red-500",
    badge:
      "bg-red-50 dark:bg-rose-500/10 text-red-700 dark:text-rose-300 ring-red-200 dark:ring-rose-500/20",
    card: "border-red-100 dark:border-rose-500/20 bg-red-50/90 text-red-900 dark:text-rose-300",
    icon: "text-red-600 dark:text-rose-300",
  },
  EXPIRED: {
    label: "Hết hạn HĐ",
    dot: "bg-purple-500",
    badge:
      "bg-purple-50 dark:bg-blue-500/10 text-purple-700 dark:text-blue-300 ring-purple-200 dark:ring-blue-500/20",
    card: "border-purple-100 dark:border-blue-500/20 bg-purple-50/90 text-purple-900 dark:text-blue-300",
    icon: "text-purple-600 dark:text-blue-300",
  },
};

const STATUS_ORDER = [
  "DRAFT",
  "VACANT",
  "OCCUPIED",
  "RESERVED",
  "SOON_VACANT",
  "MAINTENANCE",
  "EXPIRED",
];

const ROOM_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "VACANT", label: "Trống" },
  { value: "ON_HOLD", label: "Đang giữ cọc" },
  { value: "RESERVED", label: "Đã đặt cọc" },
  { value: "RESERVED_FOR_TRANSFER", label: "Giữ chuyển phòng" },
  { value: "OCCUPIED", label: "Đang thuê" },
  { value: "SOON_VACANT", label: "Sắp trống" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "EXPIRED", label: "Hết hạn HĐ" },
];

const ROOM_STATUS_FORM_ALIASES = {
  draft: "DRAFT",
  available: "VACANT",
  vacant: "VACANT",
  onhold: "ON_HOLD",
  on_hold: "ON_HOLD",
  deposited: "RESERVED",
  reserved: "RESERVED",
  soonvacant: "SOON_VACANT",
  soon_vacant: "SOON_VACANT",
  maintenance: "MAINTENANCE",
  occupied: "OCCUPIED",
  expired: "EXPIRED",
};

function mapStatusToColor(status) {
  return STATUS_META[normalizeStatus(status)] ?? STATUS_META.OCCUPIED;
}

function normalizeStatus(status) {
  const value = String(status ?? "")
    .trim()
    .toUpperCase();
  if (value === "AVAILABLE") return "VACANT";
  if (value === "DEPOSITED" || value === "ON_HOLD" || value === "RESERVED_FOR_TRANSFER") return "RESERVED";
  if (value === "SOONVACANT") return "SOON_VACANT";
  return STATUS_META[value] ? value : "OCCUPIED";
}

function statusToEditValue(status) {
  const raw = String(status ?? "").trim();
  if (!raw) return "DRAFT";
  const upper = raw.toUpperCase();
  if (ROOM_STATUS_OPTIONS.some((option) => option.value === upper)) return upper;
  return ROOM_STATUS_FORM_ALIASES[raw.replace(/\s+/g, "").toLowerCase()] ?? normalizeStatus(raw);
}

function formatRoomCode(code) {
  const rawCode = String(code ?? "").trim();
  if (!rawCode) return "P---";
  return rawCode.toUpperCase().startsWith("P")
    ? rawCode.toUpperCase()
    : `P${rawCode}`;
}

function getRoomRowKey(room, index) {
  const identity = [
    room.id ?? room.roomId ?? room.room_id,
    room.propertyId ?? room.property_id,
    room.floorId ?? room.floor_id ?? room.floor ?? room.floor_name,
    room.roomCode ?? room.room_code ?? room.code ?? room.name,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join("-");

  return identity ? `room-${identity}-${index}` : `room-${index}`;
}

function readPageRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  return [];
}

function normalizeApiFloorPlanRoom(apiRoom) {
  const rawCode =
    apiRoom.roomCode ?? apiRoom.room_code ?? apiRoom.code ?? apiRoom.name ?? "";
  const floorName =
    apiRoom.floorName ?? apiRoom.floor_name ?? apiRoom.floor?.name ?? "";
  const property = apiRoom.property ?? apiRoom.floor?.property ?? null;
  const floorNumber =
    Number.parseInt(String(floorName).replace(/\D/g, ""), 10) ||
    Number.parseInt(String(rawCode).replace(/\D/g, "").slice(0, 1), 10) ||
    1;
  const status = normalizeStatus(
    apiRoom.currentStatus ?? apiRoom.current_status ?? apiRoom.status,
  );
  const maxOccupants = Number(
    apiRoom.maxOccupants ?? apiRoom.max_occupants ?? 3,
  );
  const currentOccupants = Number(
    apiRoom.currentOccupants ??
      apiRoom.current_occupants ??
      (status === "OCCUPIED" || status === "EXPIRED"
        ? Math.min(maxOccupants, 2)
        : 0),
  );
  const imageUrls = normalizeRoomImages(apiRoom);
  const badges = [];

  if (status === "RESERVED") badges.push("Đã có cọc");
  if (apiRoom.hasPendingApplication || apiRoom.has_pending_application)
    badges.push("Có đơn chờ");
  if (apiRoom.hasDebt || apiRoom.has_debt) badges.push("Nợ");

  return {
    id: apiRoom.id ? `api-${apiRoom.id}` : `api-${rawCode}`,
    roomId: apiRoom.id ?? null,
    roomCode: String(rawCode),
    floorId: apiRoom.floorId ?? apiRoom.floor_id ?? apiRoom.floor?.id ?? null,
    floorCode: apiRoom.floorCode ?? apiRoom.floor_code ?? apiRoom.floor?.floorCode ?? apiRoom.floor?.floor_code ?? null,
    propertyId: apiRoom.propertyId ?? apiRoom.property_id ?? property?.id ?? null,
    displayCode: formatRoomCode(rawCode),
    name: apiRoom.name ?? `Phòng ${rawCode}`,
    floorNumber,
    floorName: floorName || `Tầng ${floorNumber}`,
    area: Number(apiRoom.areaM2 ?? apiRoom.area_m2 ?? apiRoom.area ?? 0),
    listedPrice: Number(
      apiRoom.listedPrice ?? apiRoom.listed_price ?? apiRoom.price ?? 0,
    ),
    currentOccupants,
    maxOccupants,
    maxPeople: maxOccupants,
    sortOrder: apiRoom.sortOrder ?? apiRoom.sort_order ?? 0,
    status,
    badges,
    note: apiRoom.publicNote ?? apiRoom.public_note ?? "",
    publicNote: apiRoom.publicNote ?? apiRoom.public_note ?? "",
    image: imageUrls[0] ?? ROOM_PLACEHOLDER_IMAGE,
    images: imageUrls,
    buildingName:
      apiRoom.propertyName ?? apiRoom.property_name ?? property?.name ?? "Hải Đăng House",
    buildingId: apiRoom.propertyId ?? apiRoom.property_id ?? property?.id ?? "hai-dang-house",
  };
}

function getRoomDetailHref(room) {
  const buildingId = encodeURIComponent(room.buildingId || "hai-dang-house");
  const roomCode = encodeURIComponent(room.roomCode || room.displayCode);
  return `/rooms/${buildingId}/${roomCode}`;
}

function getRoomIdentity(room) {
  return String(room?.roomId ?? room?.id ?? room?.roomCode ?? "").trim();
}

function isSameRoom(left, right) {
  const leftIdentity = getRoomIdentity(left);
  const rightIdentity = getRoomIdentity(right);
  return Boolean(leftIdentity && rightIdentity && leftIdentity === rightIdentity);
}

function getRoomDisplayCode(room) {
  return room?.displayCode || formatRoomCode(room?.roomCode ?? room?.id);
}

function getRoomPropertyId(room, fallback = "") {
  return room?.propertyId ?? room?.buildingId ?? room?.floor?.property?.id ?? fallback;
}

function getRoomFloorId(room) {
  return room?.floorId ?? room?.floor?.id ?? "";
}

function roomToEditForm(room) {
  return {
    roomCode: String(room?.roomCode ?? room?.id ?? "").trim(),
    name: String(room?.name ?? room?.roomCode ?? room?.id ?? "").trim(),
    floorId: String(getRoomFloorId(room) ?? ""),
    areaM2: String(room?.areaM2 ?? room?.area ?? ""),
    listedPrice: String(room?.listedPrice ?? room?.price ?? ""),
    maxOccupants: String(room?.maxOccupants ?? room?.maxPeople ?? ""),
    currentStatus: statusToEditValue(room?.currentStatus ?? room?.status),
    publicNote: String(room?.publicNote ?? room?.note ?? room?.description ?? ""),
  };
}

function toNullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortRoomList(rooms) {
  return sortByNewest(
    rooms,
    ["createdAt", "created_at", "updatedAt", "updated_at"],
    ["roomId", "id"],
  );
}

function FloorTabs({ activeFloor, floors, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl bg-white/10 p-1">
      {floors.map((floor) => (
        <button
          key={floor.id}
          type="button"
          onClick={() => onChange(floor.id)}
          className={`min-w-0 flex-1 basis-28 rounded-xl px-3 py-3 text-sm font-bold transition sm:flex-none sm:px-5 ${
            activeFloor === floor.id
              ? "bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
              : "text-slate-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          {floor.label}
        </button>
      ))}
    </div>
  );
}

function FloorSummary({ rooms }) {
  const stats = useMemo(() => {
    const count = (status) =>
      rooms.filter((room) => room.status === status).length;

    return [
      {
        label: "Tổng phòng",
        value: rooms.length,
        tone: "bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white",
        icon: Home,
      },
      {
        label: "Phòng trống",
        value: count("VACANT"),
        tone: "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
        icon: BedDouble,
      },
      {
        label: "Đang thuê",
        value: count("OCCUPIED"),
        tone: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
        icon: UserRound,
      },
      {
        label: "Đang đặt cọc",
        value: count("RESERVED"),
        tone: "bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300",
        icon: CalendarClock,
      },
      {
        label: "Bảo trì",
        value: count("MAINTENANCE"),
        tone: "bg-red-50 dark:bg-rose-500/10 text-red-700 dark:text-rose-300",
        icon: Wrench,
      },
    ];
  }, [rooms]);

  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3">
      {stats.map(({ label, value, tone, icon: Icon }) => (
        <article
          key={label}
          className={`flex min-h-[104px] flex-col justify-between rounded-2xl border border-white/70 px-5 py-4 shadow-[0_16px_40px_rgba(6,16,32,0.14)] ${tone}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-[11px] font-bold uppercase">{label}</p>
            <Icon className="h-4 w-4 shrink-0" />
          </div>
          <p className="text-3xl font-black leading-none">{value}</p>
        </article>
      ))}
    </section>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {STATUS_ORDER.map((status) => {
        const meta = mapStatusToColor(status);

        return (
          <span
            key={status}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-300"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function RoomCard({ room, isSelected, onClick }) {
  const meta = mapStatusToColor(room.status);

  return (
    <button
      type="button"
      onClick={() => onClick(room)}
      aria-label={`Mở thông tin ${room.displayCode}`}
      className={`group flex h-32 min-w-0 flex-col justify-between rounded-2xl border p-4 text-left shadow-[0_14px_28px_rgba(6,16,32,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(6,16,32,0.16)] ${
        meta.card
      } ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#1e40af]" : ""}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 ${meta.icon}`}
        >
          <BedDouble className="h-5 w-5" />
        </span>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${meta.badge}`}
        >
          {meta.label}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-black leading-7">
          {room.displayCode}
        </p>
        <p className="mt-1 truncate text-xs font-bold opacity-70">
          {formatMoney(room.listedPrice || 0)}/tháng
        </p>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 text-xs font-bold opacity-80">
        <span className="truncate">{room.area || "--"} m²</span>
        <span className="shrink-0">
          {room.currentOccupants}/{room.maxOccupants}
        </span>
      </div>
    </button>
  );
}

function RoomGrid({ rooms, selectedRoom, onRoomClick }) {
  if (rooms.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
        <BedDouble className="h-9 w-9 text-slate-400" />
        <p className="mt-4 text-sm font-bold text-white">
          Chưa có phòng ở tầng này
        </p>
        <p className="mt-1 max-w-md text-sm text-slate-400">
          Kiểm tra lại dữ liệu tầng hoặc đồng bộ danh sách phòng từ backend.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {rooms.map((room, index) => (
        <RoomCard
          key={`${room.id}-${room.roomId ?? room.roomCode ?? index}`}
          room={room}
          isSelected={selectedRoom?.id === room.id}
          onClick={onRoomClick}
        />
      ))}
    </div>
  );
}

const CONTRACT_STATUS_LABELS = {
  ACTIVE: "Đang hiệu lực",
  DRAFT: "Bản nháp",
  PENDING_SIGNATURE: "Chờ ký",
  EXPIRING_SOON: "Sắp hết hạn",
  TERMINATION_PENDING: "Chờ thanh lý",
  LIQUIDATED: "Đã thanh lý",
  EXPIRED: "Hết hạn",
  RENEWED: "Đã gia hạn",
  TRANSFERRED: "Đã chuyển phòng",
  CANCELLED: "Đã hủy",
};

const CURRENT_CONTRACT_STATUSES = new Set([
  "ACTIVE",
  "EXPIRING_SOON",
  "TERMINATION_PENDING",
]);

const OCCUPANT_ROLE_LABELS = {
  PRIMARY: "Người ký chính",
  CO_OCCUPANT: "Người ở cùng",
};

function contractStatusLabel(status) {
  return CONTRACT_STATUS_LABELS[status] || status || "Chưa rõ";
}

function RentalHistoryPanel({ history, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="mt-5 rounded-3xl border border-white bg-white dark:bg-[#0f172a] p-5 shadow-[0_16px_40px_rgba(6,16,32,0.08)]">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-5 rounded-3xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-5 text-sm font-bold text-rose-700 dark:text-rose-300">
        {error}
      </div>
    );
  }

  const contracts = history?.contracts || [];
  if (contracts.length === 0) {
    return (
      <div className="mt-5 rounded-3xl border border-white bg-white dark:bg-[#0f172a] p-5 text-center shadow-[0_16px_40px_rgba(6,16,32,0.08)]">
        <FileText className="mx-auto h-9 w-9 text-slate-400" />
        <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
          Chưa có lịch sử thuê
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Phòng này chưa có hợp đồng thuê được ghi nhận.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {contracts.map((contract, index) => {
        const isCurrent = CURRENT_CONTRACT_STATUSES.has(
          String(contract.status || "").toUpperCase()
        );
        return (
          <article
            key={contract.contractId || `${contract.contractCode}-${index}`}
            className="rounded-3xl border border-white bg-white dark:bg-[#0f172a] p-5 shadow-[0_16px_40px_rgba(6,16,32,0.08)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  {isCurrent ? "Hợp đồng hiện tại" : "Hợp đồng cũ"}
                </p>
                <h3 className="mt-1 truncate text-lg font-black text-slate-900 dark:text-white">
                  {contract.contractCode || "Chưa có mã HĐ"}
                </h3>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ${
                  isCurrent
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20"
                    : "bg-slate-50 text-slate-600 ring-slate-200"
                }`}
              >
                {contractStatusLabel(contract.status)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-[#f7f9fb] dark:bg-white/5 p-3">
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Thời hạn HĐ
                </p>
                <p className="mt-1 font-black text-slate-900 dark:text-white">
                  {formatDate(contract.startDate)} -{" "}
                  {formatDate(contract.endDate)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7f9fb] dark:bg-white/5 p-3">
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Ngày tính tiền
                </p>
                <p className="mt-1 font-black text-slate-900 dark:text-white">
                  {formatDate(contract.rentStartDate)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7f9fb] dark:bg-white/5 p-3">
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Giá thuê
                </p>
                <p className="mt-1 font-black text-slate-900 dark:text-white">
                  {formatMoney(contract.monthlyRent || 0)}/tháng
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7f9fb] dark:bg-white/5 p-3">
                <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Chu kỳ
                </p>
                <p className="mt-1 font-black text-slate-900 dark:text-white">
                  {formatCycle(contract.paymentCycleMonths)}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-3">
              <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                Người thuê chính
              </p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                {contract.primaryTenant?.fullName || "Chưa có"}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {contract.primaryTenant?.phone || "Chưa có SĐT"}
              </p>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                Người ở trong phòng
              </p>
              <div className="mt-2 space-y-2">
                {(contract.occupants || []).map((occupant, occupantIndex) => (
                  <div
                    key={
                      occupant.tenantProfileId ||
                      `${occupant.occupantRole}-${occupant.fullName}-${occupantIndex}`
                    }
                    className="rounded-2xl bg-[#f7f9fb] dark:bg-white/5 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-900 dark:text-white">
                          {occupant.fullName || "Chưa có tên"}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {occupant.phone || "Chưa có SĐT"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-indigo-200 dark:border-blue-500/20 bg-indigo-50 dark:bg-blue-500/10 px-2 py-1 text-[10px] font-black text-indigo-700 dark:text-blue-300">
                        {OCCUPANT_ROLE_LABELS[occupant.occupantRole] ||
                          occupant.occupantRole ||
                          "Chưa rõ"}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>Vào: {formatDate(occupant.moveInDate)}</span>
                      <span>
                        Rời:{" "}
                        {occupant.moveOutDate
                          ? formatDate(occupant.moveOutDate)
                          : "Đang ở"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {contract.contractFile?.fileId && (
              <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Có file hợp đồng scan/PDF.
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function RoomEditModal({ room, propertyId: fallbackPropertyId = "", isSaving, error, onClose, onSubmit }) {
  const [floors, setFloors] = useState([]);
  const [isFloorsLoading, setIsFloorsLoading] = useState(false);
  const [floorError, setFloorError] = useState("");
  const [localError, setLocalError] = useState("");
  const [form, setForm] = useState(() => roomToEditForm(room));
  const propertyId = getRoomPropertyId(room, fallbackPropertyId);
  const roomLabel = getRoomDisplayCode(room);

  useEffect(() => {
    let isMounted = true;

    async function loadFloors() {
      if (!propertyId) {
        setFloors([]);
        return;
      }

      try {
        setIsFloorsLoading(true);
        setFloorError("");
        const data = await fetchFloors(propertyId);
        if (!isMounted) return;
        setFloors(data);
        setForm((current) => {
          if (current.floorId || !data.length) return current;
          return { ...current, floorId: String(data[0].id) };
        });
      } catch (loadError) {
        if (isMounted) {
          setFloors([]);
          setFloorError(loadError.message || "Không thể tải danh sách tầng.");
        }
      } finally {
        if (isMounted) setIsFloorsLoading(false);
      }
    }

    loadFloors();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  if (!room) return null;

  const fallbackFloorId = getRoomFloorId(room);
  const floorOptions = floors.length
    ? floors
    : fallbackFloorId
      ? [{ id: fallbackFloorId, name: room.floorName || room.floor || "Tầng hiện tại" }]
      : [];
  const inputClass =
    "h-11 w-full rounded-lg border border-[#cfd8e3] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20";

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");

    const roomCode = form.roomCode.trim();
    const name = form.name.trim();
    const floorId = Number(form.floorId);
    const listedPrice = toNullableNumber(form.listedPrice);
    const maxOccupants = toNullableNumber(form.maxOccupants);

    if (!roomCode || !name) {
      setLocalError("Mã phòng và tên phòng là bắt buộc.");
      return;
    }

    if (!Number.isFinite(floorId)) {
      setLocalError("Vui lòng chọn tầng cho phòng.");
      return;
    }

    if (listedPrice !== null && listedPrice < 0) {
      setLocalError("Giá niêm yết không được âm.");
      return;
    }

    if (maxOccupants !== null && maxOccupants < 1) {
      setLocalError("Sức chứa phải lớn hơn 0.");
      return;
    }

    await onSubmit({
      floorId,
      roomCode,
      name,
      areaM2: toNullableNumber(form.areaM2),
      listedPrice: listedPrice ?? 0,
      maxOccupants: maxOccupants ?? 1,
      currentStatus: form.currentStatus,
      publicNote: form.publicNote.trim(),
    });
  }

  return (
    <Modal
      title={`Sửa ${roomLabel}`}
      onClose={isSaving ? () => {} : onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 rounded-lg border border-[#c5c6cd] dark:border-white/10 px-4 text-sm font-bold text-slate-900 dark:text-white disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="room-edit-form"
            disabled={isSaving || isFloorsLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Lưu thay đổi
          </button>
        </div>
      }
    >
      <form id="room-edit-form" onSubmit={handleSubmit} className="grid gap-5">
        {(localError || error || floorError) && (
          <div className="rounded-lg border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
            {localError || error || floorError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            Mã phòng
            <input
              value={form.roomCode}
              onChange={(event) => updateField("roomCode", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            Tên phòng
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            Tầng
            <select
              value={form.floorId}
              onChange={(event) => updateField("floorId", event.target.value)}
              className={inputClass}
              disabled={isFloorsLoading}
              required
            >
              <option value="">{isFloorsLoading ? "Đang tải tầng..." : "Chọn tầng"}</option>
              {floorOptions.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name || floor.floorCode || `Tầng ${floor.sortOrder ?? floor.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            Diện tích (m²)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.areaM2}
              onChange={(event) => updateField("areaM2", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            Giá niêm yết
            <input
              type="number"
              min="0"
              step="1000"
              value={form.listedPrice}
              onChange={(event) => updateField("listedPrice", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            Sức chứa
            <input
              type="number"
              min="1"
              step="1"
              value={form.maxOccupants}
              onChange={(event) => updateField("maxOccupants", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            Trạng thái
            <select
              value={form.currentStatus}
              onChange={(event) => updateField("currentStatus", event.target.value)}
              className={inputClass}
            >
              {ROOM_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          Ghi chú công khai
          <textarea
            value={form.publicNote}
            onChange={(event) => updateField("publicNote", event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[#cfd8e3] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20"
          />
        </label>
      </form>
    </Modal>
  );
}

function RoomDetailDrawer({ room, tenantList, activeRole, onClose, onEdit }) {
  const [roomDetail, setRoomDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [rentalHistory, setRentalHistory] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const tenant = room
    ? tenantList.find(
        (item) =>
          item.roomId === getRoomDisplayCode(room) || item.roomId === room.roomCode,
      )
    : null;
  const meta = room ? mapStatusToColor(room.status) : STATUS_META.OCCUPIED;
  const canCreateMaintenance =
    activeRole === "owner" || activeRole === "manager";
  const galleryImages = useMemo(
    () => normalizeRoomImages(roomDetail ?? room),
    [roomDetail, room],
  );
  const [activeImage, setActiveImage] = useState(
    () => galleryImages[0] ?? ROOM_PLACEHOLDER_IMAGE,
  );
  const displayActiveImage = galleryImages.includes(activeImage)
    ? activeImage
    : (galleryImages[0] ?? ROOM_PLACEHOLDER_IMAGE);

  useEffect(() => {
    let isMounted = true;

    async function fetchRoomDetail() {
      if (!room?.roomId) {
        setRoomDetail(null);
        return;
      }

      try {
        setIsDetailLoading(true);
        const data = await authenticatedFetch(`/rooms/id/${room.roomId}`, {
          method: "GET",
        });
        if (isMounted) setRoomDetail(data);
      } catch {
        if (isMounted) setRoomDetail(null);
      } finally {
        if (isMounted) setIsDetailLoading(false);
      }
    }

    fetchRoomDetail();

    return () => {
      isMounted = false;
    };
  }, [room?.roomId]);

  useEffect(() => {
    let isMounted = true;

    async function loadRentalHistory() {
      if (!room?.roomId) {
        setRentalHistory(null);
        return;
      }

      try {
        setIsHistoryLoading(true);
        setHistoryError("");
        const data = await fetchManagementRoomRentalHistory(room.roomId);
        if (isMounted) setRentalHistory(data);
      } catch (error) {
        if (isMounted) {
          setRentalHistory(null);
          setHistoryError(
            error.message || "Không tải được lịch sử thuê của phòng.",
          );
        }
      } finally {
        if (isMounted) setIsHistoryLoading(false);
      }
    }

    loadRentalHistory();

    return () => {
      isMounted = false;
    };
  }, [room?.roomId]);

  if (!room) return null;

  const roomLabel = getRoomDisplayCode(room);
  const roomBadges = Array.isArray(room.badges) ? room.badges : [];
  const currentOccupants = Number(room.currentOccupants ?? 0);
  const roomFloorName =
    roomDetail?.floor?.name ?? room.floorName ?? room.floor ?? "Chưa có";
  const detail = {
    name: roomDetail?.name ?? room.name ?? roomLabel,
    area: roomDetail?.areaM2 ?? room.areaM2 ?? room.area,
    price: roomDetail?.listedPrice ?? room.listedPrice ?? room.price,
    maxOccupants: roomDetail?.maxOccupants ?? room.maxOccupants ?? room.maxPeople,
    note: roomDetail?.publicNote ?? room.publicNote ?? room.note,
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-[#020817]/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden bg-[#f2f4f6] dark:bg-white/5 shadow-2xl sm:max-w-[430px]"
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết ${roomLabel}`}
      >
        <div className="shrink-0 overflow-hidden bg-[#1e40af] dark:bg-[#2563eb]">
          <div className="relative h-56 overflow-hidden bg-[#1e40af] dark:bg-[#2563eb]">
            <div
              role="img"
              aria-label={detail.name}
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${displayActiveImage || ROOM_PLACEHOLDER_IMAGE})`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e40af] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-white/80">
                <Home className="h-4 w-4" />
                {room.buildingName}
              </p>
              <h2 className="mt-1 truncate text-3xl font-black text-white">
                {detail.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-900 dark:text-white shadow-lg hover:bg-white dark:bg-[#0f172a]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 border-t border-white/10 bg-[#0f1a2b] p-3">
            {galleryImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImage(image)}
                aria-label={`Xem ảnh ${index + 1}`}
                className={`relative aspect-[4/3] overflow-hidden rounded-lg border transition ${
                  displayActiveImage === image
                    ? "border-white ring-2 ring-white/35"
                    : "border-white/10 opacity-80 hover:opacity-100"
                }`}
              >
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${image})` }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white dark:bg-[#0f172a] p-1 shadow-[0_8px_24px_rgba(6,16,32,0.06)]">
            {[
              ["overview", "Tổng quan"],
              ["history", "Lịch sử thuê"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`h-10 rounded-xl text-sm font-black transition ${
                  activeTab === value
                    ? "bg-[#1e40af] dark:bg-[#2563eb] text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-[#f7f9fb] dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className={`${activeTab === "overview" ? "" : "hidden"} rounded-3xl border border-white bg-white dark:bg-[#0f172a] p-5 shadow-[0_16px_40px_rgba(6,16,32,0.08)]`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-500 dark:text-slate-400">
                  Mã phòng
                </p>
                <p className="truncate text-3xl font-black text-slate-900 dark:text-white">
                  {roomLabel}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${meta.badge}`}
              >
                {meta.label}
              </span>
            </div>

            {isDetailLoading ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Giá thuê",
                    value: `${formatMoney(detail.price || 0)}/tháng`,
                  },
                  { label: "Diện tích", value: `${detail.area || "--"} m²` },
                  { label: "Tầng", value: roomFloorName },
                  {
                    label: "Số người",
                    value: `${currentOccupants}/${detail.maxOccupants ?? "--"}`,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-2xl bg-[#f7f9fb] dark:bg-white/5 p-4"
                  >
                    <p className="truncate text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {roomBadges.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {roomBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-[#edf2f7] px-3 py-1 text-xs font-black text-slate-700 dark:text-slate-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4">
              <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                Ghi chú
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                {detail.note || "Chưa có ghi chú cho phòng này."}
              </p>
            </div>

            {tenant && (
              <div className="mt-5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 p-4">
                <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">
                  Khách đang ở
                </p>
                <p className="mt-1 truncate text-sm font-black text-blue-950">
                  {tenant.name}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-blue-800 dark:text-blue-300">
                  {tenant.phone}
                </p>
              </div>
            )}
          </div>
          {activeTab === "history" && (
            <RentalHistoryPanel
              history={rentalHistory}
              isLoading={isHistoryLoading}
              error={historyError}
            />
          )}
        </div>

        <div className="grid gap-3 border-t border-[#dfe5ee] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5">
          <Link
            href={getRoomDetailHref(room)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-black text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8]"
          >
            <Eye className="h-4 w-4" />
            Xem chi tiết
          </Link>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(room)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d7deea] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 text-sm font-black text-slate-900 dark:text-white hover:bg-[#f7f9fb] dark:hover:bg-white/5"
            >
              <Edit3 className="h-4 w-4" />
              Sửa phòng
            </button>
          )}
          {normalizeStatus(room.status) === "VACANT" && (
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d7deea] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 text-sm font-black text-slate-900 dark:text-white hover:bg-[#f7f9fb] dark:hover:bg-white/5"
            >
              <CalendarClock className="h-4 w-4" />
              Đặt lịch xem phòng
            </button>
          )}
          {canCreateMaintenance && (
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d7deea] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 text-sm font-black text-slate-900 dark:text-white hover:bg-[#f7f9fb] dark:hover:bg-white/5"
            >
              <Wrench className="h-4 w-4" />
              Tạo phiếu bảo trì
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function FloorPlanPage({
  tenantList = [],
  activeRole = "owner",
  propertyId = "1",
}) {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceWarning, setSourceWarning] = useState("");
  const [activeFloor, setActiveFloor] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchFloorPlanRooms() {
      try {
        setIsLoading(true);
        setSourceWarning("");
        const data = await authenticatedFetch(
          `/rooms?propertyId=${encodeURIComponent(propertyId || "1")}&size=200`,
        );
        const normalizedRooms = readPageRows(data)
          .map(normalizeApiFloorPlanRoom)
          .sort((a, b) => Number(a.roomCode) - Number(b.roomCode));

        if (isMounted) {
          setRooms(normalizedRooms);
          if (normalizedRooms.length > 0) {
            setActiveFloor(normalizedRooms[0].floorNumber);
          }
        }
      } catch {
        if (isMounted) {
          setRooms([]);
          setSourceWarning("Không thể tải dữ liệu từ API /rooms.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchFloorPlanRooms();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const activeFloorRooms = useMemo(
    () => rooms.filter((room) => room.floorNumber === activeFloor),
    [activeFloor, rooms],
  );
  const availableFloors = useMemo(
    () =>
      [...new Set(rooms.map((room) => room.floorNumber))]
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
        .map((floorNumber) => ({
          id: floorNumber,
          label: `Tầng ${floorNumber}`,
        })),
    [rooms],
  );

  function handleFloorChange(floor) {
    setActiveFloor(floor);
    setSelectedRoom(null);
  }

  function handleRoomClick(room) {
    setSelectedRoom(room);
  }

  function handleEditRoom(room) {
    setEditError("");
    setEditingRoom(room);
  }

  async function handleSaveRoom(payload) {
    if (!editingRoom?.roomId) {
      setEditError("Không xác định được phòng cần sửa.");
      return;
    }

    try {
      setIsSavingRoom(true);
      setEditError("");
      const data = await updateRoom(editingRoom.roomId, payload);
      const normalizedRoom = normalizeApiFloorPlanRoom(data);
      setRooms((currentRooms) =>
        currentRooms.map((item) => (isSameRoom(item, normalizedRoom) ? normalizedRoom : item)),
      );
      setSelectedRoom((currentRoom) =>
        isSameRoom(currentRoom, normalizedRoom) ? normalizedRoom : currentRoom,
      );
      setActiveFloor(normalizedRoom.floorNumber);
      setEditingRoom(null);
    } catch (saveError) {
      setEditError(saveError.message || "Không thể lưu thay đổi phòng.");
    } finally {
      setIsSavingRoom(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] bg-[#1e40af] dark:bg-[#1e40af] p-4 shadow-[0_24px_80px_rgba(3,10,24,0.28)] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-400">
            Hải Đăng House
          </p>
          <h2 className="mt-2 text-3xl font-black text-white">Sơ đồ phòng</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Theo dõi nhanh trạng thái, giá thuê và sức chứa từng phòng theo
            tầng.
          </p>
        </div>
        <FloorTabs
          activeFloor={activeFloor}
          floors={availableFloors}
          onChange={handleFloorChange}
        />
      </div>

      {sourceWarning && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-semibold text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{sourceWarning}</span>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-white/10"
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <FloorSummary rooms={activeFloorRooms} />

          <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-white">
                  Tầng {activeFloor}
                </p>
                <p className="text-xs font-semibold text-slate-400">
                  {activeFloorRooms.length} phòng đang hiển thị
                </p>
              </div>
              <StatusLegend />
            </div>
            <RoomGrid
              rooms={activeFloorRooms}
              selectedRoom={selectedRoom}
              onRoomClick={handleRoomClick}
            />
          </div>
        </div>
      )}

      {selectedRoom && (
        <RoomDetailDrawer
          key={selectedRoom.id}
          room={selectedRoom}
          tenantList={tenantList}
          activeRole={activeRole}
          onClose={() => setSelectedRoom(null)}
          onEdit={handleEditRoom}
        />
      )}
      {editingRoom && (
        <RoomEditModal
          key={getRoomIdentity(editingRoom)}
          room={editingRoom}
          propertyId={propertyId}
          isSaving={isSavingRoom}
          error={editError}
          onClose={() => {
            if (!isSavingRoom) setEditingRoom(null);
          }}
          onSubmit={handleSaveRoom}
        />
      )}
    </section>
  );
}

function RoomsListPage({ query, propertyId, activeRole = "owner" }) {
  const [exportPrompt, setExportPrompt] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [apiRooms, setApiRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const fetchStaffRooms = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          page: "0",
          size: String(ROOM_LIST_FETCH_SIZE),
          sort: "createdAt,desc",
        });
        if (propertyId) params.set("propertyId", String(propertyId));

        const data = await authenticatedFetch(`/rooms?${params.toString()}`);
        const rows = sortRoomList(readPageRows(data).map((room) => normalizeApiRoom(room)));
        setApiRooms(rows);
        setIsSuccess(true);
      } catch (error) {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaffRooms();
  }, [propertyId]);

  const filteredRooms = sortRoomList(apiRooms.filter((room) => {
    if (!query?.trim()) return true;
    const q = query.trim().toLowerCase();
    const searchableText = [
      room.id,
      room.roomCode,
      room.name,
      room.floor,
      room.floorName,
      room.buildingName,
    ]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ");
    return searchableText.includes(q);
  }));
  const filteredTotalElements = filteredRooms.length;
  const filteredTotalPages =
    filteredTotalElements === 0
      ? 0
      : Math.ceil(filteredTotalElements / Math.max(1, size));
  const displayedRoomPage =
    filteredTotalPages > 0 ? Math.min(page, filteredTotalPages) : 1;
  const pagedRooms = filteredRooms.slice(
    (displayedRoomPage - 1) * size,
    displayedRoomPage * size,
  );

  // Export to CSV
  const exportRooms = () => {
    const rows = ["Ma phong,Tang,Dien tich,Gia niem yet,Trang thai"];
    filteredRooms.forEach((room) => {
      rows.push(
        [
          room.id,
          room.floor,
          `${room.area} m2`,
          room.listedPrice,
          statusCopy(room.status),
        ].join(","),
      );
    });
    downloadTextFile("danh-sach-phong.csv", rows.join("\n"));
  };

  // Map API status strings to internal status keys (matching roomStatus map)
  function mapApiStatus(status) {
    if (!status) return "occupied";
    const s = status.toLowerCase();
    if (s === "vacant") return "available";
    if (s === "soon_vacant") return "soonVacant";
    if (s === "reserved") return "deposited";
    if (s === "maintenance") return "maintenance";
    return "occupied";
  }

  function handleViewRoom(room) {
    setSelectedRoom(room);
  }

  function handleEditRoom(room) {
    setEditError("");
    setEditingRoom(room);
  }

  async function handleSaveRoom(payload) {
    if (!editingRoom?.roomId) {
      setEditError("Không xác định được phòng cần sửa.");
      return;
    }

    try {
      setIsSavingRoom(true);
      setEditError("");
      const data = await updateRoom(editingRoom.roomId, payload);
      const normalizedRoom = normalizeApiRoom(data);
      setApiRooms((currentRooms) =>
        sortRoomList(
          currentRooms.map((item) =>
            isSameRoom(item, normalizedRoom) ? { ...item, ...normalizedRoom } : item,
          ),
        ),
      );
      setSelectedRoom((currentRoom) =>
        isSameRoom(currentRoom, normalizedRoom) ? { ...currentRoom, ...normalizedRoom } : currentRoom,
      );
      setEditingRoom(null);
    } catch (saveError) {
      setEditError(saveError.message || "Không thể lưu thay đổi phòng.");
    } finally {
      setIsSavingRoom(false);
    }
  }

  /*<PageHeader
            title="Quản lý phòng"
            description={`Manage ${allRooms.length} rooms across 5 floors`}
            actionLabel="Tạo phòng mới"
            actionIcon={Building2}
          />*/
  return (
    <>
      <FilterBar>
        <SelectPill icon={Map}>Tất cả các tầng</SelectPill>
        <SelectPill icon={ListFilter}>Tất cả trạng thái</SelectPill>
        <button
          type="button"
          onClick={() => setExportPrompt(true)}
          aria-label="Xuất danh sách phòng"
          className="ml-auto rounded-lg border border-[#e2e8f0] dark:border-white/10 p-2 text-slate-600 dark:text-slate-300 hover:border-[#1e40af]"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#e2e8f0] dark:border-white/10 p-2 text-slate-600 dark:text-slate-300 hover:border-[#1e40af]"
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
      </FilterBar>

      {isError && (
        <div className="mt-4 rounded-lg border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300">
          Không thể tải dữ liệu phòng. Vui lòng thử lại.
        </div>
      )}

      {!isError && (
        <Card className="overflow-hidden">
          <div className="dashboard-table">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#f2f4f6] dark:bg-white/5">
                <tr className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
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
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm font-bold text-slate-500 dark:text-slate-400"
                    >
                      Đang tải danh sách phòng...
                    </td>
                  </tr>
                ) : filteredRooms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                    >
                      Không có phòng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  pagedRooms.map((room, index) => (
                    <tr
                      key={getRoomRowKey(room, index)}
                      className="border-t border-[#e2e8f0] dark:border-white/10"
                    >
                      <td
                        data-label="Mã phòng"
                        className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white"
                      >
                        {room.roomCode || room.id}
                      </td>
                      <td data-label="Đặc điểm" className="px-6 py-4">
                        <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-[#3c475a]">
                          Dành cho {room.maxPeople ?? room.maxOccupants ?? 0} người ở
                        </span>
                      </td>
                      <td
                        data-label="Tầng"
                        className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300"
                      >
                        {room.floor}
                      </td>
                      <td
                        data-label="Diện tích"
                        className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300"
                      >
                        {room.area} m²
                      </td>
                      <td
                        data-label="Giá niêm yết"
                        className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white"
                      >
                        {formatMoney(room.listedPrice)}
                      </td>
                      <td data-label="Trạng thái" className="px-6 py-4">
                        <StatusBadge
                          value={room.status}
                          map={roomStatus}
                        />
                      </td>
                      <td data-label="Thao tác" className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <IconButton
                            label={`Xem ${room.roomCode || room.id}`}
                            icon={Eye}
                            onClick={() => handleViewRoom(room)}
                          />
                          <IconButton
                            label={`Sửa ${room.roomCode || room.id}`}
                            icon={Edit3}
                            onClick={() => handleEditRoom(room)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <DashboardPagination
            page={page}
            size={size}
            totalElements={filteredTotalElements}
            totalPages={filteredTotalPages}
            itemLabel="phòng"
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
          />
        </Card>
      )}

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

      {selectedRoom && (
        <RoomDetailDrawer
          key={getRoomIdentity(selectedRoom)}
          room={selectedRoom}
          tenantList={[]}
          activeRole={activeRole}
          onClose={() => setSelectedRoom(null)}
          onEdit={handleEditRoom}
        />
      )}

      {editingRoom && (
        <RoomEditModal
          key={getRoomIdentity(editingRoom)}
          room={editingRoom}
          propertyId={propertyId}
          isSaving={isSavingRoom}
          error={editError}
          onClose={() => {
            if (!isSavingRoom) setEditingRoom(null);
          }}
          onSubmit={handleSaveRoom}
        />
      )}

    </>
  );
}

export function RoomsManagementContent({
  initialView = "floor-map",
  query = "",
  activeRole = "owner",
  propertyId,
  fromFacilities = false,
  facilityName = "",
}) {
  const [view, setView] = useState(initialView);

  return (
    <section className="grid gap-6">
      {fromFacilities ? <RoomsBreadcrumb facilityName={facilityName} /> : null}
      <DashboardPageHeader
        title="Quản lý Phòng & Tầng"
        description="Theo dõi mặt bằng từng tầng và danh sách phòng trong cùng một khu vực quản trị."
        actions={
          <div className="flex w-full flex-wrap rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-1 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:w-auto">
            {views.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setView(item.value)}
                  className={`inline-flex min-h-10 min-w-0 flex-1 basis-36 items-center justify-center gap-2 rounded-md px-3 py-2 text-center text-sm font-bold transition sm:flex-none sm:px-4 ${
                    isActive
                      ? "bg-[#1e40af] dark:bg-[#2563eb] text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:bg-[#f2f4f6] dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        }
      />

      {view === "floor-map" ? (
        <FloorPlanPage activeRole={activeRole} propertyId={propertyId} />
      ) : (
        <RoomsListPage query={query} propertyId={propertyId} activeRole={activeRole} />
      )}
    </section>
  );
}

export default function RoomsPage() {
  const { query, activeRole } = useDashboardLayout();
  const searchParams = useSearchParams();
  const propertyId =
    searchParams.get("propertyId") || searchParams.get("facilityId") || "";
  const fromFacilities = searchParams.get("from") === "facilities";
  const facilityName = searchParams.get("facilityName") || "";

  return (
    <RoomsManagementContent
      query={query}
      activeRole={activeRole}
      propertyId={propertyId}
      fromFacilities={fromFacilities}
      facilityName={facilityName}
    />
  );
}
