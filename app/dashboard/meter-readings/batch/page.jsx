"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
    fetchBatchMeterReadingsStatus,
    submitBatchMeterReadings,
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
import { LucideDownload, LucideEdit, LucideImport, LucideSearch, LucideCamera, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoGallery } from "../../../../components/image-gallery";
import CameraCapture from "@/components/CameraCapture";
import Image from "next/image";

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
    synced: { label: "Synced", color: "text-green-500", dot: "bg-green-500" },
    local: { label: "Local Only", color: "text-orange-400", dot: "bg-orange-400" },
    error: { label: "Error", color: "text-red-500", dot: "bg-red-500" },
    pending: { label: "Pending", color: "text-gray-400", dot: "bg-gray-300" },
};


const PER_PAGE = 5;

function MeterPhoto({ src }) {
    return (
        <div
            className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
            {src ? (
                <Image src={src} alt="thumbnail" fill sizes="40px" className="object-cover" unoptimized />
            ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
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
    const [period, setPeriod] = useState(queryPeriod); // Default to current month backend

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchBatchMeterReadingsStatus(period, 1);
            if (res) {
                const fetchedBatchId = res.batchId || res.batch_id;
                if (fetchedBatchId) setBatchId(fetchedBatchId);
                console.log("Fetched batchId:", fetchedBatchId);
                if (res.rooms) {
                    const mappedRooms = res.rooms.map(r => ({
                        id: r.room_code,
                        roomId: r.room_id,
                        elecPrev: r.electricity_previous || 0,
                        elecCurr: r.electricity_current,
                        waterPrev: r.water_previous || 0,
                        waterCurr: r.water_current,
                        status: r.status || "pending",
                        syncTime: r.sync_time ? new Date(r.sync_time).toLocaleString() : null,
                        photos: r.photos_count || 0
                    }));
                    setRooms(mappedRooms);
                }
            }
        } catch (error) {
            toast.error("Lỗi khi tải dữ liệu");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [period]);

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

    const scrollRef = useRef(null);
    const handleWheel = useCallback((e) => {
        if (e.deltaY !== 0) {
            e.preventDefault();
            e.currentTarget.scrollLeft += e.deltaY;
        }
    }, []);

    const horizontalScrollRef = useCallback((node) => {
        if (scrollRef.current) {
            scrollRef.current.removeEventListener("wheel", handleWheel);
        }
        if (node) {
            node.addEventListener("wheel", handleWheel, { passive: false });
        }
        scrollRef.current = node;
    }, [handleWheel]);

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

    const pageButtons = [1, 2, 3, 4, 5, "...", 10];

    return (
        <div className="w-full min-w-0 overflow-x-hidden font-sans">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href={"/dashboard/meter-readings"}>Quản lý điện nước</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Nhập điện nước</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 mt-2">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900">Meter Readings - June 2026</h1>
                        <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">In Progress</span>
                    </div>
                    <p className="text-sm text-gray-400">Period: 01/06/2026 - 30/06/2026</p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    {(pending > 0 || errors > 0) ? (
                        <span
                            className="text-sm font-medium text-amber-600 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path
                                strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            {pending + errors} phòng chưa hoàn thành. Chưa thể chốt kỳ.
                        </span>
                    ) : (
                        <span
                            className="text-sm font-medium text-green-600 flex items-center gap-1.5 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path
                                strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
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
                        className="flex items-center gap-2 border bg-white hover:bg-gray-50 text-gray-800 border-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        <LucideEdit className="w-4 h-4" />
                        Bắt đầu nhập
                    </Button>
                    <Button
                        onClick={handleSaveAll}
                        disabled={saving || loading || (pending > 0 || errors > 0)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving ? "Đang lưu..." : "Lưu tất cả"}
                    </Button>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 my-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Total Rooms</p>
                    <p className="text-3xl font-bold text-gray-900">{total}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Completed</p>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold text-gray-900">{completed}</p>
                        <span
                            className="text-base font-semibold text-blue-500 mb-0.5">{total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Pending</p>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold text-gray-900">{pending}</p>
                        <span
                            className="text-base font-semibold text-orange-400 mb-0.5">{total > 0 ? Math.round((pending / total) * 100) : 0}%</span>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Unsynced Changes</p>
                    <div className="flex items-center justify-between">
                        <p className="text-3xl font-bold text-gray-900">{unsynced}</p>
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Last Sync</p>
                    <div className="flex items-center justify-between">
                        <p className="text-xl font-bold text-gray-900">2 mins ago</p>
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Overall progress */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Tiến độ nhập</span>
                    <span className="text-sm text-gray-500">{completed} / {total} phòng đã nhập</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Tabs + search */}
            <div className="flex w-full min-w-0 flex-col items-start justify-between gap-4 mb-4 md:flex-row md:items-center">
                <div
                    className="flex flex-wrap items-center gap-1 md:gap-0 w-full md:w-auto pb-1 md:pb-0 border-b md:border-none border-gray-100">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex w-full min-w-0 items-center gap-2 md:w-auto">
                    <div className="relative w-full min-w-0 md:w-auto">
                        <LucideSearch className={"absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"} />
                        <input
                            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 md:w-64"
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
                            className="border border-gray-200 rounded-xl bg-white shadow-sm">
                            <AccordionTrigger
                                className="px-5 py-4 hover:no-underline hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold text-gray-900">{floor}</h3>
                                    <span
                                        className="text-xs font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-600 border border-gray-200">{floorRooms.length} rooms</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-0">
                                {/* Desktop Table View */}
                                <div className="hidden md:block w-full overflow-x-auto pb-4">
                                    <Table className="w-full text-sm min-w-[900px]">
                                        <TableHeader>
                                            <TableRow className="bg-gray-50 border-y border-gray-200">
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-gray-500 px-4 py-3 w-16"
                                                >Room
                                                </TableHead>
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-gray-500 px-4 py-3 border-b border-gray-100"
                                                >Electricity (kWh)
                                                </TableHead>
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-gray-500 px-4 py-3 border-b border-gray-100 border-l border-gray-200"
                                                >Water (m³)
                                                </TableHead>
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-gray-500 px-4 py-3 border-l border-gray-200"
                                                >Photos
                                                </TableHead>
                                                <TableHead
                                                    className="text-left text-xs font-semibold text-gray-500 px-4 py-3 border-l border-gray-200"
                                                >
                                                    <span className="flex items-center gap-1">
                                                        Status
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none"
                                                            stroke="currentColor" viewBox="0 0 24 24"><path
                                                                strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </span>
                                                </TableHead>
                                                <TableHead
                                                    className="text-center text-xs font-semibold text-gray-500 px-4 py-3 border-l border-gray-200"
                                                >Actions
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {floorRooms.map((room) => {
                                                const elecUsage = room.elecCurr !== null ? room.elecCurr - room.elecPrev : null;
                                                const waterUsage = room.waterCurr !== null ? room.waterCurr - room.waterPrev : null;
                                                const isElecError = elecUsage !== null && elecUsage < 0;
                                                const isWaterError = waterUsage !== null && waterUsage < 0;
                                                const st = STATUS_CONFIG[room.status];

                                                return (
                                                    <TableRow key={room.id}
                                                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                        <TableCell
                                                            className="px-4 py-3 font-semibold text-gray-800">{room.id}</TableCell>

                                                        {/* Electricity Compact */}
                                                        <TableCell className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="text-gray-500 w-12 text-right">{room.elecPrev.toLocaleString()}</span>
                                                                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0"
                                                                    fill="none" stroke="currentColor"
                                                                    viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round"
                                                                        strokeLinejoin="round" strokeWidth={2}
                                                                        d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                                </svg>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className={`w-20 text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isElecError ? "border-red-400 bg-red-50 text-red-600 focus:ring-red-100" : "border-gray-200 focus:ring-blue-100 text-gray-800"}`}
                                                                    value={room.elecCurr ?? ""}
                                                                    onChange={(e) => handleCurrChange(room.id, "elecCurr", e.target.value)}
                                                                    placeholder="—"
                                                                />
                                                                <span
                                                                    className={`w-14 text-left font-semibold text-xs ${elecUsage === null ? "text-gray-300" : elecUsage < 0 ? "text-red-500" : elecUsage === 0 ? "text-gray-400" : "text-green-500"}`}>
                                                                    {elecUsage === null ? "" : elecUsage < 0 ? `(${elecUsage})` : `(+${elecUsage})`}
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Water Compact */}
                                                        <TableCell className="px-4 py-3 border-l border-gray-100">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="text-gray-500 w-10 text-right">{room.waterPrev}</span>
                                                                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0"
                                                                    fill="none" stroke="currentColor"
                                                                    viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round"
                                                                        strokeLinejoin="round" strokeWidth={2}
                                                                        d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                                </svg>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className={`w-16 text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isWaterError ? "border-red-400 bg-red-50 text-red-600 focus:ring-red-100" : "border-gray-200 focus:ring-blue-100 text-gray-800"}`}
                                                                    value={room.waterCurr ?? ""}
                                                                    onChange={(e) => handleCurrChange(room.id, "waterCurr", e.target.value)}
                                                                    placeholder="—"
                                                                />
                                                                <span
                                                                    className={`w-12 text-left font-semibold text-xs ${waterUsage === null ? "text-gray-300" : waterUsage < 0 ? "text-red-500" : waterUsage === 0 ? "text-gray-400" : "text-green-500"}`}>
                                                                    {waterUsage === null ? "" : waterUsage < 0 ? `(${waterUsage})` : `(+${waterUsage})`}
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Photos */}
                                                        <TableCell className="px-4 py-3 border-l border-gray-100">
                                                            <PhotoGallery
                                                                photos={MOCK_PHOTOS.slice(0, room.photos)}
                                                                renderTrigger={(openPhoto) => (
                                                                    <div
                                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${room.photos > 0 ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm" : "bg-gray-50 border-transparent text-gray-400"}`}
                                                                        onClick={() => room.photos > 0 && openPhoto(0)}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={1.5}
                                                                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                                            <path strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={1.5}
                                                                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                        <span
                                                                            className="text-xs font-medium whitespace-nowrap">{room.photos > 0 ? `${room.photos} photos` : "Không có"}</span>
                                                                    </div>
                                                                )}
                                                            />
                                                        </TableCell>

                                                        {/* Status */}
                                                        <TableCell className="px-4 py-3 border-l border-gray-100">
                                                            <div className="flex items-start gap-1.5">
                                                                <span
                                                                    className={`w-2 h-2 rounded-full mt-1 shrink-0 ${st.dot}`}></span>
                                                                <div>
                                                                    <p className={`text-sm font-semibold ${st.color}`}>{st.label}</p>
                                                                    {room.syncTime &&
                                                                        <p className="text-xs text-gray-400">{room.syncTime}</p>}
                                                                    {room.status === "error" &&
                                                                        <p className="text-xs text-red-400">Check
                                                                            reading</p>}
                                                                    {room.status === "local" &&
                                                                        <p className="text-xs text-gray-400">Not
                                                                            synced</p>}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Actions */}
                                                        <TableCell
                                                            className="px-4 py-3 border-l border-gray-100 text-center">
                                                            <button
                                                                onClick={() => setFocusRoomId(room.id)}
                                                                className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                                                <LucideEdit size={16} />
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
                                        const st = STATUS_CONFIG[room.status];

                                        return (
                                            <div key={room.id}
                                                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 text-lg">{room.id}</h4>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${st.dot}`}></span>
                                                            <span
                                                                className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <LucideEdit size={18} />
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {/* Electricity */}
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <div
                                                            className="text-xs font-semibold text-gray-500 mb-2">Electricity
                                                            (kWh)
                                                        </div>
                                                        <div
                                                            className="grid grid-cols-3 gap-2 text-sm items-center">
                                                            <div className="flex flex-col">
                                                                <span
                                                                    className="text-xs text-gray-400">Previous</span>
                                                                <span
                                                                    className="font-medium text-gray-700">{room.elecPrev.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span
                                                                    className="text-xs text-gray-400 mb-1">Current</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className={`w-full max-w-[80px] text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isElecError ? "border-red-400 bg-red-50 text-red-600 focus:ring-red-100" : "border-gray-200 focus:ring-blue-100 text-gray-800"}`}
                                                                    value={room.elecCurr ?? ""}
                                                                    onChange={(e) => handleCurrChange(room.id, "elecCurr", e.target.value)}
                                                                    placeholder="—"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-gray-400">Usage</span>
                                                                <span
                                                                    className={`font-semibold ${elecUsage === null ? "text-gray-300" : elecUsage < 0 ? "text-red-500" : elecUsage === 0 ? "text-gray-400" : "text-green-500"}`}>
                                                                    {elecUsage === null ? "—" : elecUsage < 0 ? elecUsage : `+${elecUsage}`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Water */}
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <div
                                                            className="text-xs font-semibold text-gray-500 mb-2">Water
                                                            (m³)
                                                        </div>
                                                        <div
                                                            className="grid grid-cols-3 gap-2 text-sm items-center">
                                                            <div className="flex flex-col">
                                                                <span
                                                                    className="text-xs text-gray-400">Previous</span>
                                                                <span
                                                                    className="font-medium text-gray-700">{room.waterPrev}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <span
                                                                    className="text-xs text-gray-400 mb-1">Current</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className={`w-full max-w-[80px] text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isWaterError ? "border-red-400 bg-red-50 text-red-600 focus:ring-red-100" : "border-gray-200 focus:ring-blue-100 text-gray-800"}`}
                                                                    value={room.waterCurr ?? ""}
                                                                    onChange={(e) => handleCurrChange(room.id, "waterCurr", e.target.value)}
                                                                    placeholder="—"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs text-gray-400">Usage</span>
                                                                <span
                                                                    className={`font-semibold ${waterUsage === null ? "text-gray-300" : waterUsage < 0 ? "text-red-500" : waterUsage === 0 ? "text-gray-400" : "text-green-500"}`}>
                                                                    {waterUsage === null ? "—" : waterUsage}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div
                                                    className="flex justify-between items-end mt-4 pt-4 border-t border-gray-100">
                                                    <div>
                                                        <span
                                                            className="text-xs font-medium text-gray-500 mb-1 block">Photos</span>
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
                                                                                    className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500 hover:bg-gray-200 transition-colors">
                                                                                    +{room.photos - 2}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span
                                                                            className="text-gray-400 text-xs italic">Không có</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        {room.syncTime &&
                                                            <p className="text-xs text-gray-400">{room.syncTime}</p>}
                                                        {room.status === "error" &&
                                                            <p className="text-xs text-red-400">Check reading</p>}
                                                        {room.status === "local" &&
                                                            <p className="text-xs text-gray-400">Not synced</p>}
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
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><span
                            className="w-2 h-2 rounded-full bg-green-500"></span>Synced</span>
                        <span className="flex items-center gap-1.5"><span
                            className="w-2 h-2 rounded-full bg-orange-400"></span>Local Only</span>
                        <span className="flex items-center gap-1.5"><span
                            className="w-2 h-2 rounded-full bg-red-500"></span>Error</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors w-full md:w-auto">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Review & Submit Readings
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
                                <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-2 pr-10 scrollbar-hide border-b border-gray-100 mb-2" ref={horizontalScrollRef}>
                                    {filtered.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => setFocusRoomId(r.id)}
                                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${r.id === focusRoomId ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            {r.id}
                                        </button>
                                    ))}
                                </div>
                                <div className="space-y-6 py-4">
                                    {/* Electricity */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                                Điện (kWh)
                                            </h4>
                                            {elecUsage !== null && elecUsage < 0 && (
                                                <span
                                                    className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded">⚠ Không hợp lệ</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <p className="text-xs text-gray-500 mb-1">Số cũ</p>
                                                <p className="font-semibold text-gray-700">{room.elecPrev.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                                <p className="text-xs text-blue-600 mb-1 font-medium">Số mới</p>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full bg-white text-base border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 border"
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
                                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                Nước (m³)
                                            </h4>
                                            {waterUsage !== null && waterUsage < 0 && (
                                                <span
                                                    className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded">⚠ Không hợp lệ</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <p className="text-xs text-gray-500 mb-1">Số cũ</p>
                                                <p className="font-semibold text-gray-700">{room.waterPrev}</p>
                                            </div>
                                            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                                                <p className="text-xs text-blue-600 mb-1 font-medium">Số mới</p>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full bg-white text-base border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 border"
                                                    value={room.waterCurr ?? ""}
                                                    onChange={(e) => handleCurrChange(room.id, "waterCurr", e.target.value)}
                                                    placeholder="Nhập..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        {capturedPhotos[room.id] ? (
                                            <div className="relative h-48 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                                <Image src={capturedPhotos[room.id].previewUrl} alt="Captured" fill sizes="(max-width: 768px) 100vw, 320px" className="object-contain bg-black/5" unoptimized />
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
                                                <LucideCamera className="w-4 h-4" />
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
