"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock3,
  Loader2,
  Mail,
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
  decideMaintenanceRepair,
  declineMaintenanceTicket,
  fetchMaintenanceTicket,
  issueMaintenanceInvoice,
  updateMaintenanceRepairInfo,
  uploadMaintenanceImage,
} from "@/services/maintenanceService";
import { getAuthToken } from "@/services/identityAccessService";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import MaintenanceCompletionImageSection from "@/components/dashboard/MaintenanceCompletionImageSection";
import VietnameseMonthPicker from "@/components/dashboard/VietnameseMonthPicker";
import CostResponsibilityDropdown, {
  COST_RESPONSIBILITY_LABELS,
  normalizeCostResponsibility,
} from "@/components/dashboard/CostResponsibilityDropdown";
import { toDate } from "@/lib/dateFormat";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_META = {
  PENDING: ["Chờ tiếp nhận", "bg-amber-50 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-300 ring-amber-200 dark:ring-yellow-500/20"],
  ACCEPTED: ["Đã tiếp nhận", "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 ring-blue-200 dark:ring-blue-500/20"],
  WAITING_TENANT_DECISION: ["Chờ khách quyết định sửa", "bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300 ring-orange-200 dark:ring-orange-500/20"],
  IN_PROGRESS: ["Đang xử lý", "bg-indigo-50 dark:bg-blue-500/10 text-indigo-800 dark:text-blue-300 ring-indigo-200 dark:ring-blue-500/20"],
  WAITING_CONFIRMATION: ["Chờ xác nhận", "bg-violet-50 text-violet-800 ring-violet-200"],
  COMPLETED: ["Hoàn tất xử lý", "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20"],
  REJECTED: ["Từ chối", "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20"],
};

const CATEGORY_LABELS = {
  ELECTRICITY: "Điện",
  WATER: "Nước",
  AIR_CONDITIONER: "Máy lạnh",
  DOOR_LOCK: "Khóa cửa",
  INTERNET: "Internet",
  FURNITURE: "Nội thất",
  PAINTING: "Sơn sửa",
  CLEANING: "Vệ sinh",
  SANITARY: "Vệ sinh",
  SECURITY: "An ninh",
  COMMON_EQUIPMENT: "Thiết bị chung",
  OTHER: "Khác",
};

const SCOPE_LABELS = {
  ROOM: "Phòng thuê",
  COMMON_AREA: "Khu vực chung",
  PROPERTY_OPERATION: "Vận hành cơ sở",
};

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
  SUBMIT: "Gửi phiếu",
  ACCEPT: "Tiếp nhận",
  SEND_REPAIR_PROPOSAL: "Gửi phương án sửa chữa",
  TENANT_APPROVE_REPAIR: "Khách đồng ý sửa chữa",
  TENANT_REJECT_REPAIR: "Khách không đồng ý sửa",
  START_PROGRESS: "Bắt đầu xử lý",
  UPDATE_REPAIR_INFO: "Cập nhật thông tin sửa chữa",
  ATTACH_FILE: "Đính kèm tệp",
  REQUEST_CONFIRMATION: "Yêu cầu xác nhận",
  CONFIRM_COMPLETED: "Xác nhận hoàn tất",
  COMPLETE: "Hoàn tất xử lý",
  REJECT: "Từ chối",
  DECLINE: "Từ chối",
  REPORT_NOT_FIXED: "Báo chưa xử lý xong",
  REVIEW: "Đánh giá",
};

const TIMELINE_NOTE_LABELS = {
  "Người thuê tạo phiếu": "Khách thuê đã tạo phiếu.",
  "Khách thuê tạo phiếu": "Khách thuê đã tạo phiếu.",
};

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
  // Accept legacy event values that use spaces or hyphens instead of enum underscores.
  const normalized = String(action || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return ACTION_LABELS[normalized] || "Cập nhật trạng thái";
}

function statusMeta(status) {
  return STATUS_META[status] || ["Trạng thái chưa xác định", "bg-slate-100 text-slate-700 ring-slate-200"];
}

function formatTimelineNote(note) {
  const text = String(note || "").trim();
  const normalized = text.toUpperCase().replace(/[\s-]+/g, "_");
  return (
    TIMELINE_NOTE_LABELS[text] ||
    ACTION_LABELS[normalized] ||
    BILLING_STATUS_LABELS[normalized] ||
    text ||
    "Không có ghi chú."
  );
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
  const normalizedLabel = String(label || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (
    BILLING_STATUS_LABELS[normalizedLabel] ||
    label ||
    BILLING_STATUS_LABELS[normalized] ||
    "Trạng thái thu chưa xác định"
  );
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

function userContactName(user) {
  return [user?.fullName, user?.email, user?.phone].find((value) => String(value || "").trim()) || "Chưa có";
}

function userInitial(user) {
  const value = [user?.fullName, user?.email, user?.phone].find((item) => String(item || "").trim()) || "";
  return value ? value.charAt(0).toUpperCase() : "?";
}

function ContactItem({ label, user }) {
  const name = userContactName(user);
  const hasContact = Boolean(user?.phone || user?.email);
  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-900 dark:text-white">{name}</p>
          {user?.phone && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="break-all">{user.phone}</span>
            </p>
          )}
          {user?.email && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="break-all">{user.email}</span>
            </p>
          )}
          {!hasContact && (
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Chưa có thông tin liên hệ</p>
          )}
        </div>
      </div>
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
        Chưa có hoạt động nào.
      </div>
    );
  }

  return (
    <ol className="grid gap-3">
      {events.map((event) => {
        const hasStatusChange =
          event.fromStatus &&
          event.toStatus &&
          event.fromStatus !== event.toStatus;

        return (
          <li key={event.id || `${event.action}-${event.createdAt}`} className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{formatActionLabel(event.action)}</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{formatTimelineNote(event.note)}</p>
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">{formatDateTime(event.createdAt)}</span>
            </div>
            {(hasStatusChange || event.createdBy?.phone) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                {hasStatusChange && (
                  <>
                    <StatusBadge status={event.fromStatus} />
                    <span>→</span>
                    <StatusBadge status={event.toStatus} />
                  </>
                )}
                {event.createdBy?.phone && <span className="ml-auto">{event.createdBy.phone}</span>}
              </div>
            )}
          </li>
        );
      })}
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

export default function MaintenanceTicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id;
  const { activeRole } = useDashboardLayout();
  const canManage = ["owner", "manager"].includes(activeRole);
  const isTenant = activeRole === "tenant";
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [completeForm, setCompleteForm] = useState(buildCompleteForm());
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [editRepairDetails, setEditRepairDetails] = useState(false);
  const [repairDecision, setRepairDecision] = useState(null);
  const [repairDecisionReason, setRepairDecisionReason] = useState("");

  const locationText = useMemo(() => {
    if (!ticket) return "";
    if (ticket.ticketScope === "ROOM" || ticket.roomCode || ticket.roomName) {
      return [ticket.roomCode || ticket.roomName || "Phòng thuê", ticket.propertyName].filter(Boolean).join(" · ");
    }
    return [SCOPE_LABELS[ticket.ticketScope] || "Phạm vi chưa xác định", ticket.propertyName].filter(Boolean).join(" · ");
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
      return true;
    } catch (actionError) {
      setError(actionError?.message || "Không xử lý được thao tác.");
      return false;
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

  function openTenantRepairDecision(approved) {
    setRepairDecision(approved ? "APPROVED" : "REJECTED");
    setRepairDecisionReason("");
  }

  async function submitTenantRepairDecision(event) {
    event.preventDefault();
    const rejected = repairDecision === "REJECTED";
    if (rejected && !repairDecisionReason.trim()) {
      setError("Vui lòng nhập lý do không đồng ý sửa chữa.");
      return;
    }
    const decided = await runAction(
      "repair-decision",
      () => decideMaintenanceRepair(ticketId, !rejected, repairDecisionReason.trim()),
    );
    if (decided) {
      setRepairDecision(null);
      setRepairDecisionReason("");
    }
  }

  async function handleStartProgress() {
    setError("");
    setEditRepairDetails(true);
    setCompleteForm(buildCompleteForm(ticket));
    setIsCompleteDialogOpen(true);
  }

  function handleOpenCompletion() {
    setError("");
    setEditRepairDetails(false);
    setCompleteForm(buildCompleteForm(ticket));
    setIsCompleteDialogOpen(true);
  }

  async function handleComplete(event) {
    event.preventDefault();
    const isProposal = ticket.status === "ACCEPTED";
    const isEditingRepairDetails = isProposal || editRepairDetails;
    if (isEditingRepairDetails && !completeForm.repairItems.trim()) {
      setError(isProposal ? "Vui lòng nhập hạng mục dự kiến sửa." : "Vui lòng nhập hạng mục đã sửa.");
      return;
    }
    if (isEditingRepairDetails && !completeForm.repairmanName.trim()) {
      setError("Vui lòng nhập tên thợ sửa hoặc nhân sự xử lý.");
      return;
    }
    if (isEditingRepairDetails && !completeForm.actualCost.trim()) {
      setError(isProposal ? "Vui lòng nhập chi phí dự kiến." : "Vui lòng nhập chi phí thực tế.");
      return;
    }
    if (!isProposal && (ticket.afterAttachments?.length || 0) === 0 && completeForm.images.length === 0) {
      setError("Vui lòng upload ít nhất 1 ảnh sau sửa trước khi hoàn tất.");
      return;
    }
    if (!isProposal && (ticket.afterAttachments?.length || 0) + completeForm.images.length > 3) {
      setError("Ảnh sau sửa tối đa 3 ảnh.");
      return;
    }
    const amount = parseMoneyInput(completeForm.actualCost);
    if (isEditingRepairDetails) {
      if (!Number.isFinite(amount) || amount < 0) {
        setError("Chi phí thực tế không hợp lệ.");
        return;
      }
      if (!isProposal && ticket.ticketScope === "PROPERTY_OPERATION" && amount <= 0) {
        setError("Vui lòng nhập chi phí thực tế cho phiếu nội bộ.");
        return;
      }
    }

    const completed = await runAction("complete", async () => {
      const basePayload = isEditingRepairDetails
        ? {
            repairmanName: completeForm.repairmanName.trim(),
            repairmanPhone: completeForm.repairmanPhone.trim(),
            rootCause: completeForm.rootCause.trim(),
            repairItems: completeForm.repairItems.trim(),
            actualCost: amount,
            costResponsibility: completeForm.costResponsibility,
            costDescription: completeForm.repairItems.trim(),
            completionNote: completeForm.completionNote.trim(),
          }
        : {};
      if (isProposal) {
        await updateMaintenanceRepairInfo(ticketId, basePayload);
        return;
      }
      const uploaded = await Promise.all(completeForm.images.map((file) => uploadMaintenanceImage(file)));
      await completeMaintenanceTicket(ticketId, {
        ...basePayload,
        collectionMethod: (isEditingRepairDetails ? completeForm.costResponsibility : ticket.costResponsibility || completeForm.costResponsibility) === "TENANT" ? completeForm.collectionMethod : null,
        billingPeriod: (isEditingRepairDetails ? completeForm.costResponsibility : ticket.costResponsibility || completeForm.costResponsibility) === "TENANT" && completeForm.collectionMethod === "MONTHLY_SCHEDULED"
          ? completeForm.billingPeriod
          : null,
        completionNote: completeForm.completionNote.trim(),
        attachmentIds: uploaded.map((file) => file.fileId).filter(Boolean),
        phase: "AFTER",
      });
    });
    if (completed) setIsCompleteDialogOpen(false);
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
  const shouldShowIncidentalPayment = ticket.status !== "REJECTED" && (
    Boolean(ticket.invoiceId)
    || ["SCHEDULED", "SCHEDULE_FAILED", "DRAFT", "PENDING_PAYMENT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOIDED"]
      .includes(incidentalBillingStatus)
  );
  const isEditingRepairDetails = ticket.status === "ACCEPTED" || editRepairDetails;
  const completionCostResponsibility = editRepairDetails
    ? completeForm.costResponsibility
    : ticket.costResponsibility || completeForm.costResponsibility;

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
                <Wrench className="h-4 w-4" />
                Lập phương án sửa
              </button>
            )}
            {ticket.status === "IN_PROGRESS" && (
              <button
                type="button"
                onClick={handleOpenCompletion}
                disabled={Boolean(actionLoading)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <TimerReset className="h-4 w-4" />
                Hoàn tất xử lý
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
          ) : isTenant && ticket.status === "WAITING_TENANT_DECISION" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openTenantRepairDecision(true)}
                disabled={Boolean(actionLoading)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {actionLoading === "repair-decision" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Đồng ý sửa chữa
              </button>
              <button
                type="button"
                onClick={() => openTenantRepairDecision(false)}
                disabled={Boolean(actionLoading)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
              >
                <X className="h-4 w-4" />
                Không đồng ý sửa
              </button>
            </div>
          ) : null}
        />
      </div>

      {error && <Notice type="error">{error}</Notice>}

      <div className="grid gap-4 lg:grid-cols-4">
        <InfoItem label="Vị trí" value={locationText} />
        <InfoItem label="Hạng mục" value={CATEGORY_LABELS[ticket.category] || "Khác"} />
        <InfoItem label="Mong muốn xử lý" value={ticket.repairRequested === false ? "Chỉ báo sự cố" : "Cần sửa chữa"} />
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
          <ContactItem label="Người gửi" user={ticket.createdBy} />
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

      <Dialog
        modal={false}
        open={isCompleteDialogOpen}
        onOpenChange={(open) => {
          if (actionLoading === "complete") return;
          setIsCompleteDialogOpen(open);
          if (!open) setError("");
        }}
      >
        <DialogContent
          lockScroll={false}
          className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] !max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border border-[#d8dee8] bg-white p-0 dark:border-white/10 dark:bg-[#0f172a] sm:w-full"
        >
          <div className="shrink-0 border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                {ticket.status === "ACCEPTED" ? "Lập phương án sửa chữa" : "Hoàn tất xử lý"}
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {ticket.status === "ACCEPTED"
                  ? "Nhập thông tin thợ và chi phí để gửi khách thuê quyết định."
                  : "Ghi nhận kết quả sửa chữa và hoàn tất phiếu sự cố."}
              </DialogDescription>
            </DialogHeader>
            {error && <div className="mt-3"><Notice type="error">{error}</Notice></div>}
          </div>
          <div className="min-h-0 overflow-y-auto p-5">
      {canManage && ["ACCEPTED", "IN_PROGRESS"].includes(ticket.status) && (
        <form onSubmit={handleComplete} className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Người sửa">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input value={completeForm.repairmanName} onChange={(event) => updateCompleteForm("repairmanName", event.target.value)} readOnly={!isEditingRepairDetails} className={`${inputClassName()} w-full pl-9 ${!isEditingRepairDetails ? "bg-slate-50 dark:bg-white/5" : ""}`} placeholder="Tên thợ hoặc nhân sự" />
              </div>
            </Field>
            <Field label="Số điện thoại">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input value={completeForm.repairmanPhone} onChange={(event) => updateCompleteForm("repairmanPhone", event.target.value)} readOnly={!isEditingRepairDetails} className={`${inputClassName()} w-full pl-9 ${!isEditingRepairDetails ? "bg-slate-50 dark:bg-white/5" : ""}`} placeholder="SĐT liên hệ" />
              </div>
            </Field>
            <Field label="Trách nhiệm chi phí">
              <CostResponsibilityDropdown
                value={ticket.ticketScope === "PROPERTY_OPERATION" ? "OWNER" : completionCostResponsibility}
                onChange={(value) => updateCompleteForm("costResponsibility", value)}
                disabled={!isEditingRepairDetails || ticket.ticketScope === "PROPERTY_OPERATION"}
              />
            </Field>
          </div>
              {ticket.status !== "ACCEPTED" && completionCostResponsibility === "TENANT" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Cách thu tiền *">
                <select value={completeForm.collectionMethod} onChange={(event) => updateCompleteForm("collectionMethod", event.target.value)} className={inputClassName()}>
                  <option value="BILL_NOW">Thanh toán hóa đơn ngay</option>
                  <option value="MONTHLY_SCHEDULED">Gộp vào hóa đơn đầu tháng</option>
                </select>
              </Field>
              {completeForm.collectionMethod === "MONTHLY_SCHEDULED" && (
                <Field label="Kỳ hóa đơn gộp *">
                  <VietnameseMonthPicker
                    value={completeForm.billingPeriod}
                    onChange={(value) => updateCompleteForm("billingPeriod", value)}
                  />
                </Field>
              )}
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Nguyên nhân">
              <textarea value={completeForm.rootCause} onChange={(event) => updateCompleteForm("rootCause", event.target.value)} readOnly={!isEditingRepairDetails} className={`${textareaClassName()} ${!isEditingRepairDetails ? "bg-slate-50 dark:bg-white/5" : ""}`} placeholder="Nguyên nhân sự cố" />
            </Field>
            <Field label={ticket.status === "ACCEPTED" ? "Hạng mục dự kiến sửa *" : "Hạng mục đã sửa *"}>
              <textarea value={completeForm.repairItems} onChange={(event) => updateCompleteForm("repairItems", event.target.value)} readOnly={!isEditingRepairDetails} className={`${textareaClassName()} ${!isEditingRepairDetails ? "bg-slate-50 dark:bg-white/5" : ""}`} placeholder={ticket.status === "ACCEPTED" ? "Các việc dự kiến thực hiện" : "Các việc đã xử lý"} />
            </Field>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label={ticket.status === "ACCEPTED" ? "Chi phí dự kiến (VNĐ) *" : "Chi phí thực tế (VNĐ)"}>
              <input value={completeForm.actualCost} onChange={(event) => updateCompleteForm("actualCost", event.target.value)} readOnly={!isEditingRepairDetails} className={`${inputClassName()} tabular-nums ${!isEditingRepairDetails ? "bg-slate-50 dark:bg-white/5" : ""}`} inputMode="numeric" placeholder="0" />
            </Field>
            <Field label={ticket.status === "ACCEPTED" ? "Ghi chú gửi khách" : "Ghi chú hoàn tất"}>
              <input value={completeForm.completionNote} onChange={(event) => updateCompleteForm("completionNote", event.target.value)} className={inputClassName()} placeholder={ticket.status === "ACCEPTED" ? "Thông tin thêm cho khách thuê" : "Ghi chú hoàn tất nếu có"} />
            </Field>
          </div>
          <div className="grid gap-3">
            {ticket.status !== "ACCEPTED" && !editRepairDetails && (
              <button
                type="button"
                onClick={() => setEditRepairDetails(true)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#cbd5e1] px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Chỉnh sửa thông tin thực tế
              </button>
            )}
            {ticket.status !== "ACCEPTED" && (
              <MaintenanceCompletionImageSection
                existingAttachments={ticket.afterAttachments}
                files={completeForm.images}
                onChange={handleAfterImages}
                onRemove={(index) =>
                  setCompleteForm((current) => ({
                    ...current,
                    images: current.images.filter(
                      (_, fileIndex) => fileIndex !== index,
                    ),
                  }))
                }
              />
            )}
            <button
              type="submit"
              disabled={Boolean(actionLoading)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {actionLoading === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TimerReset className="h-4 w-4" />}
              {ticket.status === "ACCEPTED" ? "Gửi phương án cho khách" : "Xác nhận hoàn tất"}
            </button>
          </div>
        </form>
      )}

          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={repairDecision !== null}
        onOpenChange={(open) => {
          if (actionLoading === "repair-decision") return;
          if (!open) {
            setRepairDecision(null);
            setRepairDecisionReason("");
            setError("");
          }
        }}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-lg rounded-xl border border-[#d8dee8] bg-white dark:border-white/10 dark:bg-[#0f172a]">
          <form onSubmit={submitTenantRepairDecision} className="grid gap-5">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                {repairDecision === "APPROVED" ? "Đồng ý sửa chữa" : "Không đồng ý sửa chữa"}
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {repairDecision === "APPROVED"
                  ? "Bạn xác nhận đồng ý với phương án và chi phí dự kiến của quản lý?"
                  : "Vui lòng cho biết lý do để quản lý tiếp tục xử lý phiếu. "}
              </DialogDescription>
            </DialogHeader>
            {repairDecision === "REJECTED" && (
              <textarea
                value={repairDecisionReason}
                onChange={(event) => setRepairDecisionReason(event.target.value)}
                className={textareaClassName()}
                placeholder="Lý do không đồng ý sửa chữa"
                autoFocus
              />
            )}
            {error && <Notice type="error">{error}</Notice>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRepairDecision(null)}
                disabled={actionLoading === "repair-decision"}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={actionLoading === "repair-decision"}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold text-white disabled:opacity-60 ${repairDecision === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
              >
                {actionLoading === "repair-decision" && <Loader2 className="h-4 w-4 animate-spin" />}
                {repairDecision === "APPROVED" ? "Xác nhận đồng ý" : "Gửi quyết định"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {(ticket.status === "WAITING_TENANT_DECISION" || ticket.status === "WAITING_CONFIRMATION" || ticket.status === "COMPLETED") && (
        <section className="grid gap-4 rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {ticket.status === "WAITING_TENANT_DECISION" ? "Phương án sửa chữa" : "Kết quả xử lý"}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="Người sửa" value={ticket.workerName} />
            <InfoItem label="SĐT thợ" value={ticket.repairmanPhone} />
            <InfoItem label="Chi phí" value={formatMoney(ticket.costAmount)} />
            <InfoItem
              label="Trách nhiệm"
              value={COST_RESPONSIBILITY_LABELS[normalizeCostResponsibility(ticket.costResponsibility)] || "Chủ trọ chịu"}
            />
          </div>
          {ticket.rootCause && <InfoItem label="Nguyên nhân" value={ticket.rootCause} />}
          {ticket.repairItems && <InfoItem label={ticket.status === "WAITING_TENANT_DECISION" ? "Hạng mục dự kiến sửa" : "Hạng mục đã sửa"} value={ticket.repairItems} />}
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
