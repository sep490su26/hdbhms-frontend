"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  ImagePlus,
  Loader2,
  MoreVertical,
  Phone,
  Plus,
  RefreshCcw,
  ShieldAlert,
  TimerReset,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useDashboardLayout } from "../_contexts/DashboardLayoutContext";
import {
  approveMaintenanceTicket,
  completeMaintenanceTicket,
  createInternalMaintenanceTicket,
  declineMaintenanceTicket,
  fetchMaintenanceTickets,
  updateMaintenanceRepairInfo,
  uploadMaintenanceImage,
} from "@/services/maintenanceService";
import {
  fetchViewingProperties,
  fetchViewingRooms,
} from "@/services/viewingCustomersService";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import VietnameseMonthPicker from "@/components/dashboard/VietnameseMonthPicker";
import TimeTreeFilter, { buildTreeFromData } from "@/components/dashboard/TimeTreeFilter";
import CostResponsibilityDropdown, {
  normalizeCostResponsibility,
} from "@/components/dashboard/CostResponsibilityDropdown";
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
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import { toDate } from "@/lib/dateFormat";

const STATUS_OPTIONS = [
  ["all", "Tất cả"],
  ["PENDING", "Chờ tiếp nhận"],
  ["ACCEPTED", "Đã tiếp nhận"],
  ["IN_PROGRESS", "Đang xử lý"],
  ["COMPLETED", "Hoàn tất"],
  ["REJECTED", "Từ chối"],
  ["CANCELLED", "Đã hủy"],
];

const STATUS_META = {
  WAITING_TENANT_DECISION: [
    "Chờ khách quyết định",
    "bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300 ring-orange-200 dark:ring-orange-500/20",
  ],
  PENDING: [
    "Chờ tiếp nhận",
    "bg-amber-50 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-300 ring-amber-200 dark:ring-yellow-500/20",
  ],
  ACCEPTED: [
    "Đã tiếp nhận",
    "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20",
  ],
  IN_PROGRESS: [
    "Đang xử lý",
    "bg-indigo-50 dark:bg-blue-500/10 text-indigo-800 dark:text-blue-300 ring-indigo-200 dark:ring-blue-500/20",
  ],
  WAITING_CONFIRMATION: [
    "Chờ xác nhận",
    "bg-violet-50 text-violet-800 ring-violet-200",
  ],
  COMPLETED: [
    "Hoàn tất xử lý",
    "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20",
  ],
  REJECTED: [
    "Từ chối",
    "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20",
  ],
  CANCELLED: ["Đã hủy", "bg-slate-100 text-slate-700 ring-slate-200"],
};

const CATEGORY_OPTIONS = [
  ["all", "Tất cả hạng mục"],
  ["ELECTRICITY", "Điện"],
  ["WATER", "Nước"],
  ["AIR_CONDITIONER", "Máy lạnh"],
  ["DOOR_LOCK", "Khóa cửa"],
  ["INTERNET", "Internet"],
  ["FURNITURE", "Nội thất"],
  ["PAINTING", "Sơn sửa"],
  ["CLEANING", "Vệ sinh"],
  ["SECURITY", "An ninh"],
  ["COMMON_EQUIPMENT", "Thiết bị chung"],
  ["OTHER", "Khác"],
];

const SCOPE_OPTIONS = [
  ["all", "Tất cả phạm vi"],
  ["ROOM", "Phòng thuê"],
  ["COMMON_AREA", "Khu vực chung"],
  ["PROPERTY_OPERATION", "Vận hành cơ sở"],
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.slice(1));
const SCOPE_LABELS = Object.fromEntries(SCOPE_OPTIONS.slice(1));
const ROOM_STATUS_LABELS = {
  DRAFT: "Chưa kích hoạt",
  VACANT: "Phòng trống",
  ON_HOLD: "Tạm giữ",
  RESERVED: "Đã đặt",
  RESERVED_FOR_TRANSFER: "Giữ chuyển phòng",
  OCCUPIED: "Đang ở",
  SOON_VACANT: "Sắp trống",
  EXPIRED: "Đã hết hạn",
};

const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");

function formatDateTime(value) {
  if (!value) return "Chưa có";
  const date = toDate(value);
  if (!date) return "Chưa có";
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `${MONEY_FORMAT.format(Number.isFinite(amount) ? amount : 0)} VNĐ`;
}

function statusMeta(status) {
  return (
    STATUS_META[status] || [
      "Trạng thái chưa xác định",
      "bg-slate-100 text-slate-700 ring-slate-200",
    ]
  );
}

function roomStatusLabel(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return ROOM_STATUS_LABELS[normalized] || "Chưa rõ trạng thái phòng";
}

function StatusBadge({ status }) {
  const [label, className] = statusMeta(status);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label
      className={`grid gap-1.5 text-sm font-bold text-slate-900 dark:text-white ${className}`}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentPreview({ file }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <Image
      src={previewUrl}
      alt={file.name}
      fill
      unoptimized
      sizes="(min-width: 640px) 30vw, 100vw"
      className="object-cover"
    />
  );
}

function CompletionImageSection({
  existingAttachments = [],
  files,
  onChange,
  onRemove,
}) {
  const existingCount = existingAttachments.length;
  const totalCount = existingCount + files.length;
  const canAddMore = totalCount < 3;

  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 shrink-0 text-[#1e40af] dark:text-blue-300" />
            <span className="text-sm font-black text-slate-900 dark:text-white">
              Ảnh sau sửa <span className="text-rose-600">*</span>
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            Bắt buộc ít nhất 1 ảnh · tối đa 3 ảnh · JPG, PNG hoặc WEBP
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
          {totalCount}/3 ảnh
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap gap-3">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f172a]"
          >
            <AttachmentPreview file={file} />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-white opacity-100 shadow-sm transition hover:bg-rose-600"
              aria-label={`Xóa ảnh ${file.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#94a3b8] bg-white text-slate-500 transition hover:border-[#1e40af] hover:bg-blue-50/60 hover:text-[#1e40af] dark:border-white/20 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:border-blue-400 dark:hover:bg-blue-500/10">
            <ImagePlus className="h-6 w-6" />
            <span className="text-[11px] font-black">Thêm ảnh</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onChange}
              className="sr-only"
            />
          </label>
        )}
      </div>
    </section>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) {
  const selectedOption = options.find(
    (option) => String(option.value) === String(value),
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-left text-sm font-semibold text-slate-900 outline-none transition hover:bg-slate-50 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:hover:bg-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-500"
          aria-label={label}
        >
          <span className="truncate">{selectedOption?.label || label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border border-[#d9dde5] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#0f172a]"
      >
        {options.map((option) => {
          const isSelected = String(option.value) === String(value);
          return (
            <DropdownMenuItem
              key={option.value || "all"}
              asChild
              className="rounded-md p-0 focus:bg-transparent"
            >
              <button
                type="button"
                onClick={() => onChange(option.value)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f1f3f5] dark:text-slate-200 dark:hover:bg-white/5 ${
                  isSelected ? "bg-[#f1f3f5] dark:bg-white/5" : ""
                }`}
              >
                <span className="flex-1 truncate text-left">
                  {option.label}
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function inputClassName() {
  return "h-11 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:text-slate-500 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10";
}

function textareaClassName() {
  return "min-h-28 w-full resize-y rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:text-slate-500 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10";
}

function InlineNotice({ type = "info", children }) {
  const tone =
    type === "error"
      ? "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300"
      : "border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-900 dark:text-yellow-300";
  const Icon = type === "error" ? ShieldAlert : AlertCircle;
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${tone}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function UnitBadge() {
  return (
    <div className="inline-flex h-11 shrink-0 overflow-hidden rounded-lg border border-[#dce2ec] bg-white text-xs font-bold shadow-sm dark:border-white/10">
      <span className="inline-flex items-center bg-white px-3 text-[#5f6b7c]">
        Đơn vị: Nghìn VND
      </span>
    </div>
  );
}

function buildDefaultInternalForm(propertyId = "") {
  return {
    propertyId: propertyId ? String(propertyId) : "",
    locationScope: "ROOM",
    roomId: "",
    category: "AIR_CONDITIONER",
    title: "",
    description: "",
    accountingNote: "",
    images: [],
  };
}

function buildCompleteForm(ticket) {
  const nextPeriod = new Date();
  nextPeriod.setMonth(nextPeriod.getMonth() + 1, 1);
  return {
    repairmanName: ticket?.workerName || "",
    repairmanPhone: ticket?.repairmanPhone || "",
    rootCause: ticket?.rootCause || "",
    repairItems: ticket?.repairItems || "",
    actualCost: ticket?.costAmount ? MONEY_FORMAT.format(ticket.costAmount) : "",
    costResponsibility: normalizeCostResponsibility(
      ticket?.ticketScope === "PROPERTY_OPERATION"
        ? "OWNER"
        : ticket?.costResponsibility,
    ),
    collectionMethod: "MONTHLY_SCHEDULED",
    billingPeriod: nextPeriod.toISOString().slice(0, 7),
    completionNote: "",
    images: [],
  };
}

function formatMoneyInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? MONEY_FORMAT.format(Number(digits)) : "";
}

function parseMoneyInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export default function MaintenancePage() {
  const { activeRole, query } = useDashboardLayout();
  const canManage = ["owner", "manager"].includes(activeRole);
  const [tickets, setTickets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState({
    propertyId: "",
    status: "all",
    category: "all",
    scope: "all",
    floorId: "",
    fromDate: "",
    toDate: "",
  });
  const [timeFilter, setTimeFilter] = useState(null);
  const [treeTickets, setTreeTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [isInternalOpen, setIsInternalOpen] = useState(false);
  const [internalForm, setInternalForm] = useState(buildDefaultInternalForm());
  const [internalError, setInternalError] = useState("");
  const [internalSuccess, setInternalSuccess] = useState("");
  const [isCreatingInternal, setIsCreatingInternal] = useState(false);
  const internalCreateLockRef = useRef(false);
  const [completionTicket, setCompletionTicket] = useState(null);
  const [completionForm, setCompletionForm] = useState(buildCompleteForm());
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [editCompletionRepairDetails, setEditCompletionRepairDetails] = useState(false);
  const completionSubmitLockRef = useRef(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fullTreeData = useMemo(
    () =>
      buildTreeFromData(treeTickets, (ticket) =>
        ticket.createdAt || ticket.updatedAt,
      ),
    [treeTickets],
  );

  const propertyOptions = useMemo(() => {
    return properties
      .filter((property) => property?.id)
      .map((property) => ({
        id: String(property.id),
        name: property.name || `Cơ sở ${property.id}`,
      }));
  }, [properties]);

  const roomOptions = useMemo(() => {
    return rooms
      .filter((room) => room?.id)
      .map((room) => {
        return {
          id: String(room.id),
          label: room.roomCode || room.name || `Phòng ${room.id}`,
          floorId: room.floorId ?? room.floor_id ?? room.floor?.id ?? "",
          floorLabel:
            room.floorName ||
            room.floor_name ||
            room.floor?.name ||
            (room.floorId ?? room.floor_id ?? room.floor?.id
              ? `Tang ${room.floorId ?? room.floor_id ?? room.floor?.id}`
              : ""),
          status: String(
            room.status || room.currentStatus || room.current_status || "",
          ).toUpperCase(),
        };
      });
  }, [rooms]);

  const floorOptions = useMemo(() => {
    const floors = new Map();
    roomOptions.forEach((room) => {
      if (!room.floorId) return;
      floors.set(String(room.floorId), {
        value: String(room.floorId),
        label: room.floorLabel || `Tang ${room.floorId}`,
      });
    });
    return [
      { value: "", label: "Tất cả tầng" },
      ...[...floors.values()].sort((left, right) =>
        left.label.localeCompare(right.label, "vi", { numeric: true }),
      ),
    ];
  }, [roomOptions]);

  const loadTickets = useCallback(async () => {
    if (!filters.propertyId) {
      setTickets([]);
      setTotalElements(0);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await fetchMaintenanceTickets({
        ...filters,
        keyword: query || "",
        page: page - 1,
        size,
      });
      setTickets(
        sortByNewest(result.tickets, [
          "createdAt",
          "created_at",
          "updatedAt",
          "updated_at",
        ]),
      );
      setTotalElements(result.total);
      setTotalPages(result.totalPages);
    } catch (loadError) {
      setError(loadError?.message || "Không tải được danh sách phiếu bảo trì.");
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, query, size]);

  useEffect(() => {
    let isMounted = true;

    async function loadProperties() {
      const data = await fetchViewingProperties();
      if (!isMounted) return;
      setProperties(data);
      const firstPropertyId = data[0]?.id ? String(data[0].id) : "";
      if (firstPropertyId) {
        setFilters((current) =>
          current.propertyId
            ? current
            : { ...current, propertyId: firstPropertyId },
        );
        setInternalForm((current) =>
          current.propertyId
            ? current
            : buildDefaultInternalForm(firstPropertyId),
        );
      }
    }

    loadProperties();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadRooms() {
      if (!filters.propertyId) {
        setRooms([]);
        return;
      }
      const data = await fetchViewingRooms(filters.propertyId);
      if (isMounted) setRooms(data);
    }
    loadRooms();
    return () => {
      isMounted = false;
    };
  }, [filters.propertyId]);

  useEffect(() => {
    let isMounted = true;

    async function loadTreeTickets() {
      if (!filters.propertyId) {
        setTreeTickets([]);
        return;
      }
      try {
        const result = await fetchMaintenanceTickets({
          propertyId: filters.propertyId,
          page: 0,
          size: 10000,
        });
        if (isMounted) setTreeTickets(result.tickets || []);
      } catch {
        if (isMounted) setTreeTickets([]);
      }
    }

    loadTreeTickets();
    return () => {
      isMounted = false;
    };
  }, [filters.propertyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTickets();
  }, [loadTickets]);

  function updateFilter(name, value) {
    setPage(1);
    setFilters((current) => {
      const nextFilters = { ...current, [name]: value };
      // Nếu đổi Cơ sở -> Reset Phòng và khoảng thời gian.
      if (name === "propertyId") {
        nextFilters.floorId = "";
        nextFilters.fromDate = "";
        nextFilters.toDate = "";
      }
      return nextFilters;
    });

    if (name === "propertyId") setTimeFilter(null);

    if (name === "propertyId") {
      setInternalForm((current) => ({
        ...current,
        propertyId: value,
        roomId: "",
      }));
    }
  }

  const handleTimeFilterSelect = useCallback((dateSelection) => {
    setTimeFilter(dateSelection);
    setPage(1);

    if (!dateSelection) {
      setFilters((current) => ({ ...current, status: "all", fromDate: "", toDate: "" }));
      return;
    }

    const { year, quarter, month, day } = dateSelection;
    let fromDate = "";
    let toDate = "";

    if (quarter === "all" && month === "all") {
      fromDate = `${year}-01-01`;
      toDate = `${year}-12-31`;
    } else if (month === "all") {
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = quarter * 3;
      const lastDay = new Date(year, endMonth, 0).getDate();
      fromDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
      toDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (day === "all" || day == null) {
      const lastDay = new Date(year, month, 0).getDate();
      fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
      toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      fromDate = date;
      toDate = date;
    }

    setFilters((current) => ({ ...current, status: "all", fromDate, toDate }));
  }, []);

  function updateInternalForm(name, value) {
    setInternalForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "propertyId" ||
      (name === "locationScope" && value === "COMMON_AREA")
        ? { roomId: "" }
        : {}),
    }));
    if (name === "propertyId") updateFilter("propertyId", value);
  }

  function addInternalImages(fileList) {
    const files = Array.from(fileList || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    setInternalForm((current) => ({
      ...current,
      images: [...current.images, ...files].slice(0, 3),
    }));
  }

  function handleInternalImageChange(event) {
    addInternalImages(event.target.files);
    event.target.value = "";
  }

  function handleInternalImageDrop(event) {
    event.preventDefault();
    setIsDraggingImages(false);
    addInternalImages(event.dataTransfer.files);
  }

  async function handleCreateInternalTicket(event) {
    event.preventDefault();
    if (internalCreateLockRef.current) return;
    setInternalError("");
    setInternalSuccess("");
    const propertyId = Number(internalForm.propertyId || filters.propertyId);
    const roomId =
      internalForm.locationScope === "ROOM"
        ? Number(internalForm.roomId)
        : null;
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      setInternalError("Vui lòng chọn cơ sở.");
      return;
    }
    if (
      internalForm.locationScope === "ROOM" &&
      (!Number.isFinite(roomId) || roomId <= 0)
    ) {
      setInternalError("Vui lòng chọn phòng.");
      return;
    }
    if (internalForm.description.trim().length < 10) {
      setInternalError("Mô tả công việc phải có tối thiểu 10 ký tự.");
      return;
    }
    internalCreateLockRef.current = true;
    setIsCreatingInternal(true);
    let didCreate = false;
    try {
      const uploaded = await Promise.all(
        internalForm.images.map((file) => uploadMaintenanceImage(file)),
      );
      await createInternalMaintenanceTicket({
        propertyId,
        roomId,
        ticketScope: "PROPERTY_OPERATION",
        category: internalForm.category,
        title:
          internalForm.title.trim() ||
          `Bảo trì nội bộ - ${CATEGORY_LABELS[internalForm.category] || "Khác"}`,
        description: internalForm.description.trim(),
        actualCost: 0,
        accountingNote: internalForm.accountingNote.trim(),
        costType: "COMMON_OPERATING",
        attachmentIds: uploaded.map((file) => file.fileId).filter(Boolean),
      });
      didCreate = true;
      setInternalSuccess(
        "Đã tạo phiếu bảo trì nội bộ. Chi phí được ghi nhận là chủ trọ chịu và không tạo hóa đơn khách thuê.",
      );
      setInternalForm(buildDefaultInternalForm(String(propertyId)));
      setIsInternalOpen(false);
      await loadTickets();
    } catch (createError) {
      setInternalError(
        createError?.message || "Không tạo được phiếu bảo trì nội bộ.",
      );
    } finally {
      // Keep the lock after success so delayed mobile clicks cannot duplicate it.
      if (!didCreate) internalCreateLockRef.current = false;
      setIsCreatingInternal(false);
    }
  }

  async function handleApprove(ticketId) {
    setActionLoading(`approve-${ticketId}`);
    setError("");
    try {
      await approveMaintenanceTicket(ticketId);
      await loadTickets();
    } catch (approveError) {
      setError(approveError?.message || "Không thể tiếp nhận phiếu.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleDecline(ticketId) {
    const reason = window.prompt("Nhập lý do từ chối phiếu sự cố");
    if (!reason?.trim()) return;
    setActionLoading(`decline-${ticketId}`);
    setError("");
    try {
      await declineMaintenanceTicket(ticketId, reason.trim());
      await loadTickets();
    } catch (declineError) {
      setError(declineError?.message || "Không thể từ chối phiếu.");
    } finally {
      setActionLoading("");
    }
  }

  function handleStartProgress(ticket) {
    if (actionLoading) return;
    // Let Radix finish closing the action menu before mounting the dialog.
    window.setTimeout(() => openCompletionDialog(ticket, true), 140);
  }

  function handleOpenCompletionDialog(ticket) {
    if (actionLoading) return;
    // The completion dialog is launched from the same dropdown menu.
    window.setTimeout(() => openCompletionDialog(ticket), 140);
  }

  function updateCompletionForm(name, value) {
    setCompletionForm((current) => ({
      ...current,
      [name]: name === "actualCost" ? formatMoneyInput(value) : value,
    }));
  }

  function handleCompletionImages(event) {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    const existingCount = completionTicket?.afterAttachments?.length || 0;
    const remainingSlots = Math.max(0, 3 - existingCount);
    setCompletionForm((current) => ({
      ...current,
      images: [...current.images, ...files].slice(0, remainingSlots),
    }));
    event.target.value = "";
  }

  function openCompletionDialog(ticket, editRepairDetails = false) {
    completionSubmitLockRef.current = false;
    setError("");
    setCompletionTicket(ticket);
    setCompletionForm(buildCompleteForm(ticket));
    setEditCompletionRepairDetails(editRepairDetails);
    setIsCompletionOpen(true);
  }

  async function handleCompleteTicket(event) {
    event.preventDefault();
    if (completionSubmitLockRef.current || !completionTicket) return;

    setError("");
    const ticket = completionTicket;
    const isProposal = ticket.status === "ACCEPTED";
    const isEditingRepairDetails = isProposal || editCompletionRepairDetails;
    if (isEditingRepairDetails && !completionForm.repairItems.trim()) {
      setError(isProposal ? "Vui lòng nhập hạng mục dự kiến sửa." : "Vui lòng nhập hạng mục đã sửa.");
      return;
    }
    if (isEditingRepairDetails && !completionForm.repairmanName.trim()) {
      setError("Vui lòng nhập tên thợ sửa hoặc nhân sự xử lý.");
      return;
    }
    if (!isProposal &&
      (ticket.afterAttachments?.length || 0) === 0 &&
      completionForm.images.length === 0
    ) {
      setError("Vui lòng upload ít nhất 1 ảnh sau sửa trước khi hoàn tất.");
      return;
    }
    if (!isProposal &&
      (ticket.afterAttachments?.length || 0) + completionForm.images.length >
      3
    ) {
      setError("Ảnh sau sửa tối đa 3 ảnh.");
      return;
    }
    const amount = parseMoneyInput(completionForm.actualCost);
    if (isEditingRepairDetails) {
      if (!Number.isFinite(amount) || amount < 0) {
        setError(isProposal ? "Chi phí dự kiến không hợp lệ." : "Chi phí thực tế không hợp lệ.");
        return;
      }
      if (!isProposal && ticket.ticketScope === "PROPERTY_OPERATION" && amount <= 0) {
        setError("Vui lòng nhập chi phí thực tế cho phiếu nội bộ.");
        return;
      }
    }

    completionSubmitLockRef.current = true;
    setActionLoading(`complete-${ticket.id}`);
    try {
      const repairPayload = isEditingRepairDetails
        ? {
            repairmanName: completionForm.repairmanName.trim(),
            repairmanPhone: completionForm.repairmanPhone.trim(),
            rootCause: completionForm.rootCause.trim(),
            repairItems: completionForm.repairItems.trim(),
            actualCost: amount,
            costResponsibility: completionForm.costResponsibility,
            costDescription: completionForm.repairItems.trim(),
            completionNote: completionForm.completionNote.trim(),
          }
        : {};
      if (isProposal) {
        await updateMaintenanceRepairInfo(ticket.id, repairPayload);
      } else {
        const uploaded = await Promise.all(
          completionForm.images.map((file) => uploadMaintenanceImage(file)),
        );
        const costResponsibility = isEditingRepairDetails
          ? completionForm.costResponsibility
          : ticket.costResponsibility;
        await completeMaintenanceTicket(ticket.id, {
          ...repairPayload,
          collectionMethod:
            costResponsibility === "TENANT"
              ? completionForm.collectionMethod
              : null,
          billingPeriod:
            costResponsibility === "TENANT" &&
            completionForm.collectionMethod === "MONTHLY_SCHEDULED"
              ? completionForm.billingPeriod
              : null,
          completionNote: completionForm.completionNote.trim(),
          attachmentIds: uploaded.map((file) => file.fileId).filter(Boolean),
          phase: "AFTER",
        });
      }
      setIsCompletionOpen(false);
      setCompletionTicket(null);
      await loadTickets();
    } catch (completeError) {
      completionSubmitLockRef.current = false;
      setError(completeError?.message || "Không thể hoàn tất xử lý phiếu.");
    } finally {
      setActionLoading("");
    }
  }

  const isCompletionProposal = completionTicket?.status === "ACCEPTED";
  const completionRepairDetailsEditable =
    isCompletionProposal || editCompletionRepairDetails;
  const completionCostResponsibility =
    completionRepairDetailsEditable
      ? completionForm.costResponsibility
      : completionTicket?.costResponsibility || completionForm.costResponsibility;

  return (
    <section className="grid gap-6">
      <DashboardPageHeader
        title="Báo cáo sự cố & Bảo trì"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  // Reset the one-shot lock only for a new dialog session.
                  internalCreateLockRef.current = false;
                  setInternalError("");
                  setInternalForm((current) => ({
                    ...current,
                    propertyId:
                      current.propertyId ||
                      filters.propertyId ||
                      propertyOptions[0]?.id ||
                      "",
                  }));
                  setIsInternalOpen(true);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white hover:bg-[#115e59]"
              >
                <Wrench className="h-4 w-4" />
                Tạo phiếu bảo trì nội bộ
              </button>
            )}
          </div>
        }
      />

      {internalSuccess && <InlineNotice>{internalSuccess}</InlineNotice>}

      <Dialog
        open={isInternalOpen}
        onOpenChange={(open) => {
          if (isCreatingInternal) return;
          setIsInternalOpen(open);
          if (!open) setInternalError("");
        }}
      >
        <DialogContent
          lockScroll={false}
          overlayClassName="bg-slate-950/55 supports-backdrop-filter:backdrop-blur-sm"
          overlayProps={{
            "aria-hidden": true,
            onClick: () => (isCreatingInternal ? null : setIsInternalOpen(false)),
            onTouchMove: (event) => event.preventDefault(),
            onWheel: (event) => event.preventDefault(),
          }}
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-950/20 sm:max-w-4xl dark:border-white/10 dark:bg-[#0f172a]"
        >
          <form
            onSubmit={handleCreateInternalTicket}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="shrink-0 border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-start gap-4">
                <DialogHeader className="min-w-0 flex-1 gap-1 text-left">
                  <DialogTitle className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                    Tạo phiếu bảo trì nội bộ
                  </DialogTitle>
                  <DialogDescription className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                    Dùng cho phòng hoặc khu vực chung; chi phí do chủ trọ chịu
                    và không phát sinh hóa đơn cho khách thuê.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex shrink-0 items-start gap-2">
                  <span className="hidden rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-200 sm:inline-flex dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/20">
                    Chi phí nội bộ
                  </span>
                  {!isCreatingInternal && (
                    <button
                      type="button"
                      onClick={() => setIsInternalOpen(false)}
                      className="-mr-2 -mt-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label="Đóng biểu mẫu"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-5">
                {internalError && (
                  <InlineNotice type="error">{internalError}</InlineNotice>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Phạm vi *">
                    <FilterDropdown
                      label="Chọn phạm vi"
                      value={internalForm.locationScope}
                      onChange={(value) =>
                        updateInternalForm("locationScope", value)
                      }
                      options={[
                        { value: "ROOM", label: "Phòng cụ thể" },
                        {
                          value: "COMMON_AREA",
                          label: "Tài sản/khu vực chung",
                        },
                      ]}
                    />
                  </Field>
                  <Field label="Cơ sở *">
                    <FilterDropdown
                      label="Chọn cơ sở"
                      value={internalForm.propertyId}
                      onChange={(value) =>
                        updateInternalForm("propertyId", value)
                      }
                      options={[
                        { value: "", label: "Chọn cơ sở" },
                        ...propertyOptions.map((property) => ({
                          value: property.id,
                          label: property.name,
                        })),
                      ]}
                    />
                  </Field>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {internalForm.locationScope === "ROOM" && (
                    <Field label="Phòng *">
                      <FilterDropdown
                        label={
                          roomOptions.length ? "Chọn phòng" : "Chưa có phòng"
                        }
                        value={internalForm.roomId}
                        onChange={(value) =>
                          updateInternalForm("roomId", value)
                        }
                        disabled={!internalForm.propertyId || roomOptions.length === 0}
                        options={[
                          {
                            value: "",
                            label: roomOptions.length
                              ? "Chọn phòng"
                              : "Chưa có phòng",
                          },
                          ...roomOptions.map((room) => ({
                            value: room.id,
                            label: `${room.label}${room.status ? ` · ${roomStatusLabel(room.status)}` : ""}`,
                          })),
                        ]}
                      />
                    </Field>
                  )}
                  <Field label="Hạng mục *">
                    <FilterDropdown
                      label="Chọn hạng mục"
                      value={internalForm.category}
                      onChange={(value) =>
                        updateInternalForm("category", value)
                      }
                      options={CATEGORY_OPTIONS.slice(1).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                  </Field>
                </div>
                <Field label="Tiêu đề">
                  <input
                    value={internalForm.title}
                    onChange={(event) =>
                      updateInternalForm("title", event.target.value)
                    }
                    className={inputClassName()}
                    placeholder="VD: Sửa điều hòa trước khi cho thuê"
                  />
                </Field>
                <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Mô tả sự cố/công việc *">
              <textarea
                value={internalForm.description}
                onChange={(event) =>
                  updateInternalForm("description", event.target.value)
                }
                className={textareaClassName()}
                placeholder="Mô tả hiện trạng và công việc cần xử lý"
              />
            </Field>
            <Field label="Ghi chú kế toán">
              <textarea
                value={internalForm.accountingNote}
                onChange={(event) =>
                  updateInternalForm("accountingNote", event.target.value)
                }
                className={textareaClassName()}
                placeholder="Nội dung chi phí, nhà cung cấp hoặc ghi chú chứng từ"
              />
            </Field>
                </div>
                <section className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1e40af] dark:bg-blue-500/10 dark:text-blue-300">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-800 dark:text-white">
                          Ảnh/chứng từ
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Không bắt buộc · JPG, PNG hoặc WEBP
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500 ring-1 ring-inset ring-[#d8dee8] dark:bg-[#0f172a] dark:text-slate-300 dark:ring-white/10">
                      {internalForm.images.length}/3
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {internalForm.images.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="group relative min-w-0 overflow-hidden rounded-lg border border-[#d8dee8] bg-white dark:border-white/10 dark:bg-[#0f172a]"
                      >
                        <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-white/10">
                          <AttachmentPreview file={file} />
                          <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            Đã chọn
                          </span>
                        </div>
                        <div className="min-w-0 px-3 py-2.5 pr-10">
                          <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                            {file.name}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setInternalForm((current) => ({
                              ...current,
                              images: current.images.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            }))
                          }
                          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-950/65 text-white transition hover:bg-rose-600"
                          aria-label={`Xóa ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {internalForm.images.length < 3 && (
                      <label
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setIsDraggingImages(true);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDragLeave={() => setIsDraggingImages(false)}
                        onDrop={handleInternalImageDrop}
                        className={
                          isDraggingImages
                            ? "flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1e40af] bg-blue-50 px-3 py-3 text-center text-[#1e40af] dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300"
                            : "flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#9aa8ba] bg-white px-3 py-3 text-center text-slate-600 transition hover:border-[#1e40af] hover:bg-blue-50/60 hover:text-[#1e40af] dark:border-white/20 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:border-blue-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                        }
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#1e40af] dark:bg-blue-500/10 dark:text-blue-300">
                          <ImagePlus className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-black">Thêm ảnh</span>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                          Kéo thả hoặc bấm để chọn · còn {3 - internalForm.images.length}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleInternalImageChange}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </section>
              </div>
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setIsInternalOpen(false)}
              disabled={isCreatingInternal}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-white/5"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isCreatingInternal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-5 text-sm font-bold text-white hover:bg-[#115e59] disabled:opacity-60"
            >
              {isCreatingInternal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tạo phiếu nội bộ
            </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {completionTicket && (
        <Dialog
          modal={false}
          open={isCompletionOpen}
          onOpenChange={(open) => {
            if (actionLoading === `complete-${completionTicket.id}`) return;
            setIsCompletionOpen(open);
            if (!open) {
              setCompletionTicket(null);
              setError("");
            }
          }}
        >
          <DialogContent
            lockScroll={false}
            className="w-[calc(100%-1rem)] !max-w-4xl overflow-hidden rounded-xl border border-[#d8dee8] bg-white p-0 dark:border-white/10 dark:bg-[#0f172a] sm:w-full"
          >
            <form onSubmit={handleCompleteTicket} className="flex max-h-[calc(100dvh-1rem)] min-w-0 flex-col">
              <div className="shrink-0 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <DialogHeader className="gap-1 text-left">
                  <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                    {isCompletionProposal ? "Lập phương án sửa chữa" : "Hoàn tất xử lý"}
                  </DialogTitle>
                  <DialogDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {completionTicket.ticketCode} · {isCompletionProposal
                      ? "Nhập thông tin thợ và chi phí để gửi khách thuê quyết định."
                      : "Ghi nhận kết quả sửa chữa."}
                  </DialogDescription>
                </DialogHeader>
                {error && <div className="mt-3"><InlineNotice type="error">{error}</InlineNotice></div>}
              </div>

              <div className="min-h-0 overflow-y-auto p-5">
                <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                  <Field label="Người sửa">
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={completionForm.repairmanName}
                        onChange={(event) => updateCompletionForm("repairmanName", event.target.value)}
                        readOnly={!completionRepairDetailsEditable}
                        className={`${inputClassName()} pl-9`}
                        placeholder="Tên thợ hoặc nhân sự"
                      />
                    </div>
                  </Field>
                  <Field label="Số điện thoại">
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={completionForm.repairmanPhone}
                        onChange={(event) => updateCompletionForm("repairmanPhone", event.target.value)}
                        readOnly={!completionRepairDetailsEditable}
                        className={`${inputClassName()} pl-9`}
                        placeholder="SĐT liên hệ"
                      />
                    </div>
                  </Field>
                  <Field label="Trách nhiệm chi phí">
                    <CostResponsibilityDropdown
                      value={completionTicket.ticketScope === "PROPERTY_OPERATION" ? "OWNER" : completionCostResponsibility}
                      onChange={(value) => updateCompletionForm("costResponsibility", value)}
                      disabled={!completionRepairDetailsEditable || completionTicket.ticketScope === "PROPERTY_OPERATION"}
                    />
                  </Field>
                </div>

                {!isCompletionProposal && completionCostResponsibility === "TENANT" && (
                  <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
                    <Field label="Cách thu tiền *">
                      <select
                        value={completionForm.collectionMethod}
                        onChange={(event) => updateCompletionForm("collectionMethod", event.target.value)}
                        className={inputClassName()}
                      >
                        <option value="BILL_NOW">Thanh toán hóa đơn ngay</option>
                        <option value="MONTHLY_SCHEDULED">Gộp vào hóa đơn đầu tháng</option>
                      </select>
                    </Field>
                    {completionForm.collectionMethod === "MONTHLY_SCHEDULED" && (
                      <Field label="Kỳ hóa đơn gộp *">
                        <VietnameseMonthPicker
                          value={completionForm.billingPeriod}
                          onChange={(value) => updateCompletionForm("billingPeriod", value)}
                        />
                      </Field>
                    )}
                  </div>
                )}

                <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
                  <Field label="Nguyên nhân">
                    <textarea
                      value={completionForm.rootCause}
                      onChange={(event) => updateCompletionForm("rootCause", event.target.value)}
                      readOnly={!completionRepairDetailsEditable}
                      className={textareaClassName()}
                      placeholder="Nguyên nhân sự cố"
                    />
                  </Field>
                  <Field label={isCompletionProposal ? "Hạng mục dự kiến sửa *" : "Hạng mục đã sửa *"}>
                    <textarea
                      value={completionForm.repairItems}
                      onChange={(event) => updateCompletionForm("repairItems", event.target.value)}
                      readOnly={!completionRepairDetailsEditable}
                      className={textareaClassName()}
                      placeholder={isCompletionProposal ? "Các việc dự kiến thực hiện" : "Các việc đã xử lý"}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
                  <Field label={isCompletionProposal ? "Chi phí dự kiến (VNĐ) *" : "Chi phí thực tế (VNĐ)"}>
                    <input
                      value={completionForm.actualCost}
                      onChange={(event) => updateCompletionForm("actualCost", event.target.value)}
                      readOnly={!completionRepairDetailsEditable}
                      className={`${inputClassName()} tabular-nums`}
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </Field>
                  <Field label={isCompletionProposal ? "Ghi chú gửi khách" : "Ghi chú hoàn tất"}>
                    <input
                      value={completionForm.completionNote}
                      onChange={(event) => updateCompletionForm("completionNote", event.target.value)}
                      className={inputClassName()}
                      placeholder={isCompletionProposal ? "Thông tin thêm cho khách thuê" : "Ghi chú hoàn tất nếu có"}
                    />
                  </Field>
                </div>

                {!isCompletionProposal && !editCompletionRepairDetails && (
                  <button
                    type="button"
                    onClick={() => setEditCompletionRepairDetails(true)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-[#cbd5e1] px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    Chỉnh sửa thông tin thực tế
                  </button>
                )}
                {!isCompletionProposal && <CompletionImageSection
                  existingAttachments={completionTicket.afterAttachments}
                  files={completionForm.images}
                  onChange={handleCompletionImages}
                  onRemove={(index) =>
                    setCompletionForm((current) => ({
                      ...current,
                      images: current.images.filter(
                        (_, fileIndex) => fileIndex !== index,
                      ),
                    }))
                  }
                />}
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-5 py-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setIsCompletionOpen(false)}
                  disabled={actionLoading === `complete-${completionTicket.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-white/5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={Boolean(actionLoading)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCompletionProposal ? "Gửi phương án cho khách" : "Xác nhận hoàn tất"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex gap-[24px]">
        <TimeTreeFilter
          treeData={fullTreeData}
          selectedDate={timeFilter}
          onDateSelect={handleTimeFilterSelect}
          className="hidden lg:flex"
        />

        <div className="w-full min-w-0 flex-1 space-y-4">
      <section className="overflow-hidden rounded-lg border border-[#cfd5de] bg-white shadow-[0_1px_1px_rgba(9,20,38,0.03)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="border-b border-[#d9dde5] bg-[#f8fafc] px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FilterDropdown
                label="Chọn cơ sở"
                value={filters.propertyId}
                onChange={(value) => updateFilter("propertyId", value)}
                disabled={propertyOptions.length <= 1 && activeRole === "manager"}
                options={[
                  { value: "", label: "Chọn cơ sở" },
                  ...propertyOptions.map((property) => ({
                    value: property.id,
                    label: property.name,
                  })),
                ]}
              />

              <FilterDropdown
                label="Tất cả tầng"
                value={filters.floorId}
                onChange={(value) => updateFilter("floorId", value)}
                disabled={!filters.propertyId || floorOptions.length === 0}
                options={floorOptions}
              />

              <FilterDropdown
                label="Tất cả phạm vi"
                value={filters.scope}
                onChange={(value) => updateFilter("scope", value)}
                options={SCOPE_OPTIONS.map(([value, label]) => ({ value, label }))}
              />

              <FilterDropdown
                label="Tất cả hạng mục"
                value={filters.category}
                onChange={(value) => updateFilter("category", value)}
                options={CATEGORY_OPTIONS.map(([value, label]) => ({ value, label }))}
              />

            </div>

            {/* Trạng thái nằm ở hàng riêng như các màn hình có filter dạng pill. */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {STATUS_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateFilter("status", value)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                    filters.status === value
                      ? "bg-[#1e40af] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && <InlineNotice type="error">{error}</InlineNotice>}

      <section className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="dashboard-table">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#f2f4f6] dark:bg-white/5">
              <tr className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                <th className="px-5 py-4 text-center">Phiếu</th>
                <th className="px-5 py-4 text-center">Phòng</th>
                <th className="px-5 py-4 text-center">Hạng mục</th>
                <th className="px-5 py-4 text-center">Trạng thái</th>
                <th className="px-5 py-4 text-center">Cập nhật</th>
                <th className="px-5 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải danh sách phiếu...
                    </span>
                  </td>
                </tr>
              )}
              {!isLoading &&
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-t border-[#e2e8f0] dark:border-white/10 align-top"
                  >
                    <td data-label="Phiếu" className="px-5 py-4">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/maintenance/${ticket.id}`}
                          className="font-black text-slate-900 dark:text-white hover:text-[#3156b6]"
                        >
                          {ticket.title || ticket.description}
                        </Link>
                        <p className="mt-1 max-w-72 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {ticket.ticketCode}
                        </p>
                      </div>
                    </td>
                    <td
                      data-label="Vị trí"
                      className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center align-middle "
                    >
                      <p>
                        {ticket.roomCode ||
                          ticket.roomName ||
                          SCOPE_LABELS[ticket.ticketScope] ||
                          "Khu vực chưa xác định"}
                      </p>
                    </td>
                    <td
  data-label="Hạng mục"
  className="px-5 py-4 text-center text-sm font-bold text-slate-700 dark:text-slate-200 align-middle"
>
  {ticket.ticketScope === "PROPERTY_OPERATION" ? (
    <span className="inline-flex flex-col items-center gap-1">
      <span className="inline-flex w-fit rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-200">
        Bảo trì nội bộ
      </span>
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
        {CATEGORY_LABELS[ticket.category] || "Khác"}
      </span>
    </span>
  ) : (
    <span className="inline-flex flex-col items-center gap-1">
      <span>
        {CATEGORY_LABELS[ticket.category] || "Khác"}
      </span>
      <span
        className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${
          ticket.repairRequested === false
            ? "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"
            : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
        }`}
      >
        {ticket.repairRequested === false
          ? "Chỉ báo sự cố"
          : "Cần sửa chữa"}
      </span>
    </span>
  )}
</td>
                    <td data-label="Trạng thái" className="px-5 py-4 align-middle text-center">
                      <StatusBadge
                        status={ticket.ticketStatus || ticket.status}
                      />
                    </td>
                    <td
                      data-label="Cập nhật"
                      className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 align-middle text-center"
                    >
                      {formatDateTime(ticket.updatedAt || ticket.createdAt)}
                    </td>
                    <td data-label="Thao tác" className="px-5 py-4 align-middle ">
                      <div className="flex justify-center">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8dee8] text-slate-600 transition hover:border-[#1e40af] hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
                              aria-label={`Thao tác với ${ticket.ticketCode}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 rounded-lg border border-[#d9dde5] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#0f172a]"
                          >
                            <DropdownMenuItem
                              asChild
                              className="rounded-md p-0 focus:bg-transparent"
                            >
                              <Link
                                href={`/dashboard/maintenance/${ticket.id}`}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#f1f3f5] dark:text-slate-200 dark:hover:bg-white/5"
                              >
                                <Eye className="h-4 w-4" />
                                Xem chi tiết
                              </Link>
                            </DropdownMenuItem>
                            {canManage && ticket.status === "PENDING" && (
                              <>
                                <DropdownMenuItem
                                  asChild
                                  className="rounded-md p-0 focus:bg-transparent"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleApprove(ticket.id)}
                                    disabled={Boolean(actionLoading)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                                  >
                                    {actionLoading === `approve-${ticket.id}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                    Tiếp nhận
                                  </button>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  asChild
                                  className="rounded-md p-0 focus:bg-transparent"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleDecline(ticket.id)}
                                    disabled={Boolean(actionLoading)}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10"
                                  >
                                    {actionLoading === `decline-${ticket.id}` ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <X className="h-4 w-4" />
                                    )}
                                    Từ chối
                                  </button>
                                </DropdownMenuItem>
                              </>
                            )}
                            {canManage && ticket.status === "ACCEPTED" && (
                              <DropdownMenuItem
                                asChild
                                className="rounded-md p-0 focus:bg-transparent"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleStartProgress(ticket)}
                                  disabled={Boolean(actionLoading)}
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-300 dark:hover:bg-blue-500/10"
                                >
                                    {actionLoading === `complete-${ticket.id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Wrench className="h-4 w-4" />
                                  )}
                                  Xử lý
                                </button>
                              </DropdownMenuItem>
                            )}
                            {canManage && ticket.status === "IN_PROGRESS" && (
                              <DropdownMenuItem
                                asChild
                                className="rounded-md p-0 focus:bg-transparent"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenCompletionDialog(ticket)}
                                  disabled={Boolean(actionLoading)}
                                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                >
                                  <TimerReset className="h-4 w-4" />
                                  Hoàn tất xử lý
                                </button>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              {!isLoading && tickets.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-400"
                  >
                    Không có phiếu bảo trì phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DashboardPagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          itemLabel="phiếu"
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
        />
      </section>
        </div>
      </div>
    </section>
  );
}
