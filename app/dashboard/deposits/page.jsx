"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Filter,
  ImageIcon,
  LockKeyhole,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  downloadDepositContractPdf,
  fetchDepositAgreementDetails,
  fetchDepositAgreements,
  openDepositContractPdf,
  toApiAssetUrl,
  updateDepositAgreementManagementInfo,
  updateDepositAgreementStatus,
} from "@/services/depositContractsService";

const money = new Intl.NumberFormat("vi-VN");

const STATUS_OPTIONS = [
  { value: "PAID", label: "Đã đặt cọc", pill: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { value: "CONVERTED_TO_LEASE", label: "Đã nhận phòng", pill: "bg-blue-100 text-blue-800", dot: "bg-blue-600" },
  { value: "REFUNDED", label: "Đã hoàn cọc", pill: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-600" },
  { value: "FORFEITED", label: "Mất cọc", pill: "bg-rose-100 text-rose-800", dot: "bg-rose-600" },
];

const MANAGED_DEPOSIT_STATUSES = new Set(STATUS_OPTIONS.map((status) => status.value));
const MANAGEMENT_INFO_EDITABLE_STATUSES = new Set(["PENDING_PAYMENT", "PAID", "CONFIRMED", "EXTENDED"]);

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
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function toInputDate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${config.pill}`}>
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
    <article className="min-h-[150px] rounded-lg border border-[#d7dde8] bg-white p-7 shadow-[0_14px_30px_rgba(9,20,38,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#8b909a]">{title}</p>
          <p className="mt-7 text-4xl font-extrabold tracking-[-0.02em] text-[#102033]">{value}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
      {note && <p className="mt-6 text-base font-semibold text-[#4160ad]">{note}</p>}
    </article>
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
          Chưa có ảnh
        </div>
      )}
    </div>
  );
}

function valueOf(object, camelKey, snakeKey) {
  return object?.[camelKey] ?? object?.[snakeKey] ?? null;
}

function DetailModal({ agreement, loading, onClose, onOpenContract, onDownloadContract, onSaveManagementInfo }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d7dde8] px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#4160ad]">Chi tiết hợp đồng cọc</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#102033]">{agreement.depositCode}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#5a6678] hover:bg-[#eef3fb]" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="rounded-xl border border-[#d7dde8] bg-[#f7f9fc] p-10 text-center font-bold text-[#5a6678]">
              Đang tải chi tiết hợp đồng cọc...
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="grid gap-6">
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

                <section className="rounded-xl border border-[#d7dde8] bg-[#f7f9fc] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#8b909a]">Ảnh giấy tờ</p>
                      <h3 className="mt-1 text-xl font-extrabold text-[#102033]">CCCD và ảnh chân dung</h3>
                    </div>
                    <LockKeyhole className="h-5 w-5 text-[#4160ad]" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#5a6678]">
                    Dữ liệu này nhạy cảm, chỉ tài khoản có quyền quản lý mới nên xem.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <SensitiveImage title="Mặt trước CCCD" url={details.idFrontFileUrl} />
                    <SensitiveImage title="Mặt sau CCCD" url={details.idBackFileUrl} />
                    <SensitiveImage title="Ảnh chân dung" url={details.portraitFileUrl} />
                  </div>
                </section>
              </section>

              <aside className="h-fit rounded-xl border border-[#d7dde8] bg-white p-5 shadow-[0_10px_24px_rgba(9,20,38,0.06)]">
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
                    Xem hợp đồng cọc
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadContract(agreement)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#c4cad6] px-4 text-sm font-extrabold text-[#102033] hover:bg-[#f4f7fb]"
                  >
                    <Download className="h-4 w-4" />
                    Tải PDF
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
  const [updatingId, setUpdatingId] = useState(null);

  const loadAgreements = useCallback(async () => {
    try {
      setLoadError("");
      const response = await fetchDepositAgreements({ size: 200 });
      const nextAgreements = getAgreementItems(response)
        .map(normalizeAgreement)
        .filter((agreement) => MANAGED_DEPOSIT_STATUSES.has(agreement.status));
      setAgreements(nextAgreements);
    } catch (error) {
      setLoadError(error.message || "Không tải được danh sách hợp đồng cọc từ backend.");
    }
  }, []);

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

  const resetFilters = () => {
    setCustomerFilter("");
    setStatusFilter("all");
    setFloorFilter("all");
  };

  return (
    <>
      <section className="grid gap-8">
        <header>
          <h1 className="text-5xl font-extrabold tracking-[-0.03em] text-[#102033]">Danh sách hợp đồng đặt cọc</h1>
          <p className="mt-3 text-xl font-semibold text-[#6b7280]">
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

        <section className="grid gap-6 xl:grid-cols-3">
          <KpiCard icon={WalletCards} title="Tổng số tiền cọc" value={formatMoney(totalAmount)} note="Tổng tiền cọc đã ghi nhận" />
          <KpiCard icon={LockKeyhole} title="Đang giữ cọc" value={paidAgreements.length} note="Khoản thu khả dụng" tone="amber" />
          <KpiCard icon={ClipboardCheck} title="Đã nhận phòng" value={convertedAgreements.length} note="Đã chính thức nhận phòng" tone="emerald" />
        </section>

        <section className="rounded-lg border border-[#d7dde8] bg-white p-8 shadow-[0_14px_30px_rgba(9,20,38,0.08)]">
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr_auto_auto] xl:items-end">
            <label className="grid gap-2">
              <span className="text-base font-bold text-[#4b5563]">Tên khách hàng</span>
              <span className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8b909a]" />
                <input
                  value={customerFilter}
                  onChange={(event) => setCustomerFilter(event.target.value)}
                  placeholder="Nhập tên khách, SĐT, mã cọc..."
                  className="h-14 w-full rounded-lg border border-[#c4cad6] pl-12 pr-4 text-base font-semibold text-[#102033] outline-none placeholder:text-[#8b909a] focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
                />
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-base font-bold text-[#4b5563]">Trạng thái</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-14 rounded-lg border border-[#c4cad6] px-4 text-base font-semibold text-[#102033] outline-none focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
              >
                <option value="all">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-base font-bold text-[#4b5563]">Tầng</span>
              <select
                value={floorFilter}
                onChange={(event) => setFloorFilter(event.target.value)}
                className="h-14 rounded-lg border border-[#c4cad6] px-4 text-base font-semibold text-[#102033] outline-none focus:border-[#4160ad] focus:ring-4 focus:ring-[#4160ad]/10"
              >
                <option value="all">Tất cả tầng</option>
                {floorOptions.map((floor) => (
                  <option key={floor} value={floor}>{floor}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-[#dbe8ff] px-7 text-base font-extrabold text-[#102033]"
            >
              <Filter className="h-5 w-5" />
              Lọc dữ liệu
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-[#c4cad6] text-[#102033] hover:bg-[#f4f7fb]"
              aria-label="Xóa bộ lọc"
            >
              <RefreshCw className="h-6 w-6" />
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#d7dde8] bg-white shadow-[0_14px_30px_rgba(9,20,38,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#cdd5e1] bg-[#eef4ff] text-base font-extrabold uppercase tracking-[0.08em] text-[#4b5563]">
                  <th className="px-8 py-6">Phòng</th>
                  <th className="px-8 py-6">Tên khách hàng</th>
                  <th className="px-8 py-6">Số tiền cọc</th>
                  <th className="px-8 py-6">Ngày tạo</th>
                  <th className="px-8 py-6">Trạng thái</th>
                  <th className="px-8 py-6 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-base font-bold text-[#6b7280]">
                      Không có hợp đồng đặt cọc phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredAgreements.map((agreement) => (
                    <tr key={agreement.id} className="border-b border-[#edf0f5] last:border-0">
                      <td className="px-8 py-7 text-xl font-extrabold text-[#111827]">
                        {agreement.roomCode ? `P.${agreement.roomCode}` : "Chưa rõ"}
                      </td>
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f0ff] text-[#4160ad]">
                            <UserRound className="h-5 w-5" />
                          </span>
                          <span>
                            <span className="block text-lg font-extrabold text-[#102033]">{agreement.depositorFullName}</span>
                            <span className="block text-base font-semibold text-[#5a6678]">{agreement.depositorPhone}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-7 text-lg font-extrabold text-[#4160ad]">{formatMoney(agreement.amount)}</td>
                      <td className="px-8 py-7 text-lg font-semibold text-[#4b5563]">{formatDate(agreement.createdAt)}</td>
                      <td className="px-8 py-7">
                        <select
                          value={STATUS_OPTIONS.some((status) => status.value === agreement.status) ? agreement.status : ""}
                          onChange={(event) => handleStatusChange(agreement, event.target.value)}
                          disabled={updatingId === agreement.id}
                          className="h-10 rounded-full border border-[#c4cad6] bg-white px-4 text-sm font-extrabold text-[#102033] outline-none focus:border-[#4160ad] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {!STATUS_OPTIONS.some((status) => status.value === agreement.status) && (
                            <option value="">{STATUS_LABELS[agreement.status]?.label || "Chưa cập nhật"}</option>
                          )}
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>{status.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-8 py-7">
	                        <div className="flex items-center justify-center gap-3">
	                          <button
	                            type="button"
	                            onClick={() => openDetails(agreement)}
	                            className="rounded-full p-2 text-[#4160ad] hover:bg-[#eef4ff]"
	                            aria-label={`Xem chi tiết ${agreement.depositCode}`}
	                          >
	                            <Eye className="h-7 w-7" />
	                          </button>
	                          <button
	                            type="button"
	                            onClick={() => handleOpenContract(agreement)}
	                            className="rounded-full p-2 text-[#102033] hover:bg-[#eef4ff]"
	                            aria-label={`Xem hợp đồng cọc ${agreement.depositCode}`}
	                          >
	                            <FileText className="h-6 w-6" />
	                          </button>
	                          <button
	                            type="button"
	                            onClick={() => handleDownloadContract(agreement)}
	                            className="rounded-full p-2 text-[#102033] hover:bg-[#eef4ff]"
	                            aria-label={`Tải hợp đồng cọc ${agreement.depositCode}`}
	                          >
	                            <Download className="h-6 w-6" />
	                          </button>
	                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-col gap-3 border-t border-[#d7dde8] bg-[#eef4ff] px-8 py-6 text-base font-semibold text-[#5a6678] sm:flex-row sm:items-center sm:justify-between">
            <span>Hiển thị {filteredAgreements.length} trong tổng số {agreements.length} hợp đồng</span>
            <span className="rounded-md bg-[#4160ad] px-4 py-2 font-extrabold text-white">1</span>
          </footer>
        </section>
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
