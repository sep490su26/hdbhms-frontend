"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {
    Check,
    ChevronDown,
    Download,
    Edit3,
    Eye,
    FileText,
    Home,
    ImagePlus,
    ListFilter,
    LoaderCircle,
    Save,
    Trash2,
    X,
} from "lucide-react";
import {
    ROOM_PLACEHOLDER_IMAGE,
    normalizeApiRoom,
    normalizeRoomImages,
    statusCopy,
} from "@/services/roomsService";
import {
    attachRoomImage,
    deleteRoomImage,
    fetchRoomById,
    updateRoom,
    uploadRoomImage,
} from "@/services/floorRoomService";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {useDashboardLayout} from "../_contexts/DashboardLayoutContext";
import {authenticatedFetch} from "@/services/identityAccessService";
import {fetchManagementRoomRentalHistory} from "@/services/leaseContractsService";
import {formatDate as formatDisplayDate} from "@/lib/dateFormat";
import {sortByNewest} from "@/lib/sortByNewest.mjs";
import {DashboardPageHeader} from "@/components/dashboard/DashboardPageHeader";
import {DashboardPagination} from "@/components/dashboard/DashboardPagination";
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
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function Modal({title, children, onClose, footer}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white dark:bg-[#0f172a] shadow-2xl">
                <div
                    className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/10 px-6 py-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="rounded-md p-2 text-slate-600 dark:text-slate-300 hover:bg-[#f2f4f6] dark:hover:bg-white/5"
                    >
                        <X className="h-5 w-5"/>
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

function ExportConfirm({title, filename, description, onClose, onConfirm}) {
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

function StatusBadge({value, map}) {
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

function IconButton({label, icon: Icon, onClick, tone = "neutral"}) {
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
            <Icon className="h-4 w-4"/>
        </button>
    );
}

function RoomsBreadcrumb({facilityName}) {
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
                        <BreadcrumbSeparator/>
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
                        <ActionIcon className="h-4 w-4"/>
                        {actionLabel}
                    </button>
                ) : null
            }
        />
    );
}

function Card({children, className = ""}) {
    return (
        <section
            className={`rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}
        >
            {children}
        </section>
    );
}

function FilterBar({children}) {
    return (
        <div
            className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
            {children}
        </div>
    );
}

function RoomFilterMenu({label, icon: Icon, value, options, onChange}) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-10 min-w-44 items-center justify-between gap-2 rounded-lg border border-[#dbe1ea] bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200"
                >
                    <span className="inline-flex min-w-0 items-center gap-2">
                        {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-500"/> : null}
                        <span className="truncate">{value || label}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400"/>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onSelect={() => onChange(option.value)}
                        className={option.value === value ? "font-bold" : ""}
                    >
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
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
        dot: "bg-slate-500",
        badge:
            "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-white/10",
        card: "border-slate-200 dark:border-white/10 bg-slate-100/80 text-slate-900 dark:text-slate-300",
        icon: "text-slate-600 dark:text-slate-300",
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
    EXPIRED: {
        label: "Hết hạn HĐ",
        dot: "bg-purple-500",
        badge:
            "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-purple-200 dark:ring-purple-500/20",
        card: "border-purple-100 dark:border-purple-500/20 bg-purple-50/90 text-purple-900 dark:text-purple-300",
        icon: "text-purple-600 dark:text-purple-300",
    },
};

const ROOM_STATUS_OPTIONS = [
    {value: "DRAFT", label: "Bản nháp"},
    {value: "VACANT", label: "Trống"},
    {value: "ON_HOLD", label: "Đang giữ cọc"},
    {value: "RESERVED", label: "Đã đặt cọc"},
    {value: "RESERVED_FOR_TRANSFER", label: "Giữ chuyển phòng"},
    {value: "OCCUPIED", label: "Đang thuê"},
    {value: "SOON_VACANT", label: "Sắp trống"},
    {value: "EXPIRED", label: "Hết hạn HĐ"},
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

function getRoomFloorId(room) {
    return room?.floorId ?? room?.floor?.id ?? "";
}

function roomToEditForm(room) {
    return {
        listedPrice: formatAmountInput(room?.listedPrice ?? room?.price ?? ""),
        publicNote: String(room?.publicNote ?? room?.note ?? room?.description ?? ""),
    };
}

function formatAmountInput(value) {
    const digits = String(value ?? "").replace(/\D/g, "");
    return digits ? money.format(Number(digits)) : "";
}

function toNullableNumber(value) {
    if (value === "" || value === null || value === undefined) return null;
    const normalized = typeof value === "string" ? value.replace(/\D/g, "") : value;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function sortRoomList(rooms) {
    return sortByNewest(
        rooms,
        ["createdAt", "created_at", "updatedAt", "updated_at"],
        ["roomId", "id"],
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

function findCurrentRentalContract(contracts = []) {
    return contracts.find((contract) =>
        CURRENT_CONTRACT_STATUSES.has(
            String(contract?.status ?? contract?.contractStatus ?? "")
                .trim()
                .toUpperCase(),
        ),
    ) ?? null;
}

function getRentalOccupantCount(contract) {
    const occupants = Array.isArray(contract?.occupants) ? contract.occupants : [];
    if (occupants.length > 0) {
        return occupants.filter((occupant) => {
            const status = String(occupant?.status ?? "").trim().toUpperCase();
            return !occupant?.moveOutDate && !["MOVED_OUT", "INACTIVE", "TERMINATED", "LIQUIDATED"].includes(status);
        }).length;
    }

    const count = Number(contract?.occupantsCount);
    return Number.isFinite(count) ? count : 0;
}

const OCCUPANT_ROLE_LABELS = {
    PRIMARY: "Người ký chính",
    CO_OCCUPANT: "Người ở cùng",
};

function contractStatusLabel(status) {
    return CONTRACT_STATUS_LABELS[String(status || "").trim().toUpperCase()] || "Chưa rõ";
}

function RentalHistoryPanel({history, isLoading, error}) {
    if (isLoading) {
        return (
            <div
                className="mt-5 rounded-3xl border border-white bg-white dark:bg-[#0f172a] p-5 shadow-[0_16px_40px_rgba(6,16,32,0.08)]">
                <div className="h-6 w-40 animate-pulse rounded bg-slate-100"/>
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
            <div
                className="mt-5 rounded-3xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-5 text-sm font-bold text-rose-700 dark:text-rose-300">
                {error}
            </div>
        );
    }

    const contracts = history?.contracts || [];
    if (contracts.length === 0) {
        return (
            <div
                className="mt-5 rounded-3xl border border-white bg-white dark:bg-[#0f172a] p-5 text-center shadow-[0_16px_40px_rgba(6,16,32,0.08)]">
                <FileText className="mx-auto h-9 w-9 text-slate-400"/>
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
        <div className="space-y-3">
            {contracts.map((contract, index) => {
                const isCurrent = CURRENT_CONTRACT_STATUSES.has(
                    String(contract.status || "").toUpperCase()
                );
                return (
                    <article
                        key={contract.contractId || `${contract.contractCode}-${index}`}
                        className={`rounded-2xl border bg-white p-4 dark:bg-[#0f172a] ${
                            isCurrent
                                ? "border-emerald-300 shadow-sm dark:border-emerald-500/30"
                                : "border-slate-200 dark:border-white/10"
                        }`}
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

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
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

                        <div
                            className="mt-4 rounded-2xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-3">
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
                            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                                {(contract.occupants || []).map((occupant, occupantIndex) => (
                                    <div
                                        key={
                                            occupant.tenantProfileId ||
                                            `${occupant.occupantRole}-${occupant.fullName}-${occupantIndex}`
                                        }
                                        className="rounded-xl bg-[#f7f9fb] p-3 text-sm dark:bg-white/5"
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
                                            <span
                                                className="shrink-0 rounded-full border border-indigo-200 dark:border-blue-500/20 bg-indigo-50 dark:bg-blue-500/10 px-2 py-1 text-[10px] font-black text-indigo-700 dark:text-blue-300">
                        {OCCUPANT_ROLE_LABELS[occupant.occupantRole] ||
                            occupant.occupantRole ||
                            "Chưa rõ"}
                      </span>
                                        </div>
                                        <div
                                            className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
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
                            <div
                                className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                Có file hợp đồng scan/PDF.
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}

function RoomEditModal({room, isSaving, error, onClose, onSubmit}) {
    const [localError, setLocalError] = useState("");
    const [form, setForm] = useState(() => roomToEditForm(room));
    const [existingImages, setExistingImages] = useState(() => room?.imageItems ?? []);
    const [pendingImages, setPendingImages] = useState([]);
    const [deletedImageIds, setDeletedImageIds] = useState([]);
    const pendingImagesRef = useRef([]);
    const roomLabel = getRoomDisplayCode(room);

    useEffect(() => {
        pendingImagesRef.current = pendingImages;
    }, [pendingImages]);

    useEffect(() => {
        return () => {
            pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        };
    }, []);

    if (!room) return null;

    const inputClass =
        "h-11 w-full rounded-lg border border-[#cfd8e3] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:focus:ring-white/10";

    function updateField(field, value) {
        setForm((current) => ({...current, [field]: value}));
    }

    function addPendingImages(files) {
        const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length === 0) return;
        setPendingImages((current) => [
            ...current,
            ...imageFiles.map((file) => ({
                id: `${file.name}-${file.lastModified}-${Math.random()}`,
                file,
                previewUrl: URL.createObjectURL(file),
            })),
        ]);
    }

    function removePendingImage(imageId) {
        setPendingImages((current) => {
            const target = current.find((image) => image.id === imageId);
            if (target) URL.revokeObjectURL(target.previewUrl);
            return current.filter((image) => image.id !== imageId);
        });
    }

    function removeExistingImage(image) {
        if (!image?.id || image.fallback) return;
        setExistingImages((current) => current.filter((item) => item.id !== image.id));
        setDeletedImageIds((current) => [...new Set([...current, image.id])]);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setLocalError("");

        const listedPrice = toNullableNumber(form.listedPrice);

        if (listedPrice !== null && listedPrice < 0) {
            setLocalError("Giá niêm yết không được âm.");
            return;
        }

        await onSubmit({
            listedPrice: listedPrice ?? 0,
            publicNote: form.publicNote.trim(),
            imagesToUpload: pendingImages.map((image) => image.file),
            imageIdsToDelete: deletedImageIds,
        });
    }

    return (
        <Dialog
            open={Boolean(room)}
            onOpenChange={(open) => !open && !isSaving && onClose()}
        >
            <DialogContent
                lockScroll={false}
                showCloseButton={false}
                className="flex max-h-[min(90vh,760px)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl bg-white p-0 dark:bg-[#0f172a] sm:max-w-2xl"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-[#e2e8f0] px-6 py-3.5 dark:border-white/10">
                    <div>
                        <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                            Sửa {roomLabel}
                        </DialogTitle>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Chỉ cập nhật giá niêm yết, ghi chú mô tả và ảnh phòng.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        aria-label="Đóng"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/5"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <form id="room-edit-form" onSubmit={handleSubmit} className="grid gap-4">
                {(localError || error) && (
                    <div
                        className="rounded-lg border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
                        {localError || error}
                    </div>
                )}

                <div className="grid gap-4">
                    <label className="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                        Giá niêm yết
                        <input
                            type="text"
                            inputMode="numeric"
                            min="0"
                            value={form.listedPrice}
                            onChange={(event) => updateField("listedPrice", formatAmountInput(event.target.value))}
                            placeholder="0"
                            className={inputClass}
                        />
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

                <section
                    className="grid gap-3 rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Ảnh phòng
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Ảnh mới sẽ được tải lên sau khi bấm lưu thay đổi.
                            </p>
                        </div>
                        <label
                            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:border-[#1e40af] hover:text-[#1e40af]">
                            <ImagePlus className="h-4 w-4"/>
                            Thêm ảnh
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="sr-only"
                                onChange={(event) => {
                                    addPendingImages(event.target.files);
                                    event.target.value = "";
                                }}
                            />
                        </label>
                    </div>

                    {[...existingImages, ...pendingImages].length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {existingImages.map((image, index) => (
                                <div
                                    key={`existing-${image.id ?? image.url ?? index}`}
                                    className="group relative overflow-hidden rounded-lg border border-[#dbe1ea] bg-white dark:border-white/10 dark:bg-[#0f172a]"
                                >
                                    <img
                                        src={image.url}
                                        alt={`Ảnh phòng ${index + 1}`}
                                        className="aspect-[4/3] w-full object-cover"
                                    />
                                    {image.fallback ? (
                                        <span
                                            className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
                      Ảnh mẫu
                    </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(image)}
                                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white opacity-100 transition hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                                            aria-label="Xóa ảnh phòng"
                                            title="Xóa ảnh phòng"
                                        >
                                            <Trash2 className="h-4 w-4"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                            {pendingImages.map((image, index) => (
                                <div
                                    key={image.id}
                                    className="group relative overflow-hidden rounded-lg border border-dashed border-[#93a4b8] bg-white dark:border-white/20 dark:bg-[#0f172a]"
                                >
                                    <img
                                        src={image.previewUrl}
                                        alt={`Ảnh phòng mới ${index + 1}`}
                                        className="aspect-[4/3] w-full object-cover"
                                    />
                                    <span
                                        className="absolute left-2 top-2 rounded-md bg-[#1e40af]/90 px-2 py-1 text-[10px] font-bold text-white">
                    Chờ lưu
                  </span>
                                    <button
                                        type="button"
                                        onClick={() => removePendingImage(image.id)}
                                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white transition hover:bg-rose-600"
                                        aria-label="Bỏ ảnh phòng mới"
                                        title="Bỏ ảnh phòng mới"
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div
                            className="rounded-lg border border-dashed border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Chưa có ảnh phòng.
                        </div>
                    )}
                </section>
            </form>
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-[#e2e8f0] px-6 py-3.5 dark:border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-slate-700 disabled:opacity-60 dark:border-white/10 dark:text-slate-200"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        form="room-edit-form"
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
                    >
                        {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                        Lưu thay đổi
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function RoomDetailDrawer({room, tenantList, activeRole, onClose, onEdit}) {
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
    const historyContracts = rentalHistory?.contracts || [];
    const currentRentalContract = findCurrentRentalContract(historyContracts);
    const roomOccupantCount =
        roomDetail?.currentOccupants ??
        roomDetail?.current_occupants ??
        room.currentOccupants;
    const currentOccupants = currentRentalContract
        ? getRentalOccupantCount(currentRentalContract)
        : Number(roomOccupantCount ?? 0);
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
        <Dialog open={!!room} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                lockScroll={false}
                showCloseButton={false}
                className="flex max-h-[min(94dvh,920px)] w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[28px] border border-[#dcd9d2] bg-[#f7f5f0] p-0 text-[#24272b] shadow-[0_30px_100px_rgba(29,32,36,0.28)] dark:border-white/10 dark:bg-[#17191c] dark:text-white sm:w-[calc(100vw-2rem)] sm:!max-w-[calc(100vw-2rem)] sm:rounded-[28px] lg:!max-w-[1180px] xl:!max-w-[1280px]">
                <DialogHeader className="sr-only">
                    <DialogTitle>Chi tiết phòng {roomLabel}</DialogTitle>
                    <DialogDescription>
                        Thông tin phòng, khách thuê và lịch sử thuê phòng.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:h-full lg:grid-cols-5 lg:overflow-hidden">

                    {/* Cột trái (40%): Ảnh phòng & thông số cơ bản */}
                    <div className="flex min-w-0 min-h-0 flex-col bg-[#202328] text-white lg:col-span-2">
                        {/* Ảnh lớn */}
                        <div className="relative h-[min(52vh,430px)] min-h-[280px] w-full shrink-0 overflow-hidden lg:h-[min(46vh,430px)]">
                            <div
                                role="img"
                                aria-label={detail.name}
                                className="h-full w-full bg-cover bg-center transition duration-500"
                                style={{
                                    backgroundImage: `url(${displayActiveImage || ROOM_PLACEHOLDER_IMAGE})`,
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#101216]/95 via-[#101216]/15 to-transparent"/>
                            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/65">
                                    <Home className="h-4 w-4"/>
                                    {room.buildingName}
                                </p>
                                <h2 className="mt-2 truncate text-4xl font-black tracking-[-0.04em] text-white">
                                    {detail.name}
                                </h2>
                            </div>
                        </div>

                        {/* Danh sách ảnh nhỏ chuyển đổi */}
                        {galleryImages.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-black/20 p-4 pb-3">
                                {galleryImages.map((image, index) => (
                                    <button
                                        key={`${image}-${index}`}
                                        type="button"
                                        onClick={() => setActiveImage(image)}
                                        aria-label={`Xem ảnh ${index + 1}`}
                                        className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition ${
                                            displayActiveImage === image
                                                ? "border-white ring-2 ring-white/35"
                                                : "border-white/10 opacity-70 hover:opacity-100"
                                        }`}
                                    >
                                        <div
                                            className="h-full w-full bg-cover bg-center"
                                            style={{backgroundImage: `url(${image})`}}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Thông số phòng ở cột trái */}
                        <div className="min-h-0 flex-1 space-y-5 p-5 sm:p-6">
                            <div>
                                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Thông tin phòng</p>
                                <div className="grid grid-cols-2 gap-3 text-white/90">
                                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                    <span
                                        className="text-[10px] font-bold uppercase tracking-wider text-white/60">Tầng</span>
                                    <p className="mt-1 text-base font-black">{roomFloorName}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Diện tích</span>
                                    <p className="mt-1 text-base font-black">{detail.area || "--"} m²</p>
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cột pháº£i (60%): Chi tiết phòng, Khách thuê, Lịch sử & Action */}
                    <div
                        className="flex min-w-0 min-h-0 flex-col overflow-hidden bg-[#fbfaf7] text-[#24272b] dark:bg-[#1b1d20] dark:text-white lg:col-span-3 lg:h-full">
                        {/* Header: Mã phòng & Badge trạng thái */}
                        <div
                            className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e5e1d9] px-5 py-5 sm:px-8 sm:py-6 dark:border-white/10">
                            <div>
                                <span
                                    className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8b8b86] dark:text-white/45">Mã phòng</span>
                                <h3 className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#202328] dark:text-white">{roomLabel}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`rounded-full px-3.5 py-2 text-xs font-black ring-1 ${meta.badge}`}>
                                    {meta.label}
                                </span>
                                <button type="button" onClick={onClose} aria-label="Đóng" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#777a7d] transition hover:bg-black/[0.06] hover:text-[#202328] dark:hover:bg-white/10 dark:hover:text-white">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Tab selector & Content */}
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="shrink-0 border-b border-[#e5e1d9] px-5 pt-4 sm:px-8 dark:border-white/10">
                            <div className="inline-flex w-full max-w-md rounded-2xl border border-[#e1ded7] bg-[#f0eee8] p-1 dark:border-white/10 dark:bg-white/[0.06]">
                                {[
                                    ["overview", "Tổng quan"],
                                    ["history", "Lịch sử thuê"],
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setActiveTab(value)}
                                        className={`h-11 flex-1 rounded-xl text-sm font-black transition ${
                                            activeTab === value
                                                ? "bg-[#24272b] text-white shadow-[0_6px_16px_rgba(36,39,43,0.18)] dark:bg-white dark:text-[#202328]"
                                                : "text-[#777a7d] hover:text-[#202328] dark:text-white/55 dark:hover:text-white"
                                        }`}
                                        >
                                            {label}
                                            {value === "history" && historyContracts.length > 0 && (
                                                <span className="ml-2 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                                                    {historyContracts.length}
                                                </span>
                                            )}
                                        </button>
                                ))}
                            </div>
                            </div>

                            {/* Nội dung tab */}
                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar sm:px-8 sm:py-6">
                            {activeTab === "overview" ? (
                                <div className="space-y-4">
                                    {/* Grid giá cả & sức chứa */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div
                                            className="rounded-2xl bg-[#24272b] p-5 text-white shadow-[0_10px_24px_rgba(36,39,43,0.12)]">
                                            <span
                                                className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">Giá niêm yết</span>
                                            <p className="mt-2 text-xl font-black tracking-[-0.03em]">
                                                {formatMoney(detail.price || 0)}<span className="ml-1 text-xs font-bold text-white/55">/tháng</span>
                                            </p>
                                        </div>
                                        <div
                                            className="rounded-2xl border border-[#e1ded7] bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                                            <span
                                                className="text-[10px] font-black uppercase tracking-[0.14em] text-[#999993] dark:text-white/45">Số người</span>
                                            <p className="mt-2 text-xl font-black tracking-[-0.03em] text-[#24272b] dark:text-white">
                                                {currentOccupants}<span className="mx-1 text-sm font-bold text-[#999993]">/</span>{detail.maxOccupants ?? "--"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Badges tiện ích */}
                                    {roomBadges.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {roomBadges.map((badge) => (
                                                <span
                                                    key={badge}
                                                    className="rounded-full border border-[#dedbd3] bg-[#f0eee8] px-3 py-1.5 text-xs font-bold text-[#55595d] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75"
                                                >
                          {badge}
                        </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Ghi chú */}
                                    <div
                                        className="rounded-2xl border border-[#e1ded7] bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#999993] dark:text-white/45">Ghi chú mô tả</p>
                                        <p className="mt-2 text-sm font-semibold leading-7 text-[#55595d] dark:text-white/75">
                                            {detail.note || "Chưa có ghi chú cho phòng này."}
                                        </p>
                                    </div>

                                    {/* Khách đang thuê (Tenant card) */}
                                    {tenant && (
                                        <div
                                            className="flex flex-col gap-4 rounded-2xl border border-[#e1ded7] bg-[#f0eee8] p-5 dark:border-white/10 dark:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#999993] dark:text-white/45">Người đang thuê</p>
                                                <p className="mt-2 truncate text-base font-black text-[#24272b] dark:text-white">
                                                    {tenant.name}
                                                </p>
                                            </div>
                                            <a
                                                href={`tel:${tenant.phone}`}
                                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#24272b] px-4 text-xs font-black text-white transition hover:bg-[#111315]"
                                            >
                                                Gọi người thuê
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <RentalHistoryPanel
                                        history={rentalHistory}
                                        isLoading={isHistoryLoading}
                                        error={historyError}
                                    />
                                </div>
                            )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div
                            className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-[#e5e1d9] bg-[#f5f3ee] px-5 py-4 sm:px-8 dark:border-white/10 dark:bg-white/[0.03]">
                            {onEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onEdit(room);
                                    }}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d6d2ca] bg-white px-5 text-sm font-black text-[#55595d] transition hover:border-[#24272b] hover:text-[#24272b] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/75 dark:hover:border-white/30 dark:hover:text-white"
                                >
                                    <Edit3 className="h-4 w-4"/>
                                    Sửa phòng
                                </button>
                            )}
                            <Link
                                href={getRoomDetailHref(room)}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#24272b] px-5 text-sm font-black text-white transition hover:bg-[#111315]"
                            >
                                <Eye className="h-4 w-4"/>
                                Xem trang phòng
                            </Link>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}

/* Floor-plan view was removed; rooms are managed as a filtered list. */

function RoomsListPage({query, propertyId, activeRole = "owner"}) {
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [apiRooms, setApiRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [floorFilter, setFloorFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
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
            } catch (error) {
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStaffRooms();
    }, [propertyId]);

    const floorOptions = useMemo(() => [
        {value: "ALL", label: "Tất cả các tầng"},
        ...Array.from(
            new Map(
                apiRooms.map((room) => [
                    String(room.floorId ?? room.floorName ?? room.floor ?? ""),
                    room.floorName || room.floor || "Chưa xác định",
                ]),
            ).entries(),
        )
            .filter(([value]) => value)
            .sort(([, left], [, right]) => String(left).localeCompare(String(right), "vi"))
            .map(([value, label]) => ({value, label})),
    ], [apiRooms]);

    const filteredRooms = sortRoomList(apiRooms.filter((room) => {
        if (floorFilter !== "ALL" && String(room.floorId ?? room.floorName ?? room.floor ?? "") !== floorFilter) {
            return false;
        }
        if (statusFilter !== "ALL" && normalizeStatus(room.status) !== statusFilter) {
            return false;
        }
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
            const {imagesToUpload = [], imageIdsToDelete = [], ...editablePayload} = payload;
            const roomPayload = {
                floorId: getRoomFloorId(editingRoom),
                roomCode: editingRoom.roomCode,
                name: editingRoom.name,
                areaM2: editingRoom.areaM2 ?? editingRoom.area ?? null,
                maxOccupants: editingRoom.maxOccupants ?? editingRoom.maxPeople ?? 1,
                currentStatus: statusToEditValue(editingRoom.status),
                ...editablePayload,
            };
            let data = await updateRoom(editingRoom.roomId, roomPayload);
            await Promise.all(imageIdsToDelete.map((imageId) => deleteRoomImage(editingRoom.roomId, imageId)));
            for (const file of imagesToUpload) {
                const uploaded = await uploadRoomImage(file);
                await attachRoomImage(editingRoom.roomId, uploaded.fileId);
            }
            if (imagesToUpload.length > 0 || imageIdsToDelete.length > 0) {
                data = await fetchRoomById(editingRoom.roomId);
            }
            const normalizedRoom = normalizeApiRoom(data);
            setApiRooms((currentRooms) =>
                sortRoomList(
                    currentRooms.map((item) =>
                        isSameRoom(item, normalizedRoom) ? {...item, ...normalizedRoom} : item,
                    ),
                ),
            );
            setSelectedRoom((currentRoom) =>
                isSameRoom(currentRoom, normalizedRoom) ? {...currentRoom, ...normalizedRoom} : currentRoom,
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
                <RoomFilterMenu
                    label="Tất cả các tầng"
                    icon={Home}
                    value={floorOptions.find((option) => option.value === floorFilter)?.label}
                    options={floorOptions}
                    onChange={(value) => {
                        setFloorFilter(value);
                        setPage(1);
                    }}
                />
                <RoomFilterMenu
                    label="Tất cả trạng thái"
                    icon={ListFilter}
                    value={ROOM_STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label}
                    options={[{value: "ALL", label: "Tất cả trạng thái"}, ...ROOM_STATUS_OPTIONS]}
                    onChange={(value) => {
                        setStatusFilter(value);
                        setPage(1);
                    }}
                />
            </FilterBar>

            {isError && (
                <div
                    className="mt-4 rounded-lg border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300">
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
                                <th className="px-6 py-4">Tầng</th>
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
                                       
                                        <td
                                            data-label="Tầng"
                                            className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300"
                                        >
                                            {room.floor}
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
                                           query = "",
                                           activeRole = "owner",
                                           propertyId,
                                           fromFacilities = false,
                                           facilityName = "",
                                       }) {
    return (
        <section className="grid gap-6">
            {fromFacilities ? <RoomsBreadcrumb facilityName={facilityName}/> : null}
            <DashboardPageHeader
                title="Quản lý Phòng & Tầng"
                description="Theo dõi danh sách phòng, giá niêm yết và trạng thái vận hành."
            />

            <RoomsListPage query={query} propertyId={propertyId} activeRole={activeRole}/>
        </section>
    );
}

export default function RoomsPage() {
    const {query, activeRole} = useDashboardLayout();
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
