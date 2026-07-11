"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock3,
  ImagePlus,
  Loader2,
  Phone,
  ShieldAlert,
  Star,
  TimerReset,
  User,
  Wrench,
  X,
} from "lucide-react";
import { useDashboardLayout } from "../../_contexts/DashboardLayoutContext";
import {
  approveMaintenanceTicket,
  completeMaintenanceTicket,
  confirmMaintenanceTicket,
  declineMaintenanceTicket,
  fetchMaintenanceTicket,
  issueMaintenanceInvoice,
  startMaintenanceProgress,
  uploadMaintenanceImage,
} from "@/services/maintenanceService";
import { getAuthToken } from "@/services/identityAccessService";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

const STATUS_META = {
  PENDING: ["Chờ tiếp nhận", "bg-amber-50 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-300 ring-amber-200 dark:ring-yellow-500/20"],
  ACCEPTED: ["Đã tiếp nhận", "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20"],
  IN_PROGRESS: ["Đang xử lý", "bg-indigo-50 dark:bg-blue-500/10 text-indigo-800 dark:text-blue-300 ring-indigo-200 dark:ring-blue-500/20"],
  WAITING_CONFIRMATION: ["Chờ xác nhận", "bg-violet-50 text-violet-800 ring-violet-200"],
  COMPLETED: ["Hoàn tất xử lý", "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20"],
  REJECTED: ["Từ chối", "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20"],
};

const CATEGORY_LABELS = {
  ELECTRICITY: "Điện",
  WATER: "Nước",
  AIR_CONDITIONER: "Máy lạnh",
  INTERNET: "Internet",
  FURNITURE: "Nội thất",
  SANITARY: "Vệ sinh",
  SECURITY: "An ninh",
  COMMON_EQUIPMENT: "Thiết bị chung",
  OTHER: "Khác",
};

const PRIORITY_LABELS = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

const SCOPE_LABELS = {
  ROOM: "Phòng thuê",
  COMMON_AREA: "Khu vực chung",
  PROPERTY_OPERATION: "Vận hành cơ sở",
};

const COST_RESPONSIBILITY_OPTIONS = [
  ["UNDECIDED", "Chưa xác định"],
  ["OWNER", "Chủ trọ chịu"],
  ["TENANT", "Khách thuê chịu"],
  ["OPERATION", "Chi phí vận hành"],
];

const COST_RESPONSIBILITY_LABELS = Object.fromEntries(COST_RESPONSIBILITY_OPTIONS);
const MONEY_FORMAT = new Intl.NumberFormat("vi-VN");
const BILLING_STATUS_LABELS = {
  NO_CHARGE: "Không thu khách",
  NOT_INVOICED: "Chưa lập hóa đơn",
  SCHEDULED: "Đã lên lịch gộp hóa đơn đầu tháng",
  SCHEDULE_FAILED: "Lỗi lên lịch hóa đơn",
  DRAFT: "Chờ phát hành",
  PENDING_PAYMENT: "Chờ thanh toán",
  ISSUED: "Chờ thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
  VOIDED: "Đã hủy",
};
const ACTION_LABELS = {
  CREATE: "Tạo phiếu",
  ACCEPT: "Tiếp nhận",
  START_PROGRESS: "Bắt đầu xử lý",
  CONFIRM_COMPLETED: "Xác nhận hoàn tất",
  COMPLETE: "Hoàn tất xử lý",
  REJECT: "Từ chối",
  DECLINE: "Từ chối",
  REPORT_NOT_FIXED: "Báo chưa xử lý xong",
  REVIEW: "Đánh giá",
};

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

function parseMoneyInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function formatActionLabel(action) {
  const normalized = String(action || "").trim().toUpperCase();
  return ACTION_LABELS[normalized] || normalized.replaceAll("_", " ").toLowerCase().replace(/^\p{L}/u, (char) => char.toUpperCase()) || "Cập nhật trạng thái";
}

function statusMeta(status) {
  return STATUS_META[status] || [status || "Không rõ", "bg-slate-100 text-slate-700 ring-slate-200"];
}

function formatBillingPeriod(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})$/);
  return match ? `${match[2]}/${match[1]}` : "";
}

function billingBadgeLabel(status, label, billingPeriod) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "SCHEDULED") {
    const formattedPeriod = formatBillingPeriod(billingPeriod);
    return formattedPeriod
      ? `Đã lên lịch gộp hóa đơn đầu tháng ${formattedPeriod}`
      : "Đã lên lịch gộp hóa đơn đầu tháng";
  }
  return label || BILLING_STATUS_LABELS[normalized] || "Không thu khách";
}

function StatusBadge({ status }) {
  const [label, className] = statusMeta(status);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>
      {label}
    </span>
  );
}

function BillingBadge({ status, label, billingPeriod }) {
  const normalized = String(status || "").toUpperCase();
  const tone = normalized === "DRAFT"
    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20"
    : normalized === "SCHEDULED"
      ? "bg-cyan-50 dark:bg-blue-500/10 text-cyan-800 dark:text-blue-300 ring-cyan-200 dark:ring-blue-500/20"
      : normalized === "SCHEDULE_FAILED"
        ? "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20"
    : normalized === "PENDING_PAYMENT" || normalized === "ISSUED"
      ? "bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300 ring-orange-200 dark:ring-orange-500/20"
      : normalized === "PAID"
        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20"
        : normalized === "OVERDUE"
          ? "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20"
          : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tone}`}>
      {billingBadgeLabel(normalized, label, billingPeriod)}
    </span>
  );
}

function inputClassName() {
  return "h-11 rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:text-slate-500 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10";
}

function textareaClassName() {
  return "min-h-28 resize-y rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:text-slate-500 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10";
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Notice({ type = "info", children }) {
  const tone = type === "error"
    ? "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300"
    : "border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-900 dark:text-yellow-300";
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${tone}`}>
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 p-4">
      <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-white">{value || "Chưa có"}</p>
    </div>
  );
}

function AttachmentGrid({ title, attachments }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{attachments.length} ảnh</span>
      </div>
      {attachments.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-3">
          {attachments.map((attachment) => (
            <AuthorizedAttachmentLink
              key={`${attachment.id}-${attachment.fileId}`}
              attachment={attachment}
              title={title}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#cbd5e1] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
          Chưa có ảnh.
        </div>
      )}
    </section>
  );
}

function AuthorizedAttachmentLink({ attachment, title }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let currentObjectUrl = "";

    async function loadImage() {
      if (!attachment.url) {
        setFailed(true);
        return;
      }
      try {
        const token = getAuthToken();
        const response = await fetch(attachment.url, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          throw new Error(`download_failed_${response.status}`);
        }
        const blob = await response.blob();
        currentObjectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setObjectUrl(currentObjectUrl);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    loadImage();
    return () => {
      cancelled = true;
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    };
  }, [attachment.url]);

  const href = objectUrl || attachment.url || "#";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group relative block h-36 overflow-hidden rounded-lg border border-[#d8dee8] bg-[#f8fafc] dark:border-white/10 dark:bg-white/5"
    >
      {failed ? (
        <div className="grid h-36 place-items-center px-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Không tải được ảnh.
        </div>
      ) : objectUrl ? (
        <Image src={objectUrl} alt={attachment.name || title} fill sizes="240px" className="object-cover transition group-hover:scale-[1.02]" unoptimized />
      ) : (
        <div className="grid h-36 place-items-center text-xs font-bold text-slate-500 dark:text-slate-400">
          Đang tải ảnh...
        </div>
      )}
    </a>
  );
}

function Timeline({ events }) {
  if (!events.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#cbd5e1] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        Chưa có nhật ký xử lý.
      </div>
    );
  }

  return (
    <ol className="grid gap-3">
      {events.map((event) => (
        <li key={event.id || `${event.action}-${event.createdAt}`} className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{formatActionLabel(event.action)}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{event.note || "Không có ghi chú."}</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">{formatDateTime(event.createdAt)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {event.fromStatus && <StatusBadge status={event.fromStatus} />}
            {event.fromStatus && event.toStatus && <span>→</span>}
            {event.toStatus && <StatusBadge status={event.toStatus} />}
            {event.createdBy?.phone && <span className="ml-auto">{event.createdBy.phone}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function buildCompleteForm(ticket) {
  const nextPeriod = new Date();
  nextPeriod.setMonth(nextPeriod.getMonth() + 1, 1);
  return {
    repairmanName: ticket?.workerName || "",
    repairmanPhone: ticket?.repairmanPhone || "",
    rootCause: ticket?.rootCause || "",
    repairItems: ticket?.repairItems || "",
    actualCost: ticket?.costAmount ? formatMoneyInput(ticket.costAmount) : "",
    costResponsibility: ticket?.ticketScope === "PROPERTY_OPERATION"
      ? "OWNER"
      : ticket?.costResponsibility || "UNDECIDED",
    collectionMethod: "MONTHLY_SCHEDULED",
    billingPeriod: nextPeriod.toISOString().slice(0, 7),
    completionNote: "",
    images: [],
  };
}

export default function MaintenanceTicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id;
  const { activeRole } = useDashboardLayout();
  const canManage = ["owner", "manager"].includes(activeRole);
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [completeForm, setCompleteForm] = useState(buildCompleteForm());

  const locationText = useMemo(() => {
    if (!ticket) return "";
    if (ticket.ticketScope === "ROOM" || ticket.roomCode || ticket.roomName) {
      return [ticket.roomCode || ticket.roomName || "Phòng thuê", ticket.propertyName].filter(Boolean).join(" · ");
    }
    return [SCOPE_LABELS[ticket.ticketScope] || ticket.ticketScope, ticket.propertyName].filter(Boolean).join(" · ");
  }, [ticket]);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchMaintenanceTicket(ticketId);
      setTicket(data);
      setCompleteForm(buildCompleteForm(data));
    } catch (loadError) {
      setError(loadError?.message || "Không tải được chi tiết phiếu.");
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTicket();
  }, [loadTicket]);

  function updateCompleteForm(name, value) {
    setCompleteForm((current) => ({ ...current, [name]: name === "actualCost" ? formatMoneyInput(value) : value }));
  }

  function handleAfterImages(event) {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const existingCount = ticket?.afterAttachments?.length || 0;
    const remainingSlots = Math.max(0, 3 - existingCount);
    setCompleteForm((current) => ({ ...current, images: [...current.images, ...imageFiles].slice(0, remainingSlots) }));
    event.target.value = "";
  }

  async function runAction(key, callback) {
    setActionLoading(key);
    setError("");
    try {
      await callback();
      await loadTicket();
    } catch (actionError) {
      setError(actionError?.message || "Không xử lý được thao tác.");
    } finally {
      setActionLoading("");
    }
  }

  function handleApprove() {
    runAction("approve", () => approveMaintenanceTicket(ticketId));
  }

  function handleDecline() {
    const reason = window.prompt("Nhập lý do từ chối phiếu sự cố");
    if (!reason?.trim()) return;
    runAction("decline", () => declineMaintenanceTicket(ticketId, reason.trim()));
  }

  function handleStartProgress() {
    runAction("progress", () => startMaintenanceProgress(ticketId, { note: "Đã bắt đầu xử lý sự cố" }));
  }

  async function handleComplete(event) {
    event.preventDefault();
    if (!completeForm.repairItems.trim()) {
      setError("Vui lòng nhập hạng mục đã sửa.");
      return;
    }
    if (ticket.ticketScope === "PROPERTY_OPERATION" && !completeForm.repairmanName.trim()) {
      setError("Vui lòng nhập tên thợ sửa hoặc nhân sự xử lý.");
      return;
    }
    if ((ticket.afterAttachments?.length || 0) === 0 && completeForm.images.length === 0) {
      setError("Vui lòng upload ít nhất 1 ảnh sau sửa trước khi hoàn tất.");
      return;
    }
    if ((ticket.afterAttachments?.length || 0) + completeForm.images.length > 3) {
      setError("Ảnh sau sửa tối đa 3 ảnh.");
      return;
    }
    const amount = parseMoneyInput(completeForm.actualCost);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Chi phí thực tế không hợp lệ.");
      return;
    }
    if (ticket.ticketScope === "PROPERTY_OPERATION" && amount <= 0) {
      setError("Vui lòng nhập chi phí thực tế cho phiếu nội bộ.");
      return;
    }

    await runAction("complete", async () => {
      const uploaded = await Promise.all(completeForm.images.map((file) => uploadMaintenanceImage(file)));
      await completeMaintenanceTicket(ticketId, {
        repairmanName: completeForm.repairmanName.trim(),
        repairmanPhone: completeForm.repairmanPhone.trim(),
        rootCause: completeForm.rootCause.trim(),
        repairItems: completeForm.repairItems.trim(),
        actualCost: amount,
        costResponsibility: completeForm.costResponsibility,
        collectionMethod: completeForm.costResponsibility === "TENANT" ? completeForm.collectionMethod : null,
        billingPeriod: completeForm.costResponsibility === "TENANT" && completeForm.collectionMethod === "MONTHLY_SCHEDULED"
          ? completeForm.billingPeriod
          : null,
        costDescription: completeForm.repairItems.trim(),
        completionNote: completeForm.completionNote.trim(),
        attachmentIds: uploaded.map((file) => file.fileId).filter(Boolean),
        phase: "AFTER",
      });
    });
  }

  function handleConfirmCommonArea() {
    runAction("confirm", () => confirmMaintenanceTicket(ticketId));
  }

  function handleIssueInvoice() {
    runAction("issue-invoice", () => issueMaintenanceInvoice(ticketId));
  }

  if (isLoading) {
    return (
      <section className="flex min-h-[360px] items-center justify-center rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a]">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải chi tiết phiếu...
        </span>
      </section>
    );
  }

  if (!ticket) {
    return (
      <section className="grid gap-4 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-6">
        <Link href="/dashboard/maintenance" className="inline-flex items-center gap-2 text-sm font-bold text-[#3156b6]">
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <Notice type="error">{error || "Không tìm thấy phiếu bảo trì."}</Notice>
      </section>
    );
  }

  const incidentalBillingStatus = String(ticket.billingStatus || ticket.invoiceStatus || "").toUpperCase();
  const shouldShowIncidentalPayment = Boolean(ticket.invoiceId)
    || ["SCHEDULED", "SCHEDULE_FAILED", "DRAFT", "PENDING_PAYMENT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOIDED"]
      .includes(incidentalBillingStatus);

  return (
    <section className="grid gap-6">
      <div>
        <Link href="/dashboard/maintenance" className="inline-flex items-center gap-2 text-sm font-bold text-[#3156b6]">
          <ArrowLeft className="h-4 w-4" />
          Danh sách bảo trì
        </Link>
        <DashboardPageHeader
          className="mt-4"
          title={
            <span className="flex flex-wrap items-center gap-3">
              {ticket.ticketCode}
              <StatusBadge status={ticket.status} />
            </span>
          }
          description={ticket.title || ticket.description}
          actions={canManage ? (
            <div className="flex flex-wrap gap-2">
            {ticket.status === "PENDING" && (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {actionLoading === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Tiếp nhận
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 text-sm font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/10 disabled:opacity-60"
                >
                  {actionLoading === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Từ chối
                </button>
              </>
            )}
            {ticket.status === "ACCEPTED" && (
              <button
                type="button"
                onClick={handleStartProgress}
                disabled={Boolean(actionLoading)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {actionLoading === "progress" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Bắt đầu xử lý
              </button>
            )}
            {ticket.status === "WAITING_CONFIRMATION" && ticket.ticketScope !== "ROOM" && (
              <button
                type="button"
                onClick={handleConfirmCommonArea}
                disabled={Boolean(actionLoading)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {actionLoading === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Xác nhận hoàn tất
              </button>
            )}
            </div>
          ) : null}
        />
      </div>

      {error && <Notice type="error">{error}</Notice>}

      <div className="grid gap-4 lg:grid-cols-4">
        <InfoItem label="Vị trí" value={locationText} />
        <InfoItem label="Hạng mục" value={CATEGORY_LABELS[ticket.category] || ticket.category} />
        <InfoItem label="Mức độ" value={PRIORITY_LABELS[ticket.priority] || ticket.priority} />
        <InfoItem label="Ngày tạo" value={formatDateTime(ticket.createdAt)} />
      </div>

      {ticket.ticketScope === "PROPERTY_OPERATION" && (
        <section className="grid gap-4 rounded-lg border border-teal-200 bg-teal-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Chi phí bảo trì nội bộ</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Khoản này do chủ trọ chịu, chỉ dùng để thống kê chi phí vận hành.</p>
            </div>
            <span className="rounded-full bg-white dark:bg-[#0f172a] px-3 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-200">Không thu khách</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <InfoItem label="Người chịu phí" value="Chủ trọ" />
            <InfoItem label="Chi phí thực tế" value={formatMoney(ticket.costAmount)} />
            <InfoItem label="Trạng thái thu khách" value="Không thu khách" />
          </div>
          {ticket.costDescription && <InfoItem label="Ghi chú kế toán" value={ticket.costDescription} />}
        </section>
      )}

      <section className="grid gap-4 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Thông tin sự cố</h2>
        <p className="rounded-lg bg-[#f8fafc] dark:bg-white/5 p-4 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{ticket.description}</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Người tạo" value={ticket.createdBy?.phone || ticket.createdBy?.email || "Chưa có"} />
          <InfoItem label="Người xử lý" value={ticket.workerName || ticket.assignedTo?.phone || ticket.assignedTo?.email || "Chưa phân công"} />
          <InfoItem label="SĐT thợ" value={ticket.repairmanPhone || "Chưa có"} />
          <InfoItem label="Cập nhật cuối" value={formatDateTime(ticket.updatedAt || ticket.createdAt)} />
        </div>
      </section>

      {ticket.status === "REJECTED" && (
        <Notice type="error">{ticket.rejectionReason || "Phiếu đã bị từ chối."}</Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <AttachmentGrid title="Ảnh trước sửa" attachments={ticket.beforeAttachments} />
        <AttachmentGrid title="Ảnh sau sửa" attachments={ticket.afterAttachments} />
      </div>

      {canManage && ticket.status === "IN_PROGRESS" && (
        <form onSubmit={handleComplete} className="grid gap-5 rounded-lg border border-[#d8dee8] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-blue-500/10 text-indigo-700 dark:text-blue-300">
              <Wrench className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Hoàn tất xử lý</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Ghi nhận kết quả sửa chữa và hoàn tất phiếu sự cố.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Người sửa">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input value={completeForm.repairmanName} onChange={(event) => updateCompleteForm("repairmanName", event.target.value)} className={`${inputClassName()} w-full pl-9`} placeholder="Tên thợ hoặc nhân sự" />
              </div>
            </Field>
            <Field label="Số điện thoại">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input value={completeForm.repairmanPhone} onChange={(event) => updateCompleteForm("repairmanPhone", event.target.value)} className={`${inputClassName()} w-full pl-9`} placeholder="SĐT liên hệ" />
              </div>
            </Field>
            <Field label="Trách nhiệm chi phí">
              <select
                value={ticket.ticketScope === "PROPERTY_OPERATION" ? "OWNER" : completeForm.costResponsibility}
                onChange={(event) => updateCompleteForm("costResponsibility", event.target.value)}
                disabled={ticket.ticketScope === "PROPERTY_OPERATION"}
                className={`${inputClassName()} disabled:bg-slate-50 disabled:text-slate-600`}
              >
                {COST_RESPONSIBILITY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>
          {completeForm.costResponsibility === "TENANT" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Cách thu tiền *">
                <select value={completeForm.collectionMethod} onChange={(event) => updateCompleteForm("collectionMethod", event.target.value)} className={inputClassName()}>
                  <option value="BILL_NOW">Thanh toán hóa đơn luôn</option>
                  <option value="MONTHLY_SCHEDULED">Gộp vào hóa đơn đầu tháng</option>
                </select>
              </Field>
              {completeForm.collectionMethod === "MONTHLY_SCHEDULED" && (
                <Field label="Kỳ hóa đơn gộp *">
                  <input
                    type="month"
                    value={completeForm.billingPeriod}
                    onChange={(event) => updateCompleteForm("billingPeriod", event.target.value)}
                    className={inputClassName()}
                  />
                </Field>
              )}
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Nguyên nhân">
              <textarea value={completeForm.rootCause} onChange={(event) => updateCompleteForm("rootCause", event.target.value)} className={textareaClassName()} placeholder="Nguyên nhân sự cố" />
            </Field>
            <Field label="Hạng mục đã sửa">
              <textarea value={completeForm.repairItems} onChange={(event) => updateCompleteForm("repairItems", event.target.value)} className={textareaClassName()} placeholder="Các việc đã xử lý" />
            </Field>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Chi phí thực tế">
              <input value={completeForm.actualCost} onChange={(event) => updateCompleteForm("actualCost", event.target.value)} className={inputClassName()} inputMode="numeric" placeholder="0" />
            </Field>
            <Field label="Ghi chú hoàn tất">
              <input value={completeForm.completionNote} onChange={(event) => updateCompleteForm("completionNote", event.target.value)} className={inputClassName()} placeholder="Ghi chú hoàn tất nếu có" />
            </Field>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              {completeForm.images.map((file, index) => (
                <div key={`${file.name}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#d8dee8] bg-[#f8fafc] dark:border-white/10 dark:bg-white/5">
                  <Image src={URL.createObjectURL(file)} alt={file.name} fill sizes="80px" className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => setCompleteForm((current) => ({ ...current, images: current.images.filter((_, fileIndex) => fileIndex !== index) }))}
                    className="absolute right-1 top-1 rounded-full bg-[#091426]/80 p-1 text-white"
                    aria-label="Xóa ảnh"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {((ticket.afterAttachments?.length || 0) + completeForm.images.length) < 3 && (
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#94a3b8] bg-[#f8fafc] dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-[#1e40af]">
                  <ImagePlus className="h-6 w-6" />
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleAfterImages} className="sr-only" />
                </label>
              )}
            </div>
            <button
              type="submit"
              disabled={Boolean(actionLoading)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {actionLoading === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TimerReset className="h-4 w-4" />}
              Xác nhận hoàn tất
            </button>
          </div>
        </form>
      )}

      {(ticket.status === "WAITING_CONFIRMATION" || ticket.status === "COMPLETED") && (
        <section className="grid gap-4 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Kết quả xử lý</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="Người sửa" value={ticket.workerName} />
            <InfoItem label="SĐT thợ" value={ticket.repairmanPhone} />
            <InfoItem label="Chi phí" value={formatMoney(ticket.costAmount)} />
            <InfoItem label="Trách nhiệm" value={COST_RESPONSIBILITY_LABELS[ticket.costResponsibility] || ticket.costResponsibility} />
          </div>
          {ticket.rootCause && <InfoItem label="Nguyên nhân" value={ticket.rootCause} />}
          {ticket.repairItems && <InfoItem label="Hạng mục đã sửa" value={ticket.repairItems} />}
        </section>
      )}

      {shouldShowIncidentalPayment && (
        <section className="grid gap-4 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Thanh toán phát sinh</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <BillingBadge
                  status={ticket.billingStatus || ticket.invoiceStatus}
                  label={ticket.billingStatusLabel}
                  billingPeriod={ticket.billingPeriod}
                />
                {ticket.invoiceCode && <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{ticket.invoiceCode}</span>}
              </div>
            </div>
            {canManage && ticket.invoiceStatus === "DRAFT" && (
              <button
                type="button"
                onClick={handleIssueInvoice}
                disabled={Boolean(actionLoading)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {actionLoading === "issue-invoice" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Phát hành hóa đơn
              </button>
            )}
          </div>
          {ticket.invoiceStatus === "DRAFT" && (
            <Notice>
              Hóa đơn đang ở trạng thái nháp. Khách thuê chưa thấy hóa đơn này cho đến khi bạn phát hành.
            </Notice>
          )}
          {ticket.invoiceStatus && ticket.invoiceStatus !== "DRAFT" && (
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Hóa đơn đã phát hành mới được hiển thị trên mobile tenant và mới có thể thanh toán qua QR/PayOS.
            </p>
          )}
        </section>
      )}

      {ticket.review && (
        <section className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Đánh giá khách thuê</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-yellow-500/10 px-3 py-1 text-sm font-black text-amber-800 dark:text-yellow-300">
              <Star className="h-4 w-4 fill-current" />
              {ticket.review.rating}/5
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{ticket.review.comment || "Không có nhận xét."}</p>
        </section>
      )}

      <section className="grid gap-4 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Nhật ký xử lý</h2>
        <Timeline events={ticket.events} />
      </section>
    </section>
  );
}
