"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  createMaintenanceTicket,
  createMaintenanceViolation,
  declineMaintenanceTicket,
  fetchMaintenanceTickets,
  uploadMaintenanceImage,
} from "@/services/maintenanceService";
import { fetchViewingProperties, fetchViewingRooms } from "@/services/viewingCustomersService";

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
  PENDING: ["Chờ tiếp nhận", "bg-amber-50 text-amber-800 ring-amber-200"],
  ACCEPTED: ["Đã tiếp nhận", "bg-blue-50 text-blue-800 ring-blue-200"],
  IN_PROGRESS: ["Đang xử lý", "bg-indigo-50 text-indigo-800 ring-indigo-200"],
  WAITING_CONFIRMATION: ["Chờ xác nhận", "bg-violet-50 text-violet-800 ring-violet-200"],
  COMPLETED: ["Hoàn tất", "bg-emerald-50 text-emerald-800 ring-emerald-200"],
  REJECTED: ["Từ chối", "bg-rose-50 text-rose-800 ring-rose-200"],
  CANCELLED: ["Đã hủy", "bg-slate-100 text-slate-700 ring-slate-200"],
};

const BILLING_META = {
  NO_CHARGE: ["Không thu khách", "bg-slate-100 text-slate-700 ring-slate-200"],
  NOT_INVOICED: ["Chưa tạo hóa đơn", "bg-amber-50 text-amber-800 ring-amber-200"],
  PENDING_PAYMENT: ["Chờ thanh toán", "bg-orange-50 text-orange-800 ring-orange-200"],
  PAID: ["Đã thanh toán", "bg-emerald-50 text-emerald-800 ring-emerald-200"],
  OVERDUE: ["Quá hạn", "bg-rose-50 text-rose-800 ring-rose-200"],
  FAILED: ["Thanh toán thất bại", "bg-rose-50 text-rose-800 ring-rose-200"],
};

const CATEGORY_OPTIONS = [
  ["all", "Tất cả hạng mục"],
  ["RULE_VIOLATION", "Vi phạm nội quy"],
  ["ELECTRICITY", "Điện"],
  ["WATER", "Nước"],
  ["AIR_CONDITIONER", "Máy lạnh"],
  ["INTERNET", "Internet"],
  ["FURNITURE", "Nội thất"],
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
  return `${MONEY_FORMAT.format(Number.isFinite(amount) ? amount : 0)} đ`;
}

function formatMoneyInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return MONEY_FORMAT.format(Number(digits));
}

function statusMeta(status) {
  return STATUS_META[status] || [status || "Không rõ", "bg-slate-100 text-slate-700 ring-slate-200"];
}

function StatusBadge({ status }) {
  const [label, className] = statusMeta(status);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>
      {label}
    </span>
  );
}

function BillingBadge({ status, label }) {
  const [fallbackLabel, className] = BILLING_META[status] || BILLING_META.NO_CHARGE;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>
      {label || fallbackLabel}
    </span>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-[#091426] ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function selectClassName() {
  return "h-11 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#4166b2] focus:ring-2 focus:ring-[#4166b2]/10";
}

function inputClassName() {
  return "h-11 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-[#091426] outline-none placeholder:text-[#94a3b8] focus:border-[#4166b2] focus:ring-2 focus:ring-[#4166b2]/10";
}

function textareaClassName() {
  return "min-h-28 resize-y rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold text-[#091426] outline-none placeholder:text-[#94a3b8] focus:border-[#4166b2] focus:ring-2 focus:ring-[#4166b2]/10";
}

function InlineNotice({ type = "info", children }) {
  const tone = type === "error"
    ? "border-rose-200 bg-rose-50 text-rose-800"
    : "border-amber-200 bg-amber-50 text-amber-900";
  const Icon = type === "error" ? ShieldAlert : AlertCircle;
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${tone}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <article className="min-h-28 rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-black uppercase text-[#64748b]">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 truncate text-2xl font-black text-[#091426]">{value}</p>
    </article>
  );
}

function buildDefaultForm(propertyId = "") {
  return {
    propertyId: propertyId ? String(propertyId) : "",
    category: "COMMON_EQUIPMENT",
    priority: "MEDIUM",
    title: "",
    description: "",
    images: [],
  };
}

function buildDefaultViolationForm(propertyId = "") {
  return {
    propertyId: propertyId ? String(propertyId) : "",
    roomId: "",
    occupantId: "",
    violationType: "RESET_WIFI_PASSWORD",
    amount: formatMoneyInput("200000"),
    description: "Khách tự ý reset mật khẩu modem/wifi, vi phạm nội quy phòng trọ.",
    includeInMonthlyInvoice: true,
    occurredAt: new Date().toISOString().slice(0, 10),
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(buildDefaultForm());
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isViolationOpen, setIsViolationOpen] = useState(false);
  const [violationForm, setViolationForm] = useState(buildDefaultViolationForm());
  const [violationError, setViolationError] = useState("");
  const [violationSuccess, setViolationSuccess] = useState("");
  const [isCreatingViolation, setIsCreatingViolation] = useState(false);

  const propertyOptions = useMemo(() => {
    return properties
      .filter((property) => property?.id)
      .map((property) => ({ id: String(property.id), name: property.name || `Cơ sở ${property.id}` }));
  }, [properties]);

  const roomOptions = useMemo(() => {
    return rooms
      .filter((room) => room?.id)
      .map((room) => ({
        id: String(room.id),
        label: room.roomCode || room.name || `Phòng ${room.id}`,
      }));
  }, [rooms]);
  const selectedViolationPropertyId = String(violationForm.propertyId || filters.propertyId || propertyOptions[0]?.id || "");

  const metrics = useMemo(() => {
    const count = (statuses) => tickets.filter((ticket) => statuses.includes(ticket.status)).length;
    const totalCost = tickets.reduce((sum, ticket) => sum + Number(ticket.costAmount || 0), 0);
    return [
      { label: "Chờ tiếp nhận", value: count(["PENDING"]), icon: Clock3, tone: "bg-amber-50 text-amber-700" },
      { label: "Đang xử lý", value: count(["ACCEPTED", "IN_PROGRESS"]), icon: Wrench, tone: "bg-blue-50 text-blue-700" },
      { label: "Chờ xác nhận", value: count(["WAITING_CONFIRMATION"]), icon: TimerReset, tone: "bg-violet-50 text-violet-700" },
      { label: "Chi phí ghi nhận", value: formatMoney(totalCost), icon: Check, tone: "bg-emerald-50 text-emerald-700" },
    ];
  }, [tickets]);

  const loadTickets = useCallback(async () => {
    if (!filters.propertyId) {
      setTickets([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const keyword = filters.keyword || query || "";
      const result = await fetchMaintenanceTickets({ ...filters, keyword });
      setTickets(result.tickets);
    } catch (loadError) {
      setError(loadError?.message || "Không tải được danh sách phiếu bảo trì.");
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, query]);

  useEffect(() => {
    let isMounted = true;

    async function loadProperties() {
      const data = await fetchViewingProperties();
      if (!isMounted) return;
      setProperties(data);
      const firstPropertyId = data[0]?.id ? String(data[0].id) : "";
      if (firstPropertyId) {
        setFilters((current) => current.propertyId ? current : { ...current, propertyId: firstPropertyId });
        setCreateForm((current) => current.propertyId ? current : buildDefaultForm(firstPropertyId));
        setViolationForm((current) => current.propertyId ? current : buildDefaultViolationForm(firstPropertyId));
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
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === "propertyId" ? { roomId: "" } : {}),
    }));
    if (name === "propertyId") {
      setCreateForm((current) => ({ ...current, propertyId: value }));
      setViolationForm((current) => ({ ...current, propertyId: value, roomId: "" }));
    }
  }

  function updateCreateForm(name, value) {
    setCreateForm((current) => ({ ...current, [name]: value }));
  }

  function updateViolationForm(name, value) {
    const nextValue = name === "amount" ? formatMoneyInput(value) : value;
    setViolationForm((current) => ({
      ...current,
      [name]: nextValue,
      ...(name === "propertyId" ? { roomId: "" } : {}),
      ...(name === "violationType" && value === "RESET_WIFI_PASSWORD" ? { amount: formatMoneyInput("200000") } : {}),
    }));
    if (name === "propertyId") {
      updateFilter("propertyId", value);
    }
  }

  function handleImageChange(event) {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const nextFiles = [...createForm.images, ...imageFiles].slice(0, 3);
    setCreateForm((current) => ({ ...current, images: nextFiles }));
    event.target.value = "";
  }

  function handleViolationImageChange(event) {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const nextFiles = [...violationForm.images, ...imageFiles].slice(0, 3);
    setViolationForm((current) => ({ ...current, images: nextFiles }));
    event.target.value = "";
  }

  async function handleCreateCommonTicket(event) {
    event.preventDefault();
    setCreateError("");
    const propertyId = Number(createForm.propertyId || propertyOptions[0]?.id);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      setCreateError("Vui lòng chọn cơ sở hợp lệ.");
      return;
    }
    if (createForm.description.trim().length < 10) {
      setCreateError("Mô tả sự cố phải có tối thiểu 10 ký tự.");
      return;
    }

    setIsCreating(true);
    try {
      const uploaded = await Promise.all(createForm.images.map((file) => uploadMaintenanceImage(file)));
      await createMaintenanceTicket({
        propertyId,
        ticketScope: "COMMON_AREA",
        scope: "COMMON_AREA",
        category: createForm.category,
        priority: createForm.priority,
        severity: createForm.priority,
        title: createForm.title.trim() || CATEGORY_LABELS[createForm.category] || "Sự cố khu vực chung",
        description: createForm.description.trim(),
        attachmentIds: uploaded.map((file) => file.fileId).filter(Boolean),
      });
      setCreateForm(buildDefaultForm(propertyOptions[0]?.id || propertyId));
      setIsCreateOpen(false);
      await loadTickets();
    } catch (createTicketError) {
      setCreateError(createTicketError?.message || "Không tạo được phiếu bảo trì.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateViolation(event) {
    event.preventDefault();
    setViolationError("");
    setViolationSuccess("");

    const propertyId = Number(selectedViolationPropertyId);
    const roomId = Number(violationForm.roomId);
    const amount = Number(String(violationForm.amount).replace(/[^\d]/g, ""));
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      setViolationError("Vui lòng chọn cơ sở.");
      return;
    }
    if (!Number.isFinite(roomId) || roomId <= 0) {
      setViolationError("Vui lòng chọn phòng.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setViolationError("Số tiền phạt phải lớn hơn 0.");
      return;
    }
    if (violationForm.description.trim().length < 10) {
      setViolationError("Vui lòng nhập mô tả vi phạm tối thiểu 10 ký tự.");
      return;
    }

    setIsCreatingViolation(true);
    try {
      const uploaded = await Promise.all(violationForm.images.map((file) => uploadMaintenanceImage(file)));
      const attachmentIds = uploaded.map((file) => file.fileId).filter(Boolean);
      const result = await createMaintenanceViolation({
        property_id: propertyId,
        room_id: roomId,
        occupant_id: violationForm.occupantId ? Number(violationForm.occupantId) : null,
        violation_type: violationForm.violationType,
        amount,
        description: violationForm.description.trim(),
        include_in_monthly_invoice: Boolean(violationForm.includeInMonthlyInvoice),
        occurred_at: violationForm.occurredAt || new Date().toISOString().slice(0, 10),
        attachment_ids: attachmentIds,
      });
      setViolationSuccess(result?.message || "Đã ghi nhận vi phạm reset wifi 200.000đ và phát hành hóa đơn cho khách thanh toán.");
      setViolationForm(buildDefaultViolationForm(String(propertyId)));
      setIsViolationOpen(false);
      await loadTickets();
    } catch (createViolationError) {
      setViolationError(createViolationError?.message || "Không ghi nhận được vi phạm nội quy.");
    } finally {
      setIsCreatingViolation(false);
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e]">Báo sự cố & Bảo trì</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">
            Theo dõi phiếu sự cố từ lúc tiếp nhận, xử lý, chờ xác nhận đến hoàn tất.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadTickets}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-[#091426] hover:bg-[#f8fafc]"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setViolationForm((current) => ({ ...current, propertyId: current.propertyId || filters.propertyId || propertyOptions[0]?.id || "" }));
                setIsCreateOpen(false);
                setIsViolationOpen((value) => !value);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#b42318] px-4 text-sm font-bold text-white hover:bg-[#971b12]"
            >
              {isViolationOpen ? <X className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {isViolationOpen ? "Đóng vi phạm" : "Ghi nhận vi phạm"}
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setCreateForm((current) => ({ ...current, propertyId: current.propertyId || filters.propertyId || propertyOptions[0]?.id || "" }));
                setIsViolationOpen(false);
                setIsCreateOpen((value) => !value);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a]"
            >
              {isCreateOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isCreateOpen ? "Đóng form" : "Tạo phiếu chung"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-4">
        {metrics.map((item) => (
          <Metric key={item.label} {...item} />
        ))}
      </div>
      <p className="text-xs font-semibold text-[#64748b]">
        Chi phí ghi nhận là tổng chi phí/phạt đã ghi nhận, không đồng nghĩa đã thanh toán. Xem badge thanh toán trên từng phiếu để biết trạng thái thu tiền.
      </p>

      {violationSuccess && <InlineNotice>{violationSuccess}</InlineNotice>}

      {isViolationOpen && (
        <form
          onSubmit={handleCreateViolation}
          className="grid gap-5 rounded-lg border border-rose-200 bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#091426]">Ghi nhận vi phạm nội quy</h2>
              <p className="mt-1 text-sm font-semibold text-[#64748b]">
                Tách riêng khỏi phiếu sự cố. Reset modem/wifi được ghi nhận là khoản phạt VIOLATION_FINE.
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase text-rose-700 ring-1 ring-rose-200">
              VIOLATION_FINE
            </span>
          </div>
          {violationError && <InlineNotice type="error">{violationError}</InlineNotice>}
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Cơ sở *">
              <select
                value={selectedViolationPropertyId}
                onChange={(event) => updateViolationForm("propertyId", event.target.value)}
                className={selectClassName()}
              >
                <option value="">Chọn cơ sở</option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Phòng *">
              <select
                value={violationForm.roomId}
                onChange={(event) => updateViolationForm("roomId", event.target.value)}
                disabled={!selectedViolationPropertyId}
                className={selectClassName()}
              >
                <option value="">{roomOptions.length > 0 ? "Chọn phòng" : "Chọn cơ sở trước"}</option>
                {roomOptions.map((room) => (
                  <option key={room.id} value={room.id}>{room.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Người vi phạm">
              <input
                value="Ghi nhận ở cấp phòng"
                disabled
                className={`${inputClassName()} disabled:bg-[#f8fafc] disabled:text-[#64748b]`}
              />
            </Field>
            <Field label="Ngày ghi nhận">
              <input
                type="date"
                value={violationForm.occurredAt}
                onChange={(event) => updateViolationForm("occurredAt", event.target.value)}
                className={inputClassName()}
              />
            </Field>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Loại vi phạm *">
              <select
                value={violationForm.violationType}
                onChange={(event) => updateViolationForm("violationType", event.target.value)}
                className={selectClassName()}
              >
                <option value="RESET_WIFI_PASSWORD">Tự ý reset mật khẩu modem/wifi</option>
              </select>
            </Field>
            <Field label="Số tiền phạt *">
              <input
                value={violationForm.amount}
                onChange={(event) => updateViolationForm("amount", event.target.value)}
                className={inputClassName()}
                inputMode="numeric"
                placeholder="200000"
              />
            </Field>
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-4 text-sm font-bold text-[#091426]">
              <input
                type="checkbox"
                checked={violationForm.includeInMonthlyInvoice}
                onChange={(event) => updateViolationForm("includeInMonthlyInvoice", event.target.checked)}
                className="h-4 w-4 rounded border-[#cbd5e1]"
              />
              Đưa khoản phạt vào hóa đơn tháng
            </label>
          </div>
          <Field label="Mô tả/ghi chú *">
            <textarea
              value={violationForm.description}
              onChange={(event) => updateViolationForm("description", event.target.value)}
              className={textareaClassName()}
              placeholder="Ví dụ: Khách tự ý reset modem wifi trong phòng, làm thay đổi mật khẩu hệ thống."
            />
          </Field>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              {violationForm.images.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative flex h-20 w-32 items-center justify-center rounded-lg border border-[#d8dee8] bg-[#f8fafc] px-2 text-center text-xs font-bold text-[#475569]">
                  <span className="line-clamp-2">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setViolationForm((current) => ({ ...current, images: current.images.filter((_, fileIndex) => fileIndex !== index) }))}
                    className="absolute right-1 top-1 rounded-full bg-[#091426]/80 p-1 text-white"
                    aria-label="Xóa ảnh"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {violationForm.images.length < 3 && (
                <label className="flex h-20 w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#94a3b8] bg-[#f8fafc] text-xs font-bold text-[#475569] hover:border-[#091426]">
                  <ImagePlus className="h-5 w-5" />
                  Thêm bằng chứng
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleViolationImageChange} className="sr-only" />
                </label>
              )}
            </div>
            <button
              type="submit"
              disabled={isCreatingViolation}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#b42318] px-5 text-sm font-bold text-white hover:bg-[#971b12] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreatingViolation ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Ghi nhận vi phạm
            </button>
          </div>
        </form>
      )}

      {isCreateOpen && (
        <form
          onSubmit={handleCreateCommonTicket}
          className="grid gap-5 rounded-lg border border-[#d8dee8] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#091426]">Tạo phiếu khu vực chung</h2>
              <p className="mt-1 text-sm font-semibold text-[#64748b]">Áp dụng cho hành lang, sân, thiết bị chung và vận hành cơ sở.</p>
            </div>
          </div>
          {createError && <InlineNotice type="error">{createError}</InlineNotice>}
          <div className="grid gap-4 lg:grid-cols-4">
            <Field label="Cơ sở">
              {propertyOptions.length > 0 ? (
                <select
                  value={createForm.propertyId || propertyOptions[0]?.id || ""}
                  onChange={(event) => updateCreateForm("propertyId", event.target.value)}
                  className={selectClassName()}
                >
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={createForm.propertyId}
                  onChange={(event) => updateCreateForm("propertyId", event.target.value)}
                  className={inputClassName()}
                  inputMode="numeric"
                  placeholder="ID cơ sở"
                />
              )}
            </Field>
            <Field label="Hạng mục">
              <select value={createForm.category} onChange={(event) => updateCreateForm("category", event.target.value)} className={selectClassName()}>
                {CATEGORY_OPTIONS.slice(1).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Mức độ">
              <select value={createForm.priority} onChange={(event) => updateCreateForm("priority", event.target.value)} className={selectClassName()}>
                {PRIORITY_OPTIONS.slice(1).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Tiêu đề">
              <input
                value={createForm.title}
                onChange={(event) => updateCreateForm("title", event.target.value)}
                className={inputClassName()}
                placeholder="VD: Hỏng đèn hành lang"
              />
            </Field>
          </div>
          <Field label="Mô tả sự cố">
            <textarea
              value={createForm.description}
              onChange={(event) => updateCreateForm("description", event.target.value)}
              className={textareaClassName()}
              placeholder="Mô tả vị trí, hiện trạng và mức ảnh hưởng"
            />
          </Field>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              {createForm.images.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#d8dee8] bg-[#f8fafc]">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCreateForm((current) => ({ ...current, images: current.images.filter((_, fileIndex) => fileIndex !== index) }))}
                    className="absolute right-1 top-1 rounded-full bg-[#091426]/80 p-1 text-white"
                    aria-label="Xóa ảnh"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {createForm.images.length < 3 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#94a3b8] bg-[#f8fafc] text-[#475569] hover:border-[#091426]">
                  <ImagePlus className="h-6 w-6" />
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageChange} className="sr-only" />
                </label>
              )}
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tạo phiếu
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="flex items-center gap-2 text-sm font-black text-[#091426]">
          <SlidersHorizontal className="h-4 w-4" />
          Bộ lọc
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
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
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className={selectClassName()}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className={selectClassName()}>
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select value={filters.severity} onChange={(event) => updateFilter("severity", event.target.value)} className={selectClassName()}>
            {PRIORITY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select value={filters.scope} onChange={(event) => updateFilter("scope", event.target.value)} className={selectClassName()}>
            {SCOPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        {filters.propertyId && (
          <select value={filters.roomId} onChange={(event) => updateFilter("roomId", event.target.value)} className={`${selectClassName()} max-w-xs`}>
            <option value="">{roomOptions.length > 0 ? "Tất cả phòng" : "Chưa có phòng"}</option>
            {roomOptions.map((room) => (
              <option key={room.id} value={room.id}>{room.label}</option>
            ))}
          </select>
        )}
      </div>

      {error && <InlineNotice type="error">{error}</InlineNotice>}

      <section className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="dashboard-table">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#f2f4f6]">
              <tr className="text-xs font-bold uppercase tracking-[0.08em] text-[#505f76]">
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
                  <td colSpan={7} className="px-5 py-12 text-center text-sm font-bold text-[#64748b]">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải danh sách phiếu...
                    </span>
                  </td>
                </tr>
              )}
              {!isLoading && tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-[#e2e8f0] align-top">
                  <td data-label="Phiếu" className="px-5 py-4">
                    <div className="min-w-0">
                      <Link href={`/dashboard/maintenance/${ticket.id}`} className="font-black text-[#091426] hover:text-[#3156b6]">
                        {ticket.ticketCode}
                      </Link>
                      <p className="mt-1 max-w-72 truncate text-sm font-semibold text-[#475569]">{ticket.title || ticket.description}</p>
                    </div>
                  </td>
                  <td data-label="Vị trí" className="px-5 py-4 text-sm font-semibold text-[#334155]">
                    <p>{ticket.ticketScope === "ROOM" ? (ticket.roomCode || ticket.roomName || "Phòng thuê") : SCOPE_LABELS[ticket.ticketScope] || ticket.ticketScope}</p>
                    <p className="mt-1 text-xs text-[#64748b]">{ticket.propertyName || "Chưa có cơ sở"}</p>
                  </td>
                  <td data-label="Hạng mục" className="px-5 py-4 text-sm font-bold text-[#334155]">
                    {ticket.category === "RULE_VIOLATION" ? (
                      <span className="inline-flex flex-col gap-1">
                        <span className="inline-flex w-fit rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-200">
                          Vi phạm nội quy
                        </span>
                        <span className="text-xs font-black text-[#64748b]">Reset wifi · VIOLATION_FINE</span>
                      </span>
                    ) : (
                      CATEGORY_LABELS[ticket.category] || ticket.category || "Khác"
                    )}
                  </td>
                  <td data-label="Mức độ" className="px-5 py-4 text-sm font-bold text-[#334155]">
                    {PRIORITY_LABELS[ticket.priority] || ticket.priority || "Trung bình"}
                  </td>
                  <td data-label="Trạng thái" className="px-5 py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={ticket.ticketStatus || ticket.status} />
                      <BillingBadge status={ticket.billingStatus} label={ticket.billingStatusLabel} />
                      {ticket.invoiceCode && (
                        <span className="text-xs font-bold text-[#64748b]">{ticket.invoiceCode}</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Cập nhật" className="px-5 py-4 text-sm font-semibold text-[#475569]">
                    {formatDateTime(ticket.updatedAt || ticket.createdAt)}
                  </td>
                  <td data-label="Thao tác" className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/maintenance/${ticket.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8dee8] text-[#475569] hover:border-[#091426] hover:text-[#091426]"
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            aria-label="Tiếp nhận"
                          >
                            {actionLoading === `approve-${ticket.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecline(ticket.id)}
                            disabled={Boolean(actionLoading)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                            aria-label="Từ chối"
                          >
                            {actionLoading === `decline-${ticket.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && tickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm font-bold text-[#64748b]">
                    Không có phiếu bảo trì phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
