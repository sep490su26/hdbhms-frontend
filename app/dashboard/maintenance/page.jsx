"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Clock3,
  Eye,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  TimerReset,
  Wrench,
  X,
} from "lucide-react";
import { useDashboardLayout } from "../_contexts/DashboardLayoutContext";
import {
  approveMaintenanceTicket,
  createInternalMaintenanceTicket,
  declineMaintenanceTicket,
  fetchMaintenanceTickets,
  uploadMaintenanceImage,
} from "@/services/maintenanceService";
import {
  fetchViewingProperties,
  fetchViewingRooms,
} from "@/services/viewingCustomersService";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { sortByNewest } from "@/lib/sortByNewest.mjs";

const STATUS_OPTIONS = [
  ["all", "Tất cả trạng thái"],
  ["PENDING", "Chờ tiếp nhận"],
  ["ACCEPTED", "Đã tiếp nhận"],
  ["IN_PROGRESS", "Đang xử lý"],
  ["WAITING_CONFIRMATION", "Chờ xác nhận"],
  ["COMPLETED", "Hoàn tất"],
  ["REJECTED", "Từ chối"],
];

const STATUS_META = {
  PENDING: ["Chờ tiếp nhận", "bg-amber-50 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-300 ring-amber-200 dark:ring-yellow-500/20"],
  ACCEPTED: ["Đã tiếp nhận", "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20"],
  IN_PROGRESS: ["Đang xử lý", "bg-indigo-50 dark:bg-blue-500/10 text-indigo-800 dark:text-blue-300 ring-indigo-200 dark:ring-blue-500/20"],
  WAITING_CONFIRMATION: [
    "Chờ xác nhận",
    "bg-violet-50 text-violet-800 ring-violet-200",
  ],
  COMPLETED: [
    "Hoàn tất xử lý",
    "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20",
  ],
  REJECTED: ["Từ chối", "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20"],
  CANCELLED: ["Đã hủy", "bg-slate-100 text-slate-700 ring-slate-200"],
};

const BILLING_META = {
  NO_CHARGE: ["Không thu khách", "bg-slate-100 text-slate-700 ring-slate-200"],
  NOT_INVOICED: [
    "Chưa tạo hóa đơn",
    "bg-amber-50 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-300 ring-amber-200 dark:ring-yellow-500/20",
  ],
  DRAFT: ["Chờ phát hành", "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20"],
  PENDING_PAYMENT: [
    "Chờ thanh toán",
    "bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300 ring-orange-200 dark:ring-orange-500/20",
  ],
  PARTIALLY_PAID: [
    "Thanh toán một phần",
    "bg-indigo-50 dark:bg-blue-500/10 text-indigo-800 dark:text-blue-300 ring-indigo-200 dark:ring-blue-500/20",
  ],
  PAID: ["Đã thanh toán", "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20"],
  OVERDUE: ["Quá hạn", "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20"],
  VOIDED: ["Đã hủy", "bg-slate-100 text-slate-700 ring-slate-200"],
};

const CATEGORY_OPTIONS = [
  ["all", "Tất cả hạng mục"],
  ["RULE_VIOLATION", "Vi phạm nội quy"],
  ["ELECTRICITY", "Điện"],
  ["WATER", "Nước"],
  ["AIR_CONDITIONER", "Máy lạnh"],
  ["DOOR_LOCK", "Khóa cửa"],
  ["INTERNET", "Internet"],
  ["FURNITURE", "Nội thất"],
  ["PAINTING", "Sơn sửa"],
  ["CLEANING", "Vệ sinh"],
  ["SANITARY", "Vệ sinh"],
  ["SECURITY", "An ninh"],
  ["COMMON_EQUIPMENT", "Thiết bị chung"],
  ["OTHER", "Khác"],
];

const PRIORITY_OPTIONS = [
  ["all", "Tất cả mức độ"],
  ["LOW", "Thấp"],
  ["MEDIUM", "Trung bình"],
  ["HIGH", "Cao"],
  ["URGENT", "Khẩn cấp"],
];

const SCOPE_OPTIONS = [
  ["all", "Tất cả phạm vi"],
  ["ROOM", "Phòng thuê"],
  ["COMMON_AREA", "Khu vực chung"],
  ["PROPERTY_OPERATION", "Vận hành cơ sở"],
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_OPTIONS.slice(1));
const PRIORITY_LABELS = Object.fromEntries(PRIORITY_OPTIONS.slice(1));
const SCOPE_LABELS = Object.fromEntries(SCOPE_OPTIONS.slice(1));

const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");

function formatDateTime(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN", {
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
      status || "Không rõ",
      "bg-slate-100 text-slate-700 ring-slate-200",
    ]
  );
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

function BillingBadge({ status, label }) {
  const [fallbackLabel, className] =
    BILLING_META[status] || BILLING_META.NO_CHARGE;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}
    >
      {label || fallbackLabel}
    </span>
  );
}

function shouldShowBillingStatus(ticket) {
  if (ticket?.ticketScope === "PROPERTY_OPERATION") return true;
  const ticketStatus = String(
    ticket?.ticketStatus || ticket?.status || "",
  ).toUpperCase();
  if (
    ticketStatus === "PENDING" ||
    ticketStatus === "PENDING_ACCEPTANCE" ||
    ticketStatus === "ACCEPTED"
  ) {
    return false;
  }
  return Boolean(ticket?.billingStatus);
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

function selectClassName() {
  return "h-11 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10";
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

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <article className="min-h-28 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 truncate text-2xl font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </article>
  );
}

function buildDefaultInternalForm(propertyId = "") {
  return {
    propertyId: propertyId ? String(propertyId) : "",
    locationScope: "ROOM",
    roomId: "",
    category: "AIR_CONDITIONER",
    priority: "MEDIUM",
    title: "",
    description: "",
    accountingNote: "",
    images: [],
  };
}

export default function MaintenancePage() {
  const { activeRole, query } = useDashboardLayout();
  const canManage = ["owner", "manager"].includes(activeRole);
  const [tickets, setTickets] = useState([]);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState({
    keyword: "",
    propertyId: "",
    status: "all",
    category: "all",
    severity: "all",
    scope: "all",
    roomId: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [isInternalOpen, setIsInternalOpen] = useState(false);
  const [internalForm, setInternalForm] = useState(buildDefaultInternalForm());
  const [internalError, setInternalError] = useState("");
  const [internalSuccess, setInternalSuccess] = useState("");
  const [isCreatingInternal, setIsCreatingInternal] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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
      .map((room) => ({
        id: String(room.id),
        label: room.roomCode || room.name || `Phòng ${room.id}`,
        status: String(
          room.status || room.currentStatus || room.current_status || "",
        ).toUpperCase(),
      }));
  }, [rooms]);
  const metrics = useMemo(() => {
    const count = (statuses) =>
      tickets.filter((ticket) => statuses.includes(ticket.status)).length;
    const totalCost = tickets.reduce(
      (sum, ticket) => sum + Number(ticket.costAmount || 0),
      0,
    );
    const landlordCost = tickets
      .filter(
        (ticket) => String(ticket.payer || "").toUpperCase() === "LANDLORD",
      )
      .reduce((sum, ticket) => sum + Number(ticket.costAmount || 0), 0);
    return [
      {
        label: "Chờ tiếp nhận",
        value: count(["PENDING"]),
        icon: Clock3,
        tone: "bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300",
      },
      {
        label: "Đang xử lý",
        value: count(["ACCEPTED", "IN_PROGRESS"]),
        icon: Wrench,
        tone: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
      },
      {
        label: "Chờ xác nhận",
        value: count(["WAITING_CONFIRMATION"]),
        icon: TimerReset,
        tone: "bg-violet-50 text-violet-700",
      },
      {
        label: "Chi phí ghi nhận",
        value: formatMoney(totalCost),
        icon: Check,
        tone: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      },
      {
        label: "Chi phí chủ trọ chịu",
        value: formatMoney(landlordCost),
        icon: Wrench,
        tone: "bg-slate-100 text-slate-700",
      },
    ];
  }, [tickets]);

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
      const keyword = filters.keyword || query || "";
      const result = await fetchMaintenanceTickets({
        ...filters,
        keyword,
        page: page - 1,
        size,
      });
      setTickets(sortByNewest(result.tickets, ["createdAt", "created_at", "updatedAt", "updated_at"]));
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTickets();
  }, [loadTickets]);

  function updateFilter(name, value) {
    setPage(1);
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === "propertyId" ? { roomId: "" } : {}),
    }));
    if (name === "propertyId") {
      setInternalForm((current) => ({
        ...current,
        propertyId: value,
        roomId: "",
      }));
    }
  }

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

  function handleInternalImageChange(event) {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    setInternalForm((current) => ({
      ...current,
      images: [...current.images, ...files].slice(0, 3),
    }));
    event.target.value = "";
  }

  async function handleCreateInternalTicket(event) {
    event.preventDefault();
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
    setIsCreatingInternal(true);
    try {
      const uploaded = await Promise.all(
        internalForm.images.map((file) => uploadMaintenanceImage(file)),
      );
      await createInternalMaintenanceTicket({
        propertyId,
        roomId,
        ticketScope: "PROPERTY_OPERATION",
        category: internalForm.category,
        priority: internalForm.priority,
        title:
          internalForm.title.trim() ||
          `Bảo trì nội bộ - ${CATEGORY_LABELS[internalForm.category] || "Khác"}`,
        description: internalForm.description.trim(),
        actualCost: 0,
        accountingNote: internalForm.accountingNote.trim(),
        costType: "COMMON_OPERATING",
        attachmentIds: uploaded.map((file) => file.fileId).filter(Boolean),
      });
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

  return (
    <section className="grid gap-6">
      <DashboardPageHeader
        title="Báo sự cố & Bảo trì"
        description="Theo dõi phiếu sự cố từ lúc tiếp nhận, xử lý, chờ xác nhận đến hoàn tất."
        actions={
          <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadTickets}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 text-sm font-bold text-slate-900 dark:text-white hover:bg-[#f8fafc] dark:hover:bg-white/5"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setInternalForm((current) => ({
                  ...current,
                  propertyId:
                    current.propertyId ||
                    filters.propertyId ||
                    propertyOptions[0]?.id ||
                    "",
                }));
                setIsInternalOpen((value) => !value);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-4 text-sm font-bold text-white hover:bg-[#115e59]"
            >
              {isInternalOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              {isInternalOpen ? "Đóng phiếu nội bộ" : "Tạo phiếu nội bộ"}
            </button>
          )}
          </div>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-4">
        {metrics.map((item) => (
          <Metric key={item.label} {...item} />
        ))}
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
        Chi phí ghi nhận là tổng chi phí/phạt đã ghi nhận, không đồng nghĩa đã
        thanh toán. Xem badge thanh toán trên từng phiếu để biết trạng thái thu
        tiền.
      </p>

      {internalSuccess && <InlineNotice>{internalSuccess}</InlineNotice>}

      {isInternalOpen && (
        <form
          onSubmit={handleCreateInternalTicket}
          className="grid gap-5 rounded-xl border border-teal-200 bg-white dark:bg-[#0f172a] p-5 shadow-[0_8px_30px_rgba(15,118,110,0.08)]"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Tạo phiếu bảo trì nội bộ
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Dùng cho phòng hoặc khu vực chung; chi phí do chủ trọ chịu và
                không phát sinh hóa đơn tenant.
              </p>
            </div>
            <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-200">
              Chi phí nội bộ
            </span>
          </div>
          {internalError && (
            <InlineNotice type="error">{internalError}</InlineNotice>
          )}
          <div
            className={`grid gap-5 ${internalForm.locationScope === "ROOM" ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            <Field label="Phạm vi *">
              <select
                value={internalForm.locationScope}
                onChange={(event) =>
                  updateInternalForm("locationScope", event.target.value)
                }
                className={selectClassName()}
              >
                <option value="ROOM">Phòng cụ thể</option>
                <option value="COMMON_AREA">Tài sản/khu vực chung</option>
              </select>
            </Field>
            <Field label="Cơ sở *">
              <select
                value={internalForm.propertyId}
                onChange={(event) =>
                  updateInternalForm("propertyId", event.target.value)
                }
                className={selectClassName()}
              >
                <option value="">Chọn cơ sở</option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </Field>
            {internalForm.locationScope === "ROOM" && (
              <Field label="Phòng *">
                <select
                  value={internalForm.roomId}
                  onChange={(event) =>
                    updateInternalForm("roomId", event.target.value)
                  }
                  className={selectClassName()}
                >
                  <option value="">Chọn phòng</option>
                  {roomOptions.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.label}
                      {room.status ? ` · ${room.status}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Hạng mục *">
              <select
                value={internalForm.category}
                onChange={(event) =>
                  updateInternalForm("category", event.target.value)
                }
                className={selectClassName()}
              >
                {CATEGORY_OPTIONS.slice(1)
                  .filter(([value]) => value !== "RULE_VIOLATION")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Mức độ">
              <select
                value={internalForm.priority}
                onChange={(event) =>
                  updateInternalForm("priority", event.target.value)
                }
                className={selectClassName()}
              >
                {PRIORITY_OPTIONS.slice(1).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
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
          </div>
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              {internalForm.images.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative flex h-20 w-32 items-center justify-center rounded-lg border border-[#d8dee8] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 px-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  <span className="line-clamp-2">{file.name}</span>
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
                    className="absolute right-1 top-1 rounded-full bg-[#091426]/80 p-1 text-white"
                    aria-label="Xóa ảnh"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {internalForm.images.length < 3 && (
                <label className="flex h-20 w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#94a3b8] bg-[#f8fafc] dark:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <ImagePlus className="h-5 w-5" />
                  Ảnh/chứng từ
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
            <button
              type="submit"
              disabled={isCreatingInternal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-5 text-sm font-bold text-white hover:bg-[#115e59] disabled:opacity-60"
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
      )}

      <div className="grid gap-4 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
          <SlidersHorizontal className="h-4 w-4" />
          Bộ lọc
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              className={`${inputClassName()} w-full pl-9`}
              placeholder="Tìm theo mã phiếu"
            />
          </label>
          <select
            value={filters.propertyId}
            onChange={(event) => updateFilter("propertyId", event.target.value)}
            disabled={propertyOptions.length <= 1 && activeRole === "manager"}
            className={selectClassName()}
          >
            <option value="">Chọn cơ sở</option>
            {propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
            className={selectClassName()}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
            className={selectClassName()}
          >
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filters.severity}
            onChange={(event) => updateFilter("severity", event.target.value)}
            className={selectClassName()}
          >
            {PRIORITY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filters.scope}
            onChange={(event) => updateFilter("scope", event.target.value)}
            className={selectClassName()}
          >
            {SCOPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {filters.propertyId && (
          <select
            value={filters.roomId}
            onChange={(event) => updateFilter("roomId", event.target.value)}
            className={`${selectClassName()} max-w-xs`}
          >
            <option value="">
              {roomOptions.length > 0 ? "Tất cả phòng" : "Chưa có phòng"}
            </option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <InlineNotice type="error">{error}</InlineNotice>}

      <section className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="dashboard-table">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#f2f4f6] dark:bg-white/5">
              <tr className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
                <th className="px-5 py-4">Phiếu</th>
                <th className="px-5 py-4">Vị trí</th>
                <th className="px-5 py-4">Hạng mục</th>
                <th className="px-5 py-4">Mức độ</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Cập nhật</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
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
                          {ticket.ticketCode}
                        </Link>
                        <p className="mt-1 max-w-72 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {ticket.title || ticket.description}
                        </p>
                      </div>
                    </td>
                    <td
                      data-label="Vị trí"
                      className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <p>
                        {ticket.roomCode ||
                          ticket.roomName ||
                          SCOPE_LABELS[ticket.ticketScope] ||
                          ticket.ticketScope}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {ticket.propertyName || "Chưa có cơ sở"}
                      </p>
                    </td>
                    <td
                      data-label="Hạng mục"
                      className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      {ticket.ticketScope === "PROPERTY_OPERATION" ? (
                        <span className="inline-flex flex-col gap-1">
                          <span className="inline-flex w-fit rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-200">
                            Bảo trì nội bộ
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {CATEGORY_LABELS[ticket.category] ||
                              ticket.category ||
                              "Khác"}
                          </span>
                        </span>
                      ) : ticket.category === "RULE_VIOLATION" ? (
                        <span className="inline-flex flex-col gap-1">
                          <span className="inline-flex w-fit rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 text-xs font-black text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-500/20">
                            Vi phạm nội quy
                          </span>
                          <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                            Reset wifi · Phạt vi phạm nội quy
                          </span>
                        </span>
                      ) : (
                        CATEGORY_LABELS[ticket.category] ||
                        ticket.category ||
                        "Khác"
                      )}
                    </td>
                    <td
                      data-label="Mức độ"
                      className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      {PRIORITY_LABELS[ticket.priority] ||
                        ticket.priority ||
                        "Trung bình"}
                    </td>
                    <td data-label="Trạng thái" className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge
                          status={ticket.ticketStatus || ticket.status}
                        />
                        {shouldShowBillingStatus(ticket) && (
                          <BillingBadge
                            status={ticket.billingStatus}
                            label={ticket.billingStatusLabel}
                          />
                        )}
                        {ticket.ticketScope === "PROPERTY_OPERATION" && (
                          <>
                            <span className="text-xs font-black text-teal-700">
                              Chi phí nội bộ · Chủ trọ chịu
                            </span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {formatMoney(ticket.costAmount)}
                            </span>
                          </>
                        )}
                        {ticket.invoiceCode && (
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {ticket.invoiceCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      data-label="Cập nhật"
                      className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300"
                    >
                      {formatDateTime(ticket.updatedAt || ticket.createdAt)}
                    </td>
                    <td data-label="Thao tác" className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/maintenance/${ticket.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8dee8] dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#1e40af] hover:text-slate-900 dark:hover:text-white"
                          aria-label={`Xem ${ticket.ticketCode}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canManage && ticket.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(ticket.id)}
                              disabled={Boolean(actionLoading)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 disabled:opacity-60"
                              aria-label="Tiếp nhận"
                            >
                              {actionLoading === `approve-${ticket.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecline(ticket.id)}
                              disabled={Boolean(actionLoading)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/10 disabled:opacity-60"
                              aria-label="Từ chối"
                            >
                              {actionLoading === `decline-${ticket.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              {!isLoading && tickets.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
    </section>
  );
}
