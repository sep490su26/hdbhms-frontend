"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
    fetchBatchMeterReadingsStatus,
    saveProgressiveRoomReading,
    confirmBatch
} from "@/services/meterReadingService";
import { toast } from "sonner";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Breadcrumb, BreadcrumbList } from "@/components/ui/breadcrumb";
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
    AlertTriangle,
    ArrowRight,
    Camera,
    CheckCircle2,
    CircleDashed,
    ClipboardCheck,
    Droplets,
    Edit3,
    Home,
    ImageIcon,
    Info,
    Loader2,
    RefreshCw,
    Save,
    Search,
    UploadCloud,
    X,
    Zap,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoGallery } from "../../../../components/image-gallery";
import CameraCapture from "@/components/CameraCapture";
import Image from "next/image";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";

const SAMPLE_PHOTOS = [
    {
        id: "1",
        src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80",
        thumb: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=70",
        alt: "Hồ Yosemite",
        label: "Hồ Yosemite",
        caption: "California, USA",
    },
    {
        id: "2",
        src: "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1200&q=80",
        thumb: "https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=400&q=70",
        alt: "Bình minh trên biển",
        label: "Bình minh trên biển",
    },
    {
        id: "3",
        src: "https://images.unsplash.com/photo-1540206395-68808572332f?w=1200&q=80",
        thumb: "https://images.unsplash.com/photo-1540206395-68808572332f?w=400&q=70",
        alt: "Dãy núi tuyết",
        label: "Dãy núi tuyết",
        caption: "Alps, Switzerland",
    },
    {
        id: "4",
        src: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80",
        thumb: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=70",
        alt: "Thành phố đêm",
        label: "Thành phố đêm",
    },
    {
        id: "5",
        src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80",
        thumb: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=70",
        alt: "Rừng mùa thu",
        label: "Rừng mùa thu",
    },
    {
        id: "6",
        src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80",
        thumb: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=70",
        alt: "Đường mòn rừng",
        label: "Đường mòn rừng",
        caption: "Pacific Trail",
    },
];


const MOCK_PHOTOS = [
    {
        id: 1,
        src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&q=80",
        alt: "Đồng hồ điện 1",
        label: "Đồng hồ điện"
    },
    {
        id: 2,
        src: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&q=80",
        alt: "Đồng hồ nước 1",
        label: "Đồng hồ nước"
    },
    {
        id: 3,
        src: "https://images.unsplash.com/photo-1542382257-80da9fb9f5c2?w=500&q=80",
        alt: "Phòng tổng quan",
        label: "Tổng quan"
    },
];

const STATUS_CONFIG = {
    synced: { label: "Đã lưu", color: "text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-500" },
    local: { label: "Chưa đồng bộ", color: "text-orange-500 dark:text-orange-300", dot: "bg-orange-400" },
    error: { label: "Lỗi chỉ số", color: "text-red-500 dark:text-rose-300", dot: "bg-red-500" },
    pending: { label: "Chưa nhập", color: "text-slate-500 dark:text-slate-400", dot: "bg-gray-300" },
};


function getPeriodParts(value) {
    const text = String(value || "").trim();
    const canonical = text.match(/^(\d{4})-(\d{1,2})$/);
    if (canonical) return { year: canonical[1], month: canonical[2].padStart(2, "0") };

    const legacy = text.match(/^(\d{1,2})\/(\d{4})$/);
    if (legacy) return { year: legacy[2], month: legacy[1].padStart(2, "0") };

    return null;
}

function formatPeriodLabel(value) {
    const parts = getPeriodParts(value);
    return parts ? `Kỳ ${parts.month}/${parts.year}` : "Kỳ hiện tại";
}

function formatPeriodRange(value) {
    const parts = getPeriodParts(value);
    if (!parts) return "Theo kỳ ghi chỉ số hiện tại";

    const lastDay = new Date(Number(parts.year), Number(parts.month), 0).getDate();
    return `01/${parts.month}/${parts.year} - ${String(lastDay).padStart(2, "0")}/${parts.month}/${parts.year}`;
}

function readField(source, ...keys) {
    return keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null);
}

function numberOrNull(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function numberOrZero(value) {
    return numberOrNull(value) ?? 0;
}

function normalizePropertyId(value) {
    const text = String(value || "").trim();
    return /^\d+$/.test(text) ? text : "";
}

function getMeterReadingsHref(propertyId, context = {}) {
    const params = new URLSearchParams();
    const normalizedPropertyId = normalizePropertyId(propertyId);
    if (normalizedPropertyId) params.set("propertyId", normalizedPropertyId);
    if (context.from) params.set("from", context.from);
    if (context.facilityName) params.set("facilityName", context.facilityName);
    const query = params.toString();
    return `/dashboard/meter-readings${query ? `?${query}` : ""}`;
}

function MeterPhoto({ src }) {
    return (
        <div
            className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group">
            {src ? (
                <Image src={src} alt="thumbnail" fill sizes="40px" className="object-cover" unoptimized />
            ) : (
                <ImageIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
    );
}

export default function MeterReadings() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("pending");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [editingCell, setEditingCell] = useState(null); // { roomId, field }
    const [focusRoomId, setFocusRoomId] = useState(null);
    const [batchId, setBatchId] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [capturedPhotos, setCapturedPhotos] = useState({}); // { roomId: { file, previewUrl } }

    const searchParams = useSearchParams();
    const queryPeriod = searchParams.get("period") || "";
    const propertyId =
        normalizePropertyId(searchParams.get("propertyId") || searchParams.get("facilityId")) || "1";
    const fromFacilities = searchParams.get("from") === "facilities";
    const facilityName = searchParams.get("facilityName") || "";
    const meterReadingsHref = getMeterReadingsHref(propertyId, {
        from: fromFacilities ? "facilities" : "",
        facilityName,
    });
    const [period, setPeriod] = useState(queryPeriod); // Default to current month backend

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchBatchMeterReadingsStatus(period, propertyId);
            if (res) {
                const fetchedBatchId = res.batchId || res.batch_id;
                if (fetchedBatchId) setBatchId(fetchedBatchId);
                if (res.rooms) {
                    const mappedRooms = res.rooms.map((r, index) => {
                        const roomId = readField(r, "roomId", "room_id");
                        const roomCode = readField(r, "roomCode", "room_code");
                        const syncTime = readField(r, "syncTime", "sync_time");

                        return {
                            id: roomCode || (roomId ? `room-${roomId}` : `room-${index}`),
                            roomId,
                            elecPrev: numberOrZero(readField(r, "electricityPrevious", "electricity_previous")),
                            elecCurr: numberOrNull(readField(r, "electricityCurrent", "electricity_current")),
                            waterPrev: numberOrZero(readField(r, "waterPrevious", "water_previous")),
                            waterCurr: numberOrNull(readField(r, "waterCurrent", "water_current")),
                            status: readField(r, "status") || "pending",
                            syncTime: syncTime ? new Date(syncTime).toLocaleString() : null,
                            photos: numberOrZero(readField(r, "photosCount", "photos_count")),
                        };
                    });
                    setRooms(mappedRooms);
                }
            }
        } catch (error) {
            toast.error("Lỗi khi tải dữ liệu");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [period, propertyId]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadData();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadData]);

    useEffect(() => {
        if (focusRoomId) {
            document.documentElement.classList.add("overflow-hidden");
            document.body.classList.add("overflow-hidden");
        } else {
            document.documentElement.classList.remove("overflow-hidden");
            document.body.classList.remove("overflow-hidden");
        }
        return () => {
            document.documentElement.classList.remove("overflow-hidden");
            document.body.classList.remove("overflow-hidden");
        };
    }, [focusRoomId]);

    // handleSaveBatch removed

    const handleSaveAll = async () => {
        if (!batchId) {
            toast.error("Không tìm thấy kỳ ghi chỉ số");
            return;
        }

        setSaving(true);
        try {
            await confirmBatch(batchId);
            toast.success("Lưu tất cả thành công");
            loadData();
        } catch (error) {
            toast.error("Lỗi khi lưu dữ liệu");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const completed = rooms.filter((r) => r.status === "synced").length;
    const pending = rooms.filter((r) => r.status === "pending" || !r.status).length;
    const unsynced = rooms.filter((r) => r.status === "local").length;
    const errors = rooms.filter((r) => r.status === "error").length;
    const total = rooms.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    const handleCurrChange = (roomId, field, val) => {
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;

        const numVal = val === "" ? null : Number(val);

        // Validation: new reading must be >= old reading
        if (field === "elecCurr" && numVal !== null && room.elecPrev !== null) {
            if (numVal < room.elecPrev) {
                toast.error("Chỉ số điện mới không được nhỏ hơn chỉ số cũ");
                return;
            }
        }
        if (field === "waterCurr" && numVal !== null && room.waterPrev !== null) {
            if (numVal < room.waterPrev) {
                toast.error("Chỉ số nước mới không được nhỏ hơn chỉ số cũ");
                return;
            }
        }

        // Validation: old reading must be >= 0
        if (field === "elecPrev" && numVal !== null && numVal < 0) {
            toast.error("Chỉ số điện cũ không được âm");
            return;
        }
        if (field === "waterPrev" && numVal !== null && numVal < 0) {
            toast.error("Chỉ số nước cũ không được âm");
            return;
        }

        setRooms((prev) =>
            prev.map((r) =>
                r.id === roomId ? { ...r, [field]: numVal } : r
            )
        );
    };

    const handleSaveAndNext = async () => {
        const room = rooms.find(r => r.id === focusRoomId);
        if (!room) return;

        if (room.elecCurr === null && room.waterCurr === null) {
            toast.error("Vui lòng nhập ít nhất một chỉ số");
            return;
        }

        if ((room.elecCurr !== null && room.elecCurr < room.elecPrev) ||
            (room.waterCurr !== null && room.waterCurr < room.waterPrev)) {
            toast.error("Chỉ số mới không được nhỏ hơn chỉ số cũ");
            return;
        }

        if (!batchId) {
            toast.error("Không tìm thấy kỳ ghi chỉ số");
            return;
        }

        try {
            await saveProgressiveRoomReading(batchId, room.roomId, {
                electricityValue: room.elecCurr,
                waterValue: room.waterCurr,
                electricityPhotoId: null,
                waterPhotoId: null
            });

            // local update status
            setRooms(prev => prev.map(r => r.id === focusRoomId ? { ...r, status: "synced" } : r));

            const focusIndex = filtered.findIndex(r => r.id === focusRoomId);
            if (focusIndex >= 0 && focusIndex < filtered.length - 1) {
                setFocusRoomId(filtered[focusIndex + 1].id);
            } else {
                setFocusRoomId(null);
                loadData();
            }
        } catch (error) {
            toast.error("Lỗi khi lưu phòng này");
            console.error(error);
        }
    };

    const tabs = [
        { id: "pending", label: `Chưa nhập (${pending})` },
        { id: "error", label: `Lỗi (${errors})` },
        { id: "completed", label: `Đã hoàn thành (${completed})` },
        { id: "unsynced", label: `Chưa lưu (${unsynced})` },
        { id: "all", label: `Tất cả (${total})` }
    ];

    const filtered = rooms.filter((r) => {
        const matchesSearch = (r.id || "").toLowerCase().includes((search || "").toLowerCase());
        const isPending = r.status === "pending" || !r.status;
        const matchesTab =
            activeTab === "all" ? true :
                activeTab === "pending" ? isPending :
                    activeTab === "completed" ? r.status === "synced" :
                        activeTab === "unsynced" ? r.status === "local" :
                            activeTab === "error" ? r.status === "error" : true;

        return matchesSearch && matchesTab;
    });

    const groupedByFloor = filtered.reduce((acc, room) => {
        const match = room.id ? room.id.match(/\d+/) : null;
        let floorStr = "1";
        if (match) {
            const numStr = match[0];
            floorStr = numStr.length >= 3 ? numStr.substring(0, numStr.length - 2) : "1";
        }
        const floor = "Tầng " + floorStr;
        if (!acc[floor]) acc[floor] = [];
        acc[floor].push(room);
        return acc;
    }, {});
    const defaultAccordionValues = Object.keys(groupedByFloor);

    return (
        <div className="w-full min-w-0 overflow-x-hidden font-sans">
            <Breadcrumb>
                <BreadcrumbList>
                    {fromFacilities ? (
                        <>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard/facilities">Quản lý cơ sở</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            {facilityName ? (
                                <>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href={meterReadingsHref}>{facilityName}</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                </>
                            ) : null}
                        </>
                    ) : null}
                    <BreadcrumbItem>
                        <BreadcrumbLink href={meterReadingsHref}>Quản lý điện nước</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Nhập điện nước</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Header */}
            <div className="mb-4 mt-2">
                <DashboardPageHeader
                    title={
                        <span className="flex items-center gap-3">
                            Nhập chỉ số điện nước - {formatPeriodLabel(period)}
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                <CircleDashed className="h-3.5 w-3.5" />
                                Đang nhập
                            </span>
                        </span>
                    }
                    description={formatPeriodRange(period)}
                    actions={
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                            {(pending > 0 || errors > 0) ? (
                                <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300">
                                    <AlertTriangle className="h-4 w-4" />
                                    {pending + errors} phòng chưa hoàn thành. Chưa thể chốt kỳ.
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Đã đủ điều kiện chốt kỳ
                                </span>
                            )}
                            <Button
                                onClick={() => {
                                    const firstPending = filtered.find(r => r.status === "pending" || !r.status);
                                    if (firstPending) {
                                        setFocusRoomId(firstPending.id);
                                    } else if (filtered.length > 0) {
                                        setFocusRoomId(filtered[0].id);
                                    }
                                }}
                                variant={"default"}
                                className="flex items-center gap-2 border bg-white dark:bg-[#0f172a] hover:bg-gray-50 dark:hover:bg-white/5 text-slate-800 dark:text-slate-100 border-gray-200 dark:border-white/10 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                                <Edit3 className="h-4 w-4" />
                                Bắt đầu nhập
                            </Button>
                            <Button
                                onClick={handleSaveAll}
                                disabled={saving || loading || (pending > 0 || errors > 0)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? "Đang lưu..." : "Lưu tất cả"}
                            </Button>
                        </div>
                    }
                />
            </div>

            {/* Stat cards */}
            <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <DashboardStatCard icon={Home} label="Tổng số phòng" value={total} tone="blue" subtitle="Trong kỳ ghi chỉ số" />
                <DashboardStatCard icon={CheckCircle2} label="Đã nhập" value={completed} tone="emerald" subtitle={`${total > 0 ? Math.round((completed / total) * 100) : 0}% hoàn thành`} />
                <DashboardStatCard icon={CircleDashed} label="Chưa nhập" value={pending} tone="orange" subtitle={`${total > 0 ? Math.round((pending / total) * 100) : 0}% còn lại`} />
                <DashboardStatCard icon={UploadCloud} label="Chưa đồng bộ" value={unsynced} tone="amber" subtitle="Thay đổi đang chờ lưu" />
                <DashboardStatCard icon={RefreshCw} label="Cập nhật" value="Vừa tải" tone="slate" subtitle="Theo dữ liệu backend" />
            </div>

            {/* Overall progress */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tiến độ nhập</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{completed} / {total} phòng đã nhập</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Tabs + search */}
            <div className="flex w-full min-w-0 flex-col items-start justify-between gap-4 mb-4 md:flex-row md:items-center">
                <div
                    className="flex flex-wrap items-center gap-1 md:gap-0 w-full md:w-auto pb-1 md:pb-0 border-b md:border-none border-gray-100 dark:border-white/10">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-600 text-blue-600 dark:text-blue-300" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex w-full min-w-0 items-center gap-2 md:w-auto">
                    <div className="relative w-full min-w-0 md:w-auto">
                        <Search className={"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4"} />
                        <input
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-[#0f172a] dark:text-white md:w-64"
                            placeholder="Tìm phòng..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="mb-4">
                {defaultAccordionValues.length > 0 && (
                    <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full space-y-4">
                    {Object.entries(groupedByFloor).map(([floor, floorRooms]) => (
                        <AccordionItem key={floor} value={floor}
                            className="rounded-lg border border-gray-200 bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
                            <AccordionTrigger
                                className="px-5 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{floor}</h3>
                                    <span
                                        className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{floorRooms.length} phòng</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-0">
                                {/* Desktop Table View */}
                                <div className="hidden md:block w-full overflow-x-auto pb-4">
                                    <Table className="w-full text-sm min-w-[900px]">
                                        <TableHeader>
                                            <TableRow className="bg-gray-50 dark:bg-[#020817] border-y border-gray-200 dark:border-white/10">
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 w-16"
                                                >Phòng
                                                </TableHead>
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 border-b border-gray-100 dark:border-white/10"
                                                >Điện (kWh)
                                                </TableHead>
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 border-b border-gray-100 dark:border-white/10 border-l border-gray-200 dark:border-white/10"
                                                >Nước (m³)
                                                </TableHead>
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 border-l border-gray-200 dark:border-white/10"
                                                >Ảnh
                                                </TableHead>
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 border-l border-gray-200 dark:border-white/10"
                                                >
                                                    <span className="flex items-center gap-1">
                                                        Trạng thái
                                                        <Info className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                                    </span>
                                                </TableHead>
                                                <TableHead
                                                    className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 border-l border-gray-200 dark:border-white/10"
                                                >Thao tác
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {floorRooms.map((room) => {
                                                const elecUsage = room.elecCurr !== null ? room.elecCurr - room.elecPrev : null;
                                                const waterUsage = room.waterCurr !== null ? room.waterCurr - room.waterPrev : null;
                                                const isElecError = elecUsage !== null && elecUsage < 0;
                                                const isWaterError = waterUsage !== null && waterUsage < 0;
                                                const st = STATUS_CONFIG[room.status] || STATUS_CONFIG.pending;

                                                return (
                                                    <TableRow key={room.id}
                                                        className="border-b border-gray-100 dark:border-white/10 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                        <TableCell
                                                            className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{room.id}</TableCell>

                                                        {/* Electricity Compact */}
                                                        <TableCell className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="text-slate-500 dark:text-slate-400 w-12 text-right">{room.elecPrev.toLocaleString()}</span>
                                                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className={`w-20 text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isElecError ? "border-red-400 bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-300 focus:ring-red-100" : "border-gray-200 dark:border-white/10 focus:ring-blue-100 text-slate-800 dark:text-slate-100"}`}
                                                                    value={room.elecCurr ?? ""}
                                                                    onChange={(e) => handleCurrChange(room.id, "elecCurr", e.target.value)}
                                                                    placeholder="—"
                                                                />
                                                                <span
                                                                    className={`w-14 text-left font-semibold text-xs ${elecUsage === null ? "text-gray-300" : elecUsage < 0 ? "text-red-500 dark:text-rose-300" : elecUsage === 0 ? "text-slate-400 dark:text-slate-500" : "text-green-500 dark:text-green-300"}`}>
                                                                    {elecUsage === null ? "" : elecUsage < 0 ? `(${elecUsage})` : `(+${elecUsage})`}
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Water Compact */}
                                                        <TableCell className="px-4 py-3 border-l border-gray-100 dark:border-white/10">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="text-slate-500 dark:text-slate-400 w-10 text-right">{room.waterPrev}</span>
                                                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className={`w-16 text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isWaterError ? "border-red-400 bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-300 focus:ring-red-100" : "border-gray-200 dark:border-white/10 focus:ring-blue-100 text-slate-800 dark:text-slate-100"}`}
                                                                    value={room.waterCurr ?? ""}
                                                                    onChange={(e) => handleCurrChange(room.id, "waterCurr", e.target.value)}
                                                                    placeholder="—"
                                                                />
                                                                <span
                                                                    className={`w-12 text-left font-semibold text-xs ${waterUsage === null ? "text-gray-300" : waterUsage < 0 ? "text-red-500 dark:text-rose-300" : waterUsage === 0 ? "text-slate-400 dark:text-slate-500" : "text-green-500 dark:text-green-300"}`}>
                                                                    {waterUsage === null ? "" : waterUsage < 0 ? `(${waterUsage})` : `(+${waterUsage})`}
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Photos */}
                                                        <TableCell className="px-4 py-3 border-l border-gray-100 dark:border-white/10">
                                                            <PhotoGallery
                                                                photos={MOCK_PHOTOS.slice(0, room.photos)}
                                                                renderTrigger={(openPhoto) => (
                                                                    <div
                                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${room.photos > 0 ? "bg-white dark:bg-[#0f172a] border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer shadow-sm" : "bg-gray-50 dark:bg-[#020817] border-transparent text-slate-400 dark:text-slate-500"}`}
                                                                        onClick={() => room.photos > 0 && openPhoto(0)}
                                                                    >
                                                                        <Camera className="h-4 w-4" />
                                                                        <span
                                                                            className="whitespace-nowrap text-xs font-medium">{room.photos > 0 ? `${room.photos} ảnh` : "Không có"}</span>
                                                                    </div>
                                                                )}
                                                            />
                                                        </TableCell>

                                                        {/* Status */}
                                                        <TableCell className="px-4 py-3 border-l border-gray-100 dark:border-white/10">
                                                            <div className="flex items-start gap-1.5">
                                                                <span
                                                                    className={`w-2 h-2 rounded-full mt-1 shrink-0 ${st.dot}`}></span>
                                                                <div>
                                                                    <p className={`text-sm font-semibold ${st.color}`}>{st.label}</p>
                                                                    {room.syncTime &&
                                                                        <p className="text-xs text-slate-400 dark:text-slate-500">{room.syncTime}</p>}
                                                                    {room.status === "error" &&
                                                                        <p className="text-xs text-red-400">Kiểm tra lại chỉ số</p>}
                                                                    {room.status === "local" &&
                                                                        <p className="text-xs text-slate-400 dark:text-slate-500">Chưa đồng bộ</p>}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Actions */}
                                                        <TableCell
                                                            className="px-4 py-3 border-l border-gray-100 dark:border-white/10 text-center">
                                                            <button
                                                                onClick={() => setFocusRoomId(room.id)}
                                                                className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                                                <Edit3 size={16} />
                                                            </button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Card List View */}
                                <div className="flex flex-col gap-4 p-2 md:hidden w-full overflow-x-auto pb-4">
                                    {floorRooms.map((room) => {
                                        const elecUsage = room.elecCurr !== null ? room.elecCurr - room.elecPrev : null;
                                        const waterUsage = room.waterCurr !== null ? room.waterCurr - room.waterPrev : null;
                                        const isElecError = elecUsage !== null && elecUsage < 0;
                                        const isWaterError = waterUsage !== null && waterUsage < 0;
                                        const st = STATUS_CONFIG[room.status] || STATUS_CONFIG.pending;

                                        return (
                                            <div key={room.id}
                                                className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-sm relative">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">{room.id}</h4>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${st.dot}`}></span>
                                                            <span
                                                                className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                                        <Edit3 size={18} />
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {/* Electricity */}
                                                    <div className="bg-gray-50 dark:bg-[#020817] rounded-lg p-3">
                                                        <div
                                                            className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Điện
                                                            (kWh)
                                                        </div>
                                                        <div
                                                            className="grid grid-cols-3 gap-2 text-sm items-center">
                                                            <div className="flex flex-col">
                                                                <span
                                                                    className="text-xs text-slate-400 dark:text-slate-500">Số cũ</span>
                                                                <span
                                                                    className="font-medium text-slate-700 dark:text-slate-200">{room.elecPrev.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span
                                                                    className="text-xs text-slate-400 dark:text-slate-500 mb-1">Số mới</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className={`w-full max-w-[80px] text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isElecError ? "border-red-400 bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-300 focus:ring-red-100" : "border-gray-200 dark:border-white/10 focus:ring-blue-100 text-slate-800 dark:text-slate-100"}`}
                                                                    value={room.elecCurr ?? ""}
                                                                    onChange={(e) => handleCurrChange(room.id, "elecCurr", e.target.value)}
                                                                    placeholder="—"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-slate-400 dark:text-slate-500">Tiêu thụ</span>
                                                                <span
                                                                    className={`font-semibold ${elecUsage === null ? "text-gray-300" : elecUsage < 0 ? "text-red-500 dark:text-rose-300" : elecUsage === 0 ? "text-slate-400 dark:text-slate-500" : "text-green-500 dark:text-green-300"}`}>
                                                                    {elecUsage === null ? "—" : elecUsage < 0 ? elecUsage : `+${elecUsage}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Water */}
                                                    <div className="bg-gray-50 dark:bg-[#020817] rounded-lg p-3">
                                                        <div
                                                            className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Nước
                                                            (m³)
                                                        </div>
                                                        <div
                                                            className="grid grid-cols-3 gap-2 text-sm items-center">
                                                            <div className="flex flex-col">
                                                                <span
                                                                    className="text-xs text-slate-400 dark:text-slate-500">Số cũ</span>
                                                                <span
                                                                    className="font-medium text-slate-700 dark:text-slate-200">{room.waterPrev}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span
                                                                    className="text-xs text-slate-400 dark:text-slate-500 mb-1">Số mới</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className={`w-full max-w-[80px] text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isWaterError ? "border-red-400 bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-300 focus:ring-red-100" : "border-gray-200 dark:border-white/10 focus:ring-blue-100 text-slate-800 dark:text-slate-100"}`}
                                                                    value={room.waterCurr ?? ""}
                                                                    onChange={(e) => handleCurrChange(room.id, "waterCurr", e.target.value)}
                                                                    placeholder="—"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-slate-400 dark:text-slate-500">Tiêu thụ</span>
                                                                <span
                                                                    className={`font-semibold ${waterUsage === null ? "text-gray-300" : waterUsage < 0 ? "text-red-500 dark:text-rose-300" : waterUsage === 0 ? "text-slate-400 dark:text-slate-500" : "text-green-500 dark:text-green-300"}`}>
                                                                    {waterUsage === null ? "—" : waterUsage}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div
                                                    className="flex justify-between items-end mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
                                                    <div>
                                                        <span
                                                            className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Ảnh</span>
                                                        <PhotoGallery
                                                            photos={MOCK_PHOTOS.slice(0, room.photos)}
                                                            renderTrigger={(openPhoto) => (
                                                                <div
                                                                    className={`flex items-center gap-1 ${room.photos > 0 ? "cursor-pointer" : ""}`}
                                                                    onClick={() => room.photos > 0 && openPhoto(0)}
                                                                >
                                                                    {room.photos > 0 ? (
                                                                        <>
                                                                            <MeterPhoto src={MOCK_PHOTOS[0].src} />
                                                                            {room.photos > 1 &&
                                                                                <MeterPhoto
                                                                                    src={MOCK_PHOTOS[1].src} />}
                                                                            {room.photos > 2 && (
                                                                                <div
                                                                                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-gray-200 transition-colors">
                                                                                    +{room.photos - 2}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span
                                                                            className="text-slate-400 dark:text-slate-500 text-xs italic">Không có</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        {room.syncTime &&
                                                            <p className="text-xs text-slate-400 dark:text-slate-500">{room.syncTime}</p>}
                                                        {room.status === "error" &&
                                                            <p className="text-xs text-red-400">Kiểm tra lại chỉ số</p>}
                                                        {room.status === "local" &&
                                                            <p className="text-xs text-slate-400 dark:text-slate-500">Chưa đồng bộ</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                )}
            </div>

            {/* Footer */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5"><span
                            className="w-2 h-2 rounded-full bg-emerald-500"></span>Đã lưu</span>
                        <span className="flex items-center gap-1.5"><span
                            className="w-2 h-2 rounded-full bg-orange-400"></span>Chưa đồng bộ</span>
                        <span className="flex items-center gap-1.5"><span
                            className="w-2 h-2 rounded-full bg-red-500"></span>Lỗi chỉ số</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={handleSaveAll}
                        disabled={saving || loading || pending > 0 || errors > 0}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                        {saving ? "Đang chốt..." : "Kiểm tra & chốt chỉ số"}
                    </button>
                </div>
            </div>

            {/* Focus Mode Modal */}
            <Dialog open={!!focusRoomId} onOpenChange={(open) => !open && setFocusRoomId(null)}>
                <DialogContent className="sm:max-w-md">
                    {focusRoomId && (() => {
                        const room = rooms.find(r => r.id === focusRoomId);
                        if (!room) return null;

                        const elecUsage = room.elecCurr !== null ? room.elecCurr - room.elecPrev : null;
                        const waterUsage = room.waterCurr !== null ? room.waterCurr - room.waterPrev : null;

                        return (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="text-xl">Phòng {room.id}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    {/* Electricity */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-amber-500" />
                                                Điện (kWh)
                                            </h4>
                                            {elecUsage !== null && elecUsage < 0 && (
                                                <span
                                                    className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-500 dark:bg-rose-500/10 dark:text-rose-300">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    Không hợp lệ
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 dark:bg-[#020817] rounded-lg p-3 border border-gray-100 dark:border-white/10">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Số cũ</p>
                                                <p className="font-semibold text-slate-700 dark:text-slate-200">{room.elecPrev.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 dark:border-blue-500/20">
                                                <p className="text-xs text-blue-600 dark:text-blue-300 mb-1 font-medium">Số mới</p>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full bg-white dark:bg-[#0f172a] text-base border-gray-200 dark:border-white/10 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 border"
                                                    value={room.elecCurr ?? ""}
                                                    onChange={(e) => handleCurrChange(room.id, "elecCurr", e.target.value)}
                                                    placeholder="Nhập..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Water */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <Droplets className="h-4 w-4 text-blue-500" />
                                                Nước (m³)
                                            </h4>
                                            {waterUsage !== null && waterUsage < 0 && (
                                                <span
                                                    className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-500 dark:bg-rose-500/10 dark:text-rose-300">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    Không hợp lệ
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 dark:bg-[#020817] rounded-lg p-3 border border-gray-100 dark:border-white/10">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Số cũ</p>
                                                <p className="font-semibold text-slate-700 dark:text-slate-200">{room.waterPrev}</p>
                                            </div>
                                            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 dark:border-blue-500/20">
                                                <p className="text-xs text-blue-600 dark:text-blue-300 mb-1 font-medium">Số mới</p>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full bg-white dark:bg-[#0f172a] text-base border-gray-200 dark:border-white/10 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 border"
                                                    value={room.waterCurr ?? ""}
                                                    onChange={(e) => handleCurrChange(room.id, "waterCurr", e.target.value)}
                                                    placeholder="Nhập..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        {capturedPhotos[room.id] ? (
                                            <div className="relative h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#020817]">
                                                <Image src={capturedPhotos[room.id].previewUrl} alt="Captured" fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" unoptimized />
                                                <button
                                                    onClick={() => {
                                                        const newPhotos = {...capturedPhotos};
                                                        delete newPhotos[room.id];
                                                        setCapturedPhotos(newPhotos);
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button variant="primary"
                                                onClick={() => setCameraOpen(true)}
                                                className="w-full flex items-center gap-2 justify-center">
                                                <Camera className="w-4 h-4" />
                                                Chụp ảnh minh chứng
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-4">
                                    <Button variant="primary" onClick={() => setFocusRoomId(null)}
                                        className="w-1/3">
                                        Đóng
                                    </Button>
                                    <Button onClick={handleSaveAndNext}
                                        className="w-2/3 bg-blue-600 hover:bg-blue-700">
                                        Lưu & Tiếp theo
                                    </Button>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <CameraCapture
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={(photoData) => {
                    if (focusRoomId) {
                        setCapturedPhotos(prev => ({
                            ...prev,
                            [focusRoomId]: photoData
                        }));
                    }
                }}
            />
        </div>
    );
}
