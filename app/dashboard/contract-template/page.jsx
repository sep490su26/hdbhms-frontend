"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileWarning,
  Home,
  Loader2,
  Mail,
  Pencil,
  Printer,
  RefreshCw,
  Save,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";

import {
  activateLeaseContract,
  buildLeaseContractDocumentFilename,
  createDraftLeaseContractFromDeposit,
  downloadLeaseContractSignedFile,
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
import { fetchContractHandover } from "@/services/contractHandoverService";
import ContractActivationFlow from "./ContractActivationFlow";
import ContractHandoverSection from "./ContractHandoverSection";
import ContractPrintWizard from "./ContractPrintWizard";
import ContractWorkflowStepper from "./ContractWorkflowStepper";
import { toast } from "sonner";
import { formatDate as formatDisplayDate, formatDateTime as formatDisplayDateTime } from "@/lib/dateFormat";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";

const STATUS_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "PENDING_SIGNATURE", label: "Chờ ký" },
  { id: "SIGNED", label: "Đã ký" },
  { id: "OVERDUE", label: "Quá hạn" },
];
const HISTORY_FILTER = { id: "history", label: "Lịch sử" };

const TIME_QUARTERS = [
  { id: "Q1", label: "Quý 1", months: [1, 2, 3] },
  { id: "Q2", label: "Quý 2", months: [4, 5, 6] },
  { id: "Q3", label: "Quý 3", months: [7, 8, 9] },
  { id: "Q4", label: "Quý 4", months: [10, 11, 12] },
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
  "LIQUIDATED",
  "RENEWED",
  "CANCELLED",
  "AUTO_TERMINATED",
  "TERMINATION_PENDING",
  "ENDED",
]);

const ACTIVATION_FLOW_WORKFLOWS = new Set([
  "DRAFT",
  "PENDING_SIGNATURE",
  "MISSING_FILE",
  "PENDING_ACTIVATION",
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

const TENANT_INTENTION_OPTIONS = [
  { value: "RENEW", label: "Muốn tái ký / gia hạn" },
  { value: "TRANSFER", label: "Muốn chuyển phòng" },
  { value: "MOVE_OUT", label: "Sẽ chuyển đi / Không tái ký" },
  { value: "UNDECIDED", label: "Chưa có ý định" },
];

const TENANT_INTENTION_LABELS = TENANT_INTENTION_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label;
  return labels;
}, {});

const TENANT_INTENTION_SOURCE_LABELS = {
  TENANT_MOBILE: "Khách tự phản hồi trên mobile",
  MANAGEMENT_WEB: "Quản lý ghi nhận/cập nhật trên web",
};

function formatDate(value) {
  return formatDisplayDate(value, value || "Chưa có");
}

function formatDateTime(value) {
  return formatDisplayDateTime(value, value || "Chưa có");
}

function parseEventData(value) {
  if (!value || typeof value !== "string") return {};
  return value.split(";").reduce((result, part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) return result;
    const key = part.slice(0, separatorIndex).trim();
    const fieldValue = part.slice(separatorIndex + 1).trim();
    if (key) result[key] = fieldValue;
    return result;
  }, {});
}

function getLatestIntentionEvent(details) {
  if (!Array.isArray(details?.events)) return null;
  return [...details.events]
    .filter((event) => event.eventType === "INTENTION_RECORDED")
    .sort((a, b) => {
      const timeDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (timeDiff !== 0) return timeDiff;
      return Number(b.id || 0) - Number(a.id || 0);
    })[0] || null;
}

function buildTenantIntentionInfo(contract, details) {
  const latestEvent = getLatestIntentionEvent(details);
  const eventData = parseEventData(latestEvent?.eventData);
  const rawIntention =
    contract?.tenantIntention ||
    details?.tenantIntention ||
    eventData.intention ||
    "UNDECIDED";
  const intention = rawIntention === "TRANSFER_ROOM" ? "TRANSFER" : rawIntention;
  const source = contract?.intentionSource || details?.intentionSource || eventData.source || "";
  const note = contract?.intentionNote || details?.intentionNote || eventData.note || "";
  return {
    intention,
    label: TENANT_INTENTION_LABELS[intention] || TENANT_INTENTION_LABELS.UNDECIDED,
    expectedVacantDate:
      contract?.expectedVacantDate ||
      details?.expectedVacantDate ||
      eventData.expectedVacantDate ||
      null,
    note,
    sourceLabel: TENANT_INTENTION_SOURCE_LABELS[source] || (source ? source : "Chưa xác định nguồn ghi nhận"),
    recordedAt:
      contract?.intentionRecordedAt ||
      details?.intentionRecordedAt ||
      latestEvent?.createdAt ||
      null,
  };
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

function getNextRenewalContractCode(item = {}) {
  let rootContractCode = String(item.contractCode || item.displayCode || "").trim();
  const renewalSuffixes = [];

  while (/-R(\d+)$/.test(rootContractCode)) {
    renewalSuffixes.unshift(Number(rootContractCode.match(/-R(\d+)$/)?.[1]));
    rootContractCode = rootContractCode.replace(/-R\d+$/, "");
  }

  const lastSuffix = renewalSuffixes.at(-1);
  let renewalNumber = 1;
  if (renewalSuffixes.length === 1 && lastSuffix < 1900) {
    renewalNumber = lastSuffix + 1;
  } else if (renewalSuffixes.length > 0) {
    renewalNumber = renewalSuffixes.length + 1;
  }

  return rootContractCode ? `${rootContractCode}-R${renewalNumber}` : "";
}

function getContractDisplayName(item = {}) {
  if (item.leaseContractId || item.contractId) {
    return buildLeaseContractDocumentFilename(item);
  }
  return item.contractCode || item.displayCode || "Chưa tạo HĐ";
}

function buildRenewForm(item = {}) {
  const newStartDate = addDays(item.endDate, 1);
  return {
    newContractCode: getNextRenewalContractCode(item),
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
  if (item?.leaseContractId && getLeaseSignedFileId(item)) return "PENDING_ACTIVATION";
  if (item?.leaseContractId && !getLeaseSignedFileId(item)) return "MISSING_FILE";
  return "PENDING_SIGNATURE";
}

function getContractType(item = {}) {
  return item?.leaseContractId || item?.contractId ? "lease" : "deposit";
}

function getContractDateValue(item = {}) {
  return (
    item.createdAt ||
    item.created_at ||
    item.startDate ||
    item.expectedLeaseSignDate ||
    item.expectedMoveInDate ||
    item.depositCreatedAt ||
    item.updatedAt ||
    null
  );
}

function getContractTimestamp(item = {}) {
  const timestamp = new Date(getContractDateValue(item) || 0).getTime();
  if (Number.isFinite(timestamp) && timestamp > 0) return timestamp;
  return Number(item.leaseContractId || item.depositAgreementId || item.id || 0);
}

function getContractYear(item = {}) {
  const date = new Date(getContractDateValue(item) || "");
  return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
}

function getContractMonth(item = {}) {
  const date = new Date(getContractDateValue(item) || "");
  return Number.isNaN(date.getTime()) ? "" : String(date.getMonth() + 1);
}

function getContractQuarter(item = {}) {
  const month = Number(getContractMonth(item));
  if (!month) return "";
  return `Q${Math.ceil(month / 3)}`;
}

function getQuarterForTimeFilter(value) {
  if (TIME_QUARTERS.some((quarter) => quarter.id === value)) return value;
  if (String(value || "").startsWith("M")) {
    const month = Number(String(value).slice(1));
    return (
      TIME_QUARTERS.find((quarter) => quarter.months.includes(month))?.id ||
      "Q1"
    );
  }
  return "Q1";
}

function getTimeFilterLabel(value) {
  if (value === "all") return "Cả năm";
  const quarter = TIME_QUARTERS.find((item) => item.id === value);
  if (quarter) return quarter.label;
  if (String(value || "").startsWith("M")) {
    return `Tháng ${String(value).slice(1)}`;
  }
  return "Cả năm";
}

function isOverdueContract(item = {}) {
  const workflow = getWorkflow(item);
  if (workflow === "EXPIRED") return true;
  if (HISTORY_CONTRACT_WORKFLOWS.has(workflow)) return false;
  if (!item.endDate) return false;
  const end = new Date(`${toDateInputValue(item.endDate)}T23:59:59`);
  return !Number.isNaN(end.getTime()) && end < new Date();
}

function isRoomTransferManagedContract(item) {
  return Boolean(item?.transferRequestId);
}

function getLeaseSignedFileId(item = {}) {
  return (
    item?.signedFileId ??
    item?.signed_file_id ??
    item?.signedFile?.id ??
    item?.signed_file?.id ??
    null
  );
}

function needsActivationFlow(item) {
  if (!item) return false;
  if (isRoomTransferManagedContract(item)) return false;
  if (!item.leaseContractId && item.depositAgreementId) return true;
  return Boolean(item.leaseContractId && ACTIVATION_FLOW_WORKFLOWS.has(getWorkflow(item)));
}

function getTransferContractNotice(item) {
  if (!isRoomTransferManagedContract(item)) return null;
  const requestedDate = formatDate(item.transferRequestedDate);
  const code = item.transferRequestCode || `#${item.transferRequestId}`;
  if (item.transferStatus === "WAITING_TRANSFER_DATE") {
    return `Hợp đồng này được tạo từ yêu cầu chuyển phòng ${code}. Ngày dự kiến chuyển là ${requestedDate}; bàn giao/kích hoạt vẫn phải xử lý trong chi tiết yêu cầu chuyển phòng.`;
  }
  if (["READY_FOR_HANDOVER", "WAITING_EXECUTION"].includes(item.transferStatus)) {
    return `Đã tới bước vận hành của yêu cầu chuyển phòng ${code}. Hãy thực hiện bàn giao/kích hoạt trong chi tiết yêu cầu chuyển phòng.`;
  }
  if (item.transferStatus === "EXECUTED") {
    return `Hợp đồng này đã được xử lý qua yêu cầu chuyển phòng ${code}.`;
  }
  return `Hợp đồng này thuộc yêu cầu chuyển phòng ${code}; việc ký, bàn giao và kích hoạt phải đi theo luồng chuyển phòng.`;
}

function unwrapHandoverResponse(response) {
  return response?.data || response || null;
}

function hasHandoverReadings(handover) {
  return Boolean(handover?.electricity && handover?.water);
}

function hasSignedHandoverDocument(handover) {
  return Boolean(handover?.signedDocumentId || handover?.signed_document_id);
}

function matchesStatusFilter(item, statusFilter) {
  const workflow = getWorkflow(item);
  if (statusFilter === "all") return true;
  if (statusFilter === "current") return CURRENT_CONTRACT_WORKFLOWS.has(workflow);
  if (statusFilter === "history") return HISTORY_CONTRACT_WORKFLOWS.has(workflow);
  if (statusFilter === "PENDING" || statusFilter === "PENDING_SIGNATURE") {
    return ["PENDING_SIGNATURE", "MISSING_FILE", "PENDING_ACTIVATION"].includes(workflow);
  }
  if (statusFilter === "SIGNED") {
    return (
      Boolean(getLeaseSignedFileId(item)) ||
      ["ACTIVE", "EXPIRING_SOON", "PENDING_ACTIVATION"].includes(workflow)
    );
  }
  if (statusFilter === "OVERDUE") return isOverdueContract(item);
  return workflow === statusFilter || item.status === statusFilter || item.contractStatus === statusFilter;
}

function getStatusLabel(item) {
  const workflow = getWorkflow(item);
  return WORKFLOW_LABELS[workflow] || STATUS_LABELS[item?.status] || "Chờ xử lý";
}

function FileBadge({ item }) {
  const uploaded = Boolean(getLeaseSignedFileId(item));
  const Icon = uploaded ? FileCheck2 : FileWarning;
  return (
    <span
      className={`inline-flex max-w-full items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-center text-[11px] font-bold leading-tight xl:px-3 xl:py-2 xl:text-xs ${uploaded
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
    ACTIVE:
      "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    EXPIRING_SOON:
      "border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300",
    PENDING_ACTIVATION:
      "border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    MISSING_FILE:
      "border-red-200 dark:border-rose-500/20 bg-red-50 dark:bg-rose-500/10 text-red-700 dark:text-rose-300",
    PENDING_SIGNATURE:
      "border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300",
    LIQUIDATED: "border-slate-200 bg-slate-50 text-slate-600",
    EXPIRED: "border-slate-200 bg-slate-50 text-slate-600",
    RENEWED:
      "border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    CANCELLED: "border-slate-200 bg-slate-50 text-slate-500",
    TERMINATION_PENDING:
      "border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300",
  };
  const Icon = workflow === "ACTIVE" ? CheckCircle2 : workflow === "PENDING_ACTIVATION" ? RefreshCw : AlertTriangle;

  return (
    <span
      className={`inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-center text-[11px] font-bold leading-tight xl:px-3 xl:py-2 xl:text-xs ${classes[workflow] || "border-slate-200 bg-slate-50 text-slate-600"
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
        <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white xl:text-xl">
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
  const searchParams = useSearchParams();
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
  const [fileFilter, setFileFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const [timePanelQuarter, setTimePanelQuarter] = useState("Q1");
  const [roomFilter, setRoomFilter] = useState("all");
  const [contractTypeFilter, setContractTypeFilter] = useState("all");
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
  const [printWizard, setPrintWizard] = useState(null);
  const [handoverRefreshKey, setHandoverRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupStep, setCleanupStep] = useState(1);
  const selectedYear = searchParams.get("year") || "all";

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLeaseContractManagementList({ page: page - 1, size });
      const visibleContracts = data.items.filter((item) => !isRoomTransferManagedContract(item));
      setContracts(visibleContracts);
      setSelected((current) => (isRoomTransferManagedContract(current) ? null : current));
      setDetails((current) => (isRoomTransferManagedContract(current) ? null : current));
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
      return visibleContracts;
    } catch (err) {
      setError(err?.message || "Không tải được danh sách hợp đồng thuê.");
    } finally {
      setLoading(false);
    }
    return [];
  }, [page, size]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadContracts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadContracts]);

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
        if (isOverdueContract(item)) acc.overdue += 1;
        if (!getLeaseSignedFileId(item)) acc.missingFile += 1;
        return acc;
      },
      { total: 0, pendingSignature: 0, pendingActivation: 0, active: 0, missingFile: 0 },
    );
  }, [contracts]);

  const roomOptions = useMemo(() => {
    return [
      ...new Set(contracts.map((item) => item.roomCode).filter(Boolean)),
    ].sort((a, b) => String(a).localeCompare(String(b), "vi"));
  }, [contracts]);

  const activeTimeLabel = useMemo(
    () => getTimeFilterLabel(timeFilter),
    [timeFilter],
  );

  const visibleTimeQuarter = useMemo(() => {
    return (
      TIME_QUARTERS.find((quarter) => quarter.id === timePanelQuarter) ||
      TIME_QUARTERS[0]
    );
  }, [timePanelQuarter]);

  const filteredContracts = useMemo(() => {
    return contracts
      .filter((item) => {
        const matchesStatus = matchesStatusFilter(item, statusFilter);
        const matchesYear =
          selectedYear === "all" || getContractYear(item) === selectedYear;
        const contractMonth = getContractMonth(item);
        const contractQuarter = getContractQuarter(item);
        const matchesTime =
          timeFilter === "all" ||
          contractQuarter === timeFilter ||
          `M${contractMonth}` === timeFilter;
        const matchesRoom =
          roomFilter === "all" || item.roomCode === roomFilter;
        const matchesContractType =
          contractTypeFilter === "all" ||
          getContractType(item) === contractTypeFilter;
        const normalizedKeyword = normalizeKeyword(keyword);
        const matchesKeyword =
          !normalizedKeyword ||
          [
            getContractDisplayName(item),
            item.contractCode,
            item.displayCode,
            item.depositCode,
            item.roomCode,
            item.primaryTenantName,
            item.customerName,
          ]
            .map(normalizeKeyword)
            .some((value) => value.includes(normalizedKeyword));
        const hasFile = Boolean(getLeaseSignedFileId(item));
        const matchesFile =
          fileFilter === "all" ||
          (fileFilter === "uploaded" && hasFile) ||
          (fileFilter === "missing" && !hasFile);

        return (
          matchesStatus &&
          matchesYear &&
          matchesTime &&
          matchesRoom &&
          matchesContractType &&
          matchesKeyword &&
          matchesFile
        );
      })
      .sort((a, b) => getContractTimestamp(b) - getContractTimestamp(a));
  }, [
    contractTypeFilter,
    contracts,
    fileFilter,
    keyword,
    roomFilter,
    selectedYear,
    statusFilter,
    timeFilter,
  ]);

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
      signedFileId: details.signedFile?.id || details.signedFileId || selected.signedFileId,
      signedFileName: details.signedFile?.fileName || details.signedFileName || selected.signedFileName,
      signedFileUploadedAt: details.signedFile?.uploadedAt || details.signedFileUploadedAt || selected.signedFileUploadedAt,
      propertyName: details.property?.name || selected.propertyName,
      tenantId: details.tenantId || selected.tenantId || null,
      roomCode: details.room?.roomCode || selected.roomCode,
      roomId: details.room?.id || selected.roomId || null,
      monthlyRent: details.monthlyRent ?? selected.monthlyRent,
      depositAmount: details.depositAmount ?? selected.depositAmount,
      paymentCycleMonths: details.paymentCycleMonths ?? selected.paymentCycleMonths,
      startDate: details.startDate ?? selected.startDate,
      endDate: details.endDate ?? selected.endDate,
      rentStartDate: details.rentStartDate ?? selected.rentStartDate,
      status: details.status ?? selected.status,
      tenantIntention: details.tenantIntention ?? selected.tenantIntention ?? null,
      expectedVacantDate: details.expectedVacantDate ?? selected.expectedVacantDate ?? null,
      transferRequestId: details.transferRequestId ?? selected.transferRequestId ?? null,
      transferRequestCode: details.transferRequestCode ?? selected.transferRequestCode ?? null,
      transferStatus: details.transferStatus ?? selected.transferStatus ?? null,
      transferRequestedDate: details.transferRequestedDate ?? selected.transferRequestedDate ?? null,
      transferContractRole: details.transferContractRole ?? selected.transferContractRole ?? null,
      transferActivationLocked: details.transferActivationLocked ?? selected.transferActivationLocked ?? false,
      intentionRecordedAt: details.intentionRecordedAt ?? selected.intentionRecordedAt ?? null,
      intentionNote: details.intentionNote ?? selected.intentionNote ?? null,
      intentionSource: details.intentionSource ?? selected.intentionSource ?? null,
    };
  }, [details, selected]);

  const selectedLeaseContractFilename = useMemo(() => {
    if (!mergedSelected?.leaseContractId && !mergedSelected?.contractId) return "";
    return buildLeaseContractDocumentFilename(mergedSelected);
  }, [mergedSelected]);

  const selectedOccupants = useMemo(() => {
    if (Array.isArray(details?.occupants) && details.occupants.length > 0) return details.occupants;
    if (Array.isArray(selected?.occupants) && selected.occupants.length > 0) return selected.occupants;
    return [];
  }, [details, selected]);

  const tenantIntentionInfo = useMemo(
    () => buildTenantIntentionInfo(mergedSelected, details),
    [details, mergedSelected],
  );

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

  async function openPrintWizard(item) {
    let targetContractId = item?.leaseContractId;

    if (!targetContractId) {
      if (item?.depositAgreementId) {
        setActionLoading(`draft-${item.depositAgreementId}`);
        setError("");
        try {
          await createDraftLeaseContractFromDeposit(item.depositAgreementId);
          const refreshedContracts = await loadContracts();
          const updatedItem = refreshedContracts.find(
            (c) => String(c.depositAgreementId) === String(item.depositAgreementId) && c.leaseContractId
          );
          if (updatedItem && updatedItem.leaseContractId) {
            targetContractId = updatedItem.leaseContractId;
          } else {
            throw new Error("Không lấy được mã hợp đồng sau khi tạo.");
          }
        } catch (err) {
          setError(err?.message || "Không tự động tạo được hợp đồng thuê từ cọc để in.");
          setActionLoading("");
          return;
        }
      } else {
        setError("Vui lòng tạo hợp đồng thuê trước khi in.");
        return;
      }
    }

    setActionLoading(`print-${targetContractId}`);
    setError("");
    try {
      const contractDetails =
        details && String(details.contractId) === String(targetContractId)
          ? details
          : await fetchManagementLeaseContractDetails(targetContractId);
      setPrintWizard({
        contract: { ...item, leaseContractId: targetContractId, ...contractDetails },
        details: contractDetails,
      });
    } catch (err) {
      setError(err?.message || "Không tải được dữ liệu để in hợp đồng.");
    } finally {
      setActionLoading("");
    }
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
      const draft = await createDraftLeaseContractFromDeposit(item.depositAgreementId);
      const items = await loadContracts();
      const created = items.find((contract) =>
        String(contract.depositAgreementId) === String(item.depositAgreementId) ||
        String(contract.leaseContractId) === String(draft?.leaseContractId),
      );
      const nextSelected = created || draft;
      if (nextSelected?.leaseContractId) {
        setSelected(nextSelected);
        const refreshedDetails = await fetchManagementLeaseContractDetails(nextSelected.leaseContractId);
        setDetails(refreshedDetails);
      }
      return nextSelected;
    } catch (err) {
      setError(err?.message || "Không tạo được hợp đồng thuê từ cọc.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleContractUpdated() {
    if (!mergedSelected?.leaseContractId) return;
    try {
      const refreshedDetails = await fetchManagementLeaseContractDetails(mergedSelected.leaseContractId);
      setDetails(refreshedDetails);
      const items = await loadContracts();
      const updatedContract = items.find(i => String(i.leaseContractId) === String(mergedSelected.leaseContractId));
      if (updatedContract) {
        setSelected(updatedContract);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleHandoverSaved() {
    setHandoverRefreshKey((v) => v + 1);
    handleContractUpdated();
  }

  async function handleActivate(item) {
    if (!item?.leaseContractId) return;

    if (isRoomTransferManagedContract(item)) {
      window.alert("Hợp đồng này thuộc yêu cầu chuyển phòng. Vui lòng thực hiện bàn giao/kích hoạt trong chi tiết yêu cầu chuyển phòng.");
      return;
    }

    if (!getLeaseSignedFileId(item)) {
      window.alert("Vui lòng upload file hợp đồng đã ký trước khi kích hoạt.");
      return;
    }

    setActionLoading(`activate-${item.leaseContractId}`);
    setError("");
    try {
      try {
        const handoverData = unwrapHandoverResponse(await fetchContractHandover(item.leaseContractId, "MOVE_IN"));
        if (!hasHandoverReadings(handoverData) || !hasSignedHandoverDocument(handoverData)) {
          throw new Error("Missing handover data");
        }
      } catch (err) {
        window.alert("Vui lòng nhập chỉ số điện nước và hoàn thành bàn giao phòng với khách trước khi kích hoạt hợp đồng.");
        setActionLoading("");
        return;
      }

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

      // Auto-send account credentials after activation
      try {
        const provResult = await sendTenantAccountCredentials(item.leaseContractId, { retry: false });
        const provDetails = await fetchManagementLeaseContractDetails(item.leaseContractId);
        setDetails(provDetails);
        setActionMessage(provResult?.message || "Đã kích hoạt và cấp tài khoản thành công.");
        toast.success(provResult?.message || "Đã kích hoạt và cấp tài khoản thành công.");
      } catch (provErr) {
        // Account send failed — activation succeeded. Stepper will show retry button.
        toast.warning(provErr?.message || "Kích hoạt thành công nhưng chưa gửi được tài khoản.");
      }
    } catch (err) {
      setError(err?.message || "Không kích hoạt được hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleRetrySendAccount(item) {
    if (!item?.leaseContractId) return;
    const confirmed = window.confirm(
      "Lần gửi trước thất bại. Bạn có chắc muốn thử gửi lại cho các người thuê chưa được cấp tài khoản?",
    );
    if (!confirmed) return;

    setActionLoading(`send-${item.leaseContractId}`);
    setError("");
    setActionMessage("");
    try {
      const result = await sendTenantAccountCredentials(item.leaseContractId, { retry: true });
      const refreshedDetails = await fetchManagementLeaseContractDetails(item.leaseContractId);
      setDetails(refreshedDetails);
      setActionMessage(result?.message || "Đã cập nhật trạng thái cấp tài khoản.");
      toast.success(result?.message || "Đã gửi tài khoản thành công.");
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
    const currentIntention = tenantIntentionInfo?.intention || "UNDECIDED";
    setIntentionForm({
      intention: currentIntention,
      expectedMoveOutDate: ["MOVE_OUT", "TRANSFER"].includes(currentIntention)
        ? toDateInputValue(tenantIntentionInfo?.expectedVacantDate)
        : "",
      note: tenantIntentionInfo?.note || "",
    });
    setIntentionError("");
    setIntentionModalOpen(true);
  }

  async function handleRecordIntention() {
    if (!mergedSelected?.leaseContractId) return;
    setActionLoading(`intention-${mergedSelected.leaseContractId}`);
    setIntentionError("");
    try {
      const requiresMoveOutDate = ["MOVE_OUT", "TRANSFER"].includes(intentionForm.intention);
      await recordLeaseContractTenantIntention(mergedSelected.leaseContractId, {
        ...intentionForm,
        expectedMoveOutDate: requiresMoveOutDate ? intentionForm.expectedMoveOutDate : "",
      });
      const refreshedDetails = await fetchManagementLeaseContractDetails(mergedSelected.leaseContractId);
      setDetails(refreshedDetails);
      await loadContracts();
      setIntentionModalOpen(false);
    } catch (err) {
      setIntentionError(err?.details || err?.message || "Không thể ghi nhận ý định khách.");
    } finally {
      setActionLoading("");
    }
  }

  function openTimePopover() {
    setTimePanelQuarter(getQuarterForTimeFilter(timeFilter));
    setTimePopoverOpen((current) => !current);
  }

  function selectTimeFilter(value) {
    setTimeFilter(value);
    setTimePanelQuarter(getQuarterForTimeFilter(value));
    setTimePopoverOpen(false);
  }

  function handleExportExcel() {
    const exportScope = [
      selectedYear === "all" ? "tat-ca-nam" : `nam-${selectedYear}`,
      timeFilter === "all" ? "tat-ca-thoi-gian" : timeFilter.toLowerCase(),
      roomFilter === "all" ? "tat-ca-phong" : `phong-${roomFilter}`,
      contractTypeFilter === "all"
        ? "tat-ca-loai"
        : contractTypeFilter === "lease"
          ? "hop-dong-thue"
          : "hop-dong-coc",
    ].join("-");
    const header = [
      "Ma HD",
      "Loai HD",
      "Phong",
      "Nguoi ky chinh",
      "So nguoi",
      "Ngay bat dau",
      "Ngay ket thuc",
      "Gia thue",
      "Trang thai",
    ];
    const rows = filteredContracts.map((item) => [
      getContractDisplayName(item),
      getContractType(item) === "lease" ? "Thue" : "Coc",
      item.roomCode || "",
      item.primaryTenantName || item.customerName || "",
      getOccupantsCount(item),
      formatDate(item.startDate || item.expectedLeaseSignDate),
      formatDate(item.endDate || item.expectedMoveInDate),
      formatMoney(item.monthlyRent),
      getStatusLabel(item),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `danh-sach-hop-dong-${exportScope}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openCleanupModal() {
    setCleanupStep(1);
    setCleanupModalOpen(true);
  }

  function closeCleanupModal() {
    setCleanupModalOpen(false);
    setCleanupStep(1);
  }

  function confirmCleanupPreview() {
    setCleanupStep(2);
  }

  function confirmCleanupFinal() {
    setCleanupModalOpen(false);
    setCleanupStep(1);
    toast.success(
      "Đã xác nhận yêu cầu dọn dữ liệu cũ. Backend sẽ xử lý khi endpoint được kết nối.",
    );
  }

  const isBusy = Boolean(actionLoading);
  const stepperVisible = mergedSelected && !isRoomTransferManagedContract(mergedSelected) && (
    ["DRAFT", "PENDING_SIGNATURE", "MISSING_FILE", "PENDING_ACTIVATION"].includes(getWorkflow(mergedSelected)) ||
    (getWorkflow(mergedSelected) === "ACTIVE" && !["SENT", "ACTIVE"].includes(details?.accountProvisioningStatus))
  );

  return (
    <div className="w-full min-w-0 flex flex-col gap-6 text-[#091426] text-[13px] xl:text-sm">
      <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileSelected} />

      <DashboardPageHeader
        title={`Quản lý hợp đồng thuê ${selectedYear === "all" ? "Tất cả năm" : `năm ${selectedYear}`}`}
        description="Dữ liệu lấy từ backend, quản lý file scan/PDF và trạng thái vòng đời hợp đồng thuê."
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 xl:gap-4">
        <StatCard label="Tổng" value={summary.total} tone="dark" />
        <StatCard label="Chờ ký" value={summary.pendingSignature} tone="amber" />
        <StatCard label="Chờ kích hoạt" value={summary.pendingActivation} tone="blue" />
        <StatCard label="Đang hiệu lực" value={summary.active} tone="green" />
        <StatCard label="Chưa có file" value={summary.missingFile} tone="red" />
      </section>

      <section className="rounded-xl border border-[#dfe5ef] bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] xl:p-5">
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-extrabold text-white transition hover:bg-[#16253a] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`h-9 shrink-0 rounded-full border px-4 text-xs font-extrabold transition ${statusFilter === filter.id
                  ? "border-[#091426] bg-[#091426] text-white"
                  : "border-[#d7deea] bg-white text-[#56647a] hover:border-[#9ba8ba] hover:text-[#091426]"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end lg:w-[130px] lg:shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter(HISTORY_FILTER.id)}
              className="h-11 shrink-0 rounded-lg bg-[#091426] px-5 text-sm font-extrabold text-white transition hover:bg-[#16253a]"
            >
              {HISTORY_FILTER.label}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-rose-500/20 bg-red-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
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
            <thead className="bg-[#f7f9fe] dark:bg-white/5 text-[10px] font-extrabold uppercase tracking-[0.03em] text-slate-500 dark:text-slate-400 xl:text-xs">
              <tr>
                <th className="min-w-32">Mã HĐ</th>
                {/* <th className="min-w-24">Loại HĐ</th> */}
                <th className="min-w-20">Phòng</th>
                <th className="min-w-40">Người ký chính</th>
                {/* <th className="min-w-24">Số người</th> */}
                <th className="min-w-36">Thời hạn</th>
                <th className="min-w-32">Giá thuê</th>
                <th className="min-w-28">File</th>
                <th className="min-w-32">Trạng thái</th>
                {/* <th className="min-w-20 text-center">Xem</th> */}
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
                    className="bg-white dark:bg-[#0f172a] transition hover:bg-[#f8fbff] dark:hover:bg-white/5"
                  >
                    <td data-label="Mã HĐ" className="align-middle">
                      <p className="font-extrabold leading-5 text-slate-900 dark:text-white">
                        {getContractDisplayName(item)}
                      </p>
                      {!item.leaseContractId && item.depositCode && (
                        <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 xl:text-xs">
                          Mã cọc: {item.depositCode}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-[#7b8495] xl:text-xs">{item.propertyName || "Chưa có cơ sở"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {getWorkflow(item) === "RENEWED" && (
                          <span className="rounded-full border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:text-blue-300">
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
                          className="mt-2 block text-left text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline xl:text-xs"
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
                          className="mt-2 block text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline xl:text-xs"
                        >
                          Hợp đồng trước: {item.previousContractCode || `#${item.previousContractId}`}
                        </button>
                      )}
                    </td>
                    <td data-label="Loại HĐ" className="align-middle">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-extrabold ${
                          getContractType(item) === "lease"
                            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                            : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
                        }`}
                      >
                        {getContractType(item) === "lease" ? "Thuê" : "Cọc"}
                      </span>
                    </td>
                    <td data-label="Phòng" className="align-middle">
                      <span className="inline-flex items-center gap-1 font-extrabold text-slate-900 dark:text-white">
                        <Home className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500 xl:h-4 xl:w-4" />
                        {item.roomCode || "-"}
                      </span>
                    </td>
                    <td data-label="Người ký chính" className="align-middle">
                      <p className="font-extrabold leading-5 text-[#091426]">{item.primaryTenantName || item.customerName || "Chưa có"}</p>
                    </td>
                    <td data-label="Số người" className="align-middle">
                      <span className="inline-flex items-center gap-1 font-extrabold text-slate-900 dark:text-white">
                        <Users className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-blue-300 xl:h-4 xl:w-4" />
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
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectContract(item);
                          }}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#d1d7e0] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-xs font-extrabold text-slate-900 dark:text-white shadow-[0_3px_8px_rgba(15,23,42,0.04)] transition hover:bg-[#f8fafc] dark:hover:bg-white/5 xl:h-10 xl:text-sm"
                        >
                          {needsActivationFlow(item) ? (
                            <FileCheck2 className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          {needsActivationFlow(item) ? "Kích hoạt hợp đồng" : "Xem hợp đồng"}
                        </button>
                      </div>
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

      {cleanupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-4 backdrop-blur-sm"
          onClick={closeCleanupModal}
        >
          <section
            className="w-full max-w-[520px] rounded-xl bg-white p-6 shadow-2xl dark:bg-[#0f172a]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Xác nhận dọn dữ liệu định kỳ
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {cleanupStep === 1
                    ? "Thao tác này dành cho dữ liệu hợp đồng cũ hơn 2 năm. Vui lòng xác nhận trước khi chuyển sang bước kiểm tra cuối."
                    : "Bước cuối: bạn chắc chắn muốn gửi yêu cầu xóa dữ liệu cũ? Sau khi backend xử lý, dữ liệu đã xóa sẽ không thể khôi phục."}
                </p>
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
              Bước {cleanupStep}/2 · Chỉ áp dụng cho dữ liệu cũ hơn 2 năm.
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCleanupModal}
                className="h-10 rounded-lg border border-[#d1d7e0] bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-[#f8fafc] dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:hover:bg-white/5"
              >
                Không
              </button>
              {cleanupStep === 1 ? (
                <button
                  type="button"
                  onClick={confirmCleanupPreview}
                  className="h-10 rounded-lg bg-orange-600 px-4 text-sm font-extrabold text-white transition hover:bg-orange-700"
                >
                  Có, tiếp tục
                </button>
              ) : (
                <button
                  type="button"
                  onClick={confirmCleanupFinal}
                  className="h-10 rounded-lg bg-red-600 px-4 text-sm font-extrabold text-white transition hover:bg-red-700"
                >
                  Tôi chắc chắn muốn xóa
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {mergedSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-3 backdrop-blur-sm xl:p-4" onClick={() => { setSelected(null); setIsEditingTerms(false); setTermsFieldErrors({}); setTermsError(""); }}>
          <section className="max-h-[92vh] w-full max-w-[1100px] overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
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
                {getContractDisplayName(mergedSelected)}
              </h2>
              {!mergedSelected.leaseContractId && mergedSelected.depositCode && (
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  Mã cọc: {mergedSelected.depositCode}
                </p>
              )}
              <div className="mt-4">
                <StatusBadge item={mergedSelected} />
              </div>
            </header>

            <div className="grid gap-4 px-5 xl:gap-5 xl:px-7 lg:grid-cols-2">
              {getTransferContractNotice(mergedSelected) && (
                <div className="lg:col-span-2 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-extrabold">Hợp đồng thuộc luồng chuyển phòng</p>
                    <p className="mt-1">{getTransferContractNotice(mergedSelected)}</p>
                  </div>
                </div>
              )}
              {needsActivationFlow(mergedSelected) ? (
                <ContractActivationFlow
                  contract={mergedSelected}
                  details={details}
                  actionLoading={actionLoading}
                  handoverRefreshKey={handoverRefreshKey}
                  onCreateDraft={handleCreateDraft}
                  onContractUpdated={handleContractUpdated}
                  onHandoverSaved={handleHandoverSaved}
                  onActivate={() => handleActivate(mergedSelected)}
                />
              ) : (
                <>
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
                        className={`h-10 min-w-0 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${termsFieldErrors.monthlyRent
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
                        className={`h-10 min-w-0 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${termsFieldErrors.depositAmount
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
                        value={getContractDisplayName(mergedSelected)}
                      />
                      <InfoValue label="Trạng thái" value={getStatusLabel(mergedSelected)} />
                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-xs font-bold text-[#58667c]">Ngày bắt đầu *</span>
                        <input
                          type="date"
                          value={termsForm.startDate}
                          onChange={(event) => updateTermsField("startDate", event.target.value)}
                          aria-invalid={Boolean(termsFieldErrors.startDate)}
                          className={`h-10 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${termsFieldErrors.startDate
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
                          className={`h-10 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${termsFieldErrors.endDate
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
                          className={`h-10 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${termsFieldErrors.paymentCycleMonths
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
                        value={getLeaseSignedFileId(mergedSelected) ? selectedLeaseContractFilename : "Chưa có"}
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
                      value={getContractDisplayName(mergedSelected)}
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
                      value={getLeaseSignedFileId(mergedSelected) ? selectedLeaseContractFilename : "Chưa có"}
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

              {mergedSelected.leaseContractId && !isRoomTransferManagedContract(mergedSelected) && (
                <ContractHandoverSection
                  key={mergedSelected.leaseContractId}
                  contractId={mergedSelected.leaseContractId}
                  tenantId={mergedSelected.tenantId || null}
                  roomId={mergedSelected.roomId || null}
                  roomCode={mergedSelected.roomCode || mergedSelected.room?.roomCode}
                  readonly={["LIQUIDATED", "RENEWED", "CANCELLED", "AUTO_TERMINATED"].includes(
                    getWorkflow(mergedSelected),
                  )}
                  onSaved={handleHandoverSaved}
                />
              )}

              {mergedSelected.leaseContractId && stepperVisible && (
                <div className="lg:col-span-2">
                  <ContractWorkflowStepper
                    contractDetails={mergedSelected}
                    onContractUpdated={handleContractUpdated}
                    onActivate={() => handleActivate(mergedSelected)}
                    isActivating={actionLoading === `activate-${mergedSelected.leaseContractId}`}
                  />
                </div>
              )}

              {mergedSelected.leaseContractId && !stepperVisible && (
                <DetailCard title="File hợp đồng đã ký" icon={FileCheck2} className="lg:col-span-2">
                <div className="mt-5 rounded-lg bg-white p-4">
                  {getLeaseSignedFileId(mergedSelected) ? (
                    <>
                      <p className="break-words font-extrabold text-[#091426]">
                        {selectedLeaseContractFilename}
                      </p>
                      <p className="mt-1 text-sm text-[#607089]">
                        Upload: {formatDate(mergedSelected.signedFileUploadedAt)}
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => openLeaseContractFile(getLeaseSignedFileId(mergedSelected))}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold hover:bg-[#f8fafc]"
                        >
                          <Eye className="h-4 w-4" />
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadLeaseContractSignedFile(mergedSelected.leaseContractId, selectedLeaseContractFilename)}
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
              )}
              {mergedSelected.leaseContractId && (
                <DetailCard title="Nguyện vọng khách thuê" icon={FileWarning} className="lg:col-span-2">
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoValue label="Trạng thái" value={tenantIntentionInfo.label} />
                    <InfoValue
                      label="Ngày dự kiến trả phòng"
                      value={formatDate(tenantIntentionInfo.expectedVacantDate)}
                    />
                    <InfoValue label="Nguồn ghi nhận" value={tenantIntentionInfo.sourceLabel} />
                    <InfoValue label="Cập nhật lần cuối" value={formatDateTime(tenantIntentionInfo.recordedAt)} />
                  </div>
                  <div className="mt-4 rounded-xl border border-[#dfe5ef] bg-[#f8fafc] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#718096]">Lý do / ghi chú</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#091426]">
                      {tenantIntentionInfo.note || "Chưa có ghi chú"}
                    </p>
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-5 text-[#607089]">
                    Dữ liệu này được đọc trực tiếp từ backend. Nút bên dưới chỉ dùng khi quản lý ghi nhận thay khách hoặc cập nhật lại sau khi trao đổi trực tiếp.
                  </p>
                </DetailCard>
              )}

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
                {details?.canRenew === false &&
                  ["ACTIVE", "EXPIRING_SOON", "EXPIRED"].includes(getWorkflow(mergedSelected)) &&
                  details?.canRenewBlockedReason && (
                    <p className="flex min-h-11 items-center rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 sm:col-span-2">
                      {details.canRenewBlockedReason}
                    </p>
                  )}
                {getWorkflow(mergedSelected) === "EXPIRING_SOON" && (
                  <button
                    type="button"
                    onClick={openIntentionModal}
                    disabled={isBusy}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-extrabold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                  >
                    <Pencil className="h-4 w-4" />
                    Ghi nhận / Cập nhật ý định khách
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
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {printWizard && (
        <ContractPrintWizard
          contract={printWizard.contract}
          details={printWizard.details}
          occupants={printWizard.details?.occupants || printWizard.contract?.occupants || []}
          onClose={() => setPrintWizard(null)}
        />
      )}

      {renewModalOpen && mergedSelected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/70 p-3 backdrop-blur-sm" onClick={() => setRenewModalOpen(false)}>
          <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
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
                className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-[#f3f6fa] dark:hover:bg-white/5"
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
                    readOnly={field === "newContractCode"}
                    onChange={(event) => updateRenewField(field, event.target.value)}
                    className={`h-11 rounded-lg border px-3 text-sm font-semibold outline-none ${field === "newContractCode" ? "bg-slate-100 text-slate-600 " : ""
                      }${renewFieldErrors[field] ? "border-red-500" : "border-[#cbd5e1] focus:border-[#091426]"
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
                  className={`h-11 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${renewFieldErrors.paymentCycleMonths ? "border-red-500" : "border-[#cbd5e1] focus:border-[#091426]"
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
                <div className="rounded-lg border border-red-200 dark:border-rose-500/20 bg-red-50 dark:bg-rose-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-rose-300 sm:col-span-2">
                  {renewError}
                </div>
              )}
            </div>

            <footer className="flex justify-end gap-3 border-t border-[#dfe5ef] dark:border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setRenewModalOpen(false)}
                className="h-10 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-4 text-sm font-extrabold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRenewContract}
                disabled={isBusy}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-extrabold text-white disabled:opacity-60"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/70 p-3 backdrop-blur-sm" onClick={() => setIntentionModalOpen(false)}>
          <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between border-b border-[#dfe5ef] px-5 py-5">
              <div>
                <h2 className="text-xl font-extrabold text-[#091426]">Ghi nhận / Cập nhật ý định khách</h2>
                <p className="mt-1 text-sm text-[#607089]">{mergedSelected.contractCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setIntentionModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-[#f3f6fa] dark:hover:bg-white/5"
                aria-label="Đóng modal ý định khách"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="grid gap-4 px-5 py-5">
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Ý định
                </span>
                <select
                  value={intentionForm.intention}
                  onChange={(event) => {
                    const nextIntention = event.target.value;
                    setIntentionForm((current) => ({
                      ...current,
                      intention: nextIntention,
                      expectedMoveOutDate: ["MOVE_OUT", "TRANSFER"].includes(nextIntention)
                        ? current.expectedMoveOutDate
                        : "",
                    }));
                  }}
                  className="h-11 rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold"
                >
                  {TENANT_INTENTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {["MOVE_OUT", "TRANSFER"].includes(intentionForm.intention) && (
                <label className="grid gap-1.5">
                  <span className="text-sm font-bold text-[#34445c]">Ngày dự kiến trả phòng / bàn giao phòng</span>
                  <input
                    type="date"
                    value={intentionForm.expectedMoveOutDate}
                    onChange={(event) => setIntentionForm((current) => ({ ...current, expectedMoveOutDate: event.target.value }))}
                    required
                    className="h-11 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-3 text-sm font-semibold"
                  />
                </label>
              )}
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
                <div className="rounded-lg border border-red-200 dark:border-rose-500/20 bg-red-50 dark:bg-rose-500/10 px-3 py-2 text-sm font-bold text-red-700 dark:text-rose-300">
                  {intentionError}
                </div>
              )}
            </div>
            <footer className="flex justify-end gap-3 border-t border-[#dfe5ef] dark:border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setIntentionModalOpen(false)}
                className="h-10 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-4 text-sm font-extrabold"
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
