"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {
    AlertTriangle,
    BedDouble,
    Building2,
    CalendarClock,
    Check,
    Download,
    Edit3,
    Eye,
    Grid3X3,
    Home,
    ImageIcon,
    ListFilter,
    Map,
    UserRound,
    Wrench,
    X,
} from "lucide-react";
import {tenants} from "@/services/dashboardService";
import {statusCopy} from "@/services/roomsService";
import {useDashboardLayout} from "../_contexts/DashboardLayoutContext";
import {authenticatedFetch} from "@/services/identityAccessService";
import {floorTabs, mockFloorPlanData} from "./mockFloorPlanData";

const money = new Intl.NumberFormat("vi-VN");

const roomStatus = {
    occupied: ["Đang thuê", "bg-blue-50 text-blue-800"],
    available: ["Trống", "bg-emerald-50 text-emerald-700"],
    maintenance: ["Bảo trì", "bg-red-50 text-red-700"],
    soonVacant: ["Sắp trống", "bg-orange-50 text-orange-700"],
    onHolde: ["Đang giữ cọc", "bg-orange-50 text-orange-700"],
    deposited: ["Đã đặt cọc", "bg-amber-50 text-amber-700"],
    expired: ["Hết hạn", "bg-purple-50 text-purple-700"],
};

const views = [
    {value: "floor-map", label: "Sơ đồ tầng", icon: Map},
    {value: "room-list", label: "Danh sách phòng", icon: Building2},
];

function formatMoney(value) {
    return `${money.format(value)} đ`;
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
            <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                    <h2 className="text-lg font-bold text-[#091426]">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="rounded-md p-2 text-[#505f76] hover:bg-[#f2f4f6]"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </div>
                <div className="max-h-[68vh] overflow-y-auto p-6 custom-scrollbar">{children}</div>
                {footer && <div className="border-t border-[#e2e8f0] px-6 py-4">{footer}</div>}
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
                    <p className="text-sm text-[#6b7280]">
                        File sẽ được tải về máy: <span className="font-bold text-[#091426]">{filename}</span>
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white"
                        >
                            Xuất file
                        </button>
                    </div>
                </div>
            }
        >
            <div className="grid gap-4">
                <p className="text-sm leading-6 text-[#45474c]">{description}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                    {["CSV", "Dữ liệu đang lọc", "Tải về máy"].map((item) => (
                        <div key={item}
                             className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4 text-sm font-bold text-[#091426]">
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
}

function StatusBadge({value, map}) {
    const [label, className] = map[value] || ["Không rõ", "bg-slate-100 text-slate-700"];
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>
      {label}
    </span>
    );
}

function IconButton({label, icon: Icon, onClick, tone = "neutral"}) {
    const tones = {
        neutral: "text-[#505f76] hover:bg-[#f2f4f6] hover:text-[#091426]",
        good: "text-emerald-600 hover:bg-emerald-50",
        warn: "text-blue-600 hover:bg-blue-50",
        bad: "text-rose-600 hover:bg-rose-50",
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

function PageHeader({title, description, actionLabel, actionIcon: ActionIcon = Check, onAction}) {
    return (
        <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">{description}</p>
            </div>
            {actionLabel && (
                <button
                    type="button"
                    onClick={onAction}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a]"
                >
                    <ActionIcon className="h-4 w-4"/>
                    {actionLabel}
                </button>
            )}
        </section>
    );
}

function Card({children, className = ""}) {
    return (
        <section
            className={`rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}>
            {children}
        </section>
    );
}

function FilterBar({children}) {
    return (
        <div
            className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
            {children}
        </div>
    );
}

function SelectPill({icon: Icon, children}) {
    return (
        <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#191c1e] hover:border-[#091426]"
        >
            {Icon && <Icon className="h-4 w-4 text-[#505f76]"/>}
            {children}
        </button>
    );
}

const STATUS_META = {
    VACANT: {
        label: "Trống",
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        card: "border-emerald-100 bg-emerald-50/80 text-emerald-900",
        icon: "text-emerald-600",
    },
    OCCUPIED: {
        label: "Đang thuê",
        dot: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 ring-blue-200",
        card: "border-blue-100 bg-blue-50/80 text-blue-900",
        icon: "text-blue-600",
    },
    RESERVED: {
        label: "Đang đặt cọc",
        dot: "bg-amber-400",
        badge: "bg-amber-50 text-amber-700 ring-amber-200",
        card: "border-amber-100 bg-amber-50/90 text-amber-900",
        icon: "text-amber-600",
    },
    SOON_VACANT: {
        label: "Sắp trống",
        dot: "bg-orange-500",
        badge: "bg-orange-50 text-orange-700 ring-orange-200",
        card: "border-orange-100 bg-orange-50/90 text-orange-900",
        icon: "text-orange-600",
    },
    MAINTENANCE: {
        label: "Bảo trì",
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700 ring-red-200",
        card: "border-red-100 bg-red-50/90 text-red-900",
        icon: "text-red-600",
    },
    EXPIRED: {
        label: "Hết hạn HĐ",
        dot: "bg-purple-500",
        badge: "bg-purple-50 text-purple-700 ring-purple-200",
        card: "border-purple-100 bg-purple-50/90 text-purple-900",
        icon: "text-purple-600",
    },
};

const STATUS_ORDER = ["VACANT", "OCCUPIED", "RESERVED", "SOON_VACANT", "MAINTENANCE", "EXPIRED"];

function mapStatusToColor(status) {
    return STATUS_META[normalizeStatus(status)] ?? STATUS_META.OCCUPIED;
}

function normalizeStatus(status) {
    const value = String(status ?? "").trim().toUpperCase();
    if (value === "AVAILABLE") return "VACANT";
    if (value === "DEPOSITED" || value === "ON_HOLD") return "RESERVED";
    if (value === "SOONVACANT") return "SOON_VACANT";
    return STATUS_META[value] ? value : "OCCUPIED";
}

function formatRoomCode(code) {
    const rawCode = String(code ?? "").trim();
    if (!rawCode) return "P---";
    return rawCode.toUpperCase().startsWith("P") ? rawCode.toUpperCase() : `P${rawCode}`;
}

function readPageRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.data?.content)) return payload.data.content;
    return [];
}

function normalizeApiFloorPlanRoom(apiRoom) {
    const rawCode = apiRoom.roomCode ?? apiRoom.room_code ?? apiRoom.code ?? apiRoom.name ?? "";
    const floorName = apiRoom.floorName ?? apiRoom.floor_name ?? apiRoom.floor?.name ?? "";
    const floorNumber =
        Number.parseInt(String(floorName).replace(/\D/g, ""), 10) ||
        Number.parseInt(String(rawCode).replace(/\D/g, "").slice(0, 1), 10) ||
        1;
    const status = normalizeStatus(apiRoom.currentStatus ?? apiRoom.current_status ?? apiRoom.status);
    const maxOccupants = Number(apiRoom.maxOccupants ?? apiRoom.max_occupants ?? 3);
    const currentOccupants = Number(apiRoom.currentOccupants ?? apiRoom.current_occupants ?? (status === "OCCUPIED" || status === "EXPIRED" ? Math.min(maxOccupants, 2) : 0));
    const firstImage =
        apiRoom.firstImageUrl ??
        apiRoom.first_image_url ??
        apiRoom.imageUrl ??
        apiRoom.images?.[0]?.url ??
        apiRoom.images?.[0] ??
        "";
    const badges = [];

    if (status === "RESERVED") badges.push("Đã có cọc");
    if (apiRoom.hasPendingApplication || apiRoom.has_pending_application) badges.push("Có đơn chờ");
    if (apiRoom.hasDebt || apiRoom.has_debt) badges.push("Nợ");

    return {
        id: apiRoom.id ? `api-${apiRoom.id}` : `api-${rawCode}`,
        roomId: apiRoom.id ?? null,
        roomCode: String(rawCode),
        displayCode: formatRoomCode(rawCode),
        name: apiRoom.name ?? `Phòng ${rawCode}`,
        floorNumber,
        floorName: floorName || `Tầng ${floorNumber}`,
        area: Number(apiRoom.areaM2 ?? apiRoom.area_m2 ?? apiRoom.area ?? 0),
        listedPrice: Number(apiRoom.listedPrice ?? apiRoom.listed_price ?? apiRoom.price ?? 0),
        currentOccupants,
        maxOccupants,
        status,
        badges,
        note: apiRoom.publicNote ?? apiRoom.public_note ?? "",
        image: firstImage,
        buildingName: apiRoom.propertyName ?? apiRoom.property_name ?? "Hải Đăng House",
        buildingId: apiRoom.propertyId ?? apiRoom.property_id ?? "hai-dang-house",
    };
}

function getRoomDetailHref(room) {
    const buildingId = encodeURIComponent(room.buildingId || "hai-dang-house");
    const roomCode = encodeURIComponent(room.roomCode || room.displayCode);
    return `/rooms/${buildingId}/${roomCode}`;
}

function FloorTabs({activeFloor, onChange}) {
    return (
        <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white/10 p-1 no-scrollbar">
            {floorTabs.map((floor) => (
                <button
                    key={floor.id}
                    type="button"
                    onClick={() => onChange(floor.id)}
                    className={`h-11 shrink-0 rounded-xl px-5 text-sm font-bold transition ${
                        activeFloor === floor.id
                            ? "bg-white text-[#091426] shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                            : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    {floor.label}
                </button>
            ))}
        </div>
    );
}

function FloorSummary({rooms}) {
    const stats = useMemo(() => {
        const count = (status) => rooms.filter((room) => room.status === status).length;

        return [
            {label: "Tổng phòng", value: rooms.length, tone: "bg-white text-[#091426]", icon: Home},
            {label: "Phòng trống", value: count("VACANT"), tone: "bg-emerald-50 text-emerald-700", icon: BedDouble},
            {label: "Đang thuê", value: count("OCCUPIED"), tone: "bg-blue-50 text-blue-700", icon: UserRound},
            {label: "Đang đặt cọc", value: count("RESERVED"), tone: "bg-amber-50 text-amber-700", icon: CalendarClock},
            {label: "Bảo trì", value: count("MAINTENANCE"), tone: "bg-red-50 text-red-700", icon: Wrench},
        ];
    }, [rooms]);

    return (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {stats.map(({label, value, tone, icon: Icon}) => (
                <article
                    key={label}
                    className={`flex min-h-[104px] flex-col justify-between rounded-2xl border border-white/70 px-5 py-4 shadow-[0_16px_40px_rgba(6,16,32,0.14)] ${tone}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[11px] font-bold uppercase">{label}</p>
                        <Icon className="h-4 w-4 shrink-0"/>
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
                    <span key={status} className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
                        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`}/>
                        {meta.label}
                    </span>
                );
            })}
        </div>
    );
}

function RoomCard({room, isSelected, onClick}) {
    const meta = mapStatusToColor(room.status);

    return (
        <button
            type="button"
            onClick={() => onClick(room)}
            aria-label={`Mở thông tin ${room.displayCode}`}
            className={`group flex h-32 min-w-0 flex-col justify-between rounded-2xl border p-4 text-left shadow-[0_14px_28px_rgba(6,16,32,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(6,16,32,0.16)] ${
                meta.card
            } ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-[#091426]" : ""}`}
        >
            <div className="flex min-w-0 items-start justify-between gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 ${meta.icon}`}>
                    <BedDouble className="h-5 w-5"/>
                </span>
                <span className={`max-w-[112px] truncate rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${meta.badge}`}>
                    {meta.label}
                </span>
            </div>
            <div className="min-w-0">
                <p className="truncate text-2xl font-black leading-7">{room.displayCode}</p>
                <p className="mt-1 truncate text-xs font-bold opacity-70">{formatMoney(room.listedPrice || 0)}/tháng</p>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs font-bold opacity-80">
                <span className="truncate">{room.area || "--"} m²</span>
                <span className="shrink-0">{room.currentOccupants}/{room.maxOccupants}</span>
            </div>
        </button>
    );
}

function RoomGrid({rooms, selectedRoom, onRoomClick}) {
    if (rooms.length === 0) {
        return (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
                <BedDouble className="h-9 w-9 text-slate-400"/>
                <p className="mt-4 text-sm font-bold text-white">Chưa có phòng ở tầng này</p>
                <p className="mt-1 max-w-md text-sm text-slate-400">Kiểm tra lại dữ liệu tầng hoặc đồng bộ danh sách phòng từ backend.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {rooms.map((room) => (
                <RoomCard
                    key={room.id}
                    room={room}
                    isSelected={selectedRoom?.id === room.id}
                    onClick={onRoomClick}
                />
            ))}
        </div>
    );
}

function RoomDetailDrawer({room, tenantList, activeRole, onClose}) {
    const [roomDetail, setRoomDetail] = useState(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const tenant = room ? tenantList.find((item) => item.roomId === room.displayCode || item.roomId === room.roomCode) : null;
    const meta = room ? mapStatusToColor(room.status) : STATUS_META.OCCUPIED;
    const canCreateMaintenance = activeRole === "owner" || activeRole === "manager";

    useEffect(() => {
        let isMounted = true;

        async function fetchRoomDetail() {
            if (!room?.roomId) {
                setRoomDetail(null);
                return;
            }

            try {
                setIsDetailLoading(true);
                const data = await authenticatedFetch(`/rooms/id/${room.roomId}`, {method: "GET"});
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

    if (!room) return null;

    const detail = {
        name: roomDetail?.name ?? room.name,
        area: roomDetail?.areaM2 ?? room.area,
        price: roomDetail?.listedPrice ?? room.listedPrice,
        maxOccupants: roomDetail?.maxOccupants ?? room.maxOccupants,
        note: roomDetail?.publicNote ?? room.note,
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-[#020817]/70 backdrop-blur-sm" onClick={onClose}/>
            <aside
                className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden bg-[#f2f4f6] shadow-2xl sm:max-w-[430px]"
                role="dialog"
                aria-modal="true"
                aria-label={`Chi tiết ${room.displayCode}`}
            >
                <div className="relative h-56 shrink-0 overflow-hidden bg-[#091426]">
                    {room.image ? (
                        <div
                            role="img"
                            aria-label={detail.name}
                            className="h-full w-full bg-cover bg-center"
                            style={{backgroundImage: `url(${room.image})`}}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[#15233a] text-slate-400">
                            <ImageIcon className="h-12 w-12"/>
                        </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#091426] to-transparent p-5">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase text-white/80">
                            <Home className="h-4 w-4"/>
                            {room.buildingName}
                        </p>
                        <h2 className="mt-1 truncate text-3xl font-black text-white">{detail.name}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-[#091426] shadow-lg hover:bg-white"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="rounded-3xl border border-white bg-white p-5 shadow-[0_16px_40px_rgba(6,16,32,0.08)]">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#6b7280]">Mã phòng</p>
                                <p className="truncate text-3xl font-black text-[#091426]">{room.displayCode}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${meta.badge}`}>
                                {meta.label}
                            </span>
                        </div>

                        {isDetailLoading ? (
                            <div className="mt-5 grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map((item) => (
                                    <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100"/>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-5 grid grid-cols-2 gap-3">
                                {[
                                    {label: "Giá thuê", value: `${formatMoney(detail.price || 0)}/tháng`},
                                    {label: "Diện tích", value: `${detail.area || "--"} m²`},
                                    {label: "Tầng", value: room.floorName},
                                    {label: "Số người", value: `${room.currentOccupants}/${detail.maxOccupants}`},
                                ].map(({label, value}) => (
                                    <div key={label} className="min-w-0 rounded-2xl bg-[#f7f9fb] p-4">
                                        <p className="truncate text-[10px] font-black uppercase text-[#6b7280]">{label}</p>
                                        <p className="mt-1 truncate text-sm font-black text-[#091426]">{value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {room.badges.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                {room.badges.map((badge) => (
                                    <span key={badge} className="rounded-full bg-[#edf2f7] px-3 py-1 text-xs font-black text-[#334155]">
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-4">
                            <p className="text-[10px] font-black uppercase text-[#6b7280]">Ghi chú</p>
                            <p className="mt-1 text-sm font-semibold leading-6 text-[#334155]">{detail.note || "Chưa có ghi chú cho phòng này."}</p>
                        </div>

                        {tenant && (
                            <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                                <p className="text-[10px] font-black uppercase text-blue-700">Khách đang ở</p>
                                <p className="mt-1 truncate text-sm font-black text-blue-950">{tenant.name}</p>
                                <p className="mt-0.5 truncate text-xs font-semibold text-blue-800">{tenant.phone}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 border-t border-[#dfe5ee] bg-white p-5">
                    <Link
                        href={getRoomDetailHref(room)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#091426] px-4 text-sm font-black text-white hover:bg-[#16253a]"
                    >
                        <Eye className="h-4 w-4"/>
                        Xem chi tiết
                    </Link>
                    {room.status === "VACANT" && (
                        <button
                            type="button"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d7deea] bg-white px-4 text-sm font-black text-[#091426] hover:bg-[#f7f9fb]"
                        >
                            <CalendarClock className="h-4 w-4"/>
                            Đặt lịch xem phòng
                        </button>
                    )}
                    {canCreateMaintenance && (
                        <button
                            type="button"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d7deea] bg-white px-4 text-sm font-black text-[#091426] hover:bg-[#f7f9fb]"
                        >
                            <Wrench className="h-4 w-4"/>
                            Tạo phiếu bảo trì
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
}

function FloorPlanPage({tenantList = [], activeRole = "owner"}) {
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sourceWarning, setSourceWarning] = useState("");
    const [activeFloor, setActiveFloor] = useState(1);
    const [selectedRoom, setSelectedRoom] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchFloorPlanRooms() {
            try {
                setIsLoading(true);
                setSourceWarning("");
                const data = await authenticatedFetch("/rooms?propertyId=1&size=200");
                const normalizedRooms = readPageRows(data)
                    .map(normalizeApiFloorPlanRoom)
                    .sort((a, b) => Number(a.roomCode) - Number(b.roomCode));

                if (isMounted) {
                    setRooms(normalizedRooms);
                }
            } catch {
                if (isMounted) {
                    setRooms(mockFloorPlanData);
                    setSourceWarning("Không thể tải dữ liệu từ API /rooms, đang hiển thị dữ liệu mẫu tạm thời.");
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchFloorPlanRooms();

        return () => {
            isMounted = false;
        };
    }, []);

    const activeFloorRooms = useMemo(
        () => rooms.filter((room) => room.floorNumber === activeFloor),
        [activeFloor, rooms],
    );

    function handleFloorChange(floor) {
        setActiveFloor(floor);
        setSelectedRoom(null);
    }

    function handleRoomClick(room) {
        setSelectedRoom(room);
    }

    return (
        <section className="overflow-hidden rounded-[28px] bg-[#091426] p-4 shadow-[0_24px_80px_rgba(3,10,24,0.28)] sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-slate-400">Hải Đăng House</p>
                    <h2 className="mt-2 text-3xl font-black text-white">Sơ đồ phòng</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                        Theo dõi nhanh trạng thái, giá thuê và sức chứa từng phòng theo tầng.
                    </p>
                </div>
                <FloorTabs activeFloor={activeFloor} onChange={handleFloorChange}/>
            </div>

            {sourceWarning && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-semibold text-amber-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>
                    <span>{sourceWarning}</span>
                </div>
            )}

            {isLoading ? (
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {Array.from({length: 8}, (_, index) => (
                        <div key={index} className="h-32 animate-pulse rounded-2xl bg-white/10"/>
                    ))}
                </div>
            ) : (
                <div className="mt-6 space-y-5">
                    <FloorSummary rooms={activeFloorRooms}/>

                    <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 sm:p-5">
                        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-black text-white">Tầng {activeFloor}</p>
                                <p className="text-xs font-semibold text-slate-400">{activeFloorRooms.length} phòng đang hiển thị</p>
                            </div>
                            <StatusLegend/>
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
                    room={selectedRoom}
                    tenantList={tenantList}
                    activeRole={activeRole}
                    onClose={() => setSelectedRoom(null)}
                />
            )}
        </section>
    );
}

function RoomsListPage({query}) {
    const [exportPrompt, setExportPrompt] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const pageSize = 10;
    const [apiRooms, setApiRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [activeFloor, setActiveFloor] = useState(2);
    const [selectedRoom, setSelectedRoom] = useState(null);


    useEffect(() => {
        const fetchStaffRooms = async () => {
            try {
                setIsLoading(true);
                const data = await authenticatedFetch(`/rooms?page=${page}&size=${pageSize}`);
                console.log(data);
                setApiRooms(data?.data ?? []);
                setTotalPages(data?.total_pages ?? 1);
                setTotalElements(data?.total_elements ?? 0);
                setIsSuccess(true);
            } catch (error) {
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStaffRooms();
    }, [page]);
    const filteredRooms = apiRooms.filter((room) => {
        if (!query?.trim()) return true;
        const q = query.trim().toLowerCase();
        return room.id.toLowerCase().includes(q) || room.floor.toLowerCase().includes(q);
    });

    // Export to CSV
    const exportRooms = () => {
        const rows = ["Ma phong,Tang,Dien tich,Gia niem yet,Trang thai"];
        filteredRooms.forEach((room) => {
            rows.push(
                [room.id, room.floor, `${room.area} m2`, room.listedPrice, statusCopy(room.status)].join(",")
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
                    className="ml-auto rounded-lg border border-[#e2e8f0] p-2 text-[#505f76] hover:border-[#091426]"
                >
                    <Download className="h-4 w-4"/>
                </button>
                <button
                    type="button"
                    className="rounded-lg border border-[#e2e8f0] p-2 text-[#505f76] hover:border-[#091426]"
                >
                    <Grid3X3 className="h-4 w-4"/>
                </button>
            </FilterBar>

            {isLoading && (
                <div className="py-10 text-center font-bold text-[#505f76]">Đang tải danh sách phòng...</div>
            )}
            {isError && (
                <div
                    className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                    Không thể tải dữ liệu phòng. Vui lòng thử lại.
                </div>
            )}

            {!isLoading && !isError && (
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
                            {filteredRooms.map((room) => (
                                <tr key={room.room_code} className="border-t border-[#e2e8f0]">
                                    <td className="px-6 py-4 text-sm font-bold text-[#091426]">{room.room_code}</td>
                                    <td className="px-6 py-4">
                      <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-[#3c475a]">
                        Dành cho {room.max_occupants} người ở
                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#45474c]">{room.floor_name}</td>
                                    <td className="px-6 py-4 text-sm text-[#45474c]">{room.area_m2} m²</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-[#091426]">
                                        {formatMoney(room.listed_price)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge value={room.current_status} map={roomStatus}/>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-1">
                                            <IconButton label={`Xem ${room.id}`} icon={Eye}/>
                                            <IconButton label={`Sửa ${room.id}`} icon={Edit3}/>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredRooms.length === 0 && (
                                <tr>
                                    <td colSpan={7}
                                        className="px-6 py-10 text-center text-sm font-semibold text-[#6b7280]">
                                        Không có phòng nào phù hợp.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                    <div
                        className="flex items-center justify-between border-t border-[#e2e8f0] px-6 py-4 text-sm text-[#505f76]">
            <span>
              Hiển thị {filteredRooms.length} trên {totalElements} phòng
            </span>
                        <div className="flex gap-2">
                            {Array.from({length: totalPages}, (_, i) => i + 1).map((pageNum) => (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`rounded px-3 py-1 ${
                                        pageNum === page
                                            ? "bg-[#d8e3fb] text-[#111c2d]"
                                            : "border border-[#e2e8f0] hover:bg-[#f2f4f6]"
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            ))}
                        </div>
                    </div>
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
        </>
    );
}

export function RoomsManagementContent({initialView = "floor-map", query = "", activeRole = "owner"}) {
    const [view, setView] = useState(initialView);

    return (
        <section className="grid gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#191c1e]">Quản lý Phòng & Tầng</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">
                        Theo dõi mặt bằng từng tầng và danh sách phòng trong cùng một khu vực quản trị.
                    </p>
                </div>
                <div
                    className="inline-flex w-full rounded-lg border border-[#e2e8f0] bg-white p-1 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:w-auto">
                    {views.map((item) => {
                        const Icon = item.icon;
                        const isActive = view === item.value;

                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => setView(item.value)}
                                className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition sm:flex-none ${isActive
                                    ? "bg-[#091426] text-white shadow-sm"
                                    : "text-[#505f76] hover:bg-[#f2f4f6] hover:text-[#091426]"
                                }`}
                            >
                                <Icon className="h-4 w-4"/>
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {view === "floor-map" ? <FloorPlanPage tenantList={tenants} activeRole={activeRole}/> : <RoomsListPage query={query}/>}
        </section>
    );
}

export default function RoomsPage() {
    const {query, activeRole} = useDashboardLayout();

    return <RoomsManagementContent query={query} activeRole={activeRole}/>;
}
