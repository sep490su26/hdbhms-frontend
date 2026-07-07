"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  ImageIcon,
  LockKeyhole,
  Upload,
  Search,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  downloadDepositContractPdf,
  fetchDepositAgreementDetails,
  fetchDepositAgreements,
  downloadSignedDepositContractPdf,
  fetchDepositAssetObjectUrl,
  openDepositContractPdf,
  openSignedDepositContractPdf,
  updateDepositAgreementManagementInfo,
  updateDepositAgreementStatus,
  uploadSignedDepositContractFile,
} from "@/services/depositContractsService";
import { formatDate as formatDisplayDate, formatDateTime as formatDisplayDateTime } from "@/lib/dateFormat";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";

const money = new Intl.NumberFormat("vi-VN");

const STATUS_OPTIONS = [
  { value: "PAID", label: "Đã đặt cọc", pill: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { value: "CONVERTED_TO_LEASE", label: "Đã nhận phòng", pill: "bg-blue-100 text-blue-800", dot: "bg-blue-600" },
  { value: "REFUNDED", label: "Đã hoàn cọc", pill: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-600" },
  { value: "FORFEITED", label: "Mất cọc", pill: "bg-rose-100 text-rose-800", dot: "bg-rose-600" },
];

const MANAGED_DEPOSIT_STATUSES = new Set(STATUS_OPTIONS.map((status) => status.value));
const MANAGED_DEPOSIT_STATUS_VALUES = ["PAID", "CONFIRMED", "CONVERTED_TO_LEASE", "REFUNDED", "FORFEITED"];
const MANAGEMENT_INFO_EDITABLE_STATUSES = new Set(["PENDING_PAYMENT", "PAID", "CONFIRMED", "EXTENDED"]);
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const STATUS_LABELS = {
  PAID: STATUS_OPTIONS[0],
  CONFIRMED: STATUS_OPTIONS[0],
  CONVERTED_TO_LEASE: STATUS_OPTIONS[1],
  REFUNDED: STATUS_OPTIONS[2],
  FORFEITED: STATUS_OPTIONS[3],
  CANCELLED: { label: "Đã hủy", pill: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
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

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 0) return [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function getDepositStatusFilterValues(statusFilter) {
  if (statusFilter === "all") return MANAGED_DEPOSIT_STATUS_VALUES;
  if (statusFilter === "PAID") return ["PAID", "CONFIRMED"];
  return [statusFilter];
}

function normalizeSignatureStatusLabel(label, signatureStatus, signedFileId) {
  if (signatureStatus === "SIGNED" || signedFileId) return "Đã ký";
  const normalized = String(label || "").trim();
  if (!normalized || normalized === "Chờ upload" || normalized === "Chờ upload bản đã ký") {
    return "Chờ ký";
  }
  return normalized;
}

function normalizeAgreement(item) {
  const rawStatus = String(item.status || "").toUpperCase();
  const status = rawStatus === "CONFIRMED" ? "PAID" : rawStatus;
  const roomCode = item.roomCode || item.room_code || "";
  const signedFileId = item.signedFileId || item.signed_file_id || null;
  const signatureStatus = item.signatureStatus || item.signature_status || (signedFileId ? "SIGNED" : "PENDING_SIGNATURE");
  return {
    id: item.id ?? item.depositAgreementId ?? item.deposit_agreement_id,
    depositCode: item.depositCode || item.deposit_code || `DC-${item.id}`,
    roomCode,
    floorLabel: roomCode ? `Tầng ${String(roomCode).charAt(0)}` : "Chưa rõ tầng",
    propertyName: item.propertyName || item.property_name || "Nhà trọ Hải Đăng",
    depositorFullName: item.depositorFullName || item.depositor_full_name || "Khách đặt cọc",
    depositorPhone: item.depositorPhone || item.depositor_phone || "Chưa có SĐT",
    depositorEmail: item.depositorEmail || item.depositor_email || "",
    depositorPermanentAddress: item.depositorPermanentAddress || item.depositor_permanent_address || item.permanentAddress || item.permanent_address || "",
    amount: Number(item.amount || 0),
    createdAt: item.createdAt || item.created_at || null,
    status,
    confirmedAt: item.confirmedAt || item.confirmed_at || null,
    expectedLeaseSignDate: item.expectedLeaseSignDate || item.expected_lease_sign_date || null,
    expectedMoveInDate: item.expectedMoveInDate || item.expected_move_in_date || null,
    contractFileId: item.contractFileId || item.contract_file_id || null,
    contractDownloadUrl: item.contractDownloadUrl || item.contract_download_url || null,
    signatureStatus,
    signatureStatusLabel: normalizeSignatureStatusLabel(item.signatureStatusLabel || item.signature_status_label, signatureStatus, signedFileId),
    signedFileId,
    signedFileName: item.signedFileName || item.signed_file_name || "",
    signedAt: item.signedAt || item.signed_at || null,
    signedUploadedById: item.signedUploadedById || item.signed_uploaded_by_id || null,
    signedFileDownloadUrl: item.signedFileDownloadUrl || item.signed_file_download_url || null,
    canPreviewDraft: item.canPreviewDraft ?? item.can_preview_draft ?? true,
    canDownloadDraft: item.canDownloadDraft ?? item.can_download_draft ?? true,
    canUploadSignedFile: item.canUploadSignedFile ?? item.can_upload_signed_file ?? true,
    canViewSignedFile: item.canViewSignedFile ?? item.can_view_signed_file ?? Boolean(signedFileId),
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
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ${config.pill}`}>
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f7f9fc] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-[#102033]">{value || "Chưa cập nhật"}</p>
    </div>
  );
}

function SensitiveImage({ title, url, fileId }) {
  const imagePath = url || (fileId ? `/api/v1/files/private/${fileId}` : "");
  const [imageState, setImageState] = useState({ path: "", src: "", error: "" });
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
        if (isMounted) setImageState({ path: imagePath, src: "", error: "Không tải được ảnh" });
      });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath]);

  return (
    <div className="rounded-xl border border-[#d7dde8] bg-white p-3">
      <p className="mb-3 text-sm font-bold text-[#102033]">{title}</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          className="h-48 w-full rounded-lg border border-[#e5e9f2] object-contain"
        />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[#c7cfdd] bg-[#f7f9fc] text-sm font-semibold text-[#8b909a]">
          <ImageIcon className="mr-2 h-5 w-5" />
          Chưa có ảnh
        </div>
      )}
      {!src && error && imagePath && (
        <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>
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
  onOpenSignedContract,
  onDownloadSignedContract,
  onUploadSignedFile,
  onSaveManagementInfo,
}) {
  const safeAgreement = agreement || {};
  const details = safeAgreement.details || safeAgreement;
  const room = details.room || {};
  const expectedLeaseSignDate = valueOf(details, "expectedLeaseSignDate", "expected_lease_sign_date")
    || safeAgreement.expectedLeaseSignDate;
  const expectedMoveInDate = valueOf(details, "expectedMoveInDate", "expected_move_in_date")
    || safeAgreement.expectedMoveInDate;
  const depositorPermanentAddress = valueOf(details, "depositorPermanentAddress", "depositor_permanent_address")
    || safeAgreement.depositorPermanentAddress
    || "";
  const idFrontFileId = valueOf(details, "idFrontFileId", "id_front_file_id");
  const idFrontFileUrl = valueOf(details, "idFrontFileUrl", "id_front_file_url");
  const idBackFileId = valueOf(details, "idBackFileId", "id_back_file_id");
  const idBackFileUrl = valueOf(details, "idBackFileUrl", "id_back_file_url");
  const portraitFileId = valueOf(details, "portraitFileId", "portrait_file_id");
  const portraitFileUrl = valueOf(details, "portraitFileUrl", "portrait_file_url");
  const canEditManagementInfo = MANAGEMENT_INFO_EDITABLE_STATUSES.has(safeAgreement.status);
  const formDefaults = useMemo(() => ({
    depositorPhone: safeAgreement.depositorPhone || "",
    permanentAddress: depositorPermanentAddress || "",
    expectedLeaseSignDate: toInputDate(expectedLeaseSignDate),
    expectedMoveInDate: toInputDate(expectedMoveInDate),
  }), [safeAgreement.depositorPhone, depositorPermanentAddress, expectedLeaseSignDate, expectedMoveInDate]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingSigned, setIsUploadingSigned] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(null);
  const activeForm = form || formDefaults;
  const hasSignedFile = Boolean(safeAgreement.signedFileId || safeAgreement.signedFileDownloadUrl);

  if (!agreement) return null;

  const today = new Date().toISOString().slice(0, 10);
  const updateField = (field, value) => {
    setForm((current) => ({ ...(current || formDefaults), [field]: value }));
  };
  const validateForm = () => {
    const phone = activeForm.depositorPhone.replace(/[\s.-]/g, "");
    if (!/^0\d{9}$/.test(phone)) return "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số.";
    if (!activeForm.permanentAddress.trim()) return "Địa chỉ không được để trống.";
    if (!activeForm.expectedLeaseSignDate) return "Vui lòng chọn ngày ký hợp đồng dự kiến.";
    if (activeForm.expectedLeaseSignDate < today) return "Ngày ký hợp đồng dự kiến không được là ngày quá khứ.";
    if (!activeForm.expectedMoveInDate) return "Vui lòng chọn ngày vào ở dự kiến.";
    if (activeForm.expectedMoveInDate < today) return "Ngày vào ở dự kiến không được là ngày quá khứ.";
    if (activeForm.expectedMoveInDate < activeForm.expectedLeaseSignDate) return "Ngày vào ở dự kiến không được trước ngày ký hợp đồng dự kiến.";
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
      setFormError(error.message || "Không thể cập nhật thông tin hợp đồng cọc.");
    } finally {
      setIsSaving(false);
    }
  };
  const handleSignedFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingSigned(true);
    setFormError("");
    try {
      await onUploadSignedFile(agreement, file);
    } catch (error) {
      setFormError(error.message || "Không thể upload bản hợp đồng đặt cọc đã ký.");
    } finally {
      setIsUploadingSigned(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d7dde8] px-5 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#4160ad]">Chi tiết hợp đồng cọc</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#102033]">{agreement.depositCode}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#5a6678] hover:bg-[#eef3fb]" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 custom-scrollbar">
          {loading ? (
            <div className="rounded-xl border border-[#d7dde8] bg-[#f7f9fc] p-10 text-center font-bold text-[#5a6678]">
              Đang tải chi tiết hợp đồng cọc...
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailField label="Khách hàng" value={agreement.depositorFullName} />
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">Số điện thoại</span>
                      <input
                        value={activeForm.depositorPhone}
                        onChange={(event) => updateField("depositorPhone", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad]"
                      />
                    </label>
                  ) : (
                    <DetailField label="Số điện thoại" value={agreement.depositorPhone} />
                  )}
                  <DetailField label="Email" value={agreement.depositorEmail || "Không có"} />
                  <DetailField label="Phòng" value={agreement.roomCode || room.roomCode} />
                  <DetailField label="Cơ sở" value={agreement.propertyName} />
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">Địa chỉ</span>
                      <input
                        value={activeForm.permanentAddress}
                        onChange={(event) => updateField("permanentAddress", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad]"
                      />
                    </label>
                  ) : (
                    <DetailField label="Địa chỉ" value={depositorPermanentAddress} />
                  )}
                  <DetailField label="Tiền cọc" value={formatMoney(agreement.amount)} />
                  <DetailField label="Ngày tạo" value={formatDateTime(agreement.createdAt)} />
                  <DetailField label="Ngày xác nhận" value={formatDateTime(agreement.confirmedAt)} />
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">Ngày ký HĐ dự kiến</span>
                      <input
                        type="date"
                        min={today}
                        value={activeForm.expectedLeaseSignDate}
                        onChange={(event) => updateField("expectedLeaseSignDate", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad]"
                      />
                    </label>
                  ) : (
                    <DetailField label="Ngày ký HĐ dự kiến" value={formatDate(expectedLeaseSignDate)} />
                  )}
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">Ngày vào ở dự kiến</span>
                      <input
                        type="date"
                        min={today}
                        value={activeForm.expectedMoveInDate}
                        onChange={(event) => updateField("expectedMoveInDate", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad]"
                      />
                    </label>
                  ) : (
                    <DetailField label="Ngày vào ở dự kiến" value={formatDate(expectedMoveInDate)} />
                  )}
                  <DetailField label="Ghi chú" value={details.note || "Không có ghi chú"} />
                </div>

                {formError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                    {formError}
                  </div>
                )}

                <section className="rounded-xl border border-[#d7dde8] bg-[#f7f9fc] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#8b909a]">Ảnh giấy tờ</p>
                      <h3 className="mt-1 text-lg font-extrabold text-[#102033]">CCCD và ảnh chân dung</h3>
                    </div>
                    <LockKeyhole className="h-5 w-5 text-[#4160ad]" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#5a6678]">
                    Dữ liệu này nhạy cảm, chỉ tài khoản có quyền quản lý mới nên xem.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <SensitiveImage title="Mặt trước CCCD" url={idFrontFileUrl} fileId={idFrontFileId} />
                    <SensitiveImage title="Mặt sau CCCD" url={idBackFileUrl} fileId={idBackFileId} />
                    <SensitiveImage title="Ảnh chân dung" url={portraitFileUrl} fileId={portraitFileId} />
                  </div>
                </section>

                <section className="rounded-2xl border border-[#d7dde8] bg-white p-5 shadow-[0_12px_28px_rgba(9,20,38,0.06)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#4160ad]">Hợp đồng đặt cọc đã ký</p>
                      <h3 className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-[#102033]">
                        {hasSignedFile ? "Đã upload bản đã ký" : "Chờ ký"}
                      </h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#5a6678]">
                        File sau ký là bản chính thức để quản lý và khách thuê xem/tải. Bản nháp vẫn có ở cụm thao tác bên phải để in trước khi ký trực tiếp.
                      </p>
                    </div>
                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${hasSignedFile ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                      {safeAgreement.signatureStatusLabel || (hasSignedFile ? "Đã ký" : "Chờ ký")}
                    </span>
                  </div>

                  {hasSignedFile ? (
                    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div>
                        <DetailField label="Tên file" value={safeAgreement.signedFileName || "Bản hợp đồng đặt cọc đã ký"} />
                      </div>
                      <div>
                        <DetailField label="Ngày ký/upload" value={formatDateTime(safeAgreement.signedAt)} />
                      </div>
                      <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => onOpenSignedContract(agreement)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#102033] px-4 text-sm font-extrabold text-white hover:bg-[#1c2f4a]"
                        >
                          <Eye className="h-4 w-4" />
                          Xem file đã ký
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownloadSignedContract(agreement)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-[#102033] hover:bg-[#f4f7fb]"
                        >
                          <Download className="h-4 w-4" />
                          Tải về
                        </button>
                        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-[#102033] hover:bg-[#f4f7fb]">
                          <Upload className="h-4 w-4" />
                          Thay file
                          <input
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={isUploadingSigned}
                            onChange={handleSignedFileChange}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-[#c7cfdd] bg-[#f7f9fc] p-5">
                      <p className="max-w-2xl text-sm font-semibold leading-6 text-[#5a6678]">
                        Chưa upload bản hợp đồng đặt cọc đã ký. Chỉ upload sau khi khách đã ký giấy trực tiếp; file này mới là bản chính thức để khách xem/tải.
                      </p>
                      <label className={`mt-4 inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-extrabold text-white ${safeAgreement.canUploadSignedFile === false ? "cursor-not-allowed bg-slate-400" : "bg-[#102033] hover:bg-[#1c2f4a]"}`}>
                        <Upload className="h-4 w-4" />
                        {isUploadingSigned ? "Đang upload..." : "Upload bản đã ký"}
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          className="sr-only"
                          disabled={isUploadingSigned || safeAgreement.canUploadSignedFile === false}
                          onChange={handleSignedFileChange}
                        />
                      </label>
                      {safeAgreement.canUploadSignedFile === false && (
                        <p className="mt-3 text-xs font-bold text-rose-600">
                          Chỉ upload bản đã ký khi khoản cọc đã thanh toán/xác nhận và chưa ở trạng thái hoàn cọc hoặc mất cọc.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </section>

              <aside className="h-fit rounded-xl border border-[#d7dde8] bg-white p-4 shadow-[0_10px_24px_rgba(9,20,38,0.06)]">
                <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#8b909a]">Trạng thái hiện tại</p>
                <div className="mt-4">
                  <StatusBadge status={agreement.status} />
                </div>
                <div className="mt-6 grid gap-3">
                  {canEditManagementInfo && (
                    isEditing ? (
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
                          className="inline-flex h-12 items-center justify-center rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-[#102033] hover:bg-[#f4f7fb] disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="inline-flex h-12 items-center justify-center rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-[#102033] hover:bg-[#f4f7fb]"
                      >
                        Chỉnh sửa thông tin
                      </button>
                    )
                  )}
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
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-[#102033] hover:bg-[#f4f7fb]"
                  >
                    <Download className="h-4 w-4" />
                    Tải PDF bản nháp
                  </button>
                  {!canEditManagementInfo && (
                    <p className="rounded-lg bg-[#f7f9fc] p-3 text-sm font-semibold text-[#5a6678]">
                      Thông tin cọc đã khóa vì trạng thái hiện tại không còn trong giai đoạn chờ ký.
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

export default function DepositsPage() {
  const [agreements, setAgreements] = useState([]);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);
  const [uploadingSignedId, setUploadingSignedId] = useState(null);

  const loadAgreements = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetchDepositAgreements({
        page: page - 1,
        size,
        statuses: getDepositStatusFilterValues(statusFilter),
      });
      const pagination = getAgreementPagination(response);
      const nextAgreements = getAgreementItems(response)
        .map(normalizeAgreement)
        .filter((agreement) => MANAGED_DEPOSIT_STATUSES.has(agreement.status));
      setAgreements(nextAgreements);
      setTotalElements(pagination.totalElements);
      setTotalPages(pagination.totalPages);
    } catch (error) {
      setLoadError(error.message || "Không tải được danh sách hợp đồng cọc từ backend.");
    }
  }, [page, size, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAgreements();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAgreements]);

  const floorOptions = useMemo(() => {
    const floors = new Set(agreements.map((item) => item.floorLabel).filter(Boolean));
    return Array.from(floors).sort((a, b) => a.localeCompare(b, "vi"));
  }, [agreements]);

  const filteredAgreements = useMemo(() => {
    const normalizedName = customerFilter.trim().toLowerCase();
    return agreements.filter((item) => {
      const matchCustomer =
        !normalizedName ||
        item.depositorFullName.toLowerCase().includes(normalizedName) ||
        item.depositorPhone.includes(normalizedName) ||
        item.depositCode.toLowerCase().includes(normalizedName);
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      const matchFloor = floorFilter === "all" || item.floorLabel === floorFilter;
      return matchCustomer && matchStatus && matchFloor;
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [agreements, customerFilter, floorFilter, statusFilter]);

  const paidAgreements = agreements.filter((item) => item.status === "PAID");
  const convertedAgreements = agreements.filter((item) => item.status === "CONVERTED_TO_LEASE");
  const totalAmount = paidAgreements.reduce((sum, item) => sum + item.amount, 0);
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);
  const showingFrom = totalElements === 0 ? 0 : (page - 1) * size + 1;
  const showingTo = Math.min(page * size, totalElements);

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  };

  const handlePageSizeChange = (event) => {
    setSize(Number(event.target.value));
    setPage(1);
  };

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
      setAgreements((current) => current.map((item) => (item.id === agreement.id ? merged : item)));
    } catch (error) {
      setNotice(error.message || "Không tải được chi tiết hợp đồng cọc.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (agreement, nextStatus) => {
    if (!agreement?.id || !nextStatus || nextStatus === agreement.status) return;
    setUpdatingId(agreement.id);
    setNotice("");
    try {
      const details = await updateDepositAgreementStatus(agreement.id, nextStatus);
      const merged = mergeAgreement(agreement, details);
      setAgreements((current) => current.map((item) => (item.id === agreement.id ? merged : item)));
      if (selectedAgreement?.id === agreement.id) {
        setSelectedAgreement(merged);
      }
      setNotice("Đã cập nhật trạng thái cọc và trạng thái phòng.");
    } catch (error) {
      setNotice(error.message || "Không cập nhật được trạng thái cọc.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveManagementInfo = async (agreement, payload) => {
    if (!agreement?.id) {
      throw new Error("Chưa có mã hợp đồng đặt cọc để cập nhật.");
    }
    setNotice("");
    const details = await updateDepositAgreementManagementInfo(agreement.id, payload);
    const merged = mergeAgreement(agreement, details);
    setAgreements((current) => current.map((item) => (item.id === agreement.id ? merged : item)));
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
      await downloadDepositContractPdf(agreement.id, `hop-dong-dat-coc-${agreement.roomCode || agreement.depositCode}.pdf`);
    } catch (error) {
      setNotice(error.message || "Không thể tải hợp đồng đặt cọc.");
    }
  };

  const handleOpenSignedContract = async (agreement) => {
    if (!agreement?.id) {
      setNotice("Chưa có mã hợp đồng đặt cọc để mở bản đã ký.");
      return;
    }
    try {
      await openSignedDepositContractPdf(agreement.id);
    } catch (error) {
      setNotice(error.message || "Không thể mở bản hợp đồng đặt cọc đã ký.");
    }
  };

  const handleDownloadSignedContract = async (agreement) => {
    if (!agreement?.id) {
      setNotice("Chưa có mã hợp đồng đặt cọc để tải bản đã ký.");
      return;
    }
    try {
      await downloadSignedDepositContractPdf(
        agreement.id,
        agreement.signedFileName || `hop-dong-dat-coc-da-ky-${agreement.roomCode || agreement.depositCode}.pdf`,
      );
    } catch (error) {
      setNotice(error.message || "Không thể tải bản hợp đồng đặt cọc đã ký.");
    }
  };

  const handleUploadSignedFile = async (agreement, file) => {
    if (!agreement?.id) {
      throw new Error("Chưa có mã hợp đồng đặt cọc để upload bản đã ký.");
    }
    const response = await uploadSignedDepositContractFile(agreement.id, file);
    const latestDetails = await fetchDepositAgreementDetails(agreement.id);
    const signedFileId = response?.signedFileId ?? response?.signed_file_id ?? latestDetails?.signedFileId ?? latestDetails?.signed_file_id;
    const merged = mergeAgreement(agreement, {
      ...latestDetails,
      ...response,
      signedFileId,
      signedFileName: response?.signedFileName ?? response?.signed_file_name ?? latestDetails?.signedFileName ?? latestDetails?.signed_file_name,
      signedAt: response?.signedAt ?? response?.signed_at ?? latestDetails?.signedAt ?? latestDetails?.signed_at,
      signatureStatus: signedFileId ? "SIGNED" : "PENDING_SIGNATURE",
      signatureStatusLabel: signedFileId ? "Đã ký" : "Chờ ký",
      canViewSignedFile: Boolean(signedFileId),
    });
    setAgreements((current) => current.map((item) => (item.id === agreement.id ? merged : item)));
    if (selectedAgreement?.id === agreement.id) {
      setSelectedAgreement(merged);
    }
    setNotice(response?.message || "Tải lên bản hợp đồng đặt cọc đã ký thành công.");
    return merged;
  };

  const handleTableSignedFileChange = async (agreement, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingSignedId(agreement.id);
    setNotice("");
    try {
      await handleUploadSignedFile(agreement, file);
    } catch (error) {
      setNotice(error.message || "Không thể upload bản hợp đồng đặt cọc đã ký.");
    } finally {
      setUploadingSignedId(null);
    }
  };

  return (
    <>
      <section className="w-full min-w-0 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-[#102033]">Danh sách hợp đồng đặt cọc</h1>
          <p className="mt-2 text-sm font-semibold text-[#6b7280]">
            Quản lý và theo dõi các khoản đặt cọc giữ chỗ của khách hàng.
          </p>
        </header>

        {loadError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {loadError}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
            {notice}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-3">
          <DashboardStatCard icon={WalletCards} label="Tổng số tiền cọc" value={formatMoney(totalAmount)} subtitle="Tổng tiền cọc đã ghi nhận" />
          <DashboardStatCard icon={LockKeyhole} label="Đang giữ cọc" value={paidAgreements.length} subtitle="Khoản thu khả dụng" tone="amber" />
          <DashboardStatCard icon={ClipboardCheck} label="Đã nhận phòng" value={convertedAgreements.length} subtitle="Đã chính thức nhận phòng" tone="emerald" />
        </section>

        <section className="rounded-lg border border-[#d7dde8] bg-white p-5 shadow-[0_10px_22px_rgba(9,20,38,0.06)]">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">Tên khách hàng</span>
              <span className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b909a]" />
                <input
                  value={customerFilter}
                  onChange={handleCustomerFilterChange}
                  placeholder="Nhập tên khách, SĐT, mã cọc..."
                  className="h-11 w-full rounded-lg border border-[#c4cad6] pl-10 pr-3 text-sm font-semibold text-[#102033] outline-none placeholder:text-[#8b909a] focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
                />
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">Trạng thái</span>
              <select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                className="h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-semibold text-[#102033] outline-none focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
              >
                <option value="all">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">Tầng</span>
              <select
                value={floorFilter}
                onChange={handleFloorFilterChange}
                className="h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-semibold text-[#102033] outline-none focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
              >
                <option value="all">Tất cả tầng</option>
                {floorOptions.map((floor) => (
                  <option key={floor} value={floor}>{floor}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#d7dde8] bg-white shadow-[0_10px_22px_rgba(9,20,38,0.06)]">
          <div className="dashboard-table">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#cdd5e1] bg-[#eef4ff] text-xs font-extrabold uppercase tracking-[0.08em] text-[#4b5563]">
                  <th className="px-5 py-4">Phòng</th>
                  <th className="px-5 py-4">Tên khách hàng</th>
                  <th className="px-5 py-4">Số tiền cọc</th>
                  <th className="px-5 py-4">Ngày tạo</th>
                  <th className="px-5 py-4">Ngày hẹn ký HĐ</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Ký HĐ cọc</th>
                  <th className="px-5 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm font-bold text-[#6b7280]">
                      Không có hợp đồng đặt cọc phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredAgreements.map((agreement) => (
                    <tr key={agreement.id} className="border-b border-[#edf0f5] last:border-0">
                      <td data-label="Phòng" className="px-5 py-4 text-base font-extrabold text-[#111827]">
                        {agreement.roomCode ? `P.${agreement.roomCode}` : "Chưa rõ"}
                      </td>
                      <td data-label="Tên khách hàng" className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f0ff] text-[#4160ad]">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-extrabold text-[#102033]">{agreement.depositorFullName}</span>
                            <span className="block text-xs font-semibold text-[#5a6678]">{agreement.depositorPhone}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label="Số tiền cọc" className="px-5 py-4 text-sm font-extrabold text-[#4160ad]">{formatMoney(agreement.amount)}</td>
                      <td data-label="Ngày tạo" className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{formatDate(agreement.createdAt)}</td>
                      <td data-label="Ngày hẹn ký HĐ" className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{formatDate(agreement.expectedLeaseSignDate)}</td>
                      <td data-label="Trạng thái" className="px-5 py-4">
                        <select
                          value={STATUS_OPTIONS.some((status) => status.value === agreement.status) ? agreement.status : ""}
                          onChange={(event) => handleStatusChange(agreement, event.target.value)}
                          disabled={updatingId === agreement.id}
                          className="h-9 rounded-full border border-[#c4cad6] bg-white px-3 text-xs font-extrabold text-[#102033] outline-none focus:border-[#4160ad] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {!STATUS_OPTIONS.some((status) => status.value === agreement.status) && (
                            <option value="">{STATUS_LABELS[agreement.status]?.label || "Chưa cập nhật"}</option>
                          )}
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Ký HĐ cọc" className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${agreement.signatureStatus === "SIGNED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                          {agreement.signatureStatusLabel || (agreement.signatureStatus === "SIGNED" ? "Đã ký" : "Chờ ký")}
                        </span>
                      </td>
                      <td data-label="Hành động" className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(agreement)}
                            className="rounded-full p-2 text-[#4160ad] hover:bg-[#eef4ff]"
                            aria-label={`Xem chi tiết ${agreement.depositCode}`}
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenContract(agreement)}
                            className="rounded-full p-2 text-[#102033] hover:bg-[#eef4ff]"
                            aria-label={`Xem hợp đồng cọc ${agreement.depositCode}`}
                          >
                            <FileText className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadContract(agreement)}
                            className="rounded-full p-2 text-[#102033] hover:bg-[#eef4ff]"
                            aria-label={`Tải hợp đồng cọc ${agreement.depositCode}`}
                          >
                            <Download className="h-5 w-5" />
                          </button>
                          <label
                            className={`rounded-full p-2 ${
                              agreement.canUploadSignedFile === false || uploadingSignedId === agreement.id
                                ? "cursor-not-allowed text-slate-400"
                                : "cursor-pointer text-[#102033] hover:bg-[#eef4ff]"
                            }`}
                            title={agreement.signatureStatus === "SIGNED" ? "Thay file đã ký" : "Upload bản đã ký"}
                            aria-label={`${agreement.signatureStatus === "SIGNED" ? "Thay file đã ký" : "Upload bản đã ký"} ${agreement.depositCode}`}
                          >
                            <Upload className="h-5 w-5" />
                            <input
                              type="file"
                              accept="application/pdf,image/jpeg,image/png,image/webp"
                              className="sr-only"
                              disabled={agreement.canUploadSignedFile === false || uploadingSignedId === agreement.id}
                              onChange={(event) => handleTableSignedFileChange(agreement, event)}
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-col gap-4 border-t border-[#d7dde8] bg-[#eef4ff] px-5 py-4 text-sm font-semibold text-[#5a6678] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span>
                Hiển thị {filteredAgreements.length} dòng trên trang này, bản ghi {showingFrom}-{showingTo} trong tổng số {totalElements} hợp đồng
              </span>
              <label className="flex items-center gap-2 text-sm font-bold text-[#102033]">
                <span>Số dòng/trang</span>
                <select
                  value={size}
                  onChange={handlePageSizeChange}
                  className="h-10 rounded-lg border border-[#c4cad6] bg-white px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <Pagination className="mx-0 w-auto justify-start lg:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text="Trước"
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {visiblePages[0] > 1 && (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        isActive={page === 1}
                        onClick={(event) => {
                          event.preventDefault();
                          goToPage(1);
                        }}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {visiblePages[0] > 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}
                {visiblePages.map((pageNumber) => (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {visiblePages[visiblePages.length - 1] < totalPages && (
                  <>
                    {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        isActive={page === totalPages}
                        onClick={(event) => {
                          event.preventDefault();
                          goToPage(totalPages);
                        }}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text="Sau"
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page + 1);
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </footer>
        </section>
      </section>

      <DetailModal
        agreement={selectedAgreement}
        loading={detailLoading}
        onClose={() => setSelectedAgreement(null)}
        onOpenContract={handleOpenContract}
        onDownloadContract={handleDownloadContract}
        onOpenSignedContract={handleOpenSignedContract}
        onDownloadSignedContract={handleDownloadSignedContract}
        onUploadSignedFile={handleUploadSignedFile}
        onSaveManagementInfo={handleSaveManagementInfo}
      />
    </>
  );
}

