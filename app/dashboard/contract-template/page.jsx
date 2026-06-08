"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileWarning,
  Home,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";

import {
  activateLeaseContract,
  createDraftLeaseContractFromDeposit,
  downloadLeaseContractFile,
  fetchLeaseContractManagementList,
  fetchManagementLeaseContractDetails,
  openLeaseContractFile,
  uploadSignedLeaseContractFile,
  liquidateLeaseContract,
  recordLeaseContractTenantIntention,
  renewLeaseContract,
  updateLeaseContractTerms,
} from "@/services/leaseContractsService";
import { sendTenantAccountCredentials } from "@/services/identityAccessService";
import ContractHandoverSection from "./ContractHandoverSection";

const STATUS_FILTERS = [
  { id: "current", label: "Hợp đồng hiện tại" },
  { id: "all", label: "Tất cả" },
  { id: "PENDING", label: "Chờ ký / kích hoạt" },
  { id: "ACTIVE", label: "Đang hiệu lực" },
  { id: "EXPIRING_SOON", label: "Sắp hết hạn" },
  { id: "EXPIRED", label: "Hết hạn" },
  { id: "history", label: "Lịch sử" },
  { id: "RENEWED", label: "Đã gia hạn" },
  { id: "LIQUIDATED", label: "Đã thanh lý" },
];

const CURRENT_CONTRACT_WORKFLOWS = new Set([
  "PENDING_SIGNATURE",
  "MISSING_FILE",
  "PENDING_ACTIVATION",
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
]);

const HISTORY_CONTRACT_WORKFLOWS = new Set([
  "RENEWED",
  "LIQUIDATED",
  "CANCELLED",
  "AUTO_TERMINATED",
]);

const WORKFLOW_LABELS = {
  PENDING_SIGNATURE: "Chờ ký",
  MISSING_FILE: "Chưa upload",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  ACTIVE: "Đang hiệu lực",
  EXPIRING_SOON: "Sắp hết hạn",
  LIQUIDATED: "Đã thanh lý",
  EXPIRED: "Hết hạn",
  RENEWED: "Đã gia hạn",
  CANCELLED: "Đã hủy",
  AUTO_TERMINATED: "Đã tự động kết thúc",
  TERMINATION_PENDING: "Chờ thanh lý",
  ENDED: "Đã kết thúc",
  DRAFT: "Bản nháp",
};

const STATUS_LABELS = {
  ACTIVE: "Đang hiệu lực",
  PENDING_SIGNATURE: "Chờ ký",
  DRAFT: "Bản nháp",
  LIQUIDATED: "Đã thanh lý",
  EXPIRED: "Hết hạn",
  TERMINATED: "Đã thanh lý",
  RENEWED: "Đã gia hạn",
  EXPIRING_SOON: "Sắp hết hạn",
  CANCELLED: "Đã hủy",
  AUTO_TERMINATED: "Đã tự động kết thúc",
  TERMINATION_PENDING: "Chờ thanh lý",
};

const ROLE_LABELS = {
  PRIMARY: "Người ký chính",
  CO_OCCUPANT: "Người ở cùng",
};

const ACCOUNT_PROVISIONING_ACTIONS = {
  NOT_PROVISIONED: {
    label: "Gửi tài khoản cho khách",
    disabled: false,
    className: "bg-indigo-600 text-white hover:bg-indigo-700",
  },
  PENDING: {
    label: "Đang gửi tài khoản",
    disabled: true,
    className: "border border-blue-200 bg-blue-50 text-blue-700",
  },
  SENT: {
    label: "Đã gửi tài khoản",
    disabled: true,
    className: "border border-blue-200 bg-blue-50 text-blue-700",
  },
  ACTIVE: {
    label: "Đã kích hoạt tài khoản",
    disabled: true,
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  FAILED: {
    label: "Thử gửi lại tài khoản",
    disabled: false,
    className: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  },
  MISSING_EMAIL: {
    label: "Thiếu email nhận tài khoản",
    disabled: true,
    className: "border border-amber-200 bg-amber-50 text-amber-700",
  },
};

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN").format(date);
}

function formatIdentityNumber(value) {
  if (!value || String(value).startsWith("PENDING-")) return "Chưa cập nhật";
  return value;
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Chưa có";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatOptionalMoney(value) {
  if (value === null || value === undefined || value === "") return "Chưa có";
  return formatMoney(value);
}

function getAmountPerPeriod(item) {
  if (
    item?.monthlyRent === null ||
    item?.monthlyRent === undefined ||
    item?.paymentCycleMonths === null ||
    item?.paymentCycleMonths === undefined
  ) {
    return null;
  }
  return Number(item.monthlyRent) * Number(item.paymentCycleMonths);
}

function formatCycle(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "Chưa có";
  return `${number} tháng/lần`;
}

function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function buildTermsForm(item = {}) {
  return {
    startDate: toDateInputValue(item.startDate),
    endDate: toDateInputValue(item.endDate),
    paymentCycleMonths: String(item.paymentCycleMonths || 1),
    monthlyRent: item.monthlyRent == null ? "" : String(item.monthlyRent),
    depositAmount: item.depositAmount == null ? "0" : String(item.depositAmount),
  };
}

function addDays(value, days) {
  if (!value) return "";
  const date = new Date(`${toDateInputValue(value)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addYearsMinusOneDay(value, years) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setFullYear(date.getFullYear() + years);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildRenewForm(item = {}) {
  const newStartDate = addDays(item.endDate, 1);
  const year = newStartDate ? newStartDate.slice(0, 4) : new Date().getFullYear();
  return {
    newContractCode: item.contractCode ? `${item.contractCode}-R${year}` : "",
    newStartDate,
    newEndDate: addYearsMinusOneDay(newStartDate, 1),
    monthlyRent: item.monthlyRent == null ? "" : String(item.monthlyRent),
    paymentCycleMonths: String(item.paymentCycleMonths || 1),
    depositAmount: item.depositAmount == null ? "0" : String(item.depositAmount),
    note: "",
  };
}

function calculateRentStartDate(startDate) {
  if (!startDate) return "";
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  if (date.getDate() <= 10) return startDate;
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
}

function isContractShorterThanCycle(startDate, endDate, cycleMonths) {
  if (!startDate || !endDate || Number(cycleMonths) !== 3) return false;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const minimumEnd = new Date(start);
  minimumEnd.setMonth(minimumEnd.getMonth() + 3);
  return end < minimumEnd;
}

function normalizeKeyword(value) {
  return String(value || "").trim().toLowerCase();
}

function getContractRowKey(item, index) {
  if (item.sourceType === "CONTRACT" && item.contractId) return `contract-${item.contractId}`;
  if (item.sourceType === "DEPOSIT" && item.depositAgreementId) return `deposit-${item.depositAgreementId}`;
  if (item.contractId) return `contract-${item.contractId}`;
  if (item.depositAgreementId) return `deposit-${item.depositAgreementId}`;
  if (item.leaseContractId) return `lease-${item.leaseContractId}`;
  if (item.id) return `item-${item.id}`;
  if (item.displayCode) return `code-${item.displayCode}`;
  return `row-${index}`;
}

function getOccupantsCount(item, details) {
  const raw =
    item?.occupantsCount ??
    item?.occupantCount ??
    item?.peopleCount ??
    item?.roomOccupantCount ??
    details?.occupantsCount ??
    details?.occupants?.length ??
    item?.occupants?.length ??
    null;
  const count = Number(raw);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function getWorkflow(item) {
  const contractStatus = item?.status || item?.contractStatus;
  if ([
    "ACTIVE",
    "EXPIRING_SOON",
    "EXPIRED",
    "TERMINATION_PENDING",
    "LIQUIDATED",
    "RENEWED",
    "CANCELLED",
    "AUTO_TERMINATED",
  ].includes(contractStatus)) {
    return contractStatus;
  }
  const status = item?.workflowStatus || item?.depositStatus;
  if (status === "ACTIVE") return "ACTIVE";
  if (item?.leaseContractId && item?.contractFileId) return "PENDING_ACTIVATION";
  if (item?.leaseContractId && !item?.contractFileId) return "MISSING_FILE";
  return "PENDING_SIGNATURE";
}

function matchesStatusFilter(item, statusFilter) {
  const workflow = getWorkflow(item);
  if (statusFilter === "all") return true;
  if (statusFilter === "current") return CURRENT_CONTRACT_WORKFLOWS.has(workflow);
  if (statusFilter === "history") return HISTORY_CONTRACT_WORKFLOWS.has(workflow);
  if (statusFilter === "PENDING") {
    return ["PENDING_SIGNATURE", "MISSING_FILE", "PENDING_ACTIVATION"].includes(workflow);
  }
  return workflow === statusFilter || item.status === statusFilter || item.contractStatus === statusFilter;
}

function getStatusLabel(item) {
  const workflow = getWorkflow(item);
  return WORKFLOW_LABELS[workflow] || STATUS_LABELS[item?.status] || "Chờ xử lý";
}

function FileBadge({ item }) {
  const uploaded = Boolean(item?.contractFileId);
  const Icon = uploaded ? FileCheck2 : FileWarning;
  return (
    <span
      className={`inline-flex max-w-full items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-center text-[11px] font-bold leading-tight xl:px-3 xl:py-2 xl:text-xs ${
        uploaded
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {uploaded ? "Đã upload" : "Chưa upload"}
    </span>
  );
}

function StatusBadge({ item }) {
  const workflow = getWorkflow(item);
  const label = getStatusLabel(item);
  const classes = {
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    EXPIRING_SOON: "border-amber-200 bg-amber-50 text-amber-700",
    PENDING_ACTIVATION: "border-blue-200 bg-blue-50 text-blue-700",
    MISSING_FILE: "border-red-200 bg-red-50 text-red-700",
    PENDING_SIGNATURE: "border-amber-200 bg-amber-50 text-amber-700",
    LIQUIDATED: "border-slate-200 bg-slate-50 text-slate-600",
    EXPIRED: "border-slate-200 bg-slate-50 text-slate-600",
    RENEWED: "border-blue-200 bg-blue-50 text-blue-700",
    CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
    TERMINATION_PENDING: "border-orange-200 bg-orange-50 text-orange-700",
  };
  const Icon = workflow === "ACTIVE" ? CheckCircle2 : workflow === "PENDING_ACTIVATION" ? RefreshCw : AlertTriangle;

  return (
    <span
      className={`inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-center text-[11px] font-bold leading-tight xl:px-3 xl:py-2 xl:text-xs ${
        classes[workflow] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass = {
    dark: "text-[#091426] bg-[#eef3fb]",
    green: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    blue: "text-blue-700 bg-blue-50",
  };
  const [textClass, bgClass] = (toneClass[tone] || toneClass.dark).split(" ");

  return (
    <article className="rounded-xl border border-[#dfe5ef] bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] xl:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#6b7280] xl:text-xs">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold xl:text-3xl ${textClass}`}>{value}</p>
      <div className={`mt-4 h-1.5 rounded-full ${bgClass}`} />
    </article>
  );
}

function DetailCard({ title, icon: Icon, action, className = "", children }) {
  return (
    <section className={`rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-4 xl:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-[#091426] xl:text-xl">
          <Icon className="h-4 w-4 xl:h-5 xl:w-5" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoValue({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#6b7280] xl:text-sm">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[#091426] xl:text-base">{value || "Chưa có"}</p>
    </div>
  );
}

export default function ContractTemplatePage() {
  const fileInputRef = useRef(null);
  const [contracts, setContracts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("current");
  const [fileFilter, setFileFilter] = useState("all");
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [termsForm, setTermsForm] = useState(buildTermsForm());
  const [termsError, setTermsError] = useState("");
  const [termsFieldErrors, setTermsFieldErrors] = useState({});
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewForm, setRenewForm] = useState(buildRenewForm());
  const [renewError, setRenewError] = useState("");
  const [renewFieldErrors, setRenewFieldErrors] = useState({});
  const [intentionModalOpen, setIntentionModalOpen] = useState(false);
  const [intentionForm, setIntentionForm] = useState({
    intention: "UNDECIDED",
    expectedMoveOutDate: "",
    note: "",
  });
  const [intentionError, setIntentionError] = useState("");

  async function loadContracts() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLeaseContractManagementList();
      setContracts(data);
      return data;
    } catch (err) {
      setError(err?.message || "Không tải được danh sách hợp đồng thuê.");
    } finally {
      setLoading(false);
    }
    return [];
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadContracts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadDetails() {
      if (!selected?.leaseContractId) {
        setDetails(null);
        return;
      }
      setDetailLoading(true);
      try {
        const data = await fetchManagementLeaseContractDetails(selected.leaseContractId);
        if (!ignore) {
          setDetails(data);
          setTermsForm(buildTermsForm(data));
        }
      } catch {
        if (!ignore) setDetails(null);
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }
    loadDetails();
    return () => {
      ignore = true;
    };
  }, [selected?.leaseContractId]);

  const summary = useMemo(() => {
    return contracts.reduce(
      (acc, item) => {
        acc.total += 1;
        const workflow = getWorkflow(item);
        if (workflow === "ACTIVE") acc.active += 1;
        if (workflow === "PENDING_SIGNATURE") acc.pendingSignature += 1;
        if (workflow === "PENDING_ACTIVATION") acc.pendingActivation += 1;
        if (!item.contractFileId) acc.missingFile += 1;
        return acc;
      },
      { total: 0, pendingSignature: 0, pendingActivation: 0, active: 0, missingFile: 0 },
    );
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    const search = normalizeKeyword(keyword);
    return contracts.filter((item) => {
      const searchable = [
        item.displayCode,
        item.contractCode,
        item.depositCode,
        item.roomCode,
        item.propertyName,
        item.primaryTenantName,
        item.customerName,
        item.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || searchable.includes(search);
      const matchesStatus = matchesStatusFilter(item, statusFilter);
      const matchesFile =
        fileFilter === "all" ||
        (fileFilter === "uploaded" && item.contractFileId) ||
        (fileFilter === "missing" && !item.contractFileId);

      return matchesSearch && matchesStatus && matchesFile;
    });
  }, [contracts, fileFilter, keyword, statusFilter]);

  const mergedSelected = useMemo(() => {
    if (!selected) return null;
    if (!details) return selected;
    return {
      ...selected,
      ...details,
      displayCode: details.contractCode || selected.displayCode,
      contractFileId: details.contractFile?.id || selected.contractFileId,
      contractFileName: details.contractFile?.fileName || selected.contractFileName,
      contractFileUploadedAt: details.contractFile?.uploadedAt || selected.contractFileUploadedAt,
      propertyName: details.property?.name || selected.propertyName,
      roomCode: details.room?.roomCode || selected.roomCode,
      roomId: details.room?.id || selected.roomId || null,
      monthlyRent: details.monthlyRent ?? selected.monthlyRent,
      depositAmount: details.depositAmount ?? selected.depositAmount,
      paymentCycleMonths: details.paymentCycleMonths ?? selected.paymentCycleMonths,
      startDate: details.startDate ?? selected.startDate,
      endDate: details.endDate ?? selected.endDate,
      rentStartDate: details.rentStartDate ?? selected.rentStartDate,
      status: details.status ?? selected.status,
    };
  }, [details, selected]);

  const selectedOccupants = useMemo(() => {
    if (Array.isArray(details?.occupants) && details.occupants.length > 0) return details.occupants;
    if (Array.isArray(selected?.occupants) && selected.occupants.length > 0) return selected.occupants;
    return [];
  }, [details, selected]);

  const amountPerPeriod = useMemo(() => {
    const monthlyRent = Number(termsForm.monthlyRent);
    const cycleMonths = Number(termsForm.paymentCycleMonths);
    if (!Number.isFinite(monthlyRent) || !Number.isFinite(cycleMonths)) return 0;
    return monthlyRent * cycleMonths;
  }, [termsForm.monthlyRent, termsForm.paymentCycleMonths]);

  const previewRentStartDate = useMemo(
    () => calculateRentStartDate(termsForm.startDate),
    [termsForm.startDate],
  );

  const shortThreeMonthCycle = useMemo(
    () =>
      isContractShorterThanCycle(
        termsForm.startDate,
        termsForm.endDate,
        termsForm.paymentCycleMonths,
      ),
    [termsForm.endDate, termsForm.paymentCycleMonths, termsForm.startDate],
  );

  function selectContract(item) {
    setSelected(item);
    setActionMessage("");
    setTermsForm(buildTermsForm(item));
    setIsEditingTerms(false);
    setTermsFieldErrors({});
    setTermsError("");
    setRenewModalOpen(false);
    setIntentionModalOpen(false);
  }

  function openUploadDialog(item) {
    setSelected(item);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected) return;

    setActionLoading("upload");
    setError("");
    try {
      const updated = await uploadSignedLeaseContractFile(selected, file);
      const uploadedContractId = updated.leaseContractId;
      const refreshedContracts = await loadContracts();
      const refreshedItem = refreshedContracts.find(
        (item) => String(item.leaseContractId) === String(uploadedContractId),
      );
      setSelected((current) => ({ ...current, ...updated, ...refreshedItem }));

      if (uploadedContractId) {
        const refreshedDetails = await fetchManagementLeaseContractDetails(uploadedContractId);
        setDetails(refreshedDetails);
        setTermsForm(buildTermsForm(refreshedDetails));
      }
    } catch (err) {
      setError(err?.message || "Không upload được file hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleCreateDraft(item) {
    if (!item?.depositAgreementId) return;
    setActionLoading(`draft-${item.depositAgreementId}`);
    setError("");
    try {
      await createDraftLeaseContractFromDeposit(item.depositAgreementId);
      await loadContracts();
    } catch (err) {
      setError(err?.message || "Không tạo được hợp đồng thuê từ cọc.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleActivate(item) {
    if (!item?.leaseContractId) return;
    setActionLoading(`activate-${item.leaseContractId}`);
    setError("");
    try {
      const activated = await activateLeaseContract(item.leaseContractId);
      const activatedStatus = activated.status ?? activated.contractStatus;

      setSelected((current) =>
        String(current?.leaseContractId) === String(item.leaseContractId)
          ? { ...current, ...activated }
          : current,
      );
      setDetails((current) =>
        current
          ? {
              ...current,
              status: activatedStatus,
              canSendAccount: activatedStatus === "ACTIVE",
              accountProvisioningStatus: "NOT_PROVISIONED",
              canRenew: ["ACTIVE", "EXPIRING_SOON", "EXPIRED"].includes(activatedStatus),
              canLiquidate: ["ACTIVE", "EXPIRING_SOON", "EXPIRED", "TERMINATION_PENDING"].includes(
                activatedStatus,
              ),
            }
          : current,
      );

      const refreshedContracts = await loadContracts();
      const refreshedItem = refreshedContracts.find(
        (contract) => String(contract.leaseContractId) === String(item.leaseContractId),
      );
      if (refreshedItem) {
        setSelected((current) =>
          String(current?.leaseContractId) === String(item.leaseContractId)
            ? { ...current, ...refreshedItem }
            : current,
        );
      }

      const refreshedDetails = await fetchManagementLeaseContractDetails(item.leaseContractId);
      setDetails(refreshedDetails);
      setTermsForm(buildTermsForm(refreshedDetails));
    } catch (err) {
      setError(err?.message || "Không kích hoạt được hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  function updateTermsField(field, value) {
    setTermsForm((current) => ({ ...current, [field]: value }));
    setTermsFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setTermsError("");
  }

  function cancelTermsEditing() {
    setTermsForm(buildTermsForm(mergedSelected));
    setTermsFieldErrors({});
    setTermsError("");
    setIsEditingTerms(false);
  }

  async function handleSaveTerms() {
    if (!mergedSelected?.leaseContractId) return;

    const monthlyRent = Number(termsForm.monthlyRent);
    const depositAmount = Number(termsForm.depositAmount);
    const paymentCycleMonths = Number(termsForm.paymentCycleMonths);
    const validationErrors = {};

    if (!termsForm.startDate) {
      validationErrors.startDate = "Vui lòng chọn ngày bắt đầu hợp đồng.";
    }
    if (!termsForm.endDate) {
      validationErrors.endDate = "Vui lòng chọn ngày kết thúc hợp đồng.";
    } else if (termsForm.startDate && termsForm.endDate <= termsForm.startDate) {
      validationErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu hợp đồng.";
    }
    if (![1, 3].includes(paymentCycleMonths)) {
      validationErrors.paymentCycleMonths = "Chu kỳ thanh toán chỉ được là 1 hoặc 3 tháng.";
    }
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      validationErrors.monthlyRent = "Giá thuê mỗi tháng phải lớn hơn 0.";
    }
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      validationErrors.depositAmount = "Tiền cọc phải lớn hơn hoặc bằng 0.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setTermsFieldErrors(validationErrors);
      setTermsError("Vui lòng kiểm tra các trường được đánh dấu đỏ.");
      return;
    }

    setActionLoading(`terms-${mergedSelected.leaseContractId}`);
    setTermsFieldErrors({});
    setTermsError("");
    setError("");
    try {
      const updated = await updateLeaseContractTerms(mergedSelected.leaseContractId, {
        startDate: termsForm.startDate,
        endDate: termsForm.endDate,
        paymentCycleMonths,
        monthlyRent,
        depositAmount,
      });
      setContracts((current) =>
        current.map((item) =>
          item.leaseContractId === mergedSelected.leaseContractId
            ? { ...item, ...updated }
            : item,
        ),
      );
      setSelected((current) => (current ? { ...current, ...updated } : current));
      const refreshedDetails = await fetchManagementLeaseContractDetails(
        mergedSelected.leaseContractId,
      );
      setDetails(refreshedDetails);
      setTermsForm(buildTermsForm(refreshedDetails));
      setTermsFieldErrors({});
      setIsEditingTerms(false);
    } catch (err) {
      const serverErrors =
        err?.payload?.data?.fieldErrors ||
        err?.payload?.data?.field_errors ||
        {};
      setTermsFieldErrors({
        startDate: serverErrors.startDate || serverErrors.start_date,
        endDate: serverErrors.endDate || serverErrors.end_date,
        paymentCycleMonths:
          serverErrors.paymentCycleMonths || serverErrors.payment_cycle_months,
        monthlyRent: serverErrors.monthlyRent || serverErrors.monthly_rent,
        depositAmount: serverErrors.depositAmount || serverErrors.deposit_amount,
      });
      setTermsError(
        Object.keys(serverErrors).length > 0
          ? "Vui lòng kiểm tra các trường được đánh dấu đỏ."
          : err?.details || err?.message || "Không cập nhật được thông tin hợp đồng.",
      );
    } finally {
      setActionLoading("");
    }
  }

  async function handleLiquidate(item) {
    if (!item?.leaseContractId) return;
    const confirmed = window.confirm("Bạn chắc chắn muốn thanh lý hợp đồng này?");
    if (!confirmed) return;
    setActionLoading(`liquidate-${item.leaseContractId}`);
    setError("");
    try {
      const updated = await liquidateLeaseContract(item.leaseContractId, { reason: "Thanh lý từ màn quản lý hợp đồng" });
      await loadContracts();
      const refreshedDetails = await fetchManagementLeaseContractDetails(item.leaseContractId);
      setDetails(refreshedDetails);
      setSelected((current) => current ? { ...current, ...updated } : current);
    } catch (err) {
      setError(err?.message || "Không thanh lý được hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSendAccount(item) {
    if (!item?.leaseContractId) return;
    const provisioningStatus = details?.accountProvisioningStatus || "NOT_PROVISIONED";
    const retry = provisioningStatus === "FAILED";
    const confirmed = window.confirm(
      retry
        ? "Lần gửi trước thất bại. Bạn có chắc muốn thử gửi lại cho các người thuê chưa được cấp tài khoản?"
        : "Hệ thống sẽ gửi tài khoản cho các người thuê chưa được cấp. Không gửi lại cho tài khoản đã có.",
    );
    if (!confirmed) return;

    setActionLoading(`send-${item.leaseContractId}`);
    setError("");
    setActionMessage("");
    try {
      const result = await sendTenantAccountCredentials(item.leaseContractId, { retry });
      await loadContracts();
      const refreshedDetails = await fetchManagementLeaseContractDetails(item.leaseContractId);
      setDetails(refreshedDetails);
      setActionMessage(result?.message || "Đã cập nhật trạng thái cấp tài khoản.");
    } catch (err) {
      setError(err?.message || "Không gửi được tài khoản cho khách thuê.");
      try {
        const refreshedDetails = await fetchManagementLeaseContractDetails(item.leaseContractId);
        setDetails(refreshedDetails);
      } catch {
        // Keep the original provisioning error visible.
      }
    } finally {
      setActionLoading("");
    }
  }

  function openRenewModal() {
    setRenewForm(buildRenewForm(mergedSelected));
    setRenewFieldErrors({});
    setRenewError("");
    setRenewModalOpen(true);
  }

  function updateRenewField(field, value) {
    setRenewForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "newStartDate") {
        next.newEndDate = addYearsMinusOneDay(value, 1);
      }
      return next;
    });
    setRenewFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setRenewError("");
  }

  async function handleRenewContract() {
    if (!mergedSelected?.leaseContractId) return;
    const monthlyRent = Number(renewForm.monthlyRent);
    const paymentCycleMonths = Number(renewForm.paymentCycleMonths);
    const depositAmount = Number(renewForm.depositAmount);
    const validationErrors = {};

    if (!renewForm.newContractCode.trim()) {
      validationErrors.newContractCode = "Vui lòng nhập mã hợp đồng mới.";
    }
    if (!renewForm.newStartDate) {
      validationErrors.newStartDate = "Vui lòng chọn ngày bắt đầu mới.";
    }
    if (!renewForm.newEndDate) {
      validationErrors.newEndDate = "Vui lòng chọn ngày kết thúc mới.";
    } else if (renewForm.newStartDate && renewForm.newEndDate <= renewForm.newStartDate) {
      validationErrors.newEndDate = "Ngày kết thúc phải sau ngày bắt đầu.";
    }
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      validationErrors.monthlyRent = "Giá thuê phải lớn hơn 0.";
    }
    if (![1, 3].includes(paymentCycleMonths)) {
      validationErrors.paymentCycleMonths = "Chu kỳ thanh toán chỉ được là 1 hoặc 3 tháng.";
    }
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      validationErrors.depositAmount = "Tiền cọc phải lớn hơn hoặc bằng 0.";
    }
    if (Object.keys(validationErrors).length > 0) {
      setRenewFieldErrors(validationErrors);
      setRenewError("Vui lòng kiểm tra thông tin hợp đồng mới.");
      return;
    }

    setActionLoading(`renew-${mergedSelected.leaseContractId}`);
    setRenewError("");
    setError("");
    try {
      const renewal = await renewLeaseContract(mergedSelected.leaseContractId, {
        ...renewForm,
        monthlyRent,
        paymentCycleMonths,
        depositAmount,
      });
      setRenewModalOpen(false);
      const refreshedContracts = await loadContracts();
      const newContractId = renewal?.newContractId ?? renewal?.new_contract_id;
      const newContract = refreshedContracts.find(
        (item) => String(item.leaseContractId) === String(newContractId),
      );
      const refreshedDetails = await fetchManagementLeaseContractDetails(newContractId);
      setDetails(refreshedDetails);
      setSelected(newContract || {
        leaseContractId: newContractId,
        contractId: newContractId,
        contractCode: renewal?.newContractCode ?? renewal?.new_contract_code,
        displayCode: renewal?.newContractCode ?? renewal?.new_contract_code,
        status: renewal?.newContractStatus ?? renewal?.new_contract_status,
        contractStatus: renewal?.newContractStatus ?? renewal?.new_contract_status,
      });
    } catch (err) {
      setRenewError(err?.details || err?.message || "Không thể tái ký hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  function openIntentionModal() {
    setIntentionForm({
      intention: "UNDECIDED",
      expectedMoveOutDate: "",
      note: "",
    });
    setIntentionError("");
    setIntentionModalOpen(true);
  }

  async function handleRecordIntention() {
    if (!mergedSelected?.leaseContractId) return;
    setActionLoading(`intention-${mergedSelected.leaseContractId}`);
    setIntentionError("");
    try {
      await recordLeaseContractTenantIntention(mergedSelected.leaseContractId, intentionForm);
      const refreshedDetails = await fetchManagementLeaseContractDetails(mergedSelected.leaseContractId);
      setDetails(refreshedDetails);
      setIntentionModalOpen(false);
    } catch (err) {
      setIntentionError(err?.details || err?.message || "Không thể ghi nhận ý định khách.");
    } finally {
      setActionLoading("");
    }
  }

  const isBusy = Boolean(actionLoading);

  return (
    <div className="grid gap-5 text-[#091426] text-[13px] xl:gap-6 xl:text-sm">
      <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileSelected} />

      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold tracking-[-0.01em] text-[#091426] xl:text-3xl">
          Quản lý hợp đồng thuê
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-[#505f76]">
          Dữ liệu lấy từ backend, quản lý file scan/PDF và trạng thái vòng đời hợp đồng thuê.
        </p>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 xl:gap-4">
        <StatCard label="Tổng" value={summary.total} tone="dark" />
        <StatCard label="Chờ ký" value={summary.pendingSignature} tone="amber" />
        <StatCard label="Chờ kích hoạt" value={summary.pendingActivation} tone="blue" />
        <StatCard label="Đang hiệu lực" value={summary.active} tone="green" />
        <StatCard label="Chưa có file" value={summary.missingFile} tone="red" />
      </section>

      <section className="rounded-xl border border-[#dfe5ef] bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] xl:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a98af]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm mã HĐ, phòng hoặc người ký..."
              className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-white pl-10 pr-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]"
            />
          </label>
          <label className="relative">
            <FileCheck2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a98af]" />
            <select
              value={fileFilter}
              onChange={(event) => setFileFilter(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-3 text-sm font-bold text-[#091426] outline-none focus:border-[#091426]"
            >
              <option value="all">Tất cả file</option>
              <option value="uploaded">Đã upload</option>
              <option value="missing">Chưa upload</option>
            </select>
          </label>
          <button
            type="button"
            onClick={loadContracts}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-extrabold text-white transition hover:bg-[#16253a] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`h-9 shrink-0 rounded-full border px-4 text-xs font-extrabold transition ${
                statusFilter === filter.id
                  ? "border-[#091426] bg-[#091426] text-white"
                  : "border-[#d7deea] bg-white text-[#56647a] hover:border-[#9ba8ba] hover:text-[#091426]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {actionMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-[#dfe5ef] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <header className="border-b border-[#dfe5ef] px-5 py-5 xl:px-8 xl:py-7">
          <h2 className="text-xl font-extrabold tracking-[-0.01em] text-[#091426] xl:text-2xl">Danh sách hợp đồng</h2>
          <p className="mt-2 text-sm text-[#6b7280] xl:text-base">
            Quản lý hợp đồng thuê, file scan/PDF và trạng thái vòng đời hợp đồng.
          </p>
        </header>

        <div className="dashboard-table">
          <table className="w-full table-auto text-left text-[12px] xl:text-sm [&_td]:px-3 [&_td]:py-4 xl:[&_td]:px-5 xl:[&_td]:py-5 [&_th]:px-3 [&_th]:py-3 xl:[&_th]:px-5 xl:[&_th]:py-4">
            <thead className="bg-[#f7f9fe] text-[10px] font-extrabold uppercase tracking-[0.03em] text-[#6b7280] xl:text-xs">
              <tr>
                <th className="min-w-32">Mã HĐ</th>
                <th className="min-w-20">Phòng</th>
                <th className="min-w-40">Người ký chính</th>
                <th className="min-w-24">Số người</th>
                <th className="min-w-36">Thời hạn</th>
                <th className="min-w-32">Giá thuê</th>
                <th className="min-w-28">File</th>
                <th className="min-w-32">Trạng thái</th>
                <th className="min-w-20 text-center">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm font-bold text-[#607089]">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải dữ liệu hợp đồng...
                    </span>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredContracts.map((item, index) => (
                  <tr
                    key={getContractRowKey(item, index)}
                    className="bg-white transition hover:bg-[#f8fbff]"
                  >
                    <td data-label="Mã HĐ" className="align-middle">
                      <p className="font-extrabold leading-5 text-[#091426]">{item.displayCode || item.contractCode || item.depositCode || "Chưa có"}</p>
                      <p className="mt-1 text-[11px] text-[#7b8495] xl:text-xs">{item.propertyName || "Chưa có cơ sở"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {getWorkflow(item) === "RENEWED" && (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                            Hợp đồng cũ
                          </span>
                        )}
                        {item.previousContractId && CURRENT_CONTRACT_WORKFLOWS.has(getWorkflow(item)) && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                            Hợp đồng hiện tại
                          </span>
                        )}
                      </div>
                      {item.renewedContractId && (
                        <button
                          type="button"
                          onClick={() => {
                            const renewed = contracts.find(
                              (contract) => String(contract.leaseContractId) === String(item.renewedContractId),
                            );
                            selectContract(renewed || {
                              leaseContractId: item.renewedContractId,
                              contractId: item.renewedContractId,
                              contractCode: item.renewedContractCode,
                              displayCode: item.renewedContractCode,
                            });
                          }}
                          className="mt-2 block text-left text-[11px] font-bold text-blue-700 hover:underline xl:text-xs"
                        >
                          Xem HĐ mới {item.renewedContractCode || `#${item.renewedContractId}`}
                        </button>
                      )}
                      {item.previousContractId && (
                        <button
                          type="button"
                          onClick={() => {
                            const previous = contracts.find(
                              (contract) => String(contract.leaseContractId) === String(item.previousContractId),
                            );
                            selectContract(previous || {
                              leaseContractId: item.previousContractId,
                              contractId: item.previousContractId,
                              contractCode: item.previousContractCode,
                              displayCode: item.previousContractCode,
                            });
                          }}
                          className="mt-2 block text-left text-[11px] font-bold text-[#607089] hover:text-blue-700 hover:underline xl:text-xs"
                        >
                          Hợp đồng trước: {item.previousContractCode || `#${item.previousContractId}`}
                        </button>
                      )}
                    </td>
                    <td data-label="Phòng" className="align-middle">
                      <span className="inline-flex items-center gap-1 font-extrabold text-[#091426]">
                        <Home className="h-3.5 w-3.5 shrink-0 text-[#9aa3b2] xl:h-4 xl:w-4" />
                        {item.roomCode || "-"}
                      </span>
                    </td>
                    <td data-label="Người ký chính" className="align-middle">
                      <p className="font-extrabold leading-5 text-[#091426]">{item.primaryTenantName || item.customerName || "Chưa có"}</p>
                    </td>
                    <td data-label="Số người" className="align-middle">
                      <span className="inline-flex items-center gap-1 font-extrabold text-[#091426]">
                        <Users className="h-3.5 w-3.5 shrink-0 text-indigo-500 xl:h-4 xl:w-4" />
                        {getOccupantsCount(item)} người
                      </span>
                    </td>
                    <td data-label="Thời hạn" className="align-middle">
                      <p className="font-semibold leading-5 text-[#091426]">{formatDate(item.startDate || item.expectedLeaseSignDate)}</p>
                      <p className="text-[11px] leading-5 text-[#7b8495] xl:text-xs">đến {formatDate(item.endDate || item.expectedMoveInDate)}</p>
                    </td>
                    <td data-label="Giá thuê" className="align-middle">
                      <p className="font-extrabold leading-5 text-[#091426]">{formatMoney(item.monthlyRent)}</p>
                    </td>
                    <td data-label="File" className="align-middle">
                      <FileBadge item={item} />
                    </td>
                    <td data-label="Trạng thái" className="align-middle">
                      <StatusBadge item={item} />
                    </td>
                    <td data-label="Xem" className="text-center align-middle">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectContract(item);
                        }}
                        className="h-9 rounded-lg border border-[#d1d7e0] bg-white px-2 text-xs font-extrabold text-[#091426] shadow-[0_3px_8px_rgba(15,23,42,0.04)] transition hover:bg-[#f8fafc] xl:h-10 xl:px-3 xl:text-sm"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}

              {!loading && filteredContracts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm font-bold text-[#7b8495]">
                    Không có hợp đồng phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mergedSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-3 backdrop-blur-sm xl:p-4">
          <section className="max-h-[92vh] w-full max-w-[1100px] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <header className="relative bg-[#05091d] px-5 py-7 text-white xl:px-7 xl:py-8">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setIsEditingTerms(false);
                  setTermsFieldErrors({});
                  setTermsError("");
                }}
                aria-label="Đóng chi tiết hợp đồng"
                className="absolute right-4 top-4 rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-300 xl:text-xs">Chi tiết hợp đồng</p>
              <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.02em] xl:text-3xl">
                {mergedSelected.displayCode || mergedSelected.contractCode || mergedSelected.depositCode || "Chưa có mã"}
              </h2>
              <div className="mt-4">
                <StatusBadge item={mergedSelected} />
              </div>
            </header>

            <div className="grid gap-4 p-5 xl:gap-5 xl:p-7 lg:grid-cols-2">
              {getWorkflow(mergedSelected) === "EXPIRED" && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 lg:col-span-2">
                  Hợp đồng đã hết hạn. Vui lòng tái ký hoặc thanh lý.
                </div>
              )}
              {getWorkflow(mergedSelected) === "RENEWED" && mergedSelected.renewedContractId && (
                <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Hợp đồng đã được gia hạn sang {mergedSelected.renewedContractCode || `#${mergedSelected.renewedContractId}`}.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const renewed = contracts.find(
                        (item) => String(item.leaseContractId) === String(mergedSelected.renewedContractId),
                      );
                      setSelected(renewed || {
                        leaseContractId: mergedSelected.renewedContractId,
                        contractId: mergedSelected.renewedContractId,
                        contractCode: mergedSelected.renewedContractCode,
                        displayCode: mergedSelected.renewedContractCode,
                      });
                    }}
                    className="h-9 shrink-0 rounded-lg bg-blue-700 px-4 text-xs font-extrabold text-white hover:bg-blue-800"
                  >
                    Xem hợp đồng mới
                  </button>
                </div>
              )}

              <DetailCard title="Thông tin phòng" icon={Home}>
                {isEditingTerms ? (
                  <div className="mt-5 grid grid-cols-2 gap-4 xl:gap-5">
                    <InfoValue label="Cơ sở" value={mergedSelected.propertyName || mergedSelected.property?.name} />
                    <InfoValue label="Phòng" value={mergedSelected.roomCode || mergedSelected.room?.roomCode} />
                    <label className="grid min-w-0 gap-1.5">
                      <span className="text-xs font-bold text-[#58667c]">Giá thuê/tháng *</span>
                      <input
                        type="number"
                        min="1"
                        step="1000"
                        value={termsForm.monthlyRent}
                        onChange={(event) => updateTermsField("monthlyRent", event.target.value)}
                        aria-invalid={Boolean(termsFieldErrors.monthlyRent)}
                        className={`h-10 min-w-0 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${
                          termsFieldErrors.monthlyRent
                            ? "border-red-500 text-red-700 focus:border-red-600"
                            : "border-[#cbd5e1] focus:border-[#091426]"
                        }`}
                      />
                      {termsFieldErrors.monthlyRent && (
                        <span className="text-xs font-semibold leading-4 text-red-600">
                          {termsFieldErrors.monthlyRent}
                        </span>
                      )}
                    </label>
                    <label className="grid min-w-0 gap-1.5">
                      <span className="text-xs font-bold text-[#58667c]">Số tiền đóng mỗi kỳ</span>
                      <input
                        readOnly
                        value={formatMoney(amountPerPeriod)}
                        className="h-10 min-w-0 rounded-lg border border-[#d8e1ef] bg-[#f2f6fc] px-3 text-sm font-extrabold text-[#091426]"
                      />
                    </label>
                    <label className="grid min-w-0 gap-1.5">
                      <span className="text-xs font-bold text-[#58667c]">Tiền cọc *</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={termsForm.depositAmount}
                        onChange={(event) => updateTermsField("depositAmount", event.target.value)}
                        aria-invalid={Boolean(termsFieldErrors.depositAmount)}
                        className={`h-10 min-w-0 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${
                          termsFieldErrors.depositAmount
                            ? "border-red-500 text-red-700 focus:border-red-600"
                            : "border-[#cbd5e1] focus:border-[#091426]"
                        }`}
                      />
                      {termsFieldErrors.depositAmount && (
                        <span className="text-xs font-semibold leading-4 text-red-600">
                          {termsFieldErrors.depositAmount}
                        </span>
                      )}
                    </label>
                    <InfoValue
                      label="Số người"
                      value={`${getOccupantsCount(mergedSelected, details)} người`}
                    />
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-4 xl:gap-5">
                    <InfoValue label="Cơ sở" value={mergedSelected.propertyName || mergedSelected.property?.name} />
                    <InfoValue label="Phòng" value={mergedSelected.roomCode || mergedSelected.room?.roomCode} />
                    <InfoValue label="Giá thuê/tháng" value={formatOptionalMoney(mergedSelected.monthlyRent)} />
                    <InfoValue
                      label="Số tiền đóng mỗi kỳ"
                      value={formatOptionalMoney(getAmountPerPeriod(mergedSelected))}
                    />
                    <InfoValue label="Tiền cọc" value={formatOptionalMoney(mergedSelected.depositAmount)} />
                    <InfoValue
                      label="Số người"
                      value={`${getOccupantsCount(mergedSelected, details)} người`}
                    />
                  </div>
                )}
              </DetailCard>

              <DetailCard
                title="Thông tin hợp đồng"
                icon={CalendarDays}
                action={
                  mergedSelected.leaseContractId &&
                  !["LIQUIDATED", "EXPIRED", "CANCELLED", "RENEWED"].includes(getWorkflow(mergedSelected)) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingTerms) {
                          cancelTermsEditing();
                        } else {
                          setTermsForm(buildTermsForm(mergedSelected));
                          setTermsFieldErrors({});
                          setTermsError("");
                          setIsEditingTerms(true);
                        }
                      }}
                      disabled={isBusy}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-extrabold text-[#091426] hover:bg-[#f8fafc] disabled:opacity-60"
                    >
                      {isEditingTerms ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      {isEditingTerms ? "Hủy" : "Cập nhật"}
                    </button>
                  ) : null
                }
              >
                {isEditingTerms ? (
                  <div className="mt-5">
                    <div className="grid grid-cols-2 gap-3 xl:gap-4">
                      <InfoValue
                        label="Mã hợp đồng"
                        value={mergedSelected.contractCode || mergedSelected.displayCode}
                      />
                      <InfoValue label="Trạng thái" value={getStatusLabel(mergedSelected)} />
                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-bold text-[#58667c]">Ngày bắt đầu *</span>
                        <input
                          type="date"
                          value={termsForm.startDate}
                          onChange={(event) => updateTermsField("startDate", event.target.value)}
                          aria-invalid={Boolean(termsFieldErrors.startDate)}
                          className={`h-10 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${
                            termsFieldErrors.startDate
                              ? "border-red-500 text-red-700 focus:border-red-600"
                              : "border-[#cbd5e1] focus:border-[#091426]"
                          }`}
                        />
                        {termsFieldErrors.startDate && (
                          <span className="text-xs font-semibold leading-4 text-red-600">
                            {termsFieldErrors.startDate}
                          </span>
                        )}
                      </label>
                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-bold text-[#58667c]">Ngày kết thúc *</span>
                        <input
                          type="date"
                          value={termsForm.endDate}
                          min={termsForm.startDate || undefined}
                          onChange={(event) => updateTermsField("endDate", event.target.value)}
                          aria-invalid={Boolean(termsFieldErrors.endDate)}
                          className={`h-10 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${
                            termsFieldErrors.endDate
                              ? "border-red-500 text-red-700 focus:border-red-600"
                              : "border-[#cbd5e1] focus:border-[#091426]"
                          }`}
                        />
                        {termsFieldErrors.endDate && (
                          <span className="text-xs font-semibold leading-4 text-red-600">
                            {termsFieldErrors.endDate}
                          </span>
                        )}
                      </label>
                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-bold text-[#58667c]">Chu kỳ thanh toán *</span>
                        <select
                          value={termsForm.paymentCycleMonths}
                          onChange={(event) => updateTermsField("paymentCycleMonths", event.target.value)}
                          aria-invalid={Boolean(termsFieldErrors.paymentCycleMonths)}
                          className={`h-10 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${
                            termsFieldErrors.paymentCycleMonths
                              ? "border-red-500 text-red-700 focus:border-red-600"
                              : "border-[#cbd5e1] focus:border-[#091426]"
                          }`}
                        >
                          <option value="1">1 tháng/lần</option>
                          <option value="3">3 tháng/lần</option>
                        </select>
                        {termsFieldErrors.paymentCycleMonths && (
                          <span className="text-xs font-semibold leading-4 text-red-600">
                            {termsFieldErrors.paymentCycleMonths}
                          </span>
                        )}
                      </label>
                      <InfoValue label="Ngày bắt đầu tính tiền" value={formatDate(previewRentStartDate)} />
                      <InfoValue
                        label="Hợp đồng trước"
                        value={
                          mergedSelected.previousContractCode ||
                          (mergedSelected.previousContractId ? `#${mergedSelected.previousContractId}` : "Chưa có")
                        }
                      />
                      <InfoValue
                        label="Hợp đồng tái ký"
                        value={
                          mergedSelected.renewedContractCode ||
                          (mergedSelected.renewedContractId ? `#${mergedSelected.renewedContractId}` : "Chưa có")
                        }
                      />
                      <InfoValue
                        label="File hợp đồng"
                        value={mergedSelected.contractFileName || "Chưa có"}
                      />
                    </div>

                    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-800">
                      Ngày bắt đầu tính tiền thực tế: <strong>{formatDate(previewRentStartDate)}</strong>.
                      {termsForm.startDate && new Date(`${termsForm.startDate}T00:00:00`).getDate() > 10
                        ? " Theo quy tắc hiện tại, hợp đồng bắt đầu sau ngày 10 sẽ tính tiền từ ngày 01 tháng kế tiếp."
                        : " Hợp đồng bắt đầu từ ngày 01 đến ngày 10 sẽ tính tiền ngay từ ngày bắt đầu."}
                    </div>

                    {shortThreeMonthCycle && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800">
                        Thời hạn hợp đồng còn dưới 3 tháng nhưng đang chọn chu kỳ 3 tháng/lần. Hệ thống vẫn cho lưu, vui lòng kiểm tra lại lịch thu tiền.
                      </div>
                    )}

                    {termsError && (
                      <div
                        role="alert"
                        className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700"
                      >
                        {termsError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveTerms}
                      disabled={isBusy}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:opacity-60"
                    >
                      {actionLoading === `terms-${mergedSelected.leaseContractId}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Lưu thông tin hợp đồng
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-4 xl:gap-5">
                    <InfoValue
                      label="Mã hợp đồng"
                      value={mergedSelected.contractCode || mergedSelected.displayCode}
                    />
                    <InfoValue label="Trạng thái" value={getStatusLabel(mergedSelected)} />
                    <InfoValue label="Ngày bắt đầu" value={formatDate(mergedSelected.startDate)} />
                    <InfoValue label="Ngày kết thúc" value={formatDate(mergedSelected.endDate)} />
                    <InfoValue label="Ngày bắt đầu tính tiền" value={formatDate(mergedSelected.rentStartDate)} />
                    <InfoValue label="Chu kỳ thanh toán" value={formatCycle(mergedSelected.paymentCycleMonths)} />
                    <InfoValue
                      label="Hợp đồng trước"
                      value={
                        mergedSelected.previousContractCode ||
                        (mergedSelected.previousContractId ? `#${mergedSelected.previousContractId}` : "Chưa có")
                      }
                    />
                    <InfoValue
                      label="Hợp đồng tái ký"
                      value={
                        mergedSelected.renewedContractCode ||
                        (mergedSelected.renewedContractId ? `#${mergedSelected.renewedContractId}` : "Chưa có")
                      }
                    />
                    <InfoValue
                      label="File hợp đồng"
                      value={mergedSelected.contractFileName || "Chưa có"}
                    />
                  </div>
                )}
              </DetailCard>

              <DetailCard title="Người ở trong hợp đồng" icon={Users} className="lg:col-span-2">
                <div className="dashboard-table mt-5 rounded-lg border border-[#dfe5ef] bg-white">
                  <table className="w-full table-auto text-left">
                    <thead className="bg-[#f7f9fe] text-[11px] font-bold uppercase tracking-[0.04em] text-[#6b7280] xl:text-xs">
                      <tr>
                        <th className="min-w-44 px-4 py-3">Họ tên</th>
                        <th className="min-w-32 px-4 py-3">Vai trò</th>
                        <th className="min-w-32 px-4 py-3">SĐT</th>
                        <th className="min-w-36 px-4 py-3">CCCD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf1f6] text-xs xl:text-sm">
                  {detailLoading && (
                    <tr>
                      <td colSpan={4} className="px-4 py-5 text-sm font-bold text-[#607089]">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Đang tải danh sách người ở...
                      </td>
                    </tr>
                  )}
                  {!detailLoading && selectedOccupants.length > 0 ? (
                    selectedOccupants.map((occupant, index) => (
                      <tr
                        key={occupant.tenantProfileId || occupant.id || `${occupant.occupantRole}-${occupant.fullName}-${index}`}
                      >
                        <td data-label="Họ tên" className="px-4 py-3">
                          <p className="truncate font-bold text-[#091426]" title={occupant.fullName || "Chưa cập nhật"}>
                            {occupant.fullName || "Chưa cập nhật"}
                          </p>
                        </td>
                        <td data-label="Vai trò" className="px-4 py-3">
                          <span className="inline-flex max-w-full rounded-full border border-[#d8e1f2] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-bold text-[#34445c] xl:text-xs">
                            <span className="truncate">
                              {ROLE_LABELS[occupant.occupantRole] || occupant.occupantRole || "Chưa rõ"}
                            </span>
                          </span>
                        </td>
                        <td data-label="SĐT" className="break-words px-4 py-3 text-[#4b5563]" title={occupant.phone || "Chưa có"}>
                          {occupant.phone || "Chưa có"}
                        </td>
                        <td data-label="CCCD" className="break-words px-4 py-3 text-[#4b5563]" title={formatIdentityNumber(occupant.citizenId || occupant.identityNumber)}>
                          {formatIdentityNumber(occupant.citizenId || occupant.identityNumber)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    !detailLoading && (
                      <tr>
                        <td colSpan={4} className="px-4 py-5 text-sm font-semibold text-[#607089]">
                          Chưa có danh sách người ở trong hợp đồng.
                        </td>
                      </tr>
                    )
                  )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 xl:gap-5">
                  <InfoValue label="Tổng số người" value={`${getOccupantsCount(mergedSelected, details)} người`} />
                  <InfoValue label="Giá thuê" value={formatMoney(mergedSelected.monthlyRent)} />
                </div>
              </DetailCard>

              {mergedSelected.leaseContractId && (
                <ContractHandoverSection
                  key={mergedSelected.leaseContractId}
                  contractId={mergedSelected.leaseContractId}
                  roomId={mergedSelected.roomId || null}
                  roomCode={mergedSelected.roomCode || mergedSelected.room?.roomCode}
                  readonly={["LIQUIDATED", "RENEWED", "CANCELLED", "AUTO_TERMINATED"].includes(
                    getWorkflow(mergedSelected),
                  )}
                />
              )}

              <DetailCard title="File hợp đồng đã ký" icon={FileCheck2} className="lg:col-span-2">
                <div className="mt-5 rounded-lg bg-white p-4">
                  {mergedSelected.contractFileId ? (
                    <>
                      <p className="break-words font-extrabold text-[#091426]">
                        {mergedSelected.contractFileName || "hop-dong-thue.pdf"}
                      </p>
                      <p className="mt-1 text-sm text-[#607089]">
                        Upload: {formatDate(mergedSelected.contractFileUploadedAt)}
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => openLeaseContractFile(mergedSelected.contractFileId)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold hover:bg-[#f8fafc]"
                        >
                          <Eye className="h-4 w-4" />
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadLeaseContractFile(mergedSelected.contractFileId, mergedSelected.contractFileName)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold hover:bg-[#f8fafc]"
                        >
                          <Download className="h-4 w-4" />
                          Tải
                        </button>
                        <button
                          type="button"
                          onClick={() => openUploadDialog(mergedSelected)}
                          disabled={isBusy}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold hover:bg-[#f8fafc] disabled:opacity-60"
                        >
                          <Upload className="h-4 w-4" />
                          Thay
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-red-300 bg-white p-5 text-center">
                      <Upload className="mx-auto h-8 w-8 text-red-500" />
                      <p className="mt-2 font-extrabold text-[#091426]">
                        Chưa có file hợp đồng cho phòng {mergedSelected.roomCode || "chưa rõ"}
                      </p>
                      <p className="mt-1 text-sm text-[#607089]">
                        Khách: {mergedSelected.primaryTenantName || mergedSelected.customerName || "Chưa có"} - SĐT: {mergedSelected.phone || "Chưa có"}
                      </p>
                      <button
                        type="button"
                        onClick={() => openUploadDialog(mergedSelected)}
                        disabled={isBusy}
                        className="mt-4 rounded-lg bg-[#091426] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:opacity-60"
                      >
                        Upload hợp đồng đã ký
                      </button>
                    </div>
                  )}
                </div>
              </DetailCard>

              <section className="grid gap-3 lg:col-span-2 sm:grid-cols-2">
                {!mergedSelected.leaseContractId && mergedSelected.depositAgreementId && (
                  <button
                    type="button"
                    onClick={() => handleCreateDraft(mergedSelected)}
                    disabled={isBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    Tạo hợp đồng thuê
                  </button>
                )}
                {mergedSelected.leaseContractId && ["DRAFT", "PENDING_SIGNATURE", "MISSING_FILE", "PENDING_ACTIVATION"].includes(getWorkflow(mergedSelected)) && (
                  <button
                    type="button"
                    onClick={() => handleActivate(mergedSelected)}
                    disabled={isBusy || !mergedSelected.contractFileId}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Kích hoạt hợp đồng
                  </button>
                )}
                {getWorkflow(mergedSelected) === "ACTIVE" && (() => {
                  const accountAction =
                    ACCOUNT_PROVISIONING_ACTIONS[
                      details?.accountProvisioningStatus || "NOT_PROVISIONED"
                    ] || ACCOUNT_PROVISIONING_ACTIONS.NOT_PROVISIONED;
                  const isSendingAccount =
                    actionLoading === `send-${mergedSelected.leaseContractId}`;
                  return (
                    <button
                      type="button"
                      onClick={() => handleSendAccount(mergedSelected)}
                      disabled={isBusy || accountAction.disabled}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60 ${accountAction.className}`}
                    >
                      {isSendingAccount ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      {isSendingAccount ? "Đang gửi tài khoản" : accountAction.label}
                    </button>
                  );
                })()}
                {getWorkflow(mergedSelected) === "RENEWED" && (
                  <p className="flex min-h-11 items-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 sm:col-span-2">
                    Hợp đồng đã gia hạn. Tài khoản khách thuê được sử dụng tiếp ở hợp đồng mới.
                  </p>
                )}
                {(details?.canRenew ??
                  ["ACTIVE", "EXPIRING_SOON", "EXPIRED"].includes(getWorkflow(mergedSelected))) && (
                  <button
                    type="button"
                    onClick={openRenewModal}
                    disabled={isBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tái ký / Gia hạn
                  </button>
                )}
                {getWorkflow(mergedSelected) === "EXPIRING_SOON" && (
                  <button
                    type="button"
                    onClick={openIntentionModal}
                    disabled={isBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-extrabold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                  >
                    <Pencil className="h-4 w-4" />
                    Ghi nhận ý định khách
                  </button>
                )}
                {(details?.canLiquidate ??
                  ["ACTIVE", "EXPIRING_SOON", "EXPIRED", "TERMINATION_PENDING"].includes(getWorkflow(mergedSelected))) && (
                  <button
                    type="button"
                    onClick={() => handleLiquidate(mergedSelected)}
                    disabled={isBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Thanh lý hợp đồng
                  </button>
                )}
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-extrabold opacity-60"
                >
                  <Mail className="h-4 w-4" />
                  Nhắc lịch ký hợp đồng
                </button>
              </section>
            </div>
          </section>
        </div>
      )}

      {renewModalOpen && mergedSelected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/70 p-3 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[#dfe5ef] px-5 py-5">
              <div>
                <h2 className="text-xl font-extrabold text-[#091426]">Tái ký / Gia hạn hợp đồng</h2>
                <p className="mt-1 text-sm text-[#607089]">
                  Tạo hợp đồng mới từ {mergedSelected.contractCode}. Hợp đồng cũ không bị sửa đè.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRenewModalOpen(false)}
                className="rounded-lg p-2 text-[#607089] hover:bg-[#f3f6fa]"
                aria-label="Đóng modal tái ký"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              {[
                ["newContractCode", "Mã hợp đồng mới", "text"],
                ["newStartDate", "Ngày bắt đầu mới", "date"],
                ["newEndDate", "Ngày kết thúc mới", "date"],
                ["monthlyRent", "Giá thuê mới", "number"],
                ["depositAmount", "Tiền cọc", "number"],
              ].map(([field, label, type]) => (
                <label key={field} className="grid gap-1.5">
                  <span className="text-sm font-bold text-[#34445c]">{label} *</span>
                  <input
                    type={type}
                    min={type === "number" ? (field === "depositAmount" ? "0" : "1") : undefined}
                    step={type === "number" ? "1000" : undefined}
                    value={renewForm[field]}
                    onChange={(event) => updateRenewField(field, event.target.value)}
                    className={`h-11 rounded-lg border px-3 text-sm font-semibold outline-none ${
                      renewFieldErrors[field] ? "border-red-500" : "border-[#cbd5e1] focus:border-[#091426]"
                    }`}
                  />
                  {renewFieldErrors[field] && (
                    <span className="text-xs font-semibold text-red-600">{renewFieldErrors[field]}</span>
                  )}
                </label>
              ))}

              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-[#34445c]">Chu kỳ thanh toán *</span>
                <select
                  value={renewForm.paymentCycleMonths}
                  onChange={(event) => updateRenewField("paymentCycleMonths", event.target.value)}
                  className={`h-11 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${
                    renewFieldErrors.paymentCycleMonths ? "border-red-500" : "border-[#cbd5e1] focus:border-[#091426]"
                  }`}
                >
                  <option value="1">1 tháng/lần</option>
                  <option value="3">3 tháng/lần</option>
                </select>
                {renewFieldErrors.paymentCycleMonths && (
                  <span className="text-xs font-semibold text-red-600">{renewFieldErrors.paymentCycleMonths}</span>
                )}
              </label>

              <label className="grid gap-1.5 sm:col-span-2">
                <span className="text-sm font-bold text-[#34445c]">Ghi chú</span>
                <textarea
                  rows={3}
                  value={renewForm.note}
                  onChange={(event) => updateRenewField("note", event.target.value)}
                  className="rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm font-semibold outline-none focus:border-[#091426]"
                />
              </label>

              <div className="rounded-xl border border-[#dfe5ef] bg-[#f8fafc] p-4 sm:col-span-2">
                <p className="text-sm font-extrabold text-[#091426]">Occupants giữ nguyên</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selectedOccupants.map((occupant, index) => (
                    <div
                      key={occupant.tenantProfileId || `${occupant.fullName}-${index}`}
                      className="rounded-lg border border-[#dfe5ef] bg-white px-3 py-2"
                    >
                      <p className="font-bold text-[#091426]">{occupant.fullName || "Chưa cập nhật"}</p>
                      <p className="text-xs text-[#607089]">
                        {ROLE_LABELS[occupant.occupantRole] || occupant.occupantRole}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {renewError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 sm:col-span-2">
                  {renewError}
                </div>
              )}
            </div>

            <footer className="flex justify-end gap-3 border-t border-[#dfe5ef] px-5 py-4">
              <button
                type="button"
                onClick={() => setRenewModalOpen(false)}
                className="h-10 rounded-lg border border-[#cbd5e1] px-4 text-sm font-extrabold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRenewContract}
                disabled={isBusy}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {actionLoading === `renew-${mergedSelected.leaseContractId}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Tạo hợp đồng mới
              </button>
            </footer>
          </section>
        </div>
      )}

      {intentionModalOpen && mergedSelected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/70 p-3 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-[#dfe5ef] px-5 py-5">
              <div>
                <h2 className="text-xl font-extrabold text-[#091426]">Ghi nhận ý định khách</h2>
                <p className="mt-1 text-sm text-[#607089]">{mergedSelected.contractCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setIntentionModalOpen(false)}
                className="rounded-lg p-2 text-[#607089] hover:bg-[#f3f6fa]"
                aria-label="Đóng modal ý định khách"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="grid gap-4 px-5 py-5">
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-[#34445c]">Ý định</span>
                <select
                  value={intentionForm.intention}
                  onChange={(event) => setIntentionForm((current) => ({ ...current, intention: event.target.value }))}
                  className="h-11 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold"
                >
                  <option value="RENEW">Tái ký / Gia hạn</option>
                  <option value="MOVE_OUT">Chuyển đi</option>
                  <option value="TRANSFER_ROOM">Chuyển phòng</option>
                  <option value="UNDECIDED">Chưa quyết định</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-[#34445c]">Ngày dự kiến chuyển đi</span>
                <input
                  type="date"
                  value={intentionForm.expectedMoveOutDate}
                  onChange={(event) => setIntentionForm((current) => ({ ...current, expectedMoveOutDate: event.target.value }))}
                  className="h-11 rounded-lg border border-[#cbd5e1] px-3 text-sm font-semibold"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-[#34445c]">Ghi chú</span>
                <textarea
                  rows={3}
                  value={intentionForm.note}
                  onChange={(event) => setIntentionForm((current) => ({ ...current, note: event.target.value }))}
                  className="rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm font-semibold"
                />
              </label>
              {intentionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {intentionError}
                </div>
              )}
            </div>
            <footer className="flex justify-end gap-3 border-t border-[#dfe5ef] px-5 py-4">
              <button
                type="button"
                onClick={() => setIntentionModalOpen(false)}
                className="h-10 rounded-lg border border-[#cbd5e1] px-4 text-sm font-extrabold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRecordIntention}
                disabled={isBusy}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-5 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {actionLoading === `intention-${mergedSelected.leaseContractId}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Lưu ý định
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
