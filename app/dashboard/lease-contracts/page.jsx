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
  openDepositContractPdf,
  openSignedDepositContractPdf,
  toApiAssetUrl,
  updateDepositAgreementManagementInfo,
  updateDepositAgreementStatus,
  uploadSignedDepositContractFile,
} from "@/services/depositContractsService";
import { formatDate as formatDisplayDate, formatDateTime as formatDisplayDateTime } from "@/lib/dateFormat";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";

const money = new Intl.NumberFormat("vi-VN");

const STATUS_OPTIONS = [
  { value: "PAID", label: "ÄÃ£ Ä‘áº·t cá»c", pill: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { value: "CONVERTED_TO_LEASE", label: "ÄÃ£ nháº­n phÃ²ng", pill: "bg-blue-100 text-blue-800", dot: "bg-blue-600" },
  { value: "REFUNDED", label: "ÄÃ£ hoÃ n cá»c", pill: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-600" },
  { value: "FORFEITED", label: "Máº¥t cá»c", pill: "bg-rose-100 text-rose-800", dot: "bg-rose-600" },
];

const MANAGED_DEPOSIT_STATUSES = new Set(STATUS_OPTIONS.map((status) => status.value));
const MANAGEMENT_INFO_EDITABLE_STATUSES = new Set(["PENDING_PAYMENT", "PAID", "CONFIRMED", "EXTENDED"]);

const STATUS_LABELS = {
  PAID: STATUS_OPTIONS[0],
  CONFIRMED: STATUS_OPTIONS[0],
  CONVERTED_TO_LEASE: STATUS_OPTIONS[1],
  REFUNDED: STATUS_OPTIONS[2],
  FORFEITED: STATUS_OPTIONS[3],
  CANCELLED: { label: "ÄÃ£ há»§y", pill: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
};

function formatMoney(value) {
  return `${money.format(Number(value || 0))} Ä‘`;
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

function normalizeAgreement(item) {
  const rawStatus = String(item.status || "").toUpperCase();
  const status = rawStatus === "CONFIRMED" ? "PAID" : rawStatus;
  const roomCode = item.roomCode || item.room_code || "";
  return {
    id: item.id ?? item.depositAgreementId ?? item.deposit_agreement_id,
    depositCode: item.depositCode || item.deposit_code || `DC-${item.id}`,
    roomCode,
    floorLabel: roomCode ? `Táº§ng ${String(roomCode).charAt(0)}` : "ChÆ°a rÃµ táº§ng",
    propertyName: item.propertyName || item.property_name || "NhÃ  trá» Háº£i ÄÄƒng",
    depositorFullName: item.depositorFullName || item.depositor_full_name || "KhÃ¡ch Ä‘áº·t cá»c",
    depositorPhone: item.depositorPhone || item.depositor_phone || "ChÆ°a cÃ³ SÄT",
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
    signatureStatus: item.signatureStatus || item.signature_status || (item.signedFileId || item.signed_file_id ? "SIGNED" : "PENDING_SIGNATURE"),
    signatureStatusLabel: item.signatureStatusLabel || item.signature_status_label || (item.signedFileId || item.signed_file_id ? "ÄÃ£ kÃ½" : "Chá» upload báº£n Ä‘Ã£ kÃ½"),
    signedFileId: item.signedFileId || item.signed_file_id || null,
    signedFileName: item.signedFileName || item.signed_file_name || "",
    signedAt: item.signedAt || item.signed_at || null,
    signedUploadedById: item.signedUploadedById || item.signed_uploaded_by_id || null,
    signedFileDownloadUrl: item.signedFileDownloadUrl || item.signed_file_download_url || null,
    canPreviewDraft: item.canPreviewDraft ?? item.can_preview_draft ?? true,
    canDownloadDraft: item.canDownloadDraft ?? item.can_download_draft ?? true,
    canUploadSignedFile: item.canUploadSignedFile ?? item.can_upload_signed_file ?? true,
    canViewSignedFile: item.canViewSignedFile ?? item.can_view_signed_file ?? Boolean(item.signedFileId || item.signed_file_id),
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

function KpiCard({ title, value, note, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "text-blue-700 bg-blue-50",
    amber: "text-amber-700 bg-amber-50",
    emerald: "text-emerald-700 bg-emerald-50",
  };

  return (
    <article className="min-h-[118px] rounded-lg border border-[#d7dde8] bg-white p-5 shadow-[0_10px_22px_rgba(9,20,38,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#8b909a]">{title}</p>
          <p className="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-[#102033]">{value}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {note && <p className="mt-3 text-sm font-semibold text-[#4160ad]">{note}</p>}
    </article>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f7f9fc] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-[#102033]">{value || "ChÆ°a cáº­p nháº­t"}</p>
    </div>
  );
}

function SensitiveImage({ title, url }) {
  const src = toApiAssetUrl(url);
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
          ChÆ°a cÃ³ áº£nh
        </div>
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
  const canEditManagementInfo = MANAGEMENT_INFO_EDITABLE_STATUSES.has(safeAgreement.status);
  const formDefaults = useMemo(() => ({
    depositorPhone: safeAgreement.depositorPhone || "",
    permanentAddress: depositorPermanentAddress || "",
    expectedLeaseSignDate: toInputDate(expectedLeaseSignDate),
    expectedMoveInDate: toInputDate(expectedMoveInDate),
  }), [safeAgreement.depositorPhone, depositorPermanentAddress, expectedLeaseSignDate, expectedMoveInDate]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    if (!/^0\d{9}$/.test(phone)) return "Sá»‘ Ä‘iá»‡n thoáº¡i pháº£i báº¯t Ä‘áº§u báº±ng 0 vÃ  cÃ³ Ä‘Ãºng 10 chá»¯ sá»‘.";
    if (!activeForm.permanentAddress.trim()) return "Äá»‹a chá»‰ khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.";
    if (!activeForm.expectedLeaseSignDate) return "Vui lÃ²ng chá»n ngÃ y kÃ½ há»£p Ä‘á»“ng dá»± kiáº¿n.";
    if (activeForm.expectedLeaseSignDate < today) return "NgÃ y kÃ½ há»£p Ä‘á»“ng dá»± kiáº¿n khÃ´ng Ä‘Æ°á»£c lÃ  ngÃ y quÃ¡ khá»©.";
    if (!activeForm.expectedMoveInDate) return "Vui lÃ²ng chá»n ngÃ y vÃ o á»Ÿ dá»± kiáº¿n.";
    if (activeForm.expectedMoveInDate < today) return "NgÃ y vÃ o á»Ÿ dá»± kiáº¿n khÃ´ng Ä‘Æ°á»£c lÃ  ngÃ y quÃ¡ khá»©.";
    if (activeForm.expectedMoveInDate < activeForm.expectedLeaseSignDate) return "NgÃ y vÃ o á»Ÿ dá»± kiáº¿n khÃ´ng Ä‘Æ°á»£c trÆ°á»›c ngÃ y kÃ½ há»£p Ä‘á»“ng dá»± kiáº¿n.";
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
      setFormError(error.message || "KhÃ´ng thá»ƒ cáº­p nháº­t thÃ´ng tin há»£p Ä‘á»“ng cá»c.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d7dde8] px-5 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#4160ad]">Chi tiáº¿t há»£p Ä‘á»“ng cá»c</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#102033]">{agreement.depositCode}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#5a6678] hover:bg-[#eef3fb]" aria-label="ÄÃ³ng">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 custom-scrollbar">
          {loading ? (
            <div className="rounded-xl border border-[#d7dde8] bg-[#f7f9fc] p-10 text-center font-bold text-[#5a6678]">
              Äang táº£i chi tiáº¿t há»£p Ä‘á»“ng cá»c...
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <DetailField label="KhÃ¡ch hÃ ng" value={agreement.depositorFullName} />
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">Sá»‘ Ä‘iá»‡n thoáº¡i</span>
                      <input
                        value={activeForm.depositorPhone}
                        onChange={(event) => updateField("depositorPhone", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad]"
                      />
                    </label>
                  ) : (
                    <DetailField label="Sá»‘ Ä‘iá»‡n thoáº¡i" value={agreement.depositorPhone} />
                  )}
                  <DetailField label="Email" value={agreement.depositorEmail || "KhÃ´ng cÃ³"} />
                  <DetailField label="PhÃ²ng" value={agreement.roomCode || room.roomCode} />
                  <DetailField label="CÆ¡ sá»Ÿ" value={agreement.propertyName} />
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">Äá»‹a chá»‰</span>
                      <input
                        value={activeForm.permanentAddress}
                        onChange={(event) => updateField("permanentAddress", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad]"
                      />
                    </label>
                  ) : (
                    <DetailField label="Äá»‹a chá»‰" value={depositorPermanentAddress} />
                  )}
                  <DetailField label="Tiá»n cá»c" value={formatMoney(agreement.amount)} />
                  <DetailField label="NgÃ y táº¡o" value={formatDateTime(agreement.createdAt)} />
                  <DetailField label="NgÃ y xÃ¡c nháº­n" value={formatDateTime(agreement.confirmedAt)} />
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">NgÃ y kÃ½ HÄ dá»± kiáº¿n</span>
                      <input
                        type="date"
                        min={today}
                        value={activeForm.expectedLeaseSignDate}
                        onChange={(event) => updateField("expectedLeaseSignDate", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad]"
                      />
                    </label>
                  ) : (
                    <DetailField label="NgÃ y kÃ½ HÄ dá»± kiáº¿n" value={formatDate(expectedLeaseSignDate)} />
                  )}
                  {isEditing ? (
                    <label className="rounded-lg bg-[#f7f9fc] p-4">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8b909a]">NgÃ y vÃ o á»Ÿ dá»± kiáº¿n</span>
                      <input
                        type="date"
                        min={today}
                        value={activeForm.expectedMoveInDate}
                        onChange={(event) => updateField("expectedMoveInDate", event.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-bold text-[#102033] outline-none focus:border-[#4160ad]"
                      />
                    </label>
                  ) : (
                    <DetailField label="NgÃ y vÃ o á»Ÿ dá»± kiáº¿n" value={formatDate(expectedMoveInDate)} />
                  )}
                  <DetailField label="Ghi chÃº" value={details.note || "KhÃ´ng cÃ³ ghi chÃº"} />
                </div>

                {formError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                    {formError}
                  </div>
                )}

                <section className="rounded-xl border border-[#d7dde8] bg-[#f7f9fc] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#8b909a]">áº¢nh giáº¥y tá»</p>
                      <h3 className="mt-1 text-lg font-extrabold text-[#102033]">CCCD vÃ  áº£nh chÃ¢n dung</h3>
                    </div>
                    <LockKeyhole className="h-5 w-5 text-[#4160ad]" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#5a6678]">
                    Dá»¯ liá»‡u nÃ y nháº¡y cáº£m, chá»‰ tÃ i khoáº£n cÃ³ quyá»n quáº£n lÃ½ má»›i nÃªn xem.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <SensitiveImage title="Máº·t trÆ°á»›c CCCD" url={details.idFrontFileUrl} />
                    <SensitiveImage title="Máº·t sau CCCD" url={details.idBackFileUrl} />
                    <SensitiveImage title="áº¢nh chÃ¢n dung" url={details.portraitFileUrl} />
                  </div>
                </section>
              </section>

              <aside className="h-fit rounded-xl border border-[#d7dde8] bg-white p-4 shadow-[0_10px_24px_rgba(9,20,38,0.06)]">
                <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#8b909a]">Tráº¡ng thÃ¡i hiá»‡n táº¡i</p>
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
                          {isSaving ? "Äang lÆ°u..." : "LÆ°u thay Ä‘á»•i"}
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
                          Há»§y chá»‰nh sá»­a
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
                        Chá»‰nh sá»­a thÃ´ng tin
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenContract(agreement)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#102033] px-4 text-sm font-extrabold text-white hover:bg-[#1c2f4a]"
                  >
                    <FileText className="h-4 w-4" />
                    Xem há»£p Ä‘á»“ng cá»c
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadContract(agreement)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-[#102033] hover:bg-[#f4f7fb]"
                  >
                    <Download className="h-4 w-4" />
                    Táº£i PDF
                  </button>
                  {!canEditManagementInfo && (
                    <p className="rounded-lg bg-[#f7f9fc] p-3 text-sm font-semibold text-[#5a6678]">
                      ThÃ´ng tin cá»c Ä‘Ã£ khÃ³a vÃ¬ tráº¡ng thÃ¡i hiá»‡n táº¡i khÃ´ng cÃ²n trong giai Ä‘oáº¡n chá» kÃ½.
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
  const [updatingId, setUpdatingId] = useState(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadAgreements = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetchDepositAgreements({
        page: page - 1,
        size,
        statuses: [...MANAGED_DEPOSIT_STATUSES],
      });
      const nextAgreements = getAgreementItems(response)
        .map(normalizeAgreement)
        .filter((agreement) => MANAGED_DEPOSIT_STATUSES.has(agreement.status));
      setAgreements(nextAgreements);
      setTotalElements(response?.totalElements ?? nextAgreements.length);
      setTotalPages(response?.totalPages ?? 1);
    } catch (error) {
      setLoadError(error.message || "KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch há»£p Ä‘á»“ng cá»c tá»« backend.");
    }
  }, [page, size]);

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
    });
  }, [agreements, customerFilter, floorFilter, statusFilter]);

  const paidAgreements = agreements.filter((item) => item.status === "PAID");
  const convertedAgreements = agreements.filter((item) => item.status === "CONVERTED_TO_LEASE");
  const totalAmount = paidAgreements.reduce((sum, item) => sum + item.amount, 0);

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
      setNotice(error.message || "KhÃ´ng táº£i Ä‘Æ°á»£c chi tiáº¿t há»£p Ä‘á»“ng cá»c.");
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
      setNotice("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i cá»c vÃ  tráº¡ng thÃ¡i phÃ²ng.");
    } catch (error) {
      setNotice(error.message || "KhÃ´ng cáº­p nháº­t Ä‘Æ°á»£c tráº¡ng thÃ¡i cá»c.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveManagementInfo = async (agreement, payload) => {
    if (!agreement?.id) {
      throw new Error("ChÆ°a cÃ³ mÃ£ há»£p Ä‘á»“ng Ä‘áº·t cá»c Ä‘á»ƒ cáº­p nháº­t.");
    }
    setNotice("");
    const details = await updateDepositAgreementManagementInfo(agreement.id, payload);
    const merged = mergeAgreement(agreement, details);
    setAgreements((current) => current.map((item) => (item.id === agreement.id ? merged : item)));
    setSelectedAgreement(merged);
    setNotice("ÄÃ£ cáº­p nháº­t thÃ´ng tin há»£p Ä‘á»“ng cá»c vÃ  táº¡o láº¡i file PDF.");
    return merged;
  };

  const handleOpenContract = async (agreement) => {
    if (!agreement?.id) {
      setNotice("ChÆ°a cÃ³ mÃ£ há»£p Ä‘á»“ng Ä‘áº·t cá»c Ä‘á»ƒ má»Ÿ.");
      return;
    }
    try {
      await openDepositContractPdf(agreement.id);
    } catch (error) {
      setNotice(error.message || "KhÃ´ng thá»ƒ má»Ÿ há»£p Ä‘á»“ng Ä‘áº·t cá»c.");
    }
  };

  const handleDownloadContract = async (agreement) => {
    if (!agreement?.id) {
      setNotice("ChÆ°a cÃ³ mÃ£ há»£p Ä‘á»“ng Ä‘áº·t cá»c Ä‘á»ƒ táº£i.");
      return;
    }
    try {
      await downloadDepositContractPdf(agreement.id, `hop-dong-dat-coc-${agreement.roomCode || agreement.depositCode}.pdf`);
    } catch (error) {
      setNotice(error.message || "KhÃ´ng thá»ƒ táº£i há»£p Ä‘á»“ng Ä‘áº·t cá»c.");
    }
  };

  return (
    <>
      <section className="w-full min-w-0 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] text-[#102033]">Danh sÃ¡ch há»£p Ä‘á»“ng Ä‘áº·t cá»c</h1>
          <p className="mt-2 text-sm font-semibold text-[#6b7280]">
            Quáº£n lÃ½ vÃ  theo dÃµi cÃ¡c khoáº£n Ä‘áº·t cá»c giá»¯ chá»— cá»§a khÃ¡ch hÃ ng.
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
          <KpiCard icon={WalletCards} title="Tá»•ng sá»‘ tiá»n cá»c" value={formatMoney(totalAmount)} note="Tá»•ng tiá»n cá»c Ä‘Ã£ ghi nháº­n" />
          <KpiCard icon={LockKeyhole} title="Äang giá»¯ cá»c" value={paidAgreements.length} note="Khoáº£n thu kháº£ dá»¥ng" tone="amber" />
          <KpiCard icon={ClipboardCheck} title="ÄÃ£ nháº­n phÃ²ng" value={convertedAgreements.length} note="ÄÃ£ chÃ­nh thá»©c nháº­n phÃ²ng" tone="emerald" />
        </section>

        <section className="rounded-lg border border-[#d7dde8] bg-white p-5 shadow-[0_10px_22px_rgba(9,20,38,0.06)]">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">TÃªn khÃ¡ch hÃ ng</span>
              <span className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b909a]" />
                <input
                  value={customerFilter}
                  onChange={(event) => setCustomerFilter(event.target.value)}
                  placeholder="Nháº­p tÃªn khÃ¡ch, SÄT, mÃ£ cá»c..."
                  className="h-11 w-full rounded-lg border border-[#c4cad6] pl-10 pr-3 text-sm font-semibold text-[#102033] outline-none placeholder:text-[#8b909a] focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
                />
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">Tráº¡ng thÃ¡i</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-semibold text-[#102033] outline-none focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
              >
                <option value="all">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">Táº§ng</span>
              <select
                value={floorFilter}
                onChange={(event) => setFloorFilter(event.target.value)}
                className="h-11 w-full rounded-lg border border-[#c4cad6] px-3 text-sm font-semibold text-[#102033] outline-none focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
              >
                <option value="all">Táº¥t cáº£ táº§ng</option>
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
                  <th className="px-5 py-4">PhÃ²ng</th>
                  <th className="px-5 py-4">TÃªn khÃ¡ch hÃ ng</th>
                  <th className="px-5 py-4">Sá»‘ tiá»n cá»c</th>
                  <th className="px-5 py-4">NgÃ y táº¡o</th>
                  <th className="px-5 py-4">NgÃ y háº¹n kÃ½ HÄ</th>
                  <th className="px-5 py-4">Tráº¡ng thÃ¡i</th>
                  <th className="px-5 py-4 text-center">HÃ nh Ä‘á»™ng</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm font-bold text-[#6b7280]">
                      KhÃ´ng cÃ³ há»£p Ä‘á»“ng Ä‘áº·t cá»c phÃ¹ há»£p.
                    </td>
                  </tr>
                ) : (
                  filteredAgreements.map((agreement) => (
                    <tr key={agreement.id} className="border-b border-[#edf0f5] last:border-0">
                      <td data-label="PhÃ²ng" className="px-5 py-4 text-base font-extrabold text-[#111827]">
                        {agreement.roomCode ? `P.${agreement.roomCode}` : "ChÆ°a rÃµ"}
                      </td>
                      <td data-label="TÃªn khÃ¡ch hÃ ng" className="px-5 py-4">
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
                      <td data-label="Sá»‘ tiá»n cá»c" className="px-5 py-4 text-sm font-extrabold text-[#4160ad]">{formatMoney(agreement.amount)}</td>
                      <td data-label="NgÃ y táº¡o" className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{formatDate(agreement.createdAt)}</td>
                      <td data-label="NgÃ y háº¹n kÃ½ HÄ" className="px-5 py-4 text-sm font-semibold text-[#4b5563]">{formatDate(agreement.expectedLeaseSignDate)}</td>
                      <td data-label="Tráº¡ng thÃ¡i" className="px-5 py-4">
                        <select
                          value={STATUS_OPTIONS.some((status) => status.value === agreement.status) ? agreement.status : ""}
                          onChange={(event) => handleStatusChange(agreement, event.target.value)}
                          disabled={updatingId === agreement.id}
                          className="h-9 rounded-full border border-[#c4cad6] bg-white px-3 text-xs font-extrabold text-[#102033] outline-none focus:border-[#4160ad] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {!STATUS_OPTIONS.some((status) => status.value === agreement.status) && (
                            <option value="">{STATUS_LABELS[agreement.status]?.label || "ChÆ°a cáº­p nháº­t"}</option>
                          )}
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                      </td>
                      <td data-label="HÃ nh Ä‘á»™ng" className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(agreement)}
                            className="rounded-full p-2 text-[#4160ad] hover:bg-[#eef4ff]"
                            aria-label={`Xem chi tiáº¿t ${agreement.depositCode}`}
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenContract(agreement)}
                            className="rounded-full p-2 text-[#102033] hover:bg-[#eef4ff]"
                            aria-label={`Xem há»£p Ä‘á»“ng cá»c ${agreement.depositCode}`}
                          >
                            <FileText className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadContract(agreement)}
                            className="rounded-full p-2 text-[#102033] hover:bg-[#eef4ff]"
                            aria-label={`Táº£i há»£p Ä‘á»“ng cá»c ${agreement.depositCode}`}
                          >
                            <Download className="h-5 w-5" />
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
            itemLabel="h?p d?ng"
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
            className="bg-[#eef4ff]"
          />        </section>
      </section>

      <DetailModal
        agreement={selectedAgreement}
        loading={detailLoading}
        onClose={() => setSelectedAgreement(null)}
        onOpenContract={handleOpenContract}
        onDownloadContract={handleDownloadContract}
        onSaveManagementInfo={handleSaveManagementInfo}
      />
    </>
  );
}
