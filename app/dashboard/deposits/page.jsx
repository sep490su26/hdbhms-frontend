"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  CalendarClock,
  CircleAlert,
  Download,
  FileText,
  ImageIcon,
  LockKeyhole,
  Search,
  PhoneCall,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  downloadDepositContractPdf,
  fetchDepositAgreementDetails,
  fetchDepositAgreements,
  fetchDepositDashboardSummary,
  fetchDepositFilterOptions,
  fetchDepositAssetObjectUrl,
  openDepositContractPdf,
  updateDepositAgreementManagementInfo,
  updateDepositAgreementStatus,
  recordDepositContact,
  extendDepositAgreement,
  forfeitDepositAgreement,
} from "@/services/depositContractsService";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/lib/dateFormat";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";

const money = new Intl.NumberFormat("vi-VN");

const STATUS_OPTIONS = [
  {
    value: "PAID",
    label: "Đã đặt cọc",
    pill: "bg-amber-100 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-300",
    dot: "bg-amber-500",
  },
  {
    value: "EXTENDED",
    label: "Đã gia hạn",
    pill: "bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-300",
    dot: "bg-cyan-600",
  },
  {
    value: "CONVERTED_TO_LEASE",
    label: "Đã nhận phòng",
    pill: "bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300",
    dot: "bg-blue-600",
  },
  {
    value: "REFUNDED",
    label: "Đã hoàn cọc",
    pill: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    dot: "bg-emerald-600",
  },
  {
    value: "FORFEITED",
    label: "Mất cọc",
    pill: "bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300",
    dot: "bg-rose-600",
  },
];

const MANAGED_DEPOSIT_STATUSES = new Set(
  STATUS_OPTIONS.map((status) => status.value),
);
const MANAGED_DEPOSIT_STATUS_VALUES = [
  "PAID",
  "CONFIRMED",
  "EXTENDED",
  "CONVERTED_TO_LEASE",
  "REFUNDED",
  "FORFEITED",
];
const MANAGEMENT_INFO_EDITABLE_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "EXTENDED",
]);
const ACTIVE_DEPOSIT_STATUSES = new Set(["PAID", "CONFIRMED", "EXTENDED"]);
const STATUS_UPDATE_OPTIONS = STATUS_OPTIONS.filter((status) =>
  ["CONVERTED_TO_LEASE", "REFUNDED"].includes(status.value),
);

const STATUS_LABELS = {
  PAID: STATUS_OPTIONS[0],
  CONFIRMED: STATUS_OPTIONS[0],
  EXTENDED: STATUS_OPTIONS[1],
  CONVERTED_TO_LEASE: STATUS_OPTIONS[2],
  REFUNDED: STATUS_OPTIONS[3],
  FORFEITED: STATUS_OPTIONS[4],
  CANCELLED: {
    label: "Đã hủy",
    pill: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  },
};

function formatMoney(value) {
  return `${money.format(Number(value || 0))} đ`;
}

function formatDate(value) {
  return formatDisplayDate(value);
}

function toInputDate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  return formatDisplayDateTime(value);
}

function isDateReached(value) {
  if (!value) return false;
  return String(value).slice(0, 10) <= new Date().toISOString().slice(0, 10);
}

function contactOutcomeLabel(outcome) {
  if (outcome === "REACHED") return "Đã liên hệ được";
  if (outcome === "UNREACHABLE") return "Không liên lạc được";
  return "Chưa ghi nhận liên hệ";
}

function getDepositTrackingState(agreement) {
  if (agreement.status === "CONVERTED_TO_LEASE") {
    return { label: "Đã nhận phòng", className: "bg-blue-100 text-blue-700" };
  }
  if (agreement.status === "REFUNDED") {
    return { label: "Đã hoàn cọc", className: "bg-emerald-100 text-emerald-700" };
  }
  if (agreement.status === "FORFEITED") {
    return { label: "Đã xử lý mất cọc", className: "bg-slate-100 text-slate-700" };
  }
  if (agreement.contactRequired) {
    return { label: "Cần liên hệ", className: "bg-amber-100 text-amber-800" };
  }
  if (ACTIVE_DEPOSIT_STATUSES.has(agreement.status) && agreement.overdueDays > 0) {
    return { label: `Quá hạn ${agreement.overdueDays} ngày`, className: "bg-rose-100 text-rose-700" };
  }
  return { label: "Đang theo dõi", className: "bg-slate-100 text-slate-700" };
}

function getAgreementItems(response) {
  return response?.data || response?.content || response?.items || [];
}

function getAgreementPagination(response) {
  return {
    currentPage: Number(response?.currentPage || 1),
    totalPages: Number(response?.totalPages || 0),
    pageSize: Number(response?.pageSize || 10),
    totalElements: Number(response?.totalElements || 0),
  };
}

function getDepositStatusFilterValues(statusFilter) {
  if (statusFilter === "all") return MANAGED_DEPOSIT_STATUS_VALUES;
  if (statusFilter === "PAID") return ["PAID", "CONFIRMED"];
  return [statusFilter];
}

function normalizeSignatureStatusLabel(label, signatureStatus, signedFileId) {
  if (signatureStatus === "SIGNED" || signedFileId) return "Đã ký";
  const normalized = String(label || "").trim();
  if (
    !normalized ||
    normalized === "Chờ upload" ||
    normalized === "Chờ upload bản đã ký"
  ) {
    return "Chờ ký";
  }
  return normalized;
}

function normalizeAgreement(item) {
  const rawStatus = String(item.status || "").toUpperCase();
  const status = rawStatus === "CONFIRMED" ? "PAID" : rawStatus;
  const roomCode = item.roomCode || item.room_code || "";
  const floorName = item.floorName || item.floor_name || "";
  const signedFileId = item.signedFileId || item.signed_file_id || null;
  const signatureStatus =
    item.signatureStatus ||
    item.signature_status ||
    (signedFileId ? "SIGNED" : "PENDING_SIGNATURE");
  return {
    id: item.id ?? item.depositAgreementId ?? item.deposit_agreement_id,
    depositCode: item.depositCode || item.deposit_code || `DC-${item.id}`,
    roomCode,
    floorId: item.floorId ?? item.floor_id ?? null,
    floorLabel: floorName || (roomCode
      ? `Tầng ${String(roomCode).charAt(0)}`
      : "Chưa rõ tầng"),
    propertyName: item.propertyName || item.property_name || "Nhà trọ Hải Đăng",
    depositorFullName:
      item.depositorFullName || item.depositor_full_name || "Khách đặt cọc",
    depositorPhone:
      item.depositorPhone || item.depositor_phone || "Chưa có SĐT",
    depositorEmail: item.depositorEmail || item.depositor_email || "",
    depositorPermanentAddress:
      item.depositorPermanentAddress ||
      item.depositor_permanent_address ||
      item.permanentAddress ||
      item.permanent_address ||
      "",
    amount: Number(item.amount || 0),
    createdAt: item.createdAt || item.created_at || null,
    status,
    confirmedAt: item.confirmedAt || item.confirmed_at || null,
    expectedLeaseSignDate:
      item.expectedLeaseSignDate || item.expected_lease_sign_date || null,
    expectedMoveInDate:
      item.expectedMoveInDate || item.expected_move_in_date || null,
    contractFileId: item.contractFileId || item.contract_file_id || null,
    contractDownloadUrl:
      item.contractDownloadUrl || item.contract_download_url || null,
    signatureStatus,
    signatureStatusLabel: normalizeSignatureStatusLabel(
      item.signatureStatusLabel || item.signature_status_label,
      signatureStatus,
      signedFileId,
    ),
    signedFileId,
    signedFileName: item.signedFileName || item.signed_file_name || "",
    signedAt: item.signedAt || item.signed_at || null,
    signedUploadedById:
      item.signedUploadedById || item.signed_uploaded_by_id || null,
    signedFileDownloadUrl:
      item.signedFileDownloadUrl || item.signed_file_download_url || null,
    canPreviewDraft: item.canPreviewDraft ?? item.can_preview_draft ?? true,
    canDownloadDraft: item.canDownloadDraft ?? item.can_download_draft ?? true,
    canUploadSignedFile:
      item.canUploadSignedFile ?? item.can_upload_signed_file ?? true,
    canViewSignedFile:
      item.canViewSignedFile ??
      item.can_view_signed_file ??
      Boolean(signedFileId),
    extensionCount: Number(item.extensionCount ?? item.extension_count ?? 0),
    maxExtensions: Number(item.maxExtensions ?? item.max_extensions ?? 1),
    depositExpiresAt: item.depositExpiresAt || item.deposit_expires_at || null,
    forfeitureDecisionDate:
      item.forfeitureDecisionDate || item.forfeiture_decision_date || null,
    overdueDays: Number(item.overdueDays ?? item.overdue_days ?? 0),
    latestContactOutcome:
      item.latestContactOutcome || item.latest_contact_outcome || "",
    lastContactedAt: item.lastContactedAt || item.last_contacted_at || null,
    lastContactNote: item.lastContactNote || item.last_contact_note || "",
    contactRequired: Boolean(item.contactRequired ?? item.contact_required),
    canExtend: Boolean(item.canExtend ?? item.can_extend),
    canForfeit: Boolean(item.canForfeit ?? item.can_forfeit),
  };
}

function mergeAgreement(base, details) {
  if (!details) return base;
  return {
    ...base,
    ...normalizeAgreement({ ...base, ...details }),
    details,
  };
}

function StatusBadge({ status }) {
  const config = STATUS_LABELS[status] || STATUS_OPTIONS[0];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ${config.pill}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f7f9fc] dark:bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-900 dark:text-white">
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}

function SensitiveImage({ title, url, fileId }) {
  const imagePath = url || (fileId ? `/api/v1/files/private/${fileId}` : "");
  const [imageState, setImageState] = useState({
    path: "",
    src: "",
    error: "",
  });
  const src = imageState.path === imagePath ? imageState.src : "";
  const error = imageState.path === imagePath ? imageState.error : "";

  useEffect(() => {
    let isMounted = true;
    let objectUrl = "";

    if (!imagePath) return undefined;

    fetchDepositAssetObjectUrl(imagePath)
      .then((nextUrl) => {
        objectUrl = nextUrl;
        if (isMounted) {
          setImageState({ path: imagePath, src: nextUrl, error: "" });
        } else if (nextUrl) {
          URL.revokeObjectURL(nextUrl);
        }
      })
      .catch(() => {
        if (isMounted)
          setImageState({
            path: imagePath,
            src: "",
            error: "Không tải được ảnh",
          });
      });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath]);

  return (
    <div className="rounded-xl border border-[#d7dde8] dark:border-white/10 bg-white dark:bg-[#0f172a] p-3">
      <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
        {title}
      </p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          className="h-48 w-full rounded-lg border border-[#e5e9f2] dark:border-white/10 object-contain"
        />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[#c7cfdd] dark:border-white/10 bg-[#f7f9fc] dark:bg-white/5 text-sm font-semibold text-slate-500 dark:text-slate-400">
          <ImageIcon className="mr-2 h-5 w-5" />
          Chưa có ảnh
        </div>
      )}
      {!src && error && imagePath && (
        <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

function valueOf(object, camelKey, snakeKey) {
  return object?.[camelKey] ?? object?.[snakeKey] ?? null;
}

function DetailModal({
  agreement,
  loading,
  onClose,
  onOpenContract,
  onDownloadContract,
  onSaveManagementInfo,
  onRecordContact,
  onExtend,
  onForfeit,
}) {
  const safeAgreement = agreement || {};
  const details = safeAgreement.details || safeAgreement;
  const room = details.room || {};
  const expectedLeaseSignDate =
    valueOf(details, "expectedLeaseSignDate", "expected_lease_sign_date") ||
    safeAgreement.expectedLeaseSignDate;
  const expectedMoveInDate =
    valueOf(details, "expectedMoveInDate", "expected_move_in_date") ||
    safeAgreement.expectedMoveInDate;
  const depositorPermanentAddress =
    valueOf(
      details,
      "depositorPermanentAddress",
      "depositor_permanent_address",
    ) ||
    safeAgreement.depositorPermanentAddress ||
    "";
  const idFrontFileId = valueOf(details, "idFrontFileId", "id_front_file_id");
  const idFrontFileUrl = valueOf(
    details,
    "idFrontFileUrl",
    "id_front_file_url",
  );
  const idBackFileId = valueOf(details, "idBackFileId", "id_back_file_id");
  const idBackFileUrl = valueOf(details, "idBackFileUrl", "id_back_file_url");
  const portraitFileId = valueOf(details, "portraitFileId", "portrait_file_id");
  const portraitFileUrl = valueOf(
    details,
    "portraitFileUrl",
    "portrait_file_url",
  );
  const canEditManagementInfo = MANAGEMENT_INFO_EDITABLE_STATUSES.has(
    safeAgreement.status,
  );
  const canEditSchedule = safeAgreement.status === "PENDING_PAYMENT";
  const canRecordContact =
    MANAGEMENT_INFO_EDITABLE_STATUSES.has(safeAgreement.status) &&
    isDateReached(expectedMoveInDate);
  const formDefaults = useMemo(
    () => ({
      depositorPhone: safeAgreement.depositorPhone || "",
      permanentAddress: depositorPermanentAddress || "",
      expectedLeaseSignDate: toInputDate(expectedLeaseSignDate),
      expectedMoveInDate: toInputDate(expectedMoveInDate),
    }),
    [
      safeAgreement.depositorPhone,
      depositorPermanentAddress,
      expectedLeaseSignDate,
      expectedMoveInDate,
    ],
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(null);
  const activeForm = form || formDefaults;

  if (!agreement) return null;

  const today = new Date().toISOString().slice(0, 10);
  const updateField = (field, value) => {
    setForm((current) => ({ ...(current || formDefaults), [field]: value }));
  };
  const validateForm = () => {
    const phone = activeForm.depositorPhone.replace(/[\s.-]/g, "");
    if (!/^0\d{9}$/.test(phone))
      return "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số.";
    if (!activeForm.permanentAddress.trim())
      return "Địa chỉ không được để trống.";
    if (canEditSchedule) {
      if (!activeForm.expectedLeaseSignDate)
        return "Vui lòng chọn ngày ký hợp đồng dự kiến.";
      if (activeForm.expectedLeaseSignDate < today)
        return "Ngày ký hợp đồng dự kiến không được là ngày quá khứ.";
      if (!activeForm.expectedMoveInDate)
        return "Vui lòng chọn ngày vào ở dự kiến.";
      if (activeForm.expectedMoveInDate < today)
        return "Ngày vào ở dự kiến không được là ngày quá khứ.";
      if (activeForm.expectedMoveInDate < activeForm.expectedLeaseSignDate)
        return "Ngày vào ở dự kiến không được trước ngày ký hợp đồng dự kiến.";
    }
    return "";
  };
  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      await onSaveManagementInfo(agreement, {
        depositorPhone: activeForm.depositorPhone.replace(/[\s.-]/g, ""),
        permanentAddress: activeForm.permanentAddress.trim(),
        expectedLeaseSignDate: activeForm.expectedLeaseSignDate,
        expectedMoveInDate: activeForm.expectedMoveInDate,
      });
      setForm(null);
      setIsEditing(false);
    } catch (error) {
      setFormError(
        error.message || "Không thể cập nhật thông tin hợp đồng cọc.",
      );
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white dark:bg-[#0f172a] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d7dde8] dark:border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#1e40af] dark:text-[#93c5fd]">
              Chi tiết hợp đồng cọc
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
              {agreement.depositCode}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-600 dark:text-slate-300 hover:bg-[#eef3fb]"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 custom-scrollbar">
          {loading ? (
            <div className="rounded-xl border border-[#d7dde8] dark:border-white/10 bg-[#f7f9fc] dark:bg-white/5 p-10 text-center font-bold text-slate-600 dark:text-slate-300">
              Đang tải chi tiết hợp đồng cọc...
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailField
                    label="Khách hàng"
                    value={agreement.depositorFullName}
                  />
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] dark:bg-white/5 p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                        Số điện thoại
                      </span>
                      <input
                        value={activeForm.depositorPhone}
                        onChange={(event) =>
                          updateField("depositorPhone", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] dark:border-white/10 px-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
                      />
                    </label>
                  ) : (
                    <DetailField
                      label="Số điện thoại"
                      value={agreement.depositorPhone}
                    />
                  )}
                  <DetailField
                    label="Email"
                    value={agreement.depositorEmail || "Không có"}
                  />
                  <DetailField
                    label="Phòng"
                    value={agreement.roomCode || room.roomCode}
                  />
                  <DetailField label="Cơ sở" value={agreement.propertyName} />
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] dark:bg-white/5 p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                        Địa chỉ
                      </span>
                      <input
                        value={activeForm.permanentAddress}
                        onChange={(event) =>
                          updateField("permanentAddress", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] dark:border-white/10 px-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
                      />
                    </label>
                  ) : (
                    <DetailField
                      label="Địa chỉ"
                      value={depositorPermanentAddress}
                    />
                  )}
                  <DetailField
                    label="Tiền cọc"
                    value={formatMoney(agreement.amount)}
                  />
                  <DetailField
                    label="Ngày tạo"
                    value={formatDateTime(agreement.createdAt)}
                  />
                  <DetailField
                    label="Ngày xác nhận"
                    value={formatDateTime(agreement.confirmedAt)}
                  />
                  {isEditing && canEditSchedule ? (
                    <label className="rounded-lg bg-[#f7f9fc] dark:bg-white/5 p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                        Ngày ký HĐ dự kiến
                      </span>
                      <input
                        type="date"
                        min={today}
                        value={activeForm.expectedLeaseSignDate}
                        onChange={(event) =>
                          updateField(
                            "expectedLeaseSignDate",
                            event.target.value,
                          )
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] dark:border-white/10 px-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
                      />
                    </label>
                  ) : (
                    <DetailField
                      label="Ngày ký HĐ dự kiến"
                      value={formatDate(expectedLeaseSignDate)}
                    />
                  )}
                  {isEditing && canEditSchedule ? (
                    <label className="rounded-lg bg-[#f7f9fc] dark:bg-white/5 p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                        Ngày vào ở dự kiến
                      </span>
                      <input
                        type="date"
                        min={today}
                        value={activeForm.expectedMoveInDate}
                        onChange={(event) =>
                          updateField("expectedMoveInDate", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] dark:border-white/10 px-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
                      />
                    </label>
                  ) : (
                    <DetailField
                      label="Ngày vào ở dự kiến"
                      value={formatDate(expectedMoveInDate)}
                    />
                  )}
                  <DetailField
                    label="Ghi chú"
                    value={details.note || "Không có ghi chú"}
                  />
                </div>

                {formError && (
                  <div className="rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm font-bold text-rose-700 dark:text-rose-300">
                    {formError}
                  </div>
                )}

                <section className="rounded-xl border border-[#d7dde8] dark:border-white/10 bg-[#f7f9fc] dark:bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                        Ảnh giấy tờ
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                        CCCD và ảnh chân dung
                      </h3>
                    </div>
                    <LockKeyhole className="h-5 w-5 text-[#1e40af] dark:text-[#93c5fd]" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Dữ liệu này nhạy cảm, chỉ tài khoản có quyền quản lý mới nên
                    xem.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <SensitiveImage
                      title="Mặt trước CCCD"
                      url={idFrontFileUrl}
                      fileId={idFrontFileId}
                    />
                    <SensitiveImage
                      title="Mặt sau CCCD"
                      url={idBackFileUrl}
                      fileId={idBackFileId}
                    />
                    <SensitiveImage
                      title="Ảnh chân dung"
                      url={portraitFileUrl}
                      fileId={portraitFileId}
                    />
                  </div>
                </section>

              </section>

              <aside className="h-fit rounded-xl border border-[#d7dde8] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 shadow-[0_10px_24px_rgba(9,20,38,0.06)]">
                <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Trạng thái hiện tại
                </p>
                <div className="mt-4">
                  <StatusBadge status={agreement.status} />
                </div>
                <div className="mt-5 grid gap-3 rounded-xl bg-[#f7f9fc] p-4 dark:bg-white/5">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-5 w-5 text-[#1e40af] dark:text-[#93c5fd]" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                        Hạn xử lý mất cọc
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                        {formatDate(safeAgreement.forfeitureDecisionDate)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {ACTIVE_DEPOSIT_STATUSES.has(safeAgreement.status) && safeAgreement.overdueDays > 0
                          ? `Đã quá ngày vào dự kiến ${safeAgreement.overdueDays} ngày`
                          : ACTIVE_DEPOSIT_STATUSES.has(safeAgreement.status)
                            ? "Chưa quá ngày vào dự kiến"
                            : "Khoản cọc đã kết thúc xử lý"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-[#d7dde8] pt-3 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                      Liên hệ gần nhất
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                      {contactOutcomeLabel(safeAgreement.latestContactOutcome)}
                    </p>
                    {safeAgreement.lastContactedAt && (
                      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {formatDateTime(safeAgreement.lastContactedAt)}
                      </p>
                    )}
                    {safeAgreement.lastContactNote && (
                      <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {safeAgreement.lastContactNote}
                      </p>
                    )}
                  </div>
                  <p className="border-t border-[#d7dde8] pt-3 text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-300">
                    Gia hạn {safeAgreement.extensionCount || 0}/{safeAgreement.maxExtensions || 1} lần, tối đa 7 ngày.
                  </p>
                </div>
                <div className="mt-6 grid gap-3">
                  {canRecordContact && (
                    <button
                      type="button"
                      onClick={() => onRecordContact(agreement)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-slate-900 hover:bg-[#f4f7fb] dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                    >
                      <PhoneCall className="h-4 w-4" />
                      Ghi nhận liên hệ
                    </button>
                  )}
                  {safeAgreement.canExtend && (
                    <button
                      type="button"
                      onClick={() => onExtend(agreement)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-extrabold text-white hover:bg-cyan-800"
                    >
                      <CalendarClock className="h-4 w-4" />
                      Gia hạn cọc
                    </button>
                  )}
                  {safeAgreement.canForfeit && (
                    <button
                      type="button"
                      onClick={() => onForfeit(agreement)}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-extrabold text-white hover:bg-rose-800"
                    >
                      <CircleAlert className="h-4 w-4" />
                      Xử lý mất cọc
                    </button>
                  )}
                  {canEditManagementInfo &&
                    (isEditing ? (
                      <div className="grid gap-3">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isSaving}
                          className="inline-flex h-12 items-center justify-center rounded-lg bg-[#102033] px-4 text-sm font-extrabold text-white hover:bg-[#1c2f4a] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setFormError("");
                            setForm(null);
                          }}
                          disabled={isSaving}
                          className="inline-flex h-12 items-center justify-center rounded-lg border border-[#c4cad6] dark:border-white/10 px-4 text-sm font-extrabold text-slate-900 dark:text-white hover:bg-[#f4f7fb] dark:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Hủy chỉnh sửa
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setForm(formDefaults);
                          setFormError("");
                          setIsEditing(true);
                        }}
                        className="inline-flex h-12 items-center justify-center rounded-lg border border-[#c4cad6] dark:border-white/10 px-4 text-sm font-extrabold text-slate-900 dark:text-white hover:bg-[#f4f7fb] dark:hover:bg-white/5"
                      >
                        Chỉnh sửa thông tin
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => onOpenContract(agreement)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#102033] px-4 text-sm font-extrabold text-white hover:bg-[#1c2f4a]"
                  >
                    <FileText className="h-4 w-4" />
                    Xem bản nháp
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadContract(agreement)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#c4cad6] dark:border-white/10 px-4 text-sm font-extrabold text-slate-900 dark:text-white hover:bg-[#f4f7fb] dark:hover:bg-white/5"
                  >
                    <Download className="h-4 w-4" />
                    Tải PDF bản nháp
                  </button>
                  {!canEditManagementInfo && (
                    <p className="rounded-lg bg-[#f7f9fc] dark:bg-white/5 p-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      Thông tin cọc đã khóa vì trạng thái hiện tại không còn
                      trong giai đoạn chờ ký.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LifecycleActionModal({ action, agreement, onClose, onSubmit }) {
  const [outcome, setOutcome] = useState("UNREACHABLE");
  const [additionalDays, setAdditionalDays] = useState(7);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!action || !agreement) return null;

  const config = {
    contact: {
      title: "Ghi nhận liên hệ khách",
      description: "Lưu kết quả liên hệ để hệ thống theo dõi điều kiện xử lý cọc.",
      submitLabel: "Lưu kết quả liên hệ",
    },
    extend: {
      title: "Gia hạn khoản cọc",
      description: "Mỗi khoản cọc chỉ được gia hạn một lần, tối đa 7 ngày.",
      submitLabel: "Xác nhận gia hạn",
    },
    forfeit: {
      title: "Xử lý mất cọc",
      description: "Hành động này kết thúc giữ chỗ và chuyển phòng về trạng thái trống.",
      submitLabel: "Xác nhận mất cọc",
    },
  }[action];

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!note.trim()) {
      setError(action === "extend" ? "Vui lòng nhập lý do gia hạn." : "Vui lòng nhập ghi chú xử lý.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = action === "contact"
        ? { outcome, note: note.trim() }
        : action === "extend"
          ? { additionalDays: Number(additionalDays), reason: note.trim() }
          : { reason: note.trim() };
      await onSubmit(action, agreement, payload);
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Không thể thực hiện hành động này.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0f172a]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{config.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{config.description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-[#eef4ff] p-4 text-sm font-bold text-slate-800 dark:bg-white/5 dark:text-slate-200">
          Phòng {agreement.roomCode || "chưa rõ"} · {agreement.depositorFullName}
        </div>

        {action === "contact" && (
          <label className="mt-5 grid gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Kết quả liên hệ</span>
            <select value={outcome} onChange={(event) => setOutcome(event.target.value)} className="h-11 rounded-lg border border-[#c4cad6] px-3 text-sm font-semibold dark:border-white/10 dark:bg-[#0f172a] dark:text-white">
              <option value="UNREACHABLE">Không liên lạc được</option>
              <option value="REACHED">Đã liên hệ được</option>
            </select>
          </label>
        )}

        {action === "extend" && (
          <label className="mt-5 grid gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Số ngày gia hạn</span>
            <input type="number" min="1" max="7" value={additionalDays} onChange={(event) => setAdditionalDays(event.target.value)} className="h-11 rounded-lg border border-[#c4cad6] px-3 text-sm font-semibold dark:border-white/10 dark:bg-[#0f172a] dark:text-white" />
          </label>
        )}

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {action === "extend" ? "Lý do gia hạn" : "Ghi chú"}
          </span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={1000} className="rounded-lg border border-[#c4cad6] px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-[#0f172a] dark:text-white" placeholder={action === "forfeit" ? "Mô tả các lần liên hệ và lý do xử lý..." : "Nhập nội dung trao đổi với khách..."} />
        </label>

        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="h-11 rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-slate-800 dark:border-white/10 dark:text-white">Hủy</button>
          <button type="submit" disabled={submitting} className={`h-11 rounded-lg px-5 text-sm font-extrabold text-white disabled:opacity-60 ${action === "forfeit" ? "bg-rose-700" : "bg-[#102033]"}`}>
            {submitting ? "Đang xử lý..." : config.submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DepositsPage() {
  const [agreements, setAgreements] = useState([]);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [debouncedCustomerFilter, setDebouncedCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [floorOptions, setFloorOptions] = useState([]);
  const [summary, setSummary] = useState({
    totalHeldAmount: 0,
    heldCount: 0,
    convertedCount: 0,
  });
  const [lifecycleAction, setLifecycleAction] = useState(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);

  const loadAgreements = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetchDepositAgreements({
        page,
        size,
        statuses: getDepositStatusFilterValues(statusFilter),
        search: debouncedCustomerFilter,
        floorId: floorFilter === "all" ? null : floorFilter,
      });
      const pagination = getAgreementPagination(response);
      const nextAgreements = getAgreementItems(response)
        .map(normalizeAgreement)
        .filter((agreement) => MANAGED_DEPOSIT_STATUSES.has(agreement.status));
      setAgreements(nextAgreements);
      setTotalElements(pagination.totalElements);
      setTotalPages(pagination.totalPages);
    } catch (error) {
      setLoadError(
        error.message || "Không tải được danh sách hợp đồng cọc từ backend.",
      );
    }
  }, [debouncedCustomerFilter, floorFilter, page, size, statusFilter]);

  const loadSummary = useCallback(async () => {
    const response = await fetchDepositDashboardSummary();
    setSummary({
      totalHeldAmount: Number(response?.totalHeldAmount ?? response?.total_held_amount ?? 0),
      heldCount: Number(response?.heldCount ?? response?.held_count ?? 0),
      convertedCount: Number(response?.convertedCount ?? response?.converted_count ?? 0),
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAgreements();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAgreements]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedCustomerFilter(customerFilter.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [customerFilter]);

  useEffect(() => {
    Promise.all([fetchDepositFilterOptions(), fetchDepositDashboardSummary()])
      .then(([filterResponse, summaryResponse]) => {
        setFloorOptions(filterResponse?.floors || []);
        setSummary({
          totalHeldAmount: Number(summaryResponse?.totalHeldAmount ?? summaryResponse?.total_held_amount ?? 0),
          heldCount: Number(summaryResponse?.heldCount ?? summaryResponse?.held_count ?? 0),
          convertedCount: Number(summaryResponse?.convertedCount ?? summaryResponse?.converted_count ?? 0),
        });
      })
      .catch((error) => setLoadError(error.message || "Không tải được dữ liệu tổng quan hợp đồng cọc."));
  }, []);

  const filteredAgreements = agreements;

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleCustomerFilterChange = (event) => {
    setCustomerFilter(event.target.value);
    setPage(1);
  };

  const handleFloorFilterChange = (event) => {
    setFloorFilter(event.target.value);
    setPage(1);
  };

  const openDetails = async (agreement) => {
    if (!agreement?.id) return;
    setSelectedAgreement(agreement);
    setDetailLoading(true);
    try {
      const details = await fetchDepositAgreementDetails(agreement.id);
      const merged = mergeAgreement(agreement, details);
      setSelectedAgreement(merged);
      setAgreements((current) =>
        current.map((item) => (item.id === agreement.id ? merged : item)),
      );
    } catch (error) {
      setNotice(error.message || "Không tải được chi tiết hợp đồng cọc.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (agreement, nextStatus) => {
    if (!agreement?.id || !nextStatus || nextStatus === agreement.status)
      return;
    if (nextStatus === "FORFEITED") {
      setLifecycleAction({ action: "forfeit", agreement });
      return;
    }
    setUpdatingId(agreement.id);
    setNotice("");
    try {
      const details = await updateDepositAgreementStatus(
        agreement.id,
        nextStatus,
      );
      const merged = mergeAgreement(agreement, details);
      setAgreements((current) =>
        current.map((item) => (item.id === agreement.id ? merged : item)),
      );
      if (selectedAgreement?.id === agreement.id) {
        setSelectedAgreement(merged);
      }
      setNotice("Đã cập nhật trạng thái cọc và trạng thái phòng.");
      await loadSummary();
    } catch (error) {
      setNotice(error.message || "Không cập nhật được trạng thái cọc.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLifecycleSubmit = async (action, agreement, payload) => {
    let details;
    if (action === "contact") {
      details = await recordDepositContact(agreement.id, payload);
    } else if (action === "extend") {
      details = await extendDepositAgreement(agreement.id, payload);
    } else {
      details = await forfeitDepositAgreement(agreement.id, payload);
    }

    const merged = mergeAgreement(agreement, details);
    setAgreements((current) =>
      current.map((item) => (item.id === agreement.id ? merged : item)),
    );
    if (selectedAgreement?.id === agreement.id) {
      setSelectedAgreement(merged);
    }
    setNotice(
      action === "contact"
        ? "Đã ghi nhận kết quả liên hệ khách."
        : action === "extend"
          ? "Đã gia hạn khoản cọc và cập nhật ngày vào ở dự kiến."
          : "Đã xử lý mất cọc và giải phóng phòng.",
    );
    await Promise.all([loadAgreements(), loadSummary()]);
  };

  const handleSaveManagementInfo = async (agreement, payload) => {
    if (!agreement?.id) {
      throw new Error("Chưa có mã hợp đồng đặt cọc để cập nhật.");
    }
    setNotice("");
    const details = await updateDepositAgreementManagementInfo(
      agreement.id,
      payload,
    );
    const merged = mergeAgreement(agreement, details);
    setAgreements((current) =>
      current.map((item) => (item.id === agreement.id ? merged : item)),
    );
    setSelectedAgreement(merged);
    setNotice("Đã cập nhật thông tin hợp đồng cọc và tạo lại file PDF.");
    return merged;
  };

  const handleOpenContract = async (agreement) => {
    if (!agreement?.id) {
      setNotice("Chưa có mã hợp đồng đặt cọc để mở.");
      return;
    }
    try {
      await openDepositContractPdf(agreement.id);
    } catch (error) {
      setNotice(error.message || "Không thể mở hợp đồng đặt cọc.");
    }
  };

  const handleDownloadContract = async (agreement) => {
    if (!agreement?.id) {
      setNotice("Chưa có mã hợp đồng đặt cọc để tải.");
      return;
    }
    try {
      await downloadDepositContractPdf(
        agreement.id,
        `hop-dong-dat-coc-${agreement.roomCode || agreement.depositCode}.pdf`,
      );
    } catch (error) {
      setNotice(error.message || "Không thể tải hợp đồng đặt cọc.");
    }
  };

  return (
    <>
      <section className="w-full min-w-0 flex flex-col gap-6">
        <header>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">
            Danh sách hợp đồng đặt cọc
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Quản lý và theo dõi các khoản đặt cọc giữ chỗ của khách hàng.
          </p>
        </header>

        {loadError && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm font-bold text-rose-700 dark:text-rose-300">
            {loadError}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 p-4 text-sm font-bold text-blue-800 dark:text-blue-300">
            {notice}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-3">
          <DashboardStatCard
            icon={WalletCards}
            label="Tổng số tiền cọc"
            value={formatMoney(summary.totalHeldAmount)}
            subtitle="Toàn bộ khoản cọc đang giữ"
          />
          <DashboardStatCard
            icon={LockKeyhole}
            label="Đang giữ cọc"
            value={summary.heldCount}
            subtitle="Toàn bộ khoản cọc đang hiệu lực"
            tone="amber"
          />
          <DashboardStatCard
            icon={ClipboardCheck}
            label="Đã nhận phòng"
            value={summary.convertedCount}
            subtitle="Đã chính thức nhận phòng"
            tone="emerald"
          />
        </section>

        <section className="rounded-lg border border-[#d7dde8] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_10px_22px_rgba(9,20,38,0.06)]">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
                Tên khách hàng
              </span>
              <span className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                <input
                  value={customerFilter}
                  onChange={handleCustomerFilterChange}
                  placeholder="Nhập tên khách, SĐT, mã cọc..."
                  className="h-11 w-full rounded-lg border border-[#c4cad6] dark:border-white/10 pl-10 pr-3 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-500 dark:text-slate-400 focus:border-[#1e40af] focus:ring-4 focus:ring-[#1e40af]/10"
                />
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
                Trạng thái
              </span>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="h-11 w-full rounded-lg border border-[#c4cad6] dark:border-white/10 px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#1e40af] focus:ring-4 focus:ring-[#1e40af]/10"
              >
                <option value="all">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
                Tầng
              </span>
              <select
                value={floorFilter}
                onChange={handleFloorFilterChange}
                className="h-11 w-full rounded-lg border border-[#c4cad6] dark:border-white/10 px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#1e40af] focus:ring-4 focus:ring-[#1e40af]/10"
              >
                <option value="all">Tất cả tầng</option>
                {floorOptions.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#d7dde8] bg-white shadow-[0_10px_22px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-none">
          <div className="dashboard-table">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#cdd5e1] bg-[#eef4ff] text-xs font-extrabold uppercase tracking-[0.08em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <th className="px-5 py-4">Phòng</th>
                  <th className="px-5 py-4">Tên khách hàng</th>
                  <th className="px-5 py-4">Số tiền cọc</th>
                  <th className="px-5 py-4">Ngày tạo</th>
                  <th className="px-5 py-4">Ngày hẹn ký HĐ</th>
                  <th className="px-5 py-4">Ngày dự kiến vào</th>
                  <th className="px-5 py-4">Theo dõi</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Ký HĐ cọc</th>
                  <th className="px-5 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-sm font-bold text-slate-500 dark:text-slate-400"
                    >
                      Không có hợp đồng đặt cọc phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredAgreements.map((agreement) => (
                    <tr
                      key={agreement.id}
                      className="border-b border-[#edf0f5] dark:border-white/10 last:border-0"
                    >
                      <td
                        data-label="Phòng"
                        className="px-5 py-4 text-base font-extrabold text-slate-900 dark:text-white"
                      >
                        {agreement.roomCode
                          ? `P.${agreement.roomCode}`
                          : "Chưa rõ"}
                      </td>
                      <td data-label="Tên khách hàng" className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f0ff] text-[#1e40af] dark:text-[#93c5fd]">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-extrabold text-slate-900 dark:text-white">
                              {agreement.depositorFullName}
                            </span>
                            <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {agreement.depositorPhone}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td
                        data-label="Số tiền cọc"
                        className="px-5 py-4 text-sm font-extrabold text-[#1e40af] dark:text-[#93c5fd]"
                      >
                        {formatMoney(agreement.amount)}
                      </td>
                      <td
                        data-label="Ngày tạo"
                        className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {formatDate(agreement.createdAt)}
                      </td>
                      <td
                        data-label="Ngày hẹn ký HĐ"
                        className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {formatDate(agreement.expectedLeaseSignDate)}
                      </td>
                      <td
                        data-label="Ngày dự kiến vào"
                        className="px-5 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {formatDate(agreement.expectedMoveInDate)}
                      </td>
                      <td data-label="Theo dõi" className="px-5 py-4">
                        <div className="grid gap-1">
                          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-extrabold ${getDepositTrackingState(agreement).className}`}>
                            {getDepositTrackingState(agreement).label}
                          </span>
                          {agreement.latestContactOutcome && (
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {contactOutcomeLabel(agreement.latestContactOutcome)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Trạng thái" className="px-5 py-4">
                        {ACTIVE_DEPOSIT_STATUSES.has(agreement.status) ? (
                        <select
                          value={agreement.status}
                          onChange={(event) =>
                            handleStatusChange(agreement, event.target.value)
                          }
                          disabled={updatingId === agreement.id}
                          className="h-9 rounded-full border border-[#c4cad6] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-xs font-extrabold text-slate-900 dark:text-white outline-none focus:border-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {!STATUS_UPDATE_OPTIONS.some(
                            (status) => status.value === agreement.status,
                          ) && (
                            <option value={agreement.status}>
                              {STATUS_LABELS[agreement.status]?.label ||
                                "Chưa cập nhật"}
                            </option>
                          )}
                          {STATUS_UPDATE_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                          {agreement.canForfeit && agreement.status !== "FORFEITED" && (
                            <option value="FORFEITED">Mất cọc</option>
                          )}
                        </select>
                        ) : (
                          <StatusBadge status={agreement.status} />
                        )}
                      </td>
                      <td data-label="Ký HĐ cọc" className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${agreement.signatureStatus === "SIGNED" ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 text-slate-700"}`}
                        >
                          {agreement.signatureStatusLabel ||
                            (agreement.signatureStatus === "SIGNED"
                              ? "Đã ký"
                              : "Chờ ký")}
                        </span>
                      </td>
                      <td data-label="Hành động" className="px-5 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => openDetails(agreement)}
                            className="inline-flex h-9 min-w-[88px] items-center justify-center rounded-lg bg-[#1e40af] px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#17358f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af] focus-visible:ring-offset-2 dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
                            aria-label={`Xem chi tiết ${agreement.depositCode}`}
                          >
                            Chi tiết
                          </button>
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
            totalElements={totalElements}
            totalPages={totalPages}
            itemLabel="hợp đồng"
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
          />
        </section>
      </section>

      <DetailModal
        agreement={selectedAgreement}
        loading={detailLoading}
        onClose={() => setSelectedAgreement(null)}
        onOpenContract={handleOpenContract}
        onDownloadContract={handleDownloadContract}
        onSaveManagementInfo={handleSaveManagementInfo}
        onRecordContact={(agreement) =>
          setLifecycleAction({ action: "contact", agreement })
        }
        onExtend={(agreement) =>
          setLifecycleAction({ action: "extend", agreement })
        }
        onForfeit={(agreement) =>
          setLifecycleAction({ action: "forfeit", agreement })
        }
      />
      <LifecycleActionModal
        key={`${lifecycleAction?.action || "none"}-${lifecycleAction?.agreement?.id || "none"}`}
        action={lifecycleAction?.action}
        agreement={lifecycleAction?.agreement}
        onClose={() => setLifecycleAction(null)}
        onSubmit={handleLifecycleSubmit}
      />
    </>
  );
}
