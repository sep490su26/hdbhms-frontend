"use client";

import {useState, useEffect, useCallback, useRef} from "react";
import {useSearchParams} from "next/navigation";
import {
    downloadMeterReadingImportTemplate,
    fetchBatchMeterReadingsStatus,
    importMeterReadingsFromExcel,
    resolveMeterReadingAnomalies,
    saveProgressiveRoomReading,
    startBatchReading,
    uploadMeterReadingPhoto,
} from "@/services/meterReadingService";
import {createUtilityBillingRun} from "@/services/billingService";
import {
    cacheBatchMeterReadingsStatus,
    getCachedBatchMeterReadingsStatus,
    getQueuedMeterReadings,
    isOfflineSaveError,
    OFFLINE_METER_READING_QUEUE_EVENT,
    queueMeterReadingForSync,
    syncQueuedMeterReadings,
} from "@/services/meterReadingOfflineSync";
import {toast} from "sonner";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {Breadcrumb, BreadcrumbList} from "@/components/ui/breadcrumb";
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import {Button} from "@/components/ui/button";
import {
    AlertTriangle,
    ArrowRight,
    Camera,
    CheckCircle2,
    CircleDashed,
    Download,
    Edit3,
    Home,
    ImageIcon,
    Info,
    RefreshCw,
    Search,
    UploadCloud,
    X,
    Zap,
} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {PhotoGallery} from "../../../../components/image-gallery";
import CameraCapture from "@/components/CameraCapture";
import Image from "next/image";
import {DashboardPageHeader} from "@/components/dashboard/DashboardPageHeader";
import {DashboardStatCard} from "@/components/dashboard/DashboardStatCard";
import {
    calculateUtilityCharge,
    DEFAULT_UTILITY_TARIFFS,
    formatVnd,
    normalizeUtilityTariff,
} from "@/lib/meterReadingCost.mjs";
import {formatDateTime} from "@/lib/dateFormat";
import {useAuth} from "@/app/dashboard/_contexts/AuthContext";
import {fetchSimpleProperties} from "@/services/identityAccessService";
import {UtilityBillingRunsPanel} from "../_components/UtilityBillingRunsPanel";

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
        id: 3,
        src: "https://images.unsplash.com/photo-1542382257-80da9fb9f5c2?w=500&q=80",
        alt: "Phòng tổng quan",
        label: "Tổng quan"
    },
];

const STATUS_CONFIG = {
    warning: {label: "Cần kiểm tra", color: "text-amber-600 dark:text-amber-300", dot: "bg-amber-500"},
    synced: {label: "Đã lưu", color: "text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-500"},
    local: {label: "Chưa đồng bộ", color: "text-orange-500 dark:text-orange-300", dot: "bg-orange-400"},
    error: {label: "Lỗi chỉ số", color: "text-red-500 dark:text-rose-300", dot: "bg-red-500"},
    pending: {label: "Chưa nhập", color: "text-slate-500 dark:text-slate-400", dot: "bg-gray-300"},
};


function getPeriodParts(value) {
    const text = String(value || "").trim();
    const canonical = text.match(/^(\d{4})-(\d{1,2})$/);
    if (canonical) return {year: canonical[1], month: canonical[2].padStart(2, "0")};

    const legacy = text.match(/^(\d{1,2})\/(\d{4})$/);
    if (legacy) return {year: legacy[2], month: legacy[1].padStart(2, "0")};

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

function normalizeBatchStatus(source) {
    return String(readField(source, "status", "batchStatus", "batch_status") || "").toUpperCase();
}

function normalizeBoolean(value) {
    if (typeof value === "boolean") return value;
    return ["true", "1", "yes"].includes(String(value || "").toLowerCase());
}

function numberOrNull(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function numberOrZero(value) {
    return numberOrNull(value) ?? 0;
}

function numberOrDefault(value, fallback) {
    return numberOrNull(value) ?? fallback;
}

function normalizeReadingWarnings(warnings) {
    if (!Array.isArray(warnings)) return [];
    return warnings.map((warning) => ({
        id: readField(warning, "id", "warningId", "warning_id") ?? null,
        meterType: readField(warning, "meterType", "meter_type") || "",
        type: readField(warning, "type") || "",
        severity: readField(warning, "severity") || "",
        message: readField(warning, "message") || "",
    }));
}

function firstWarningMessage(room) {
    return Array.isArray(room?.warnings) ? room.warnings.find((warning) => warning?.message)?.message || "" : "";
}

function requiresMeterReadingCorrection(room) {
    const current = numberOrNull(room?.elecCurr);
    const previous = numberOrNull(room?.elecPrev);
    const hasNegativeUsage = current !== null && previous !== null && current < previous;
    const hasNegativeUsageWarning = Array.isArray(room?.warnings)
        && room.warnings.some((warning) => String(warning?.type || "").toUpperCase() === "NEGATIVE_USAGE");
    return hasNegativeUsage || hasNegativeUsageWarning;
}

function normalizePropertyId(value) {
    const text = String(value || "").trim();
    return /^\d+$/.test(text) ? text : "";
}

function firstAssignedPropertyId(user) {
    const assignedProperty = Array.isArray(user?.assignedProperties)
        ? user.assignedProperties[0]
        : null;
    return normalizePropertyId(
        assignedProperty?.id ||
        assignedProperty?.propertyId ||
        assignedProperty?.property_id,
    );
}

function countEvidencePhotos(room) {
    return Number(Boolean(room.electricityPhotoId || room.offlineElectricityPhotoQueued));
}

function applyOfflineQueueToRooms(rooms, queueItems) {
    const queuedByRoomId = new Map(
        (queueItems || []).map((item) => [String(item.roomId), item]),
    );

    return rooms.map((room) => {
        const queued = queuedByRoomId.get(String(room.roomId));
        if (!queued) return room;

        const nextRoom = {
            ...room,
            elecCurr: numberOrNull(queued.electricityValue),
            electricityPhotoId: queued.electricityPhotoId ?? room.electricityPhotoId,
            offlineElectricityPhotoQueued: Boolean(queued.electricityPhotoFile),
            offlineQueuedAt: queued.updatedAt || queued.createdAt || null,
            offlineSyncError: queued.lastError || "",
            status: "local",
            warnings: [],
        };

        return {
            ...nextRoom,
            photos: countEvidencePhotos(nextRoom),
        };
    });
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

function formatMonthYearPeriod(date = new Date()) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${month}-${date.getFullYear()}`;
}

function meterPeriodToBillingPeriod(value) {
    const text = String(value || "").trim();
    const meterPeriodMatch = /^(\d{1,2})-(\d{4})$/.exec(text);
    if (meterPeriodMatch) {
        return `${meterPeriodMatch[2]}-${meterPeriodMatch[1].padStart(2, "0")}`;
    }

    const billingPeriodMatch = /^(\d{4})-(\d{1,2})$/.exec(text);
    if (billingPeriodMatch) {
        return `${billingPeriodMatch[1]}-${billingPeriodMatch[2].padStart(2, "0")}`;
    }

    return "";
}

function MeterPhoto({src}) {
    return (
        <div
            className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group">
            {src ? (
                <Image src={src} alt="thumbnail" fill sizes="40px" className="object-cover" unoptimized/>
            ) : (
                <ImageIcon className="w-5 h-5 text-slate-400 dark:text-slate-500"/>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"/>
        </div>
    );
}

export default function MeterReadings() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [importingExcel, setImportingExcel] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [resolvingWarningRoomId, setResolvingWarningRoomId] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [editingCell, setEditingCell] = useState(null); // { roomId, field }
    const [focusRoomId, setFocusRoomId] = useState(null);
    const [batchId, setBatchId] = useState(null);
    const [batchStatus, setBatchStatus] = useState("");
    const [billingRunStatus, setBillingRunStatus] = useState("");
    const [readingsLocked, setReadingsLocked] = useState(false);
    const [billingRunRefreshToken, setBillingRunRefreshToken] = useState(0);
    const [billingRunOpenToken, setBillingRunOpenToken] = useState(0);
    const [cameraTarget, setCameraTarget] = useState(null);
    const [capturedPhotos, setCapturedPhotos] = useState({}); // { roomId: { electricity } }
    const [electricityTariff, setElectricityTariff] = useState(DEFAULT_UTILITY_TARIFFS.electricity);
    const [backendFacilityName, setBackendFacilityName] = useState("");
    const [fallbackPropertyId, setFallbackPropertyId] = useState("");
    const [isOnline, setIsOnline] = useState(() =>
        typeof navigator === "undefined" ? true : navigator.onLine,
    );
    const [syncingOffline, setSyncingOffline] = useState(false);
    const [lastOfflineSyncAt, setLastOfflineSyncAt] = useState(null);
    const syncingOfflineRef = useRef(false);
    const excelInputRef = useRef(null);

    const {user} = useAuth();
    const searchParams = useSearchParams();
    const queryPeriod = searchParams.get("period") || "";
    const queryBatchId = normalizePropertyId(searchParams.get("batchId"));
    const queryPropertyId =
        normalizePropertyId(searchParams.get("propertyId") || searchParams.get("facilityId"));
    const propertyId = queryPropertyId || firstAssignedPropertyId(user) || fallbackPropertyId;
    const fromFacilities = searchParams.get("from") === "facilities";
    const facilityName = backendFacilityName;
    const meterReadingsHref = getMeterReadingsHref(propertyId, {
        from: fromFacilities ? "facilities" : "",
        facilityName,
    });
    const [period, setPeriod] = useState(queryPeriod); // Default to current month backend

    useEffect(() => {
        if (queryPropertyId || firstAssignedPropertyId(user)) {
            return undefined;
        }

        let isActive = true;
        fetchSimpleProperties()
            .then((properties) => {
                if (!isActive) return;
                setFallbackPropertyId(normalizePropertyId(properties?.[0]?.id));
            })
            .catch(() => {
                if (isActive) setFallbackPropertyId("");
            });

        return () => {
            isActive = false;
        };
    }, [queryPropertyId, user]);

    const hydrateBatchResponse = useCallback(async (res) => {
        if (!res) return;

        setBackendFacilityName(readField(res, "propertyName", "property_name") || "");
        const fetchedBatchId = res.batchId || res.batch_id || null;
        setBatchId(fetchedBatchId);
        setBatchStatus(normalizeBatchStatus(res));
        setBillingRunStatus(String(readField(res, "billingRunStatus", "billing_run_status") || "").toUpperCase());
        setReadingsLocked(normalizeBoolean(readField(res, "readingsLocked", "readings_locked")));
        setElectricityTariff(normalizeUtilityTariff(
            readField(res, "electricityTariff", "electricity_tariff"),
            DEFAULT_UTILITY_TARIFFS.electricity,
        ));
        if (res.rooms) {
            const mappedRooms = res.rooms.map((r, index) => {
                const roomId = readField(r, "roomId", "room_id");
                const roomCode = readField(r, "roomCode", "room_code");
                const syncTime = readField(r, "syncTime", "sync_time");
                const elecPrev = numberOrZero(readField(r, "electricityPrevious", "electricity_previous"));
                const warnings = normalizeReadingWarnings(readField(r, "warnings", "warnings"));

                return {
                    id: roomCode || (roomId ? `room-${roomId}` : `room-${index}`),
                    roomId,
                    elecPrev,
                    elecCurr: numberOrDefault(readField(r, "electricityCurrent", "electricity_current"), elecPrev),
                    electricityPhotoId: readField(r, "electricityPhotoId", "electricity_photo_id") ?? null,
                    offlineElectricityPhotoQueued: false,
                    offlineQueuedAt: null,
                    offlineSyncError: "",
                    status: warnings.length > 0
                        ? "warning"
                        : readField(r, "status") || "pending",
                    syncTime: formatDateTime(syncTime, null),
                    photos: Number(Boolean(readField(r, "electricityPhotoId", "electricity_photo_id"))),
                    warnings,
                };
            });
            const queuedItems = fetchedBatchId
                ? await getQueuedMeterReadings({batchId: fetchedBatchId})
                : [];
            setRooms(applyOfflineQueueToRooms(mappedRooms, queuedItems));
        }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setBackendFacilityName("");
        try {
            const res = await fetchBatchMeterReadingsStatus(period, propertyId, queryBatchId);
            if (!queryBatchId) {
                await cacheBatchMeterReadingsStatus(period, propertyId, res);
            }
            if (res) {
                setBackendFacilityName(readField(res, "propertyName", "property_name") || "");
                const fetchedBatchId = res.batchId || res.batch_id || null;
                setBatchId(fetchedBatchId);
                setBatchStatus(normalizeBatchStatus(res));
                setBillingRunStatus(String(readField(res, "billingRunStatus", "billing_run_status") || "").toUpperCase());
                setReadingsLocked(normalizeBoolean(readField(res, "readingsLocked", "readings_locked")));
                    setElectricityTariff(normalizeUtilityTariff(
                        readField(res, "electricityTariff", "electricity_tariff"),
                        DEFAULT_UTILITY_TARIFFS.electricity,
                    ));
                if (res.rooms) {
                    const mappedRooms = res.rooms.map((r, index) => {
                        const roomId = readField(r, "roomId", "room_id");
                        const roomCode = readField(r, "roomCode", "room_code");
                        const syncTime = readField(r, "syncTime", "sync_time");
                        const elecPrev = numberOrZero(readField(r, "electricityPrevious", "electricity_previous"));
                        const warnings = normalizeReadingWarnings(readField(r, "warnings", "warnings"));

                        return {
                            id: roomCode || (roomId ? `room-${roomId}` : `room-${index}`),
                            roomId,
                            elecPrev,
                            elecCurr: numberOrDefault(readField(r, "electricityCurrent", "electricity_current"), elecPrev),
                            electricityPhotoId: readField(r, "electricityPhotoId", "electricity_photo_id") ?? null,
                            offlineElectricityPhotoQueued: false,
                            offlineQueuedAt: null,
                            offlineSyncError: "",
                            status: warnings.length > 0
                                ? "warning"
                                : readField(r, "status") || "pending",
                            syncTime: formatDateTime(syncTime, null),
                            photos: Number(Boolean(readField(r, "electricityPhotoId", "electricity_photo_id"))),
                            warnings,
                        };
                    });
                    const queuedItems = fetchedBatchId
                        ? await getQueuedMeterReadings({batchId: fetchedBatchId})
                        : [];
                    setRooms(applyOfflineQueueToRooms(mappedRooms, queuedItems));
                }
            }
        } catch (error) {
            if (!queryBatchId && isOfflineSaveError(error)) {
                const cached = await getCachedBatchMeterReadingsStatus(period, propertyId);
                if (cached) {
                    await hydrateBatchResponse(cached);
                    toast.warning("Đang dùng dữ liệu đã lưu offline. Khi có mạng hệ thống sẽ tự đồng bộ.");
                } else {
                    toast.error("Chưa có dữ liệu offline cho kỳ này. Vui lòng mở màn này một lần khi có mạng.");
                }
            } else {
                toast.error("Lỗi khi tải dữ liệu");
                console.error(error);
            }
        } finally {
            setLoading(false);
        }
    }, [hydrateBatchResponse, period, propertyId, queryBatchId]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadData();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadData]);

    const refreshQueuedRooms = useCallback(async () => {
        const queuedItems = await getQueuedMeterReadings(batchId ? {batchId} : {});
        setRooms((prev) => applyOfflineQueueToRooms(prev, queuedItems));
    }, [batchId]);

    const runOfflineSync = useCallback(async ({silent = false} = {}) => {
        if (syncingOfflineRef.current) return;
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;

        syncingOfflineRef.current = true;
        setSyncingOffline(true);
        try {
            const result = await syncQueuedMeterReadings();
            if (result.synced > 0) {
                setLastOfflineSyncAt(new Date());
                toast.success(`Đã đồng bộ ${result.synced} phòng nhập offline.`);
                await loadData();
            } else {
                await refreshQueuedRooms();
                if (!silent && result.failed > 0) {
                    toast.error("Chưa đồng bộ được dữ liệu offline. Hệ thống sẽ thử lại khi có mạng.");
                }
            }
        } catch (error) {
            if (!silent) {
                toast.error(error?.details || error?.message || "Chưa đồng bộ được dữ liệu offline.");
            }
            console.error(error);
        } finally {
            syncingOfflineRef.current = false;
            setSyncingOffline(false);
        }
    }, [loadData, refreshQueuedRooms]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            void runOfflineSync();
        };
        const handleOffline = () => setIsOnline(false);
        const handleQueueChanged = () => {
            void refreshQueuedRooms();
            if (typeof navigator === "undefined" || navigator.onLine) {
                void runOfflineSync({silent: true});
            }
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        window.addEventListener(OFFLINE_METER_READING_QUEUE_EVENT, handleQueueChanged);
        const syncTimer = window.setTimeout(() => {
            void runOfflineSync({silent: true});
        }, 0);

        return () => {
            window.clearTimeout(syncTimer);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener(OFFLINE_METER_READING_QUEUE_EVENT, handleQueueChanged);
        };
    }, [refreshQueuedRooms, runOfflineSync]);

    const completed = rooms.filter((r) => r.status === "synced").length;
    const pending = rooms.filter((r) => r.status === "pending" || !r.status).length;
    const unsynced = rooms.filter((r) => r.status === "local").length;
    const warnings = rooms.filter((r) => r.status === "warning" || r.warnings?.length > 0).length;
    const errors = rooms.filter((r) => r.status === "error").length;
    const total = rooms.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    const isBatchLocked = readingsLocked;
    const hasBillingRun = Boolean(billingRunStatus);
    const canCreateBilling = !isBatchLocked && Boolean(propertyId) && total > 0 && pending === 0 && errors === 0 && warnings === 0 && unsynced === 0;

    const handleCurrChange = (roomId, field, val) => {
        if (isBatchLocked) {
            toast.info("Hóa đơn kỳ này đã phát hành, không thể chỉnh sửa chỉ số.");
            return;
        }

        const room = rooms.find(r => r.id === roomId);
        if (!room) return;

        const numVal = val === "" ? null : Number(val);

        // Validation: old reading must be >= 0
        if (field === "elecPrev" && numVal !== null && numVal < 0) {
            toast.error("Chỉ số điện cũ không được âm");
            return;
        }
        setRooms((prev) =>
            prev.map((r) =>
                r.id === roomId ? {...r, [field]: numVal} : r
            )
        );
    };

    const getCapturedPhoto = (roomId, type) => capturedPhotos[roomId]?.[type] ?? null;
    const getExistingPhotoId = (room) => room.electricityPhotoId;
    const removeCapturedPhoto = (roomId, type) => {
        setCapturedPhotos((prev) => {
            const next = {...prev};
            const roomPhotos = {...(next[roomId] || {})};
            delete roomPhotos[type];
            if (Object.keys(roomPhotos).length > 0) {
                next[roomId] = roomPhotos;
            } else {
                delete next[roomId];
            }
            return next;
        });
    };

    const ensureBatchForSaving = useCallback(async () => {
        if (batchId) return batchId;

        let targetPropertyId = propertyId;
        if (!targetPropertyId) {
            const properties = await fetchSimpleProperties();
            targetPropertyId = normalizePropertyId(properties?.[0]?.id);
            if (targetPropertyId) setFallbackPropertyId(targetPropertyId);
        }

        if (!targetPropertyId) {
            toast.error("Vui lòng chọn cơ sở trước khi lưu chỉ số");
            return null;
        }

        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            toast.error("Cần có mạng để tạo kỳ ghi chỉ số trước khi lưu offline");
            return null;
        }

        const periodToStart = period || formatMonthYearPeriod();
        const createdBatchId = await startBatchReading(periodToStart, targetPropertyId);
        if (!createdBatchId) {
            toast.error("Không tạo được kỳ ghi chỉ số");
            return null;
        }

        setBatchId(createdBatchId);
        return createdBatchId;
    }, [batchId, period, propertyId]);

    const handleExcelFileChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (isBatchLocked) {
            toast.info("Hóa đơn kỳ này đã phát hành, không thể nhập thêm dữ liệu.");
            return;
        }
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            toast.error("Cần có mạng để nhập chỉ số từ Excel.");
            return;
        }

        const activeBatchId = await ensureBatchForSaving();
        if (!activeBatchId) return;

        setImportingExcel(true);
        try {
            const result = await importMeterReadingsFromExcel(activeBatchId, file);
            toast.success(`Đã nhập ${result?.importedRows || 0} phòng từ Excel.`);
            setBillingRunRefreshToken((value) => value + 1);
            await loadData();
        } catch (error) {
            toast.error(error?.details || error?.message || "Không thể nhập dữ liệu Excel.");
            console.error(error);
        } finally {
            setImportingExcel(false);
        }
    };

    const handleDownloadExcelTemplate = async () => {
        try {
            await downloadMeterReadingImportTemplate({period, propertyId, batchId});
        } catch (error) {
            toast.error(error?.message || "Không thể tải file mẫu Excel.");
        }
    };

    const handleResolveWarning = async (room) => {
        if (!room || resolvingWarningRoomId) return;
        if (requiresMeterReadingCorrection(room)) {
            toast.error("Chỉ số mới thấp hơn chỉ số cũ. Vui lòng sửa lại trước khi xác nhận.");
            setFocusRoomId(room.id);
            return;
        }
        if (isBatchLocked) {
            toast.info("Hóa đơn kỳ này đã phát hành, chỉ có thể xem lại.");
            return;
        }
        if (!batchId || !room.roomId) {
            toast.error("Chưa có kỳ ghi chỉ số hoặc phòng hợp lệ để xác nhận.");
            return;
        }
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            toast.error("Cần có mạng để xác nhận chỉ số đã kiểm tra.");
            return;
        }

        setResolvingWarningRoomId(room.id);
        try {
            // Missing-reading warnings need a current-period reading before they can be resolved.
            if (room.elecCurr === null || room.elecCurr === undefined) {
                throw new Error("Vui lòng nhập chỉ số điện trước khi xác nhận.");
            }
            await saveProgressiveRoomReading(batchId, room.roomId, {
                electricityValue: room.elecCurr,
                electricityPhotoId: getExistingPhotoId(room),
            });
            await resolveMeterReadingAnomalies(batchId, room.roomId);
            setBillingRunRefreshToken((value) => value + 1);
            setRooms((prev) => prev.map((item) => item.id === room.id ? {
                ...item,
                status: "synced",
                warnings: [],
            } : item));
            toast.success("Đã xác nhận chỉ số bất thường.");
            await loadData();
        } catch (error) {
            toast.error(error?.details || error?.message || "Không thể xác nhận chỉ số bất thường.");
            console.error(error);
        } finally {
            setResolvingWarningRoomId(null);
        }
    };

    const uploadEvidencePhoto = async (room, type) => {
        const photo = getCapturedPhoto(room.id, type);
        if (!photo?.file) return getExistingPhotoId(room, type) ?? null;

        const response = await uploadMeterReadingPhoto(photo.file);
        const fileId = response?.fileId || response?.id;
        if (!fileId) throw new Error("Không upload được ảnh minh chứng");
        return fileId;
    };

    const queueRoomForOfflineSync = async (room, {
        electricityPhotoId = null,
        targetBatchId = batchId
    } = {}) => {
        const electricityPhoto = getCapturedPhoto(room.id, "electricity");
        const queuedElectricityPhotoId = electricityPhotoId ?? getExistingPhotoId(room) ?? null;
        const existingQueuedItems = await getQueuedMeterReadings(targetBatchId ? {batchId: targetBatchId} : {});
        const existingQueuedRoom = existingQueuedItems.find(
            (item) => String(item.roomId) === String(room.roomId),
        );

        await queueMeterReadingForSync({
            batchId: targetBatchId,
            roomId: room.roomId,
            roomCode: room.id,
            period,
            propertyId,
            electricityValue: room.elecCurr,
            electricityPhotoId: queuedElectricityPhotoId,
            electricityPhotoFile: queuedElectricityPhotoId ? null : electricityPhoto?.file ?? existingQueuedRoom?.electricityPhotoFile ?? null,
        });

        setRooms(prev => prev.map(r => r.id === room.id ? {
            ...r,
            status: "local",
            electricityPhotoId: queuedElectricityPhotoId,
            offlineElectricityPhotoQueued: Boolean(!queuedElectricityPhotoId && (electricityPhoto?.file || existingQueuedRoom?.electricityPhotoFile)),
            offlineQueuedAt: new Date().toISOString(),
            offlineSyncError: "",
            photos: Number(Boolean(queuedElectricityPhotoId || electricityPhoto?.file)),
            warnings: [],
        } : r));
    };

    const renderEvidenceCapture = (room, type, label) => {
        const photo = getCapturedPhoto(room.id, type);
        const existingPhotoId = getExistingPhotoId(room, type);

        return (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-[#020817]">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
                    {existingPhotoId && !photo ? (
                        <span
                            className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                            Đã có ảnh
                        </span>
                    ) : null}
                </div>
                {photo ? (
                    <div
                        className="relative h-28 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0f172a]">
                        <Image src={photo.previewUrl} alt={label} fill sizes="(max-width: 768px) 100vw, 320px"
                               className="object-cover" unoptimized/>
                        <button
                            type="button"
                            onClick={() => removeCapturedPhoto(room.id, type)}
                            disabled={isBatchLocked}
                            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                        >
                            <X className="h-4 w-4"/>
                        </button>
                    </div>
                ) : (
                    <Button
                        variant="primary"
                        onClick={() => setCameraTarget({roomId: room.id, type})}
                        disabled={isBatchLocked}
                        className="flex w-full items-center justify-center gap-2"
                    >
                        <Camera className="h-4 w-4"/>
                        {existingPhotoId ? "Chụp lại" : "Chụp ảnh minh chứng"}
                    </Button>
                )}
            </div>
        );
    };

    const handleSaveAndNext = async () => {
        if (saving) return;
        if (isBatchLocked) {
            toast.info("Hóa đơn kỳ này đã phát hành, không thể chỉnh sửa.");
            return;
        }

        const room = rooms.find(r => r.id === focusRoomId);
        if (!room) return;

        if (room.elecCurr === null) {
            toast.error("Vui lòng nhập chỉ số điện");
            return;
        }

        if (room.elecCurr < room.elecPrev) {
            toast.error("Chỉ số mới không được nhỏ hơn chỉ số cũ");
            return;
        }

        const activeBatchId = await ensureBatchForSaving();

        if (!activeBatchId) return;

        const moveToNextRoom = () => {
            const focusIndex = filtered.findIndex(r => r.id === focusRoomId);
            if (focusIndex >= 0 && focusIndex < filtered.length - 1) {
                setFocusRoomId(filtered[focusIndex + 1].id);
            } else {
                setFocusRoomId(null);
                void loadData();
            }
        };

        let savedElectricityPhotoId = getExistingPhotoId(room, "electricity") ?? null;

        setSaving(true);
        try {
            if (typeof navigator !== "undefined" && navigator.onLine === false) {
                await queueRoomForOfflineSync(room, {
                    electricityPhotoId: savedElectricityPhotoId,
                    targetBatchId: activeBatchId,
                });
                toast.warning("Đã lưu offline. Khi có mạng hệ thống sẽ tự đồng bộ.");
                moveToNextRoom();
                return;
            }

            savedElectricityPhotoId = await uploadEvidencePhoto(room, "electricity");

            await saveProgressiveRoomReading(activeBatchId, room.roomId, {
                electricityValue: room.elecCurr,
                electricityPhotoId: savedElectricityPhotoId,
            });
            setBillingRunRefreshToken((value) => value + 1);

            // local update status
            setRooms(prev => prev.map(r => r.id === focusRoomId ? {
                ...r,
                status: "synced",
                electricityPhotoId: savedElectricityPhotoId,
                photos: Number(Boolean(savedElectricityPhotoId)),
                warnings: [],
            } : r));

            await loadData();
            moveToNextRoom();
        } catch (error) {
            if (isOfflineSaveError(error)) {
                await queueRoomForOfflineSync(room, {
                    electricityPhotoId: savedElectricityPhotoId,
                    targetBatchId: activeBatchId,
                });
                toast.warning("Đã lưu offline. Khi có mạng hệ thống sẽ tự đồng bộ.");
                moveToNextRoom();
                return;
            }
            toast.error(error?.details || error?.message || "Lỗi khi lưu phòng này");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateOrUpdateBilling = async () => {
        if (confirming) return;
        if (isBatchLocked) {
            toast.info("Kỳ này đã xuất hóa đơn và được chốt nhập.");
            return;
        }
        if (!canCreateBilling) {
            toast.error(warnings > 0
                ? "Vui lòng xử lý các cảnh báo trước khi tạo hóa đơn."
                : "Vui lòng hoàn tất và lưu đủ chỉ số trước khi tạo hóa đơn.");
            return;
        }

        const billingPeriod = meterPeriodToBillingPeriod(period);
        if (!billingPeriod) {
            toast.error("Không xác định được kỳ hóa đơn.");
            return;
        }

        setConfirming(true);
        try {
            const run = await createUtilityBillingRun({propertyId, billingPeriod});
            setBillingRunStatus(String(run?.status || "PREVIEWED").toUpperCase());
            setBillingRunRefreshToken((value) => value + 1);
            setBillingRunOpenToken((value) => value + 1);
            toast.success("Đã tạo/cập nhật bản nháp hóa đơn.");
            await loadData();
        } catch (error) {
            toast.error(error?.details || error?.message || "Không thể tạo/cập nhật hóa đơn.");
            console.error(error);
        } finally {
            setConfirming(false);
        }
    };

    const tabs = [
        {id: "pending", label: `Chưa nhập (${pending})`},
        {id: "error", label: `Lỗi (${errors})`},
        {id: "warning", label: `Cần kiểm tra (${warnings})`},
        {id: "completed", label: `Đã hoàn thành (${completed})`},
        {id: "unsynced", label: `Chưa lưu (${unsynced})`},
        {id: "all", label: `Tất cả (${total})`}
    ];

    const filtered = rooms.filter((r) => {
        const matchesSearch = (r.id || "").toLowerCase().includes((search || "").toLowerCase());
        const isPending = r.status === "pending" || !r.status;
        const matchesTab =
            activeTab === "all" ? true :
                activeTab === "pending" ? isPending :
                    activeTab === "completed" ? r.status === "synced" :
                        activeTab === "unsynced" ? r.status === "local" :
                            activeTab === "warning" ? r.status === "warning" :
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
    const focusedRoom = focusRoomId ? rooms.find(r => r.id === focusRoomId) : null;

    return (
        <div className="w-full min-w-0 overflow-x-hidden font-sans">
            <Breadcrumb>
                <BreadcrumbList>
                    {fromFacilities ? (
                        <>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard/facilities">Quản lý cơ sở</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator/>
                            {facilityName ? (
                                <>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href={meterReadingsHref}>{facilityName}</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator/>
                                </>
                            ) : null}
                        </>
                    ) : null}
                    <BreadcrumbItem>
                        <BreadcrumbLink href={meterReadingsHref}>Quản lý chỉ số điện</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>Nhập chỉ số điện</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Header */}
            <div className="mb-4 mt-2">
                <DashboardPageHeader
                    className="xl:!flex-col xl:!items-start xl:!justify-start 2xl:!flex-row 2xl:!items-end 2xl:!justify-between"
                    title={
                        <span className="min-w-0 break-words">Nhập chỉ số điện - {formatPeriodLabel(period)}</span>
                    }
                    description={formatPeriodRange(period)}
                    actions={
                        <div className="mt-1 flex w-full flex-col items-start gap-3 2xl:items-end">
                            <div className="flex flex-wrap items-center gap-3">
                                <span
                                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${isOnline ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"}`}>
                                    <RefreshCw className={`h-4 w-4 ${syncingOffline ? "animate-spin" : ""}`}/>
                                    {syncingOffline ? "Đang đồng bộ offline" : isOnline ? "Online" : "Offline - sẽ tự đồng bộ"}
                                </span>
                                {isBatchLocked ? (
                                    <span
                                        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                        <CheckCircle2 className="h-4 w-4"/>
                                        Hóa đơn đã phát hành, chỉ có thể xem lại
                                    </span>
                                ) : hasBillingRun ? (
                                    <span
                                        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                                        <CheckCircle2 className="h-4 w-4"/>
                                        Đã có bản nháp hóa đơn, vẫn có thể cập nhật
                                    </span>
                                ) : (pending > 0 || errors > 0 || warnings > 0 || unsynced > 0) ? (
                                    <span
                                        className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300">
                                        <AlertTriangle className="h-4 w-4"/>
                                        {pending + errors + warnings + unsynced} phòng chưa đủ điều kiện. Chưa thể tạo hóa đơn.
                                    </span>
                                ) : (
                                    <span
                                        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                        <CheckCircle2 className="h-4 w-4"/>
                                        Đã đủ điều kiện tạo hóa đơn
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    onClick={handleDownloadExcelTemplate}
                                    variant="outline"
                                    className="flex items-center gap-2 text-sm font-medium"
                                >
                                    <Download className="h-4 w-4"/>
                                    Tải file mẫu
                                </Button>
                                <input
                                    ref={excelInputRef}
                                    type="file"
                                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    className="hidden"
                                    onChange={handleExcelFileChange}
                                />
                                <Button
                                    onClick={() => excelInputRef.current?.click()}
                                    disabled={isBatchLocked || importingExcel || loading}
                                    variant="outline"
                                    className="flex items-center gap-2 text-sm font-medium"
                                >
                                    <UploadCloud className="h-4 w-4"/>
                                    {importingExcel ? "Đang nhập Excel..." : "Nhập Excel"}
                                </Button>
                                <Button
                                    onClick={() => {
                                        const firstPending = filtered.find(r => r.status === "pending" || !r.status);
                                        if (firstPending) {
                                            setFocusRoomId(firstPending.id);
                                        } else if (filtered.length > 0) {
                                            setFocusRoomId(filtered[0].id);
                                        }
                                    }}
                                    disabled={isBatchLocked}
                                    variant={"default"}
                                    className="flex items-center gap-2 border bg-white dark:bg-[#0f172a] hover:bg-gray-50 dark:hover:bg-white/5 text-slate-800 dark:text-slate-100 border-gray-200 dark:border-white/10 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                                    <Edit3 className="h-4 w-4"/>
                                    Bắt đầu nhập
                                </Button>
                                <Button
                                    onClick={handleCreateOrUpdateBilling}
                                    disabled={!canCreateBilling || confirming}
                                    className="flex items-center gap-2 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <CheckCircle2 className="h-4 w-4"/>
                                    {confirming ? "Đang cập nhật..." : isBatchLocked ? "Đã chốt nhập" : "Tạo/Cập nhật hóa đơn"}
                                </Button>
                            </div>
                        </div>
                    }
                />
            </div>

            {/* Stat cards */}
            <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <DashboardStatCard icon={Home} label="Tổng số phòng" value={total} tone="blue"/>
                <DashboardStatCard icon={CheckCircle2} label="Đã nhập" value={completed} tone="emerald"/>
                <DashboardStatCard icon={AlertTriangle} label="Cần kiểm tra" value={warnings} tone="amber"/>
                <DashboardStatCard icon={CircleDashed} label="Chưa nhập" value={pending} tone="orange"/>
                <DashboardStatCard icon={UploadCloud} label="Chưa đồng bộ" value={unsynced} tone="amber"/>
            </div>

            {hasBillingRun || isBatchLocked ? (
                <div className="mb-6">
                    <UtilityBillingRunsPanel
                        key={`${propertyId || "all"}-${period || formatMonthYearPeriod()}-${billingRunStatus || "none"}`}
                        propertyId={propertyId}
                        defaultPeriod={period || formatMonthYearPeriod()}
                        refreshToken={billingRunRefreshToken}
                        openToken={billingRunOpenToken}
                        showTrigger={false}
                        onPublished={async (run) => {
                            setBillingRunStatus(String(run?.status || "INVOICES_CREATED").toUpperCase());
                            await loadData();
                        }}
                    />
                </div>
            ) : null}

            {/* Overall progress */}
            <div
                className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tiến độ nhập</span>
                    <span
                        className="text-sm text-slate-500 dark:text-slate-400">{completed} / {total} phòng đã nhập</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full transition-all"
                         style={{width: `${progress}%`}}></div>
                </div>
            </div>

            {/* Tabs + search */}
            <div
                className="flex w-full min-w-0 flex-col items-start justify-between gap-4 mb-4 md:flex-row md:items-center">
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
                        <Search
                            className={"absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4"}/>
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
                                        <Table className="w-full text-sm min-w-[1040px]">
                                            <TableHeader>
                                                <TableRow
                                                    className="bg-gray-50 dark:bg-[#020817] border-y border-gray-200 dark:border-white/10">
                                                    <TableHead
                                                        className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 w-16"
                                                    >Phòng
                                                    </TableHead>
                                                    <TableHead
                                                        className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 border-b border-gray-100 dark:border-white/10"
                                                    >Điện (kWh)
                                                    </TableHead>
                                                    <TableHead
                                                        className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 border-l border-gray-200 dark:border-white/10"
                                                    >Ảnh (tùy chọn)
                                                    </TableHead>
                                                    <TableHead
                                                        className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 border-l border-gray-200 dark:border-white/10"
                                                    >
                                                    <span className="flex items-center gap-1">
                                                        Trạng thái
                                                        <Info
                                                            className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500"/>
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
                                                    const elecCharge = calculateUtilityCharge(elecUsage, electricityTariff);
                                                    const isElecError = elecUsage !== null && elecUsage < 0;
                                                    const st = STATUS_CONFIG[room.status] || STATUS_CONFIG.pending;
                                                    const warningMessage = firstWarningMessage(room);

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
                                                                    <ArrowRight
                                                                        className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"/>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        className={`w-20 text-center text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 transition-colors ${isElecError ? "border-red-400 bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-300 focus:ring-red-100" : "border-gray-200 dark:border-white/10 focus:ring-blue-100 text-slate-800 dark:text-slate-100"}`}
                                                                        value={room.elecCurr ?? ""}
                                                                        disabled={isBatchLocked}
                                                                        onChange={(e) => handleCurrChange(room.id, "elecCurr", e.target.value)}
                                                                        placeholder="—"
                                                                    />
                                                                    <span
                                                                        className={`w-28 text-left text-xs font-semibold ${elecCharge === null ? "text-gray-300" : elecCharge.isInvalid ? "text-red-500 dark:text-rose-300" : elecCharge.amount === 0 ? "text-slate-400 dark:text-slate-500" : "text-green-500 dark:text-green-300"}`}>
                                                                    {elecCharge === null ? "" : elecCharge.isInvalid ? "Lỗi" : formatVnd(elecCharge.amount)}
                                                                </span>
                                                                </div>
                                                            </TableCell>

                                                            {/* Photos */}
                                                            <TableCell
                                                                className="px-4 py-3 border-l border-gray-100 dark:border-white/10">
                                                                <PhotoGallery
                                                                    photos={room.photos > 0 ? [MOCK_PHOTOS[0]] : []}
                                                                    renderTrigger={(openPhoto) => (
                                                                        <div
                                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${room.photos > 0 ? "bg-white dark:bg-[#0f172a] border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer shadow-sm" : "bg-gray-50 dark:bg-[#020817] border-transparent text-slate-400 dark:text-slate-500"}`}
                                                                            onClick={() => room.photos > 0 && openPhoto(0)}
                                                                        >
                                                                            <Camera className="h-4 w-4"/>
                                                                            <span
                                                                                className="whitespace-nowrap text-xs font-medium">{room.photos > 0 ? `${room.photos} ảnh` : "Không có"}</span>
                                                                        </div>
                                                                    )}
                                                                />
                                                            </TableCell>

                                                            {/* Status */}
                                                            <TableCell
                                                                className="px-4 py-3 border-l border-gray-100 dark:border-white/10">
                                                                <div className="flex items-start gap-1.5">
                                                                <span
                                                                    className={`w-2 h-2 rounded-full mt-1 shrink-0 ${st.dot}`}></span>
                                                                    <div>
                                                                        <p className={`text-sm font-semibold ${st.color}`}>{st.label}</p>
                                                                        {room.syncTime &&
                                                                            <p className="text-xs text-slate-400 dark:text-slate-500">{room.syncTime}</p>}
                                                                        {room.status === "warning" && warningMessage ? (
                                                                            <p className="mt-1 max-w-[240px] text-xs leading-snug text-amber-600 dark:text-amber-300">
                                                                                {warningMessage}
                                                                            </p>
                                                                        ) : null}
                                                                        {room.status === "error" &&
                                                                            <p className="text-xs text-red-400">Kiểm tra
                                                                                lại chỉ số</p>}
                                                                        {room.status === "local" &&
                                                                            <p className="text-xs text-slate-400 dark:text-slate-500">Chưa
                                                                                đồng bộ</p>}
                                                                    </div>
                                                                </div>
                                                            </TableCell>

                                                            {/* Actions */}
                                                            <TableCell
                                                                className="px-4 py-3 border-l border-gray-100 dark:border-white/10 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {room.status === "warning" ? (
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="xs"
                                                                            onClick={() => handleResolveWarning(room)}
                                                                            disabled={isBatchLocked || resolvingWarningRoomId === room.id}
                                                                            className="text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                                                                        >
                                                                            <CheckCircle2 className="h-3.5 w-3.5"/>
                                                                            {requiresMeterReadingCorrection(room)
                                                                                ? "Sửa chỉ số"
                                                                                : resolvingWarningRoomId === room.id ? "Đang lưu" : "Đã kiểm tra"}
                                                                        </Button>
                                                                    ) : null}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setFocusRoomId(room.id)}
                                                                        disabled={isBatchLocked}
                                                                        className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-300 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                                                                        <Edit3 size={16}/>
                                                                    </button>
                                                                </div>
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
                                            const elecCharge = calculateUtilityCharge(elecUsage, electricityTariff);
                                            const isElecError = elecUsage !== null && elecUsage < 0;
                                            const st = STATUS_CONFIG[room.status] || STATUS_CONFIG.pending;
                                            const warningMessage = firstWarningMessage(room);

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
                                                            {room.status === "warning" && warningMessage ? (
                                                                <p className="mt-2 max-w-[220px] text-xs leading-snug text-amber-600 dark:text-amber-300">
                                                                    {warningMessage}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            {room.status === "warning" ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="xs"
                                                                    onClick={() => handleResolveWarning(room)}
                                                                    disabled={isBatchLocked || resolvingWarningRoomId === room.id}
                                                                    className="text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5"/>
                                                                    {requiresMeterReadingCorrection(room)
                                                                        ? "Sửa chỉ số"
                                                                        : resolvingWarningRoomId === room.id ? "Đang lưu" : "Đã kiểm tra"}
                                                                </Button>
                                                            ) : null}
                                                            <button
                                                                type="button"
                                                                onClick={() => setFocusRoomId(room.id)}
                                                                disabled={isBatchLocked}
                                                                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                                                                <Edit3 size={18}/>
                                                            </button>
                                                        </div>
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
                                                                        disabled={isBatchLocked}
                                                                        onChange={(e) => handleCurrChange(room.id, "elecCurr", e.target.value)}
                                                                        placeholder="—"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <span
                                                                        className="text-xs text-slate-400 dark:text-slate-500">Chi phí</span>
                                                                    <span
                                                                        className={`font-semibold ${elecCharge === null ? "text-gray-300" : elecCharge.isInvalid ? "text-red-500 dark:text-rose-300" : elecCharge.amount === 0 ? "text-slate-400 dark:text-slate-500" : "text-green-500 dark:text-green-300"}`}>
                                                                    {elecCharge === null ? "—" : elecCharge.isInvalid ? "Lỗi" : formatVnd(elecCharge.amount)}
                                                                </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                    <div
                                                        className="flex justify-between items-end mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
                                                        <div>
                                                        <span
                                                            className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Ảnh (tùy chọn)</span>
                                                            <PhotoGallery
                                                                 photos={room.photos > 0 ? [MOCK_PHOTOS[0]] : []}
                                                                renderTrigger={(openPhoto) => (
                                                                    <div
                                                                        className={`flex items-center gap-1 ${room.photos > 0 ? "cursor-pointer" : ""}`}
                                                                        onClick={() => room.photos > 0 && openPhoto(0)}
                                                                    >
                                                                        {room.photos > 0 ? (
                                                                            <>
                                                                                <MeterPhoto src={MOCK_PHOTOS[0].src}/>
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
                                                                <p className="text-xs text-red-400">Kiểm tra lại chỉ
                                                                    số</p>}
                                                            {room.status === "local" &&
                                                                <p className="text-xs text-slate-400 dark:text-slate-500">Chưa
                                                                    đồng bộ</p>}
                                                        </div>
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
                            className="w-2 h-2 rounded-full bg-amber-500"></span>Cần kiểm tra</span>
                        <span className="flex items-center gap-1.5"><span
                            className="w-2 h-2 rounded-full bg-orange-400"></span>Chưa đồng bộ</span>
                        <span className="flex items-center gap-1.5"><span
                            className="w-2 h-2 rounded-full bg-red-500"></span>Lỗi chỉ số</span>
                    </div>
                </div>
                <Button
                    onClick={handleCreateOrUpdateBilling}
                    disabled={!canCreateBilling || confirming}
                    className="flex w-full items-center justify-center gap-2 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                >
                    <CheckCircle2 className="h-4 w-4"/>
                    {confirming ? "Đang cập nhật..." : isBatchLocked ? "Đã chốt nhập" : "Tạo/Cập nhật hóa đơn"}
                </Button>
            </div>

            {/* Focus Mode Modal */}
            <Dialog modal={false} open={Boolean(focusedRoom)} onOpenChange={(open) => !open && setFocusRoomId(null)}>
                {focusedRoom ? (
                <DialogContent lockScroll={false} className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden sm:max-w-md">
                    {(() => {
                        const room = focusedRoom;
                        const elecUsage = room.elecCurr !== null ? room.elecCurr - room.elecPrev : null;
                        const elecCharge = calculateUtilityCharge(elecUsage, electricityTariff);
                        const warningMessage = firstWarningMessage(room);

                        return (
                            <>
                                <DialogHeader className="shrink-0">
                                    <DialogTitle className="text-xl">Phòng {room.id}</DialogTitle>
                                </DialogHeader>
                                {room.status === "warning" ? (
                                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold">Cần kiểm tra chỉ số</p>
                                                {warningMessage ? (
                                                    <p className="mt-1 text-xs leading-snug">{warningMessage}</p>
                                                ) : null}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="xs"
                                                onClick={() => handleResolveWarning(room)}
                                                disabled={isBatchLocked || resolvingWarningRoomId === room.id}
                                                className="bg-white/80 text-amber-700 hover:text-amber-800 dark:bg-[#0f172a] dark:text-amber-300 dark:hover:text-amber-200"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5"/>
                                                {requiresMeterReadingCorrection(room)
                                                    ? "Sửa chỉ số"
                                                    : resolvingWarningRoomId === room.id ? "Đang lưu" : "Đã kiểm tra"}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                                <div
                                    className="mt-4 flex w-full shrink-0 touch-pan-x items-center gap-2 overflow-x-auto border-b border-gray-100 pb-3 pr-8 dark:border-white/10">
                                    {filtered.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setFocusRoomId(item.id)}
                                            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${item.id === focusRoomId ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-slate-600 hover:bg-gray-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"}`}
                                        >
                                            {item.id}
                                        </button>
                                    ))}
                                </div>
                                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4 pr-1">
                                    {/* Electricity */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-amber-500"/>
                                                Điện (kWh)
                                            </h4>
                                            {elecUsage !== null && elecUsage < 0 && (
                                                <span
                                                    className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-500 dark:bg-rose-500/10 dark:text-rose-300">
                                                    <AlertTriangle className="h-3.5 w-3.5"/>
                                                    Không hợp lệ
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div
                                                className="bg-gray-50 dark:bg-[#020817] rounded-lg p-3 border border-gray-100 dark:border-white/10">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Số cũ</p>
                                                <p className="font-semibold text-slate-700 dark:text-slate-200">{room.elecPrev.toLocaleString()}</p>
                                            </div>
                                            <div
                                                className="bg-blue-50/50 rounded-lg p-3 border border-blue-100 dark:border-blue-500/20">
                                                <p className="text-xs text-blue-600 dark:text-blue-300 mb-1 font-medium">Số
                                                    mới</p>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full bg-white dark:bg-[#0f172a] text-base border-gray-200 dark:border-white/10 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 border"
                                                    value={room.elecCurr ?? ""}
                                                    disabled={isBatchLocked}
                                                    onChange={(e) => handleCurrChange(room.id, "elecCurr", e.target.value)}
                                                    placeholder="Nhập..."
                                                />
                                            </div>
                                        </div>
                                        {elecCharge ? (
                                            <div
                                                className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span
                                                        className="text-xs font-medium text-slate-500 dark:text-slate-400">Chi phí chênh lệch</span>
                                                    <span
                                                        className={`text-sm font-semibold ${elecCharge.isInvalid ? "text-red-500 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                                                        {elecCharge.isInvalid ? "Lỗi chỉ số" : formatVnd(elecCharge.amount)}
                                                    </span>
                                                </div>
                                                {!elecCharge.isInvalid ? (
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {elecCharge.billableUsage} kWh
                                                        x {formatVnd(elecCharge.unitPrice)}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        {renderEvidenceCapture(room, "electricity", "Ảnh minh chứng điện (tùy chọn)")}
                                    </div>

                                </div>

                                <div
                                    className="mt-4 flex shrink-0 items-center gap-3 border-t border-gray-100 pt-4 dark:border-white/10">
                                    <Button variant="primary" onClick={() => setFocusRoomId(null)}
                                            className="w-1/3">
                                        Đóng
                                    </Button>
                                    <Button onClick={handleSaveAndNext}
                                            disabled={saving || isBatchLocked}
                                            className="w-2/3 bg-blue-600 hover:bg-blue-700">
                                        {saving ? "Đang lưu..." : "Lưu & Tiếp theo"}
                                    </Button>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
                ) : null}
            </Dialog>

            <CameraCapture
                open={!!cameraTarget}
                title="Chụp ảnh đồng hồ điện"
                onClose={() => setCameraTarget(null)}
                onCapture={(photoData) => {
                    if (isBatchLocked) return;
                    if (cameraTarget?.roomId && cameraTarget?.type) {
                        setCapturedPhotos(prev => ({
                            ...prev,
                            [cameraTarget.roomId]: {
                                ...(prev[cameraTarget.roomId] || {}),
                                [cameraTarget.type]: photoData,
                            },
                        }));
                    }
                }}
            />
        </div>
    );
}
