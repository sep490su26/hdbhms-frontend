"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
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
  Plus,
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
  downloadLeaseContractDraftPdf,
  downloadLeaseContractSignedFile,
  fetchLeaseContractFileObjectUrl,
  fetchLeaseContractManagementList,
  fetchManagementLeaseContractDetails,
  openLeaseContractFile,
  uploadSignedLeaseContractFile,
  liquidateLeaseContract,
  recordLeaseContractTenantIntention,
  updateLeaseContractLiquidationDraft,
  updateLeaseContractTerms,
} from "@/services/leaseContractsService";
import {
  confirmTransferContract,
  signTransferContractDocument,
} from "@/services/roomTransferService";
import { sendTenantAccountCredentials } from "@/services/identityAccessService";
import {
  fetchContractHandover,
  fetchLatestReadings,
  uploadFile,
} from "@/services/contractHandoverService";
import { fetchPropertyUtilitySettings } from "@/services/propertyUtilitySettingsService";
import ContractActivationFlow from "./ContractActivationFlow";
import ContractHandoverSection from "./ContractHandoverSection";
import ContractPrintWizard from "./ContractPrintWizard";
import HandoverDocumentCard from "./HandoverDocumentCard";
import TransferExecutionModal from "../_components/TransferExecutionModal";
import { toast } from "sonner";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/lib/dateFormat";
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import {
  calculateUtilityCharge,
  DEFAULT_UTILITY_TARIFFS,
  normalizeUtilityTariff,
} from "@/lib/meterReadingCost.mjs";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import DateInput from "@/components/DateInput";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "../_contexts/AuthContext";
import { ROLES } from "../_lib/rbac";

// ponytail: local filters cover the first 1000 contracts; move these filters into the API when the portfolio grows.
const CONTRACT_MANAGEMENT_FETCH_SIZE = 1000;

const STATUS_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "EXPIRING_SOON", label: "Sắp hết hạn" },
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
  "TRANSFERRED",
  "CANCELLED",
  "AUTO_TERMINATED",
  "TERMINATION_PENDING",
  "ENDED",
]);

const LIQUIDATION_CHARGE_TYPES = [
  { value: "ELECTRICITY", label: "Tiền điện" },
  { value: "SERVICE_FEE", label: "Phí dịch vụ" },
  { value: "ROOM_RENT", label: "Tiền phòng" },
  { value: "MAINTENANCE_COMPENSATION", label: "Sửa chữa/bồi thường" },
  { value: "VIOLATION_FINE", label: "Phạt vi phạm" },
  { value: "OTHER", label: "Chi phí phát sinh" },
];

const DEFAULT_LIQUIDATION_CHARGES = [
  ["ELECTRICITY", "Tiền điện chốt phòng"],
  ["SERVICE_FEE", "Phí dịch vụ chốt phòng"],
  ["ROOM_RENT", "Tiền phòng còn thiếu"],
  ["MAINTENANCE_COMPENSATION", "Sửa chữa/bồi thường"],
  ["OTHER", "Chi phí phát sinh"],
];

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
  TRANSFERRED: "Đã chuyển phòng",
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
  TRANSFERRED: "Đã chuyển phòng",
  EXPIRING_SOON: "Sắp hết hạn",
  CANCELLED: "Đã hủy",
  AUTO_TERMINATED: "Đã tự động kết thúc",
  TERMINATION_PENDING: "Chờ thanh lý",
};

const TRANSFER_STATUS_LABELS = {
  REQUESTED: "Mới tạo",
  MANAGER_APPROVED: "Quản lý đã duyệt",
  WAITING_MANAGER_APPROVAL: "Chờ quản lý duyệt",
  WAITING_TARGET_HOLDER_APPROVAL: "Chờ chủ phòng đích duyệt",
  WAITING_TENANT_CONFIRMATION: "Chờ khách xác nhận",
  WAITING_PAYMENT: "Chờ thanh toán",
  WAITING_CONTRACT_CONFIRMATION: "Chờ quản lý xác nhận hợp đồng",
  WAITING_SIGNING: "Chờ quản lý upload bản ký",
  WAITING_CONTRACT_SIGNING: "Chờ quản lý upload bản ký",
  WAITING_TRANSFER_DATE: "Sẵn sàng chuyển phòng",
  READY_FOR_HANDOVER: "Sẵn sàng chuyển phòng",
  WAITING_EXECUTION: "Đang trong phiên chuyển phòng",
  EXECUTED: "Đã chuyển phòng",
  CANCELLED: "Đã hủy",
  REJECTED: "Đã từ chối",
  EXPIRED: "Đã hết hạn",
};

const ROLE_LABELS = {
  PRIMARY: "Người ký chính",
  CO_OCCUPANT: "Người ở cùng",
};

const OCCUPANT_INTENTION_LABELS = {
  FOLLOW_PRIMARY_MOVE_OUT: "Rời phòng theo người đứng tên",
  JOIN_RENEWAL: "Tiếp tục ở nếu tái ký",
};

const TENANT_INTENTION_OPTIONS = [
  { value: "RENEW", label: "Muốn gia hạn" },
  { value: "TRANSFER", label: "Muốn chuyển phòng" },
  { value: "MOVE_OUT", label: "Sẽ chuyển đi / Không gia hạn" },
  { value: "UNDECIDED", label: "Chưa có ý định" },
];

const TENANT_INTENTION_LABELS = TENANT_INTENTION_OPTIONS.reduce(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {},
);

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
  return (
    [...details.events]
      .filter((event) => event.eventType === "INTENTION_RECORDED")
      .sort((a, b) => {
        const timeDiff =
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime();
        if (timeDiff !== 0) return timeDiff;
        return Number(b.id || 0) - Number(a.id || 0);
      })[0] || null
  );
}

function buildTenantIntentionInfo(contract, details) {
  const latestEvent = getLatestIntentionEvent(details);
  const eventData = parseEventData(latestEvent?.eventData);
  const rawIntention =
    contract?.tenantIntention ||
    details?.tenantIntention ||
    eventData.intention ||
    "UNDECIDED";
  const intention =
    rawIntention === "TRANSFER_ROOM" ? "TRANSFER" : rawIntention;
  const source =
    contract?.intentionSource ||
    details?.intentionSource ||
    eventData.source ||
    "";
  const note =
    contract?.intentionNote || details?.intentionNote || eventData.note || "";
  return {
    intention,
    label:
      TENANT_INTENTION_LABELS[intention] || TENANT_INTENTION_LABELS.UNDECIDED,
    expectedVacantDate:
      contract?.expectedVacantDate ||
      details?.expectedVacantDate ||
      eventData.expectedVacantDate ||
      null,
    note,
    sourceLabel:
      TENANT_INTENTION_SOURCE_LABELS[source] ||
      (source ? source : "Chưa xác định nguồn ghi nhận"),
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
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(number)} VNĐ`;
}

function formatOptionalMoney(value) {
  if (value === null || value === undefined || value === "") return "Chưa có";
  return formatMoney(value);
}

function getDepositRefundStatusLabel(value) {
  const map = {
    PENDING: "Chờ xử lý",
    WAITING_OWNER_APPROVAL: "Chờ chủ trọ duyệt",
    APPROVED_WAITING_REFUND: "Đã duyệt, chờ hoàn tiền",
    RECORDED_BY_MANAGER: "Đã hoàn tiền, chờ khách xác nhận",
    TENANT_CONFIRMED: "Khách đã xác nhận nhận tiền",
    DISPUTED: "Khách phản hồi chưa nhận/sai tiền",
    OWNER_REJECTED: "Chủ trọ từ chối",
    NOT_REQUIRED: "Không cần hoàn cọc",
    CANCELLED: "Đã hủy",
  };
  return map[value] || value || "Chưa tạo yêu cầu";
}

function getLiquidationChargeTypeLabel(value) {
  return (
    LIQUIDATION_CHARGE_TYPES.find((type) => type.value === value)?.label ||
    "Chi phí phát sinh"
  );
}

function getInvoiceLineAmount(line = {}) {
  const amount = Number(line.amount);
  if (Number.isFinite(amount)) return amount;
  const quantity = Number(line.quantity || 0);
  const unitPrice = Number(line.unitPrice || 0);
  return Number.isFinite(quantity) && Number.isFinite(unitPrice)
    ? quantity * unitPrice
    : 0;
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
    depositAmount:
      item.depositAmount == null ? "0" : String(item.depositAmount),
  };
}

function todayInputValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function isMeterLiquidationCharge(lineType) {
  return lineType === "ELECTRICITY";
}

function getContractPropertyId(item = {}) {
  return (
    item.propertyId ??
    item.property_id ??
    item.property?.id ??
    item.property?.propertyId ??
    item.property?.property_id ??
    item.room?.propertyId ??
    item.room?.property_id ??
    item.room?.property?.id ??
    item.room?.property?.propertyId ??
    item.room?.property?.property_id ??
    null
  );
}

const DEFAULT_LIQUIDATION_TARIFFS = {
  ELECTRICITY: DEFAULT_UTILITY_TARIFFS.electricity,
};

function getLiquidationTariff(lineType, tariffs = DEFAULT_LIQUIDATION_TARIFFS) {
  const key =
    lineType === "ELECTRICITY"
      ? "electricity"
      : null;
  const fallback =
    DEFAULT_LIQUIDATION_TARIFFS[lineType] || DEFAULT_UTILITY_TARIFFS[key] || {};
  return normalizeUtilityTariff(
    tariffs?.[lineType] || tariffs?.[key],
    fallback,
  );
}

function getLiquidationChargeDefaultDescription(lineType) {
  return (
    DEFAULT_LIQUIDATION_CHARGES.find(([type]) => type === lineType)?.[1] ||
    "Chi phí phát sinh"
  );
}

function getMeterUsage(charge = {}) {
  if (!isMeterLiquidationCharge(charge.lineType)) {
    return Number(charge.quantity || 0);
  }
  const previousValue = Number(charge.previousValue || 0);
  const currentValue = Number(charge.currentValue || 0);
  if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue)) {
    return 0;
  }
  return currentValue - previousValue;
}

function getLiquidationMeterEstimate(charge = {}) {
  const tariff = normalizeUtilityTariff(
    {
      unitPrice: charge.unitPrice,
      freeAllowance: charge.freeAllowance,
    },
    getLiquidationTariff(charge.lineType),
  );
  return calculateUtilityCharge(getMeterUsage(charge), tariff);
}

function getLiquidationChargeLiveAmount(charge = {}) {
  if (isMeterLiquidationCharge(charge.lineType)) {
    const estimate = getLiquidationMeterEstimate(charge);
    return estimate?.isInvalid ? null : estimate?.amount;
  }
  const quantity = Number(charge.quantity || 0);
  const unitPrice = Number(charge.unitPrice || 0);
  return Number.isFinite(quantity) && Number.isFinite(unitPrice)
    ? quantity * unitPrice
    : 0;
}

function calculateLiquidationRoomRent(item = {}, liquidationDateValue) {
  const liquidationDate = toDateInputValue(
    liquidationDateValue || item.liquidationDate || item.expectedVacantDate,
  );
  const monthlyRent = Number(item.monthlyRent || 0);
  if (!liquidationDate || !Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    return 0;
  }
  const liquidation = new Date(`${liquidationDate}T00:00:00`);
  if (Number.isNaN(liquidation.getTime())) {
    return 0;
  }
  const periodStart = new Date(
    liquidation.getFullYear(),
    liquidation.getMonth(),
    1,
  );
  const rentStartValue = toDateInputValue(item.rentStartDate || item.startDate);
  const rentStart = rentStartValue
    ? new Date(`${rentStartValue}T00:00:00`)
    : periodStart;
  const chargeStart = rentStart > periodStart ? rentStart : periodStart;
  const endDateValue = toDateInputValue(item.endDate);
  const endDate = endDateValue
    ? new Date(`${endDateValue}T00:00:00`)
    : liquidation;
  const chargeEnd = endDate < liquidation ? endDate : liquidation;
  if (chargeEnd < chargeStart) {
    return 0;
  }
  const daysInMonth = new Date(
    liquidation.getFullYear(),
    liquidation.getMonth() + 1,
    0,
  ).getDate();
  const chargeableDays = chargeEnd.getDate() - chargeStart.getDate() + 1;
  return Math.ceil((monthlyRent * chargeableDays) / daysInMonth);
}

function getLiquidationRoomRentDescription(liquidationDateValue) {
  const liquidationDate = toDateInputValue(liquidationDateValue);
  if (!liquidationDate) return "Tiền phòng tháng thanh lý";
  return `Tiền phòng tháng ${liquidationDate.slice(0, 7)} đến ngày ${liquidationDate}`;
}

function applyAutoLiquidationRoomRent(
  charges = [],
  item = {},
  liquidationDateValue,
) {
  const amount = calculateLiquidationRoomRent(item, liquidationDateValue);
  const description = getLiquidationRoomRentDescription(liquidationDateValue);
  return charges.map((charge) =>
    charge.lineType === "ROOM_RENT"
      ? {
          ...charge,
          description: charge.description || description,
          quantity: "1",
          unitPrice: String(amount),
        }
      : charge,
  );
}

function createLiquidationCharge(
  lineType = "OTHER",
  description = "",
  tariffs = DEFAULT_LIQUIDATION_TARIFFS,
) {
  const meterCharge = isMeterLiquidationCharge(lineType);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lineType,
    description:
      description || getLiquidationChargeDefaultDescription(lineType),
    previousValue: "0",
    currentValue: "0",
    quantity: meterCharge ? "0" : "1",
    unitPrice: meterCharge
      ? String(getLiquidationTariff(lineType, tariffs).unitPrice)
      : "0",
    freeAllowance: meterCharge
      ? String(getLiquidationTariff(lineType, tariffs).freeAllowance)
      : "0",
    photoFileId: null,
    proofFile: null,
  };
}

function buildLiquidationCharges(
  item = {},
  tariffs = DEFAULT_LIQUIDATION_TARIFFS,
) {
  const lines = Array.isArray(item.liquidationFinalInvoiceLines)
    ? item.liquidationFinalInvoiceLines
    : [];
  if (lines.length > 0) {
    return lines.map((line) => ({
      id: `${line.id || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      lineType: line.lineType || "OTHER",
      description: line.description || "",
      previousValue:
        line.previousValue == null ? "0" : String(line.previousValue),
      currentValue: line.currentValue == null ? "0" : String(line.currentValue),
      quantity: line.quantity == null ? "1" : String(line.quantity),
      unitPrice: line.unitPrice == null ? "0" : String(line.unitPrice),
      freeAllowance: "0",
      photoFileId: line.photoFileId ?? null,
      proofFile: null,
    }));
  }
  return applyAutoLiquidationRoomRent(
    DEFAULT_LIQUIDATION_CHARGES.map(([lineType, description]) =>
      createLiquidationCharge(lineType, description, tariffs),
    ),
    item,
    item.liquidationDate || item.expectedVacantDate || todayInputValue(),
  );
}

function buildLiquidationForm(
  item = {},
  tariffs = DEFAULT_LIQUIDATION_TARIFFS,
) {
  return {
    liquidationDate:
      toDateInputValue(item.liquidationDate || item.expectedVacantDate) ||
      todayInputValue(),
    reason: item.liquidationReason || item.intentionNote || "",
    charges: buildLiquidationCharges(item, tariffs),
  };
}

function normalizeLiquidationCharges(charges = []) {
  return charges
    .map((charge) => {
      const estimate = isMeterLiquidationCharge(charge.lineType)
        ? getLiquidationMeterEstimate(charge)
        : null;
      const rawQuantity = estimate
        ? estimate.billableUsage
        : Number(charge.quantity || 0);
      const unitPrice = estimate
        ? estimate.unitPrice
        : Number(charge.unitPrice || 0);
      const quantity =
        Number.isFinite(rawQuantity) && rawQuantity > 0
          ? Math.ceil(rawQuantity)
          : 0;
      const description = String(
        charge.description ||
          getLiquidationChargeDefaultDescription(charge.lineType),
      ).trim();
      return {
        lineType: charge.lineType || "OTHER",
        description: isMeterLiquidationCharge(charge.lineType)
          ? `${description}: ${charge.previousValue || 0} -> ${charge.currentValue || 0}, miễn phí ${estimate?.freeAllowance || 0}, tính ${quantity} x ${unitPrice}`
          : description,
        quantity,
        unitPrice: Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0,
        previousValue: isMeterLiquidationCharge(charge.lineType)
          ? Number(charge.previousValue || 0)
          : null,
        currentValue: isMeterLiquidationCharge(charge.lineType)
          ? Number(charge.currentValue || 0)
          : null,
        photoFileId: isMeterLiquidationCharge(charge.lineType)
          ? (charge.photoFileId ?? null)
          : null,
      };
    })
    .filter((charge) =>
      isMeterLiquidationCharge(charge.lineType)
        ? charge.unitPrice > 0
        : charge.quantity > 0 && charge.unitPrice > 0,
    );
}

function getLiquidationChargeSubtotal(charges = []) {
  return normalizeLiquidationCharges(charges).reduce(
    (total, charge) => total + charge.quantity * charge.unitPrice,
    0,
  );
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

function getContractDisplayName(item = {}) {
  return item.contractCode || item.displayCode || item.code || "Chưa tạo HĐ";
}

function withoutPdfExtension(value = "") {
  return String(value).replace(/\.pdf$/i, "");
}

function buildRenewForm(item = {}) {
  const currentEndDate = toDateInputValue(item.endDate);
  return {
    startDate: toDateInputValue(item.startDate),
    currentEndDate,
    endDate:
      addYearsMinusOneDay(addDays(currentEndDate, 1), 1) || currentEndDate,
    monthlyRent: item.monthlyRent == null ? "" : String(item.monthlyRent),
    paymentCycleMonths: String(item.paymentCycleMonths || 1),
    depositAmount:
      item.depositAmount == null ? "0" : String(item.depositAmount),
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
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return false;
  const minimumEnd = new Date(start);
  minimumEnd.setMonth(minimumEnd.getMonth() + 3);
  return end < minimumEnd;
}

function normalizeKeyword(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getContractRowKey(item, index) {
  const depositFormId = getDepositFormId(item);
  if (item.sourceType === "CONTRACT" && item.contractId)
    return `contract-${item.contractId}`;
  if (item.sourceType === "DEPOSIT" && depositFormId)
    return `deposit-${depositFormId}`;
  if (item.contractId) return `contract-${item.contractId}`;
  if (depositFormId) return `deposit-${depositFormId}`;
  if (item.leaseContractId) return `lease-${item.leaseContractId}`;
  if (item.id) return `item-${item.id}`;
  if (item.displayCode) return `code-${item.displayCode}`;
  return `row-${index}`;
}

function getDepositFormId(item = {}) {
  return (
    item?.depositFormId ??
    item?.deposit_form_id ??
    item?.depositAgreementId ??
    item?.deposit_agreement_id ??
    null
  );
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
  const renewalContract = isRenewalContract(item);
  if (
    renewalContract &&
    ["DRAFT", "PENDING_SIGNATURE"].includes(contractStatus)
  ) {
    return contractStatus;
  }
  if (
    [
      "ACTIVE",
      "EXPIRING_SOON",
      "EXPIRED",
      "TERMINATION_PENDING",
      "LIQUIDATED",
      "RENEWED",
      "TRANSFERRED",
      "CANCELLED",
      "AUTO_TERMINATED",
      "DRAFT",
      "PENDING_SIGNATURE",
    ].includes(contractStatus)
  ) {
    return contractStatus;
  }
  const status = item?.workflowStatus || item?.depositStatus;
  if (
    renewalContract &&
    ["MISSING_FILE", "PENDING_ACTIVATION"].includes(status)
  ) {
    return "PENDING_SIGNATURE";
  }
  if (status === "ACTIVE") return "ACTIVE";
  if (item?.leaseContractId && getLeaseSignedFileId(item))
    return "PENDING_ACTIVATION";
  if (item?.leaseContractId && !getLeaseSignedFileId(item))
    return "MISSING_FILE";
  return "PENDING_SIGNATURE";
}

function getContractType(item = {}) {
  return item?.leaseContractId || item?.contractId ? "lease" : "deposit";
}

function isVisibleLeaseContract(item) {
  return Boolean(item?.leaseContractId || item?.contractId || getDepositFormId(item));
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
  return Number(
    item.leaseContractId || getDepositFormId(item) || item.id || 0,
  );
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

function isTransferExecuted(item) {
  return item?.transferStatus === "EXECUTED";
}

function shouldShowSignedFileCard(item) {
  if (!item?.leaseContractId) return false;
  if (!isRoomTransferManagedContract(item)) return true;
  return item?.status === "SIGNED" || Boolean(getLeaseSignedFileId(item));
}

function isTransferSigningStatus(status) {
  return status === "WAITING_SIGNING" || status === "WAITING_CONTRACT_SIGNING";
}

function getTransferStatusLabel(status) {
  return TRANSFER_STATUS_LABELS[status] || status || "Chưa rõ";
}

function getTransferContractStatusLabel(item = {}) {
  const status = item?.transferStatus;
  if (isTransferSigningStatus(status) && item?.status === "SIGNED") {
    return "Đã xác nhận ký, chờ đủ bộ";
  }
  if (isTransferSigningStatus(status) && getLeaseSignedFileId(item)) {
    return "Đã upload bản ký, chờ xác nhận đủ bộ";
  }
  return getTransferStatusLabel(status);
}

function isRenewalContract(item) {
  return Boolean(item?.previousContractId ?? item?.previous_contract_id);
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
  if (isRenewalContract(item)) return false;
  if (!item.leaseContractId && getDepositFormId(item)) return true;
  if (!item.leaseContractId) return false;
  return ACTIVATION_FLOW_WORKFLOWS.has(getWorkflow(item));
}

function getTransferContractNotice(item) {
  if (!isRoomTransferManagedContract(item)) return null;
  const requestedDate = formatDate(item.transferRequestedDate);
  const code = item.transferRequestCode || `#${item.transferRequestId}`;
  if (isTransferSigningStatus(item.transferStatus)) {
    if (getLeaseSignedFileId(item)) {
      return `Hợp đồng này được tạo từ yêu cầu chuyển phòng ${code}. Bản đã ký của hợp đồng này đã được upload; bước xác nhận đủ bộ thực hiện ở chi tiết yêu cầu chuyển phòng.`;
    }
    return `Hợp đồng này được tạo từ yêu cầu chuyển phòng ${code}. Quản lý có thể upload bản đã ký của riêng hợp đồng này tại đây.`;
  }
  if (item.transferStatus === "WAITING_TRANSFER_DATE") {
    return `Hợp đồng này được tạo từ yêu cầu chuyển phòng ${code}. Ngày dự kiến chuyển là ${requestedDate}; có thể bấm Chốt phòng cũ ngay trong màn hợp đồng khi tenant và quản lý có mặt thực tế.`;
  }
  if (
    ["READY_FOR_HANDOVER", "WAITING_EXECUTION"].includes(item.transferStatus)
  ) {
    return `Đã tới bước vận hành của yêu cầu chuyển phòng ${code}. Hoàn tất chốt phòng cũ/nhận phòng mới ngay tại màn hợp đồng để chuyển trạng thái.`;
  }
  if (item.transferStatus === "EXECUTED") {
    return `Hợp đồng này đã được xử lý qua yêu cầu chuyển phòng ${code}.`;
  }
  return `Hợp đồng này thuộc yêu cầu chuyển phòng ${code}; trạng thái hợp đồng sẽ đi theo tiến trình chuyển phòng.`;
}

function unwrapHandoverResponse(response) {
  return response?.data || response || null;
}

function hasHandoverReadings(handover) {
  return Boolean(handover?.electricity);
}

function getSignedHandoverDocumentId(handover = {}) {
  return handover?.signedDocumentId ?? handover?.signed_document_id ?? null;
}

function matchesStatusFilter(item, statusFilter) {
  const workflow = getWorkflow(item);
  if (statusFilter === "all") return true;
  if (statusFilter === "current")
    return CURRENT_CONTRACT_WORKFLOWS.has(workflow);
  if (statusFilter === "history")
    return HISTORY_CONTRACT_WORKFLOWS.has(workflow);
  if (statusFilter === "PENDING" || statusFilter === "PENDING_SIGNATURE") {
    return ["PENDING_SIGNATURE", "MISSING_FILE", "PENDING_ACTIVATION"].includes(
      workflow,
    );
  }
  if (statusFilter === "SIGNED") {
    return (
      Boolean(getLeaseSignedFileId(item)) ||
      ["ACTIVE", "EXPIRING_SOON", "PENDING_ACTIVATION"].includes(workflow)
    );
  }
  if (statusFilter === "OVERDUE") return isOverdueContract(item);
  return (
    workflow === statusFilter ||
    item.status === statusFilter ||
    item.contractStatus === statusFilter
  );
}

function getStatusLabel(item) {
  const workflow = getWorkflow(item);
  return (
    WORKFLOW_LABELS[workflow] || STATUS_LABELS[item?.status] || "Chờ xử lý"
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
  const Icon =
    workflow === "ACTIVE"
      ? CheckCircle2
      : workflow === "PENDING_ACTIVATION"
        ? RefreshCw
        : AlertTriangle;

  return (
    <span
      className={`inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-center text-[11px] font-bold leading-tight xl:px-3 xl:py-2 xl:text-xs ${
        classes[workflow] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
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
      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#6b7280] xl:text-xs">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-extrabold xl:text-3xl ${textClass}`}>
        {value}
      </p>
      <div className={`mt-4 h-1.5 rounded-full ${bgClass}`} />
    </article>
  );
}

function DetailCard({ title, icon: Icon, action, className = "", children }) {
  return (
    <section
      className={`rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-4 xl:p-5 ${className}`}
    >
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
      <p className="mt-1 break-words text-sm font-bold text-[#091426] xl:text-base">
        {value || "Chưa có"}
      </p>
    </div>
  );
}

function LiquidationInvoiceLines({ lines = [] }) {
  if (!lines.length) {
    return (
      <p className="rounded-lg border border-dashed border-[#dfe5ef] bg-white px-4 py-3 text-sm font-semibold text-[#607089]">
        Chưa có khoản thanh lý nào.
      </p>
    );
  }

  const electricityLines = lines.filter(
    (line) => line.lineType === "ELECTRICITY",
  );
  const otherLines = lines.filter(
    (line) => !isMeterLiquidationCharge(line.lineType),
  );
  const renderLines = (items, { compactMeter = false } = {}) => (
    <table className="w-full table-auto text-left">
      <thead className="bg-[#f7f9fe] text-[11px] font-bold uppercase tracking-[0.04em] text-[#6b7280] xl:text-xs">
        <tr>
          <th className="px-4 py-3">Loại phí</th>
          <th className="px-4 py-3">Diễn giải</th>
          {!compactMeter && <th className="px-4 py-3 text-right">SL</th>}
          {!compactMeter && <th className="px-4 py-3 text-right">Đơn giá</th>}
          <th className="px-4 py-3 text-right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        {items.map((line) => (
          <tr
            key={line.id || `${line.lineType}-${line.description}`}
            className="border-t border-[#edf1f6]"
          >
            <td className="px-4 py-3 text-sm font-bold text-[#091426]">
              {getLiquidationChargeTypeLabel(line.lineType)}
            </td>
            <td className="px-4 py-3 text-sm font-semibold text-[#091426]">
              {line.description || "Chưa có"}
            </td>
            {!compactMeter && (
              <td className="px-4 py-3 text-right text-sm font-semibold text-[#091426]">
                {line.quantity ?? 1}
              </td>
            )}
            {!compactMeter && (
              <td className="px-4 py-3 text-right text-sm font-semibold text-[#091426]">
                {formatOptionalMoney(line.unitPrice)}
              </td>
            )}
            <td className="px-4 py-3 text-right text-sm font-extrabold text-[#091426]">
              {formatMoney(getInvoiceLineAmount(line))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="grid gap-3">
      {electricityLines.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[#dfe5ef] bg-white">
          <p className="border-b border-[#edf1f6] bg-[#f7f9fe] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.06em] text-[#58667c]">
            Chốt điện
          </p>
          {renderLines(electricityLines, { compactMeter: true })}
        </div>
      )}
      {otherLines.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[#dfe5ef] bg-white">
          <p className="border-b border-[#edf1f6] bg-[#f7f9fe] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.06em] text-[#58667c]">
            Chi phí khác
          </p>
          {renderLines(otherLines)}
        </div>
      )}
    </div>
  );
}

function LiquidationProofPreview({ file, fileId }) {
  const [preview, setPreview] = useState({ key: "", url: "", error: "" });
  const remoteKey = !file && fileId ? `remote-${fileId}` : "";
  const localUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file],
  );
  const url = file ? localUrl : preview.key === remoteKey ? preview.url : "";
  const error = file ? "" : preview.key === remoteKey ? preview.error : "";

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = "";
    if (!remoteKey) return undefined;

    fetchLeaseContractFileObjectUrl(fileId)
      .then((nextUrl) => {
        objectUrl = nextUrl;
        if (isMounted) {
          setPreview({ key: remoteKey, url: nextUrl, error: "" });
        } else if (nextUrl) {
          URL.revokeObjectURL(nextUrl);
        }
      })
      .catch(() => {
        if (isMounted)
          setPreview({ key: remoteKey, url: "", error: "Không tải được ảnh" });
      });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, remoteKey]);

  if (!file && !fileId) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-xs font-bold text-[#607089]">
        Chưa có ảnh
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-2 text-center text-xs font-bold text-[#607089]">
        {error || "Đang tải ảnh..."}
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Ảnh bằng chứng"
        className="h-24 w-full rounded-lg border border-[#dfe5ef] object-cover"
      />
    </a>
  );
}

function LiquidationChargeRows({
  charges = [],
  onAdd,
  onChange,
  onProofChange,
  onRemove,
}) {
  const electricityCharges = charges
    .map((charge, index) => ({ charge, index }))
    .filter(({ charge }) => charge.lineType === "ELECTRICITY");
  const otherCharges = charges
    .map((charge, index) => ({ charge, index }))
    .filter(({ charge }) => !isMeterLiquidationCharge(charge.lineType));
  const renderChargeRow = (charge, index) => (
    <div
      key={charge.id || index}
      className={`grid gap-3 rounded-lg border border-[#dfe5ef] bg-white p-3 ${
        isMeterLiquidationCharge(charge.lineType)
          ? "xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_95px_95px_125px_220px_auto]"
          : "xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)_100px_120px_130px_auto]"
      }`}
    >
      <label className="grid min-w-0 gap-1.5">
        <span className="text-[11px] font-bold text-[#58667c]">Loại phí</span>
        <select
          value={charge.lineType}
          onChange={(event) => onChange(index, "lineType", event.target.value)}
          className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426]"
        >
          {LIQUIDATION_CHARGE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid min-w-0 gap-1.5">
        <span className="text-[11px] font-bold text-[#58667c]">Diễn giải</span>
        <input
          value={charge.description}
          onChange={(event) =>
            onChange(index, "description", event.target.value)
          }
          className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426]"
        />
      </label>
      {isMeterLiquidationCharge(charge.lineType) ? (
        <>
          <label className="grid min-w-0 gap-1.5">
            <span className="text-[11px] font-bold text-[#58667c]">
              Chỉ số cũ
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={charge.previousValue}
              onChange={(event) =>
                onChange(index, "previousValue", event.target.value)
              }
              className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426]"
            />
          </label>
          <label className="grid min-w-0 gap-1.5">
            <span className="text-[11px] font-bold text-[#58667c]">
              Chỉ số mới
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={charge.currentValue}
              onChange={(event) =>
                onChange(index, "currentValue", event.target.value)
              }
              className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426]"
            />
          </label>
        </>
      ) : (
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[11px] font-bold text-[#58667c]">Số lượng</span>
          <input
            type="number"
            min="1"
            step="1"
            value={charge.quantity}
            disabled={charge.lineType === "ROOM_RENT"}
            onChange={(event) =>
              onChange(index, "quantity", event.target.value)
            }
            className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-[#f8fafc] disabled:text-[#607089]"
          />
        </label>
      )}
      {!isMeterLiquidationCharge(charge.lineType) && (
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[11px] font-bold text-[#58667c]">Đơn giá</span>
          <input
            type="number"
            min="0"
            step="1000"
            value={charge.unitPrice}
            disabled={charge.lineType === "ROOM_RENT"}
            onChange={(event) =>
              onChange(index, "unitPrice", event.target.value)
            }
            className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426] disabled:bg-[#f8fafc] disabled:text-[#607089]"
          />
        </label>
      )}
      <div className="grid min-w-0 gap-1.5">
        <span className="text-[11px] font-bold text-[#58667c]">Thành tiền</span>
        <div className="flex h-10 min-w-0 items-center justify-end rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-3 text-sm font-extrabold text-[#091426]">
          {getLiquidationChargeLiveAmount(charge) == null
            ? "Không hợp lệ"
            : formatMoney(getLiquidationChargeLiveAmount(charge))}
        </div>
      </div>
      {isMeterLiquidationCharge(charge.lineType) && (
        <label className="grid min-w-0 gap-1.5">
          <span className="text-[11px] font-bold text-[#58667c]">
            Ảnh bằng chứng
          </span>
          <span className="inline-flex h-10 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-extrabold text-[#091426] hover:bg-[#f8fafc]">
            <Upload className="h-3.5 w-3.5" />
            <span className="truncate">
              {charge.proofFile?.name ||
                (charge.photoFileId ? "Đã có ảnh" : "Upload ảnh")}
            </span>
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) =>
              onProofChange(index, event.target.files?.[0] || null)
            }
          />
          <LiquidationProofPreview
            file={charge.proofFile}
            fileId={charge.photoFileId}
          />
        </label>
      )}
      <div className="flex items-end justify-end">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-extrabold text-red-600 hover:bg-red-50"
        >
          <X className="h-3.5 w-3.5" />
          Xóa
        </button>
      </div>
    </div>
  );

  if (!charges.length) {
    return (
      <div className="grid gap-3 rounded-lg border border-dashed border-[#dfe5ef] bg-white p-3 sm:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#58667c]">
            Chi phí khác
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-extrabold text-[#091426] hover:bg-[#f8fafc]"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm dòng
          </button>
        </div>
        <p className="text-sm font-semibold text-[#607089]">
          Chưa có khoản thanh lý nào.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:col-span-2">
      {electricityCharges.length > 0 && (
        <div className="grid gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#58667c]">
            Chốt điện
          </p>
          {electricityCharges.map(({ charge, index }) =>
            renderChargeRow(charge, index),
          )}
        </div>
      )}
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#58667c]">
            Chi phí khác
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-extrabold text-[#091426] hover:bg-[#f8fafc]"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm dòng
          </button>
        </div>
        {otherCharges.length > 0 ? (
          otherCharges.map(({ charge, index }) =>
            renderChargeRow(charge, index),
          )
        ) : (
          <p className="rounded-lg border border-dashed border-[#dfe5ef] bg-white px-4 py-3 text-sm font-semibold text-[#607089]">
            Chưa có chi phí khác.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ContractTemplatePage() {
  const { user } = useAuth();
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
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") || "all",
  );
  const [timeFilter, setTimeFilter] = useState("all");
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const [timePanelQuarter, setTimePanelQuarter] = useState("Q1");
  const [roomFilter, setRoomFilter] = useState("all");
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [termsForm, setTermsForm] = useState(buildTermsForm());
  const [termsError, setTermsError] = useState("");
  const [termsFieldErrors, setTermsFieldErrors] = useState({});
  const [isEditingLiquidation, setIsEditingLiquidation] = useState(false);
  const [liquidationForm, setLiquidationForm] = useState(
    buildLiquidationForm(),
  );
  const [liquidationTariffs, setLiquidationTariffs] = useState(
    DEFAULT_LIQUIDATION_TARIFFS,
  );
  const [liquidationError, setLiquidationError] = useState("");
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
  const [activationReadiness, setActivationReadiness] = useState(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupStep, setCleanupStep] = useState(1);
  const [transferExecutionModal, setTransferExecutionModal] = useState(null);
  const selectedYear = searchParams.get("year") || "all";

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLeaseContractManagementList({
        page: 0,
        size: CONTRACT_MANAGEMENT_FETCH_SIZE,
      });
      const visibleContracts = data.items.filter(isVisibleLeaseContract);
      setContracts(visibleContracts);
      setSelected((current) =>
        isVisibleLeaseContract(current) ? current : null,
      );
      setDetails((current) =>
        isVisibleLeaseContract(current) ? current : null,
      );
      return visibleContracts;
    } catch (err) {
      setError(err?.message || "Không tải được danh sách hợp đồng thuê.");
    } finally {
      setLoading(false);
    }
    return [];
  }, []);

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
        const data = await fetchManagementLeaseContractDetails(
          selected.leaseContractId,
        );
        if (!ignore) {
          setDetails(data);
          setTermsForm(buildTermsForm(data));
          setLiquidationForm(buildLiquidationForm(data));
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
      {
        total: 0,
        pendingSignature: 0,
        pendingActivation: 0,
        active: 0,
        missingFile: 0,
      },
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
          matchesKeyword &&
          matchesFile
        );
      })
      .sort((a, b) => getContractTimestamp(b) - getContractTimestamp(a));
  }, [
    contracts,
    fileFilter,
    keyword,
    roomFilter,
    selectedYear,
    statusFilter,
    timeFilter,
  ]);

  const filteredTotalElements = filteredContracts.length;
  const filteredTotalPages =
    filteredTotalElements === 0
      ? 0
      : Math.ceil(filteredTotalElements / Math.max(1, size));
  const displayedContractPage =
    filteredTotalPages > 0 ? Math.min(page, filteredTotalPages) : 1;
  const pagedContracts = useMemo(() => {
    const start = (displayedContractPage - 1) * size;
    return filteredContracts.slice(start, start + size);
  }, [displayedContractPage, filteredContracts, size]);

  const mergedSelected = useMemo(() => {
    if (!selected) return null;
    if (!details) return selected;
    return {
      ...selected,
      ...details,
      displayCode: details.contractCode || selected.displayCode,
      contractFileId: details.contractFile?.id || selected.contractFileId,
      contractFileName:
        details.contractFile?.fileName || selected.contractFileName,
      contractFileUploadedAt:
        details.contractFile?.uploadedAt || selected.contractFileUploadedAt,
      signedFileId:
        details.signedFile?.id ?? details.signedFileId ?? selected.signedFileId,
      signedFileName:
        details.signedFile?.fileName ??
        details.signedFileName ??
        selected.signedFileName,
      signedFileUploadedAt:
        details.signedFile?.uploadedAt ??
        details.signedFileUploadedAt ??
        selected.signedFileUploadedAt,
      propertyName: details.property?.name || selected.propertyName,
      propertyId:
        getContractPropertyId(details) ?? getContractPropertyId(selected),
      tenantId: details.tenantId || selected.tenantId || null,
      roomCode: details.room?.roomCode || selected.roomCode,
      roomId: details.room?.id || selected.roomId || null,
      monthlyRent: details.monthlyRent ?? selected.monthlyRent,
      depositAmount: details.depositAmount ?? selected.depositAmount,
      paymentCycleMonths:
        details.paymentCycleMonths ?? selected.paymentCycleMonths,
      startDate: details.startDate ?? selected.startDate,
      endDate: details.endDate ?? selected.endDate,
      rentStartDate: details.rentStartDate ?? selected.rentStartDate,
      status: details.status ?? selected.status,
      tenantIntention:
        details.tenantIntention ?? selected.tenantIntention ?? null,
      expectedVacantDate:
        details.expectedVacantDate ?? selected.expectedVacantDate ?? null,
      transferRequestId:
        details.transferRequestId ?? selected.transferRequestId ?? null,
      transferRequestCode:
        details.transferRequestCode ?? selected.transferRequestCode ?? null,
      transferStatus: details.transferStatus ?? selected.transferStatus ?? null,
      transferRequestedDate:
        details.transferRequestedDate ?? selected.transferRequestedDate ?? null,
      transferContractRole:
        details.transferContractRole ?? selected.transferContractRole ?? null,
      transferActivationLocked:
        details.transferActivationLocked ??
        selected.transferActivationLocked ??
        false,
      intentionRecordedAt:
        details.intentionRecordedAt ?? selected.intentionRecordedAt ?? null,
      intentionNote: details.intentionNote ?? selected.intentionNote ?? null,
      intentionSource:
        details.intentionSource ?? selected.intentionSource ?? null,
      liquidationId: details.liquidationId ?? selected.liquidationId ?? null,
      liquidationDate:
        details.liquidationDate ?? selected.liquidationDate ?? null,
      liquidationReason:
        details.liquidationReason ?? selected.liquidationReason ?? null,
      liquidationDepositAmount:
        details.liquidationDepositAmount ??
        selected.liquidationDepositAmount ??
        null,
      liquidationDepositDeductionAmount:
        details.liquidationDepositDeductionAmount ??
        selected.liquidationDepositDeductionAmount ??
        null,
      liquidationDepositDeductionReason:
        details.liquidationDepositDeductionReason ??
        selected.liquidationDepositDeductionReason ??
        null,
      liquidationDepositRefundAmount:
        details.liquidationDepositRefundAmount ??
        selected.liquidationDepositRefundAmount ??
        null,
      liquidationFinalInvoiceId:
        details.liquidationFinalInvoiceId ??
        selected.liquidationFinalInvoiceId ??
        null,
      liquidationFinalInvoiceCode:
        details.liquidationFinalInvoiceCode ??
        selected.liquidationFinalInvoiceCode ??
        null,
      liquidationFinalInvoiceStatus:
        details.liquidationFinalInvoiceStatus ??
        selected.liquidationFinalInvoiceStatus ??
        null,
      liquidationFinalInvoiceSubtotalAmount:
        details.liquidationFinalInvoiceSubtotalAmount ??
        selected.liquidationFinalInvoiceSubtotalAmount ??
        null,
      liquidationFinalInvoiceDiscountAmount:
        details.liquidationFinalInvoiceDiscountAmount ??
        selected.liquidationFinalInvoiceDiscountAmount ??
        null,
      liquidationFinalInvoiceTotalAmount:
        details.liquidationFinalInvoiceTotalAmount ??
        selected.liquidationFinalInvoiceTotalAmount ??
        null,
      liquidationFinalInvoiceRemainingAmount:
        details.liquidationFinalInvoiceRemainingAmount ??
        selected.liquidationFinalInvoiceRemainingAmount ??
        null,
      liquidationFinalInvoiceLines:
        Array.isArray(details.liquidationFinalInvoiceLines) &&
        details.liquidationFinalInvoiceLines.length > 0
          ? details.liquidationFinalInvoiceLines
          : (selected.liquidationFinalInvoiceLines ?? []),
      liquidationSignedFileId:
        details.liquidationSignedFileId ??
        selected.liquidationSignedFileId ??
        null,
      liquidationStatus:
        details.liquidationStatus ?? selected.liquidationStatus ?? null,
      liquidationCreatedAt:
        details.liquidationCreatedAt ?? selected.liquidationCreatedAt ?? null,
      liquidationDepositRefundRequestId:
        details.liquidationDepositRefundRequestId ??
        selected.liquidationDepositRefundRequestId ??
        null,
      liquidationDepositRefundExpenseId:
        details.liquidationDepositRefundExpenseId ??
        selected.liquidationDepositRefundExpenseId ??
        null,
      liquidationDepositRefundExpenseRequestId:
        details.liquidationDepositRefundExpenseRequestId ??
        selected.liquidationDepositRefundExpenseRequestId ??
        null,
      liquidationDepositRefundStatus:
        details.liquidationDepositRefundStatus ??
        selected.liquidationDepositRefundStatus ??
        null,
      liquidationDepositRefundProofFileId:
        details.liquidationDepositRefundProofFileId ??
        selected.liquidationDepositRefundProofFileId ??
        null,
      liquidationDepositRefundedAmount:
        details.liquidationDepositRefundedAmount ??
        selected.liquidationDepositRefundedAmount ??
        null,
      liquidationDepositRefundedAt:
        details.liquidationDepositRefundedAt ??
        selected.liquidationDepositRefundedAt ??
        null,
      liquidationDepositRefundTransactionRef:
        details.liquidationDepositRefundTransactionRef ??
        selected.liquidationDepositRefundTransactionRef ??
        null,
    };
  }, [details, selected]);

  const liquidationDraftCharges = useMemo(
    () => liquidationForm.charges || [],
    [liquidationForm.charges],
  );
  const liquidationDraftSubtotal = useMemo(
    () => getLiquidationChargeSubtotal(liquidationDraftCharges),
    [liquidationDraftCharges],
  );
  const liquidationDraftDeposit = Number(
    mergedSelected?.liquidationDepositAmount ??
      mergedSelected?.depositAmount ??
      0,
  );
  const safeLiquidationDraftDeposit = Number.isFinite(liquidationDraftDeposit)
    ? liquidationDraftDeposit
    : 0;
  const liquidationDraftRemainingDeposit = Math.max(
    0,
    safeLiquidationDraftDeposit,
  );
  const liquidationDraftRemainingPayable = Math.max(
    0,
    liquidationDraftSubtotal,
  );

  const selectedLeaseContractFilename = useMemo(() => {
    if (!mergedSelected?.leaseContractId && !mergedSelected?.contractId)
      return "";
    return buildLeaseContractDocumentFilename(mergedSelected);
  }, [mergedSelected]);
  const selectedSignedLeaseContractFilename = useMemo(() => {
    if (!getLeaseSignedFileId(mergedSelected)) return "";
    return mergedSelected?.signedFileName || selectedLeaseContractFilename;
  }, [mergedSelected, selectedLeaseContractFilename]);
  const selectedContractDisplayName = mergedSelected
    ? getContractDisplayName(mergedSelected)
    : "";
  const selectedDetailTitle = selectedLeaseContractFilename
    ? withoutPdfExtension(selectedLeaseContractFilename)
    : selectedContractDisplayName;

  const selectedOccupants = useMemo(() => {
    const rows =
      Array.isArray(details?.occupants) && details.occupants.length > 0
        ? details.occupants
        : selected?.occupants;
    return sortByNewest(rows, [
      "createdAt",
      "created_at",
      "moveInDate",
      "move_in_date",
      "signedAt",
      "signed_at",
    ]);
  }, [details, selected]);

  const tenantIntentionInfo = useMemo(
    () => buildTenantIntentionInfo(mergedSelected, details),
    [details, mergedSelected],
  );

  const amountPerPeriod = useMemo(() => {
    const monthlyRent = Number(termsForm.monthlyRent);
    const cycleMonths = Number(termsForm.paymentCycleMonths);
    if (!Number.isFinite(monthlyRent) || !Number.isFinite(cycleMonths))
      return 0;
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
    setActivationReadiness(null);
    setActionMessage("");
    setTermsForm(buildTermsForm(item));
    setIsEditingTerms(false);
    setTermsFieldErrors({});
    setTermsError("");
    setLiquidationForm(buildLiquidationForm(item));
    setIsEditingLiquidation(false);
    setLiquidationError("");
    setRenewModalOpen(false);
    setIntentionModalOpen(false);
    setTransferExecutionModal(null);
  }

  function openUploadDialog(item) {
    setSelected(item);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function closeTransferExecutionModal() {
    setTransferExecutionModal(null);
  }

  function openTransferExecutionModal(item) {
    if (!item?.transferRequestId) return;
    setTransferExecutionModal({
      contract: item,
      transferRequestId: item.transferRequestId,
    });
  }

  async function openPrintWizard(item) {
    let targetContractId = item?.leaseContractId;
    const depositFormId = getDepositFormId(item);

    if (!targetContractId) {
      if (depositFormId) {
        setActionLoading(`draft-${depositFormId}`);
        setError("");
        try {
          await createDraftLeaseContractFromDeposit(depositFormId);
          const refreshedContracts = await loadContracts();
          const updatedItem = refreshedContracts.find(
            (c) =>
              String(getDepositFormId(c)) === String(depositFormId) &&
              c.leaseContractId,
          );
          if (updatedItem && updatedItem.leaseContractId) {
            targetContractId = updatedItem.leaseContractId;
          } else {
            throw new Error("Không lấy được mã hợp đồng sau khi tạo.");
          }
        } catch (err) {
          setError(
            err?.message ||
              "Không tự động tạo được hợp đồng thuê từ cọc để in.",
          );
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
        contract: {
          ...item,
          leaseContractId: targetContractId,
          ...contractDetails,
        },
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
      setSelected((current) => {
        const merged = { ...current, ...refreshedItem, ...updated };
        return {
          ...merged,
          signedFileId:
            updated.signedFileId ??
            refreshedItem?.signedFileId ??
            current?.signedFileId ??
            merged.signedFileId,
          signedFileName:
            updated.signedFileName ??
            refreshedItem?.signedFileName ??
            current?.signedFileName ??
            merged.signedFileName,
          signedFileUploadedAt:
            updated.signedFileUploadedAt ??
            refreshedItem?.signedFileUploadedAt ??
            current?.signedFileUploadedAt ??
            merged.signedFileUploadedAt,
        };
      });

      if (uploadedContractId) {
        const refreshedDetails =
          await fetchManagementLeaseContractDetails(uploadedContractId);
        const mergedDetails = {
          ...refreshedDetails,
          signedFileId:
            refreshedDetails.signedFileId ??
            updated.signedFileId ??
            refreshedItem?.signedFileId,
          signedFileName:
            refreshedDetails.signedFileName ??
            updated.signedFileName ??
            refreshedItem?.signedFileName,
          signedFileUploadedAt:
            refreshedDetails.signedFileUploadedAt ??
            updated.signedFileUploadedAt ??
            refreshedItem?.signedFileUploadedAt,
        };
        setDetails(mergedDetails);
        setTermsForm(buildTermsForm(mergedDetails));
      }
    } catch (err) {
      setError(err?.message || "Không upload được file hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleCreateDraft(item) {
    const depositFormId = getDepositFormId(item);
    if (!depositFormId) return;
    setActionLoading(`draft-${depositFormId}`);
    setError("");
    try {
      const draft = await createDraftLeaseContractFromDeposit(
        depositFormId,
      );
      const items = await loadContracts();
      const created = items.find(
        (contract) =>
          String(getDepositFormId(contract)) === String(depositFormId) ||
          String(contract.leaseContractId) === String(draft?.leaseContractId),
      );
      const nextSelected = created || draft;
      if (nextSelected?.leaseContractId) {
        setSelected(nextSelected);
        const refreshedDetails = await fetchManagementLeaseContractDetails(
          nextSelected.leaseContractId,
        );
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
      const refreshedDetails = await fetchManagementLeaseContractDetails(
        mergedSelected.leaseContractId,
      );
      setDetails(refreshedDetails);
      const items = await loadContracts();
      const updatedContract = items.find(
        (i) =>
          String(i.leaseContractId) === String(mergedSelected.leaseContractId),
      );
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
      window.alert(
        "Hợp đồng này thuộc yêu cầu chuyển phòng. Vui lòng xử lý trong khối chuyển phòng ngay tại chi tiết hợp đồng.",
      );
      return;
    }

    if (!getLeaseSignedFileId(item)) {
      window.alert("Vui lòng upload file hợp đồng đã ký trước khi kích hoạt.");
      return;
    }

    setActionLoading(`activate-${item.leaseContractId}`);
    setError("");
    try {
      if (!isRenewalContract(item)) {
        try {
          const handoverData = unwrapHandoverResponse(
            await fetchContractHandover(item.leaseContractId, "MOVE_IN"),
          );
          if (!hasHandoverReadings(handoverData)) {
            throw new Error("Missing handover data");
          }
          if (!getSignedHandoverDocumentId(handoverData)) {
            window.alert(
              "Vui lòng upload biên bản bàn giao đã ký trước khi kích hoạt hợp đồng.",
            );
            setActionLoading("");
            return;
          }
        } catch (err) {
          window.alert(
            "Vui lòng nhập chỉ số điện và hoàn thành bàn giao phòng với khách trước khi kích hoạt hợp đồng.",
          );
          setActionLoading("");
          return;
        }
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
              canRenew: ["ACTIVE", "EXPIRING_SOON", "EXPIRED"].includes(
                activatedStatus,
              ),
              canLiquidate: [
                "ACTIVE",
                "EXPIRING_SOON",
                "EXPIRED",
                "TERMINATION_PENDING",
              ].includes(activatedStatus),
            }
          : current,
      );

      const refreshedContracts = await loadContracts();
      const refreshedItem = refreshedContracts.find(
        (contract) =>
          String(contract.leaseContractId) === String(item.leaseContractId),
      );
      if (refreshedItem) {
        setSelected((current) =>
          String(current?.leaseContractId) === String(item.leaseContractId)
            ? { ...current, ...refreshedItem }
            : current,
        );
      }

      const refreshedDetails = await fetchManagementLeaseContractDetails(
        item.leaseContractId,
      );
      setDetails(refreshedDetails);
      setTermsForm(buildTermsForm(refreshedDetails));

      // Auto-send account credentials after activation
      try {
        const provResult = await sendTenantAccountCredentials(
          item.leaseContractId,
          { retry: false },
        );
        const provDetails = await fetchManagementLeaseContractDetails(
          item.leaseContractId,
        );
        setDetails(provDetails);
        setActionMessage(
          provResult?.message || "Đã kích hoạt và cấp tài khoản thành công.",
        );
        toast.success(
          provResult?.message || "Đã kích hoạt và cấp tài khoản thành công.",
        );
      } catch (provErr) {
        // Account send failed — activation succeeded. Stepper will show retry button.
        toast.warning(
          provErr?.message ||
            "Kích hoạt thành công nhưng chưa gửi được tài khoản.",
        );
      }
    } catch (err) {
      setError(err?.message || "Không kích hoạt được hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleDownloadTransferDraft(item) {
    if (!item?.leaseContractId) return;

    setActionLoading(`transfer-download-${item.leaseContractId}`);
    setError("");
    try {
      await downloadLeaseContractDraftPdf(
        item.leaseContractId,
        buildLeaseContractDocumentFilename(item),
      );
      toast.success("Đã tải hợp đồng chuyển phòng để in và ký.");
    } catch (err) {
      setError(err?.message || "Không tải được hợp đồng chuyển phòng.");
      toast.error(err?.message || "Không tải được hợp đồng chuyển phòng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleConfirmTransferDocumentSigned(item) {
    if (!item?.transferRequestId || !item?.leaseContractId) return;
    if (!isTransferSigningStatus(item.transferStatus)) {
      toast.info("Hợp đồng chuyển phòng đã qua bước xác nhận ký.");
      return;
    }
    if (item.status === "SIGNED") {
      toast.info("Hợp đồng này đã được xác nhận ký.");
      return;
    }
    if (!getLeaseSignedFileId(item)) {
      toast.warning("Vui lòng upload file hợp đồng đã ký trước khi xác nhận.");
      return;
    }

    setActionLoading(`transfer-contract-sign-${item.leaseContractId}`);
    setError("");
    try {
      await signTransferContractDocument(
        item.transferRequestId,
        item.leaseContractId,
      );
      const refreshedContracts = await loadContracts();
      const refreshedItem = refreshedContracts.find(
        (contract) =>
          String(contract.leaseContractId) === String(item.leaseContractId),
      );
      if (refreshedItem) {
        setSelected((current) =>
          String(current?.leaseContractId) === String(item.leaseContractId)
            ? { ...current, ...refreshedItem }
            : refreshedItem,
        );
      }
      const refreshedDetails = await fetchManagementLeaseContractDetails(
        item.leaseContractId,
      );
      setDetails(refreshedDetails);
      setTermsForm(buildTermsForm(refreshedDetails));
      toast.success("Đã xác nhận hợp đồng này đã ký.");
    } catch (err) {
      setError(err?.message || "Không xác nhận được hợp đồng đã ký.");
      toast.error(err?.message || "Không xác nhận được hợp đồng đã ký.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleConfirmTransferContract(item) {
    if (!item?.transferRequestId || !item?.leaseContractId) return;

    setActionLoading(`transfer-confirm-${item.transferRequestId}`);
    setError("");
    try {
      await confirmTransferContract(item.transferRequestId);
      const refreshedContracts = await loadContracts();
      const refreshedItem = refreshedContracts.find(
        (contract) =>
          String(contract.leaseContractId) === String(item.leaseContractId),
      );
      if (refreshedItem) {
        setSelected((current) =>
          String(current?.leaseContractId) === String(item.leaseContractId)
            ? { ...current, ...refreshedItem }
            : refreshedItem,
        );
      }
      const refreshedDetails = await fetchManagementLeaseContractDetails(
        item.leaseContractId,
      );
      setDetails(refreshedDetails);
      setTermsForm(buildTermsForm(refreshedDetails));
      toast.success("Đã xác nhận hợp đồng chuyển phòng.");
    } catch (err) {
      setError(err?.message || "Không xác nhận được hợp đồng chuyển phòng.");
      toast.error(err?.message || "Không xác nhận được hợp đồng chuyển phòng.");
    } finally {
      setActionLoading("");
    }
  }

  async function refreshSelectedContract(contract) {
    if (!contract?.leaseContractId) {
      await loadContracts();
      return;
    }
    const refreshedContracts = await loadContracts();
    const refreshedItem = refreshedContracts.find(
      (item) =>
        String(item.leaseContractId) === String(contract.leaseContractId),
    );
    const selectedUpdate = { ...contract, ...(refreshedItem || {}) };
    setSelected((current) =>
      String(current?.leaseContractId) === String(contract.leaseContractId)
        ? { ...current, ...selectedUpdate }
        : selectedUpdate,
    );
    const refreshedDetails = await fetchManagementLeaseContractDetails(
      contract.leaseContractId,
    );
    setDetails(refreshedDetails);
    setTermsForm(buildTermsForm(refreshedDetails));
    setLiquidationForm(buildLiquidationForm(selectedUpdate));
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
      const result = await sendTenantAccountCredentials(item.leaseContractId, {
        retry: true,
      });
      const refreshedDetails = await fetchManagementLeaseContractDetails(
        item.leaseContractId,
      );
      setDetails(refreshedDetails);
      setActionMessage(
        result?.message || "Đã cập nhật trạng thái cấp tài khoản.",
      );
      toast.success(result?.message || "Đã gửi tài khoản thành công.");
    } catch (err) {
      setError(err?.message || "Không gửi được tài khoản cho khách thuê.");
      try {
        const refreshedDetails = await fetchManagementLeaseContractDetails(
          item.leaseContractId,
        );
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
    } else if (
      termsForm.startDate &&
      termsForm.endDate <= termsForm.startDate
    ) {
      validationErrors.endDate =
        "Ngày kết thúc phải sau ngày bắt đầu hợp đồng.";
    }
    if (![1, 3].includes(paymentCycleMonths)) {
      validationErrors.paymentCycleMonths =
        "Chu kỳ thanh toán chỉ được là 1 hoặc 3 tháng.";
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
      const updated = await updateLeaseContractTerms(
        mergedSelected.leaseContractId,
        {
          startDate: termsForm.startDate,
          endDate: termsForm.endDate,
          paymentCycleMonths,
          monthlyRent,
          depositAmount,
        },
      );
      setContracts((current) =>
        current.map((item) =>
          item.leaseContractId === mergedSelected.leaseContractId
            ? { ...item, ...updated }
            : item,
        ),
      );
      setSelected((current) =>
        current ? { ...current, ...updated } : current,
      );
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
        depositAmount:
          serverErrors.depositAmount || serverErrors.deposit_amount,
      });
      setTermsError(
        Object.keys(serverErrors).length > 0
          ? "Vui lòng kiểm tra các trường được đánh dấu đỏ."
          : err?.details ||
              err?.message ||
              "Không cập nhật được thông tin hợp đồng.",
      );
    } finally {
      setActionLoading("");
    }
  }

  async function openLiquidationEditor(item) {
    const propertyId = getContractPropertyId(item);
    if (!propertyId) {
      setLiquidationError(
        "Không xác định được cơ sở để tải đơn giá điện.",
      );
      toast.error("Không xác định được cơ sở để tải đơn giá điện.");
      return;
    }
    let tariffs = DEFAULT_LIQUIDATION_TARIFFS;
    try {
      const settings = await fetchPropertyUtilitySettings(propertyId);
      tariffs = {
        ELECTRICITY: normalizeUtilityTariff(
          settings?.electricity,
          DEFAULT_LIQUIDATION_TARIFFS.ELECTRICITY,
        ),
      };
    } catch (err) {
      setLiquidationError(
        err?.message || "Không tải được đơn giá điện của cơ sở.",
      );
      toast.error(
        err?.message || "Không tải được đơn giá điện của cơ sở.",
      );
      return;
    }
    setLiquidationTariffs(tariffs);
    const initialForm = buildLiquidationForm(item, tariffs);
    setLiquidationForm(initialForm);
    setLiquidationError("");
    setIsEditingLiquidation(true);

    if (!item?.roomId || (item.liquidationFinalInvoiceLines || []).length > 0) {
      return;
    }

    try {
      const latestReadings = await fetchLatestReadings(item.roomId);
      setLiquidationForm((current) => ({
        ...current,
        charges: (current.charges || []).map((charge) => {
          if (!isMeterLiquidationCharge(charge.lineType)) return charge;
          const key = "electricity";
          const reading = latestReadings?.[key] || {};
          const suggestedValue =
            reading.suggestedValue ??
            reading.suggested_value ??
            reading.previousValue ??
            reading.previous_value ??
            0;
          return {
            ...charge,
            previousValue: String(suggestedValue ?? 0),
            currentValue: String(suggestedValue ?? 0),
            unitPrice: String(
              getLiquidationTariff(charge.lineType, tariffs).unitPrice,
            ),
            freeAllowance: String(
              getLiquidationTariff(charge.lineType, tariffs).freeAllowance,
            ),
          };
        }),
      }));
    } catch (err) {
      setLiquidationForm((current) => ({
        ...current,
        charges: (current.charges || []).map((charge) =>
          isMeterLiquidationCharge(charge.lineType)
            ? {
                ...charge,
                previousValue: charge.previousValue || "0",
                currentValue: charge.currentValue || "0",
                unitPrice: String(
                  getLiquidationTariff(charge.lineType, tariffs).unitPrice,
                ),
                freeAllowance: String(
                  getLiquidationTariff(charge.lineType, tariffs).freeAllowance,
                ),
              }
            : charge,
        ),
      }));
    }
  }

  async function handleLiquidate(item) {
    if (!item?.leaseContractId) return;
    if (!item.liquidationFinalInvoiceId) {
      await openLiquidationEditor(item);
      setLiquidationError(
        "Vui lòng nhập và lưu hồ sơ thanh lý trước khi hoàn tất.",
      );
      return;
    }
    const validationPayload = await buildLiquidationPayload();
    if (!validationPayload) {
      return;
    }
    const confirmed = window.confirm(
      "Bạn chắc chắn muốn hoàn tất thanh lý hợp đồng này?",
    );
    if (!confirmed) return;
    setActionLoading(`liquidate-${item.leaseContractId}`);
    setError("");
    setLiquidationError("");
    try {
      const payload = await buildLiquidationPayload({ uploadPhotos: true });
      if (!payload) return;
      const updated = await liquidateLeaseContract(
        item.leaseContractId,
        payload,
      );
      await refreshSelectedContract(updated);
      setIsEditingLiquidation(false);
      toast.success("Đã hoàn tất thanh lý hợp đồng.");
    } catch (err) {
      setError(err?.message || "Không thanh lý được hợp đồng.");
      setLiquidationError(
        err?.details || err?.message || "Không thanh lý được hợp đồng.",
      );
      toast.error(err?.message || "Không thanh lý được hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  function updateLiquidationField(field, value) {
    setLiquidationForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "liquidationDate") {
        next.charges = applyAutoLiquidationRoomRent(
          current.charges || [],
          mergedSelected || {},
          value,
        );
      }
      return next;
    });
    if (liquidationError) setLiquidationError("");
  }

  function updateLiquidationCharge(index, field, value) {
    setLiquidationForm((current) => ({
      ...current,
      charges: (current.charges || []).map((charge, chargeIndex) => {
        if (chargeIndex !== index) return charge;
        const next = { ...charge, [field]: value };
        if (field === "lineType") {
          const meterCharge = isMeterLiquidationCharge(value);
          next.description = getLiquidationChargeDefaultDescription(value);
          next.unitPrice = meterCharge
            ? String(getLiquidationTariff(value, liquidationTariffs).unitPrice)
            : next.unitPrice || "0";
          next.freeAllowance = meterCharge
            ? String(
                getLiquidationTariff(value, liquidationTariffs).freeAllowance,
              )
            : "0";
          next.quantity = meterCharge ? "0" : next.quantity || "1";
          next.previousValue = meterCharge ? next.previousValue || "0" : "0";
          next.currentValue = meterCharge ? next.currentValue || "0" : "0";
          next.photoFileId = meterCharge ? (next.photoFileId ?? null) : null;
          next.proofFile = meterCharge ? (next.proofFile ?? null) : null;
          if (value === "ROOM_RENT") {
            next.description = getLiquidationRoomRentDescription(
              current.liquidationDate,
            );
            next.quantity = "1";
            next.unitPrice = String(
              calculateLiquidationRoomRent(
                mergedSelected || {},
                current.liquidationDate,
              ),
            );
          }
        }
        return next;
      }),
    }));
    if (liquidationError) setLiquidationError("");
  }

  function updateLiquidationChargeProof(index, file) {
    if (!file) return;
    setLiquidationForm((current) => ({
      ...current,
      charges: (current.charges || []).map((charge, chargeIndex) =>
        chargeIndex === index
          ? { ...charge, proofFile: file, photoFileId: null }
          : charge,
      ),
    }));
    if (liquidationError) setLiquidationError("");
  }

  function addLiquidationCharge() {
    setLiquidationForm((current) => ({
      ...current,
      charges: [...(current.charges || []), createLiquidationCharge()],
    }));
  }

  function removeLiquidationCharge(index) {
    setLiquidationForm((current) => ({
      ...current,
      charges: (current.charges || []).filter(
        (_, chargeIndex) => chargeIndex !== index,
      ),
    }));
  }

  async function buildLiquidationPayload({ uploadPhotos = false } = {}) {
    if (!liquidationForm.liquidationDate) {
      setLiquidationError("Vui lòng chọn ngày thanh lý.");
      return null;
    }
    let uploadedCharges = liquidationForm.charges || [];
    for (const charge of liquidationForm.charges || []) {
      const meterCharge = isMeterLiquidationCharge(charge.lineType);
      const quantity = meterCharge
        ? getLiquidationMeterEstimate(charge)?.billableUsage
        : Number(charge.quantity || 0);
      const unitPrice = Number(charge.unitPrice || 0);
      const previousValue = Number(charge.previousValue || 0);
      const currentValue = Number(charge.currentValue || 0);
      if (
        meterCharge &&
        (!Number.isFinite(previousValue) ||
          !Number.isFinite(currentValue) ||
          previousValue < 0 ||
          currentValue < 0 ||
          currentValue < previousValue)
      ) {
        setLiquidationError("Chỉ số mới không được nhỏ hơn chỉ số cũ.");
        return null;
      }
      if (
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        (!meterCharge && unitPrice > 0 && quantity <= 0)
      ) {
        setLiquidationError(
          "Vui lòng kiểm tra số lượng và đơn giá các khoản thanh lý.",
        );
        return null;
      }
    }
    if (uploadPhotos) {
      uploadedCharges = [];
      for (const charge of liquidationForm.charges || []) {
        if (isMeterLiquidationCharge(charge.lineType) && charge.proofFile) {
          const uploaded = await uploadFile(charge.proofFile, "METER_PHOTO");
          uploadedCharges.push({
            ...charge,
            proofFile: null,
            photoFileId: uploaded?.fileId || uploaded?.id || null,
          });
        } else {
          uploadedCharges.push(charge);
        }
      }
      setLiquidationForm((current) => ({
        ...current,
        charges: uploadedCharges,
      }));
    }
    const charges = normalizeLiquidationCharges(uploadedCharges);
    return {
      liquidationDate: liquidationForm.liquidationDate,
      reason: liquidationForm.reason,
      charges,
    };
  }

  async function handleSaveLiquidationDraft(item) {
    if (!item?.leaseContractId) return;
    setActionLoading(`liquidation-draft-${item.leaseContractId}`);
    setLiquidationError("");
    setError("");
    try {
      const payload = await buildLiquidationPayload({ uploadPhotos: true });
      if (!payload) return;
      const updated = await updateLeaseContractLiquidationDraft(
        item.leaseContractId,
        payload,
      );
      await refreshSelectedContract(updated);
      setIsEditingLiquidation(false);
      toast.success("Đã lưu hồ sơ thanh lý.");
    } catch (err) {
      setLiquidationError(
        err?.details || err?.message || "Không lưu được hồ sơ thanh lý.",
      );
      toast.error(err?.message || "Không lưu được hồ sơ thanh lý.");
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
      return { ...current, [field]: value };
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
    const startDate =
      renewForm.startDate || toDateInputValue(mergedSelected.startDate);
    const currentEndDate =
      renewForm.currentEndDate || toDateInputValue(mergedSelected.endDate);

    if (!startDate) {
      validationErrors.startDate = "Hợp đồng chưa có ngày bắt đầu.";
    }
    if (!renewForm.endDate) {
      validationErrors.endDate = "Vui lòng chọn ngày kết thúc sau gia hạn.";
    } else if (startDate && renewForm.endDate <= startDate) {
      validationErrors.endDate =
        "Ngày kết thúc phải sau ngày bắt đầu hợp đồng.";
    } else if (currentEndDate && renewForm.endDate <= currentEndDate) {
      validationErrors.endDate =
        "Ngày kết thúc sau gia hạn phải sau ngày kết thúc hiện tại.";
    }
    if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
      validationErrors.monthlyRent = "Giá thuê phải lớn hơn 0.";
    }
    if (![1, 3].includes(paymentCycleMonths)) {
      validationErrors.paymentCycleMonths =
        "Chu kỳ thanh toán chỉ được là 1 hoặc 3 tháng.";
    }
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      validationErrors.depositAmount = "Tiền cọc phải lớn hơn hoặc bằng 0.";
    }
    if (Object.keys(validationErrors).length > 0) {
      setRenewFieldErrors(validationErrors);
      setRenewError("Vui lòng kiểm tra thông tin gia hạn.");
      return;
    }

    setActionLoading(`renew-${mergedSelected.leaseContractId}`);
    setRenewError("");
    setError("");
    try {
      const updated = await updateLeaseContractTerms(
        mergedSelected.leaseContractId,
        {
          startDate,
          endDate: renewForm.endDate,
          monthlyRent,
          paymentCycleMonths,
          depositAmount,
        },
      );
      setRenewModalOpen(false);
      await refreshSelectedContract(updated);
      toast.success("Đã gia hạn hợp đồng.");
    } catch (err) {
      const serverErrors =
        err?.payload?.data?.fieldErrors ||
        err?.payload?.data?.field_errors ||
        {};
      setRenewFieldErrors({
        startDate: serverErrors.startDate || serverErrors.start_date,
        endDate: serverErrors.endDate || serverErrors.end_date,
        paymentCycleMonths:
          serverErrors.paymentCycleMonths || serverErrors.payment_cycle_months,
        monthlyRent: serverErrors.monthlyRent || serverErrors.monthly_rent,
        depositAmount:
          serverErrors.depositAmount || serverErrors.deposit_amount,
      });
      setRenewError(
        Object.keys(serverErrors).length > 0
          ? "Vui lòng kiểm tra các trường được đánh dấu đỏ."
          : err?.details || err?.message || "Không thể gia hạn hợp đồng.",
      );
      toast.error(err?.message || "Không thể gia hạn hợp đồng.");
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
      const requiresMoveOutDate = ["MOVE_OUT", "TRANSFER"].includes(
        intentionForm.intention,
      );
      await recordLeaseContractTenantIntention(mergedSelected.leaseContractId, {
        ...intentionForm,
        expectedMoveOutDate: requiresMoveOutDate
          ? intentionForm.expectedMoveOutDate
          : "",
      });
      const refreshedDetails = await fetchManagementLeaseContractDetails(
        mergedSelected.leaseContractId,
      );
      setDetails(refreshedDetails);
      await loadContracts();
      setIntentionModalOpen(false);
    } catch (err) {
      setIntentionError(
        err?.details || err?.message || "Không thể ghi nhận ý định khách.",
      );
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
    setPage(1);
    setTimePanelQuarter(getQuarterForTimeFilter(value));
    setTimePopoverOpen(false);
  }

  function handleExportExcel() {
    const exportScope = [
      selectedYear === "all" ? "tat-ca-nam" : `nam-${selectedYear}`,
      timeFilter === "all" ? "tat-ca-thoi-gian" : timeFilter.toLowerCase(),
      roomFilter === "all" ? "tat-ca-phong" : `phong-${roomFilter}`,
    ].join("-");
    const header = [
      "Ma HD",
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
  const canUseLiquidationActions = user?.role === ROLES.OWNER;

  return (
    <div className="w-full min-w-0 flex flex-col gap-6 text-[#091426] text-[13px] xl:text-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      {
        <DashboardPageHeader
          title={`Quản lý hợp đồng thuê ${selectedYear === "all" ? "Tất cả năm" : `năm ${selectedYear}`}`}
        />
      }


      <section className="rounded-xl border border-[#dfe5ef] bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] xl:p-5">
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative">
            <FileCheck2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a98af]" />
            <select
              value={fileFilter}
              onChange={(event) => {
                setFileFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 w-full appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-3 text-sm font-bold text-[#091426] outline-none focus:border-[#091426]"
            >
              <option value="all">Tất cả file</option>
              <option value="uploaded">Đã upload</option>
              <option value="missing">Chưa upload</option>
            </select>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={openTimePopover}
              aria-expanded={timePopoverOpen}
              className="inline-flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-bold text-[#091426] outline-none transition hover:border-[#9ba8ba] focus:border-[#091426] dark:border-white/10 dark:bg-[#0f172a] dark:text-white"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#8a98af]" />
                <span className="truncate">{activeTimeLabel}</span>
              </span>
              <span className="text-xs text-[#8a98af]">
                {timePopoverOpen ? "Thu gọn" : "Mở"}
              </span>
            </button>

            {timePopoverOpen && (
              <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#dfe5ef] bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#0f172a]">
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <div className="flex flex-col gap-1 border-r border-[#edf1f6] pr-3 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => selectTimeFilter("all")}
                      className={`h-9 rounded-lg px-3 text-left text-xs font-extrabold transition ${
                        timeFilter === "all"
                          ? "bg-[#091426] text-white"
                          : "text-slate-600 hover:bg-[#f5f7fb] hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                      }`}
                    >
                      Cả năm
                    </button>
                    {TIME_QUARTERS.map((quarter) => (
                      <button
                        key={quarter.id}
                        type="button"
                        onMouseEnter={() => setTimePanelQuarter(quarter.id)}
                        onFocus={() => setTimePanelQuarter(quarter.id)}
                        onClick={() => selectTimeFilter(quarter.id)}
                        className={`h-9 rounded-lg px-3 text-left text-xs font-extrabold transition ${
                          timeFilter === quarter.id ||
                          timePanelQuarter === quarter.id
                            ? "bg-[#eff6ff] text-[#1e40af] dark:bg-[#1e40af]/20 dark:text-[#93c5fd]"
                            : "text-slate-600 hover:bg-[#f5f7fb] hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                        }`}
                      >
                        {quarter.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {visibleTimeQuarter.months.map((month) => (
                      <button
                        key={month}
                        type="button"
                        onClick={() => selectTimeFilter(`M${month}`)}
                        className={`h-9 rounded-lg border px-3 text-left text-xs font-extrabold transition ${
                          timeFilter === `M${month}`
                            ? "border-[#091426] bg-[#091426] text-white"
                            : "border-[#edf1f6] bg-white text-slate-600 hover:border-[#9ba8ba] hover:bg-[#f8fafc] hover:text-slate-900 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                        }`}
                      >
                        Tháng {month}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <label>
            <span className="sr-only">Lọc theo phòng</span>
            <select
              value={roomFilter}
              onChange={(event) => {
                setRoomFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-bold text-[#091426] outline-none focus:border-[#091426] dark:border-white/10 dark:bg-[#0f172a] dark:text-white"
            >
              <option value="all">Tất cả phòng</option>
              {roomOptions.map((roomCode) => (
                <option key={roomCode} value={roomCode}>
                  Phòng {roomCode}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.id);
                  setPage(1);
                }}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openCleanupModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 text-xs font-extrabold text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300"
            >
              <AlertTriangle className="h-4 w-4" />
              Dọn dữ liệu cũ
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-4 text-xs font-extrabold text-white transition hover:bg-[#1d4ed8] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
            >
              <Download className="h-4 w-4" />
              Xuất Excel
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(HISTORY_FILTER.id);
                setPage(1);
              }}
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
        <div className="dashboard-table contract-management-table">
          <table className="table-auto text-left text-[12px] xl:text-sm [&_td]:px-2 [&_td]:py-4 xl:[&_td]:px-2.5 xl:[&_td]:py-4 [&_th]:px-2 [&_th]:py-3 xl:[&_th]:px-2.5 xl:[&_th]:py-3">
            <colgroup>
              <col style={{ width: "18%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "16%" }} />
            </colgroup>
            <thead className="bg-[#f7f9fe] dark:bg-white/5 text-[10px] font-extrabold uppercase tracking-[0.03em] text-slate-500 dark:text-slate-400 xl:text-xs">
              <tr>
                <th className="!pl-5 xl:!pl-6 text-center">Mã HĐ</th>
                <th className="text-center">Phòng</th>
                <th className="text-center">Người ký chính</th>
                <th className="text-center">Thời hạn</th>
                <th className="text-center">Giá thuê</th>
                <th className="text-center">Trạng thái</th>
                <th className="contract-management-table__action !px-2 text-center xl:!px-2.5">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-sm font-bold text-[#607089]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải dữ liệu hợp đồng...
                    </span>
                  </td>
                </tr>
              )}

              {!loading &&
                pagedContracts.map((item, index) => (
                  <tr
                    key={getContractRowKey(item, index)}
                    className="bg-white dark:bg-[#0f172a] transition hover:bg-[#f8fbff] dark:hover:bg-white/5"
                  >
                    <td
                      data-label="Mã HĐ"
                      className="!pl-5 align-middle xl:!pl-6"
                    >
                      <p className="font-extrabold leading-5 text-slate-900 dark:text-white">
                        {getContractDisplayName(item)}
                      </p>
                      {!item.leaseContractId && item.depositCode && (
                        <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 xl:text-xs">
                          Mã cọc: {item.depositCode}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-[#7b8495] xl:text-xs">
                        {item.propertyName || "Chưa có cơ sở"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {getWorkflow(item) === "RENEWED" && (
                          <span className="rounded-full border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:text-blue-300">
                            Hợp đồng cũ
                          </span>
                        )}
                        {item.previousContractId &&
                          CURRENT_CONTRACT_WORKFLOWS.has(getWorkflow(item)) && (
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
                              (contract) =>
                                String(contract.leaseContractId) ===
                                String(item.renewedContractId),
                            );
                            selectContract(
                              renewed || {
                                leaseContractId: item.renewedContractId,
                                contractId: item.renewedContractId,
                                contractCode: item.renewedContractCode,
                                displayCode: item.renewedContractCode,
                              },
                            );
                          }}
                          className="mt-2 block text-left text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline xl:text-xs"
                        >
                          Xem HĐ mới{" "}
                          {item.renewedContractCode ||
                            `#${item.renewedContractId}`}
                        </button>
                      )}
                      {item.previousContractId && (
                        <button
                          type="button"
                          onClick={() => {
                            const previous = contracts.find(
                              (contract) =>
                                String(contract.leaseContractId) ===
                                String(item.previousContractId),
                            );
                            selectContract(
                              previous || {
                                leaseContractId: item.previousContractId,
                                contractId: item.previousContractId,
                                contractCode: item.previousContractCode,
                                displayCode: item.previousContractCode,
                              },
                            );
                          }}
                          className="mt-2 block text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline xl:text-xs"
                        >
                          Hợp đồng trước:{" "}
                          {item.previousContractCode ||
                            `#${item.previousContractId}`}
                        </button>
                      )}
                    </td>
                    <td data-label="Phòng" className="align-middle text-center">
                      <span className="inline-flex items-center gap-1 font-extrabold text-slate-900 dark:text-white">
                        {item.roomCode || "-"}
                      </span>
                    </td>
                    <td data-label="Người ký chính" className="align-middle text-center">
                      <p className="font-extrabold leading-5 text-[#091426]">
                        {item.primaryTenantName ||
                          item.customerName ||
                          "Chưa có"}
                      </p>
                    </td>
                    
                    <td data-label="Thời hạn" className="align-middle text-center">
                      <p className="font-semibold leading-5 text-[#091426]">
                        {formatDate(
                          item.startDate || item.expectedLeaseSignDate,
                        )}
                      </p>
                      <p className="text-[11px] leading-5 text-[#7b8495] xl:text-xs">
                        đến{" "}
                        {formatDate(item.endDate || item.expectedMoveInDate)}
                      </p>
                    </td>
                    <td data-label="Giá thuê" className="align-middle text-center">
                      <p className="font-extrabold leading-5 text-[#091426]">
                        {formatMoney(item.monthlyRent)}
                      </p>
                    </td>
                    <td data-label="Trạng thái" className="align-middle text-center">
                      <StatusBadge item={item} />
                    </td>
                    <td
                      data-label="Thao tác"
                      className="contract-management-table__action !px-2 text-center align-middle xl:!px-2.5"
                    >
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectContract(item);
                          }}
                          className="inline-flex h-9 min-w-[9.75rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#d1d7e0] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-[11px] font-extrabold text-slate-900 dark:text-white shadow-[0_3px_8px_rgba(15,23,42,0.04)] transition hover:bg-[#f8fafc] dark:hover:bg-white/5 xl:h-10 xl:text-xs"
                        >
                          {needsActivationFlow(item) ? (
                            <FileCheck2 className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                          {needsActivationFlow(item)
                            ? "Kích hoạt hợp đồng"
                            : "Xem chi tiết"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && filteredContracts.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-sm font-bold text-[#7b8495]"
                  >
                    Không có hợp đồng phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredTotalElements > size ? (
          <DashboardPagination
            page={page}
            size={size}
            totalElements={filteredTotalElements}
            totalPages={filteredTotalPages}
            itemLabel="hợp đồng"
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
          />
        ) : null}
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
        <Dialog
          open={Boolean(mergedSelected)}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              setIsEditingTerms(false);
              setTermsFieldErrors({});
              setTermsError("");
            }
          }}
        >
          <DialogContent
            showCloseButton={false}
            id="contract-detail-dialog"
            className="custom-scrollbar flex max-h-[92vh] w-[calc(100%-1rem)] !max-w-7xl flex-col overflow-y-auto rounded-xl bg-white p-0 shadow-2xl sm:rounded-xl"
          >
            <header className="relative bg-[#05091d] px-5 py-7 text-white xl:px-7 xl:py-8">
              <DialogClose asChild>
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
              </DialogClose>
              <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-slate-300 xl:text-xs">
                Chi tiết hợp đồng
              </p>
              <DialogTitle className="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-white xl:text-3xl">
                {selectedDetailTitle}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Thông tin chi tiết và các thao tác quản lý hợp đồng.
              </DialogDescription>
              {selectedLeaseContractFilename &&
                selectedContractDisplayName &&
                selectedContractDisplayName !==
                  selectedLeaseContractFilename && (
                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    Mã hợp đồng: {selectedContractDisplayName}
                  </p>
                )}
              {!mergedSelected.leaseContractId &&
                mergedSelected.depositCode && (
                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    Mã cọc: {mergedSelected.depositCode}
                  </p>
                )}
              <div className="mt-4">
                <StatusBadge item={mergedSelected} />
              </div>
            </header>

            <div className="grid gap-4 px-5 py-5 xl:gap-5 xl:px-7 lg:grid-cols-2">
              {getTransferContractNotice(mergedSelected) && (
                <div className="lg:col-span-2 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-extrabold">
                      Hợp đồng thuộc luồng chuyển phòng
                    </p>
                    <p className="mt-1">
                      {getTransferContractNotice(mergedSelected)}
                    </p>
                  </div>
                </div>
              )}
              {isRoomTransferManagedContract(mergedSelected) &&
                !isTransferExecuted(mergedSelected) && (
                  <DetailCard
                    title="Xử lý hợp đồng chuyển phòng"
                    icon={ArrowRightLeft}
                    className="lg:col-span-2"
                  >
                    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <InfoValue
                          label="Yêu cầu chuyển phòng"
                          value={
                            mergedSelected.transferRequestCode ||
                            `#${mergedSelected.transferRequestId}`
                          }
                        />
                        <InfoValue
                          label="Trạng thái chuyển phòng"
                          value={getTransferContractStatusLabel(mergedSelected)}
                        />
                        <InfoValue
                          label="File đã ký"
                          value={
                            getLeaseSignedFileId(mergedSelected)
                              ? selectedSignedLeaseContractFilename
                              : "Chưa upload"
                          }
                        />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {[
                          "WAITING_TRANSFER_DATE",
                          "READY_FOR_HANDOVER",
                          "WAITING_EXECUTION",
                        ].includes(mergedSelected.transferStatus) && (
                          <button
                            type="button"
                            onClick={() =>
                              openTransferExecutionModal(mergedSelected)
                            }
                            disabled={isBusy}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                            {mergedSelected.transferStatus ===
                            "WAITING_EXECUTION"
                              ? "Hoàn tất chuyển phòng"
                              : "Chốt phòng cũ"}
                          </button>
                        )}
                        {mergedSelected.transferStatus ===
                          "WAITING_CONTRACT_CONFIRMATION" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleConfirmTransferContract(mergedSelected)
                            }
                            disabled={isBusy}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {actionLoading ===
                            `transfer-confirm-${mergedSelected.transferRequestId}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Xác nhận hợp đồng
                          </button>
                        )}
                        {isTransferSigningStatus(
                          mergedSelected.transferStatus,
                        ) && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadTransferDraft(mergedSelected)
                              }
                              disabled={isBusy}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-extrabold text-[#091426] hover:bg-[#f8fafc] disabled:opacity-60"
                            >
                              {actionLoading ===
                              `transfer-download-${mergedSelected.leaseContractId}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              Tải bản nháp
                            </button>
                            <button
                              type="button"
                              onClick={() => openUploadDialog(mergedSelected)}
                              disabled={isBusy}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-extrabold text-[#091426] hover:bg-[#f8fafc] disabled:opacity-60"
                            >
                              <Upload className="h-4 w-4" />
                              {getLeaseSignedFileId(mergedSelected)
                                ? "Thay file ký"
                                : "Upload bản ký"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleConfirmTransferDocumentSigned(
                                  mergedSelected,
                                )
                              }
                              disabled={
                                isBusy ||
                                !getLeaseSignedFileId(mergedSelected) ||
                                mergedSelected.status === "SIGNED"
                              }
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {actionLoading ===
                              `transfer-contract-sign-${mergedSelected.leaseContractId}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              {mergedSelected.status === "SIGNED"
                                ? "Đã xác nhận ký"
                                : "Xác nhận hợp đồng này"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {!isTransferSigningStatus(mergedSelected.transferStatus) &&
                      mergedSelected.transferStatus !==
                        "WAITING_CONTRACT_CONFIRMATION" && (
                        <p className="mt-4 rounded-lg border border-[#dfe5ef] bg-white px-4 py-3 text-sm font-semibold text-[#607089]">
                          Trạng thái chuyển phòng hiện tại:{" "}
                          {getTransferContractStatusLabel(mergedSelected)}. Tất
                          cả thao tác xử lý đều làm ngay tại khối này.
                        </p>
                      )}
                  </DetailCard>
                )}
              {needsActivationFlow(mergedSelected) ? (
                <ContractActivationFlow
                  contract={mergedSelected}
                  details={details}
                  actionLoading={actionLoading}
                  draftError={error}
                  handoverRefreshKey={handoverRefreshKey}
                  onCreateDraft={handleCreateDraft}
                  onContractUpdated={handleContractUpdated}
                  onHandoverSaved={handleHandoverSaved}
                  onActivate={() => handleActivate(mergedSelected)}
                  onReadinessChange={setActivationReadiness}
                />
              ) : (
                <>
                  {getWorkflow(mergedSelected) === "EXPIRED" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 lg:col-span-2">
                      Hợp đồng đã hết hạn. Vui lòng gia hạn hoặc thanh lý.
                    </div>
                  )}
                  {getWorkflow(mergedSelected) === "RENEWED" &&
                    mergedSelected.renewedContractId && (
                      <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          Hợp đồng đã được gia hạn sang{" "}
                          {mergedSelected.renewedContractCode ||
                            `#${mergedSelected.renewedContractId}`}
                          .
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const renewed = contracts.find(
                              (item) =>
                                String(item.leaseContractId) ===
                                String(mergedSelected.renewedContractId),
                            );
                            setSelected(
                              renewed || {
                                leaseContractId:
                                  mergedSelected.renewedContractId,
                                contractId: mergedSelected.renewedContractId,
                                contractCode:
                                  mergedSelected.renewedContractCode,
                                displayCode: mergedSelected.renewedContractCode,
                              },
                            );
                          }}
                          className="h-9 shrink-0 rounded-lg bg-blue-700 px-4 text-xs font-extrabold text-white hover:bg-blue-800"
                        >
                          Xem hợp đồng mới
                        </button>
                      </div>
                    )}

                  <DetailCard title="Thông tin phòng" icon={Home}>
                    {isEditingTerms ? (
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:gap-5">
                        <InfoValue
                          label="Cơ sở"
                          value={
                            mergedSelected.propertyName ||
                            mergedSelected.property?.name
                          }
                        />
                        <InfoValue
                          label="Phòng"
                          value={
                            mergedSelected.roomCode ||
                            mergedSelected.room?.roomCode
                          }
                        />
                        <label className="grid min-w-0 gap-1.5">
                          <span className="text-xs font-bold text-[#58667c]">
                            Giá thuê/tháng *
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="1000"
                            value={termsForm.monthlyRent}
                            onChange={(event) =>
                              updateTermsField(
                                "monthlyRent",
                                event.target.value,
                              )
                            }
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
                          <span className="text-xs font-bold text-[#58667c]">
                            Số tiền đóng mỗi kỳ
                          </span>
                          <input
                            readOnly
                            value={formatMoney(amountPerPeriod)}
                            className="h-10 min-w-0 rounded-lg border border-[#d8e1ef] bg-[#f2f6fc] px-3 text-sm font-extrabold text-[#091426]"
                          />
                        </label>
                        <label className="grid min-w-0 gap-1.5">
                          <span className="text-xs font-bold text-[#58667c]">
                            Tiền cọc *
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={termsForm.depositAmount}
                            onChange={(event) =>
                              updateTermsField(
                                "depositAmount",
                                event.target.value,
                              )
                            }
                            aria-invalid={Boolean(
                              termsFieldErrors.depositAmount,
                            )}
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
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:gap-5">
                        <InfoValue
                          label="Cơ sở"
                          value={
                            mergedSelected.propertyName ||
                            mergedSelected.property?.name
                          }
                        />
                        <InfoValue
                          label="Phòng"
                          value={
                            mergedSelected.roomCode ||
                            mergedSelected.room?.roomCode
                          }
                        />
                        <InfoValue
                          label="Giá thuê/tháng"
                          value={formatOptionalMoney(
                            mergedSelected.monthlyRent,
                          )}
                        />
                        <InfoValue
                          label="Số tiền đóng mỗi kỳ"
                          value={formatOptionalMoney(
                            getAmountPerPeriod(mergedSelected),
                          )}
                        />
                        <InfoValue
                          label="Tiền cọc"
                          value={formatOptionalMoney(
                            mergedSelected.depositAmount,
                          )}
                        />
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
                      ![
                        "LIQUIDATED",
                        "EXPIRED",
                        "CANCELLED",
                        "RENEWED",
                      ].includes(getWorkflow(mergedSelected)) ? (
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
                          {isEditingTerms ? (
                            <X className="h-3.5 w-3.5" />
                          ) : (
                            <Pencil className="h-3.5 w-3.5" />
                          )}
                          {isEditingTerms ? "Hủy" : "Cập nhật"}
                        </button>
                      ) : null
                    }
                  >
                    {isEditingTerms ? (
                      <div className="mt-5">
                        <div className="grid gap-3 sm:grid-cols-2 xl:gap-4">
                          <InfoValue
                            label="Mã hợp đồng"
                            value={getContractDisplayName(mergedSelected)}
                          />
                          <InfoValue
                            label="Trạng thái"
                            value={getStatusLabel(mergedSelected)}
                          />
                          <label className="grid min-w-0 gap-1.5">
                            <span className="text-xs font-bold text-[#58667c]">
                              Ngày bắt đầu *
                            </span>
                            <DateInput
                              value={termsForm.startDate}
                              onChange={(event) =>
                                updateTermsField(
                                  "startDate",
                                  event.target.value,
                                )
                              }
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
                            <span className="text-xs font-bold text-[#58667c]">
                              Ngày kết thúc *
                            </span>
                            <DateInput
                              value={termsForm.endDate}
                              min={termsForm.startDate || undefined}
                              onChange={(event) =>
                                updateTermsField("endDate", event.target.value)
                              }
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
                            <span className="text-xs font-bold text-[#58667c]">
                              Chu kỳ thanh toán *
                            </span>
                            <select
                              value={termsForm.paymentCycleMonths}
                              onChange={(event) =>
                                updateTermsField(
                                  "paymentCycleMonths",
                                  event.target.value,
                                )
                              }
                              aria-invalid={Boolean(
                                termsFieldErrors.paymentCycleMonths,
                              )}
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
                          <InfoValue
                            label="Ngày bắt đầu tính tiền"
                            value={formatDate(previewRentStartDate)}
                          />
                          <InfoValue
                            label="Hợp đồng trước"
                            value={
                              mergedSelected.previousContractCode ||
                              (mergedSelected.previousContractId
                                ? `#${mergedSelected.previousContractId}`
                                : "Chưa có")
                            }
                          />
                          <InfoValue
                            label="Hợp đồng gia hạn"
                            value={
                              mergedSelected.renewedContractCode ||
                              (mergedSelected.renewedContractId
                                ? `#${mergedSelected.renewedContractId}`
                                : "Chưa có")
                            }
                          />
                          <InfoValue
                            label="File hợp đồng"
                            value={
                              getLeaseSignedFileId(mergedSelected)
                                ? selectedSignedLeaseContractFilename
                                : "Chưa có"
                            }
                          />
                        </div>

                        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-800">
                          Ngày bắt đầu tính tiền thực tế:{" "}
                          <strong>{formatDate(previewRentStartDate)}</strong>.
                          {termsForm.startDate &&
                          new Date(
                            `${termsForm.startDate}T00:00:00`,
                          ).getDate() > 10
                            ? " Theo quy tắc hiện tại, hợp đồng bắt đầu sau ngày 10 sẽ tính tiền từ ngày 01 tháng kế tiếp."
                            : " Hợp đồng bắt đầu từ ngày 01 đến ngày 10 sẽ tính tiền ngay từ ngày bắt đầu."}
                        </div>

                        {shortThreeMonthCycle && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800">
                            Thời hạn hợp đồng còn dưới 3 tháng nhưng đang chọn
                            chu kỳ 3 tháng/lần. Hệ thống vẫn cho lưu, vui lòng
                            kiểm tra lại lịch thu tiền.
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
                          {actionLoading ===
                          `terms-${mergedSelected.leaseContractId}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Lưu thông tin hợp đồng
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:gap-5">
                        <InfoValue
                          label="Mã hợp đồng"
                          value={getContractDisplayName(mergedSelected)}
                        />
                        <InfoValue
                          label="Trạng thái"
                          value={getStatusLabel(mergedSelected)}
                        />
                        <InfoValue
                          label="Ngày bắt đầu"
                          value={formatDate(mergedSelected.startDate)}
                        />
                        <InfoValue
                          label="Ngày kết thúc"
                          value={formatDate(mergedSelected.endDate)}
                        />
                        <InfoValue
                          label="Ngày bắt đầu tính tiền"
                          value={formatDate(mergedSelected.rentStartDate)}
                        />
                        <InfoValue
                          label="Chu kỳ thanh toán"
                          value={formatCycle(mergedSelected.paymentCycleMonths)}
                        />
                        <InfoValue
                          label="Hợp đồng trước"
                          value={
                            mergedSelected.previousContractCode ||
                            (mergedSelected.previousContractId
                              ? `#${mergedSelected.previousContractId}`
                              : "Chưa có")
                          }
                        />
                        <InfoValue
                          label="Hợp đồng gia hạn"
                          value={
                            mergedSelected.renewedContractCode ||
                            (mergedSelected.renewedContractId
                              ? `#${mergedSelected.renewedContractId}`
                              : "Chưa có")
                          }
                        />
                        <InfoValue
                          label="File hợp đồng"
                          value={
                            getLeaseSignedFileId(mergedSelected)
                              ? selectedSignedLeaseContractFilename
                              : "Chưa có"
                          }
                        />
                      </div>
                    )}
                  </DetailCard>

                  {(mergedSelected.liquidationId ||
                    getWorkflow(mergedSelected) === "TERMINATION_PENDING") && (
                    <DetailCard
                      title="Hồ sơ thanh lý"
                      icon={FileWarning}
                      className="lg:col-span-2"
                      action={
                        canUseLiquidationActions &&
                        mergedSelected.liquidationStatus !== "CONFIRMED" ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingLiquidation) {
                                setLiquidationForm(
                                  buildLiquidationForm(mergedSelected),
                                );
                                setLiquidationError("");
                                setIsEditingLiquidation(false);
                              } else {
                                openLiquidationEditor(mergedSelected);
                              }
                            }}
                            disabled={isBusy}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-extrabold text-[#091426] hover:bg-[#f8fafc] disabled:opacity-60"
                          >
                            {isEditingLiquidation ? (
                              <X className="h-3.5 w-3.5" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5" />
                            )}
                            {isEditingLiquidation ? "Hủy" : "Cập nhật"}
                          </button>
                        ) : null
                      }
                    >
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:gap-5">
                        {isEditingLiquidation ? (
                          <>
                            <label className="grid min-w-0 gap-1.5">
                              <span className="text-xs font-bold text-[#58667c]">
                                Ngày thanh lý *
                              </span>
                              <DateInput
                                value={liquidationForm.liquidationDate}
                                onChange={(event) =>
                                  updateLiquidationField(
                                    "liquidationDate",
                                    event.target.value,
                                  )
                                }
                                className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#091426]"
                              />
                            </label>
                            <LiquidationChargeRows
                              charges={liquidationDraftCharges}
                              onAdd={addLiquidationCharge}
                              onChange={updateLiquidationCharge}
                              onProofChange={updateLiquidationChargeProof}
                              onRemove={removeLiquidationCharge}
                            />
                            <div className="grid gap-3 rounded-lg border border-[#dfe5ef] bg-white p-3 sm:col-span-2 sm:grid-cols-4">
                              <InfoValue
                                label="Tổng phí chốt"
                                value={formatMoney(liquidationDraftSubtotal)}
                              />
                              <InfoValue
                                label="Khách còn phải trả"
                                value={formatMoney(
                                  liquidationDraftRemainingPayable,
                                )}
                              />
                              <InfoValue
                                label="Cọc phải hoàn"
                                value={formatMoney(
                                  liquidationDraftRemainingDeposit,
                                )}
                              />
                            </div>
                            <label className="grid min-w-0 gap-1.5 sm:col-span-2">
                              <span className="text-xs font-bold text-[#58667c]">
                                Lý do thanh lý
                              </span>
                              <textarea
                                rows={3}
                                value={liquidationForm.reason}
                                onChange={(event) =>
                                  updateLiquidationField(
                                    "reason",
                                    event.target.value,
                                  )
                                }
                                className="min-h-24 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#091426]"
                              />
                            </label>
                          </>
                        ) : (
                          <>
                            <InfoValue
                              label="Trạng thái hồ sơ"
                              value={
                                mergedSelected.liquidationStatus === "CONFIRMED"
                                  ? "Đã xác nhận"
                                  : "Bản nháp"
                              }
                            />
                            <InfoValue
                              label="Ngày thanh lý"
                              value={formatDate(
                                mergedSelected.liquidationDate ||
                                  mergedSelected.expectedVacantDate,
                              )}
                            />
                            <InfoValue
                              label="Cọc đã thanh toán"
                              value={formatOptionalMoney(
                                mergedSelected.liquidationDepositAmount ??
                                  mergedSelected.depositAmount,
                              )}
                            />
                            <InfoValue
                              label="Hoàn trả cọc"
                              value={formatOptionalMoney(
                                mergedSelected.liquidationDepositRefundAmount ??
                                  mergedSelected.depositAmount,
                              )}
                            />
                            <InfoValue
                              label="Trạng thái hoàn cọc"
                              value={getDepositRefundStatusLabel(
                                mergedSelected.liquidationDepositRefundStatus,
                              )}
                            />
                            <InfoValue
                              label="Yêu cầu duyệt hoàn cọc"
                              value={
                                mergedSelected.liquidationDepositRefundExpenseRequestId
                                  ? `#${mergedSelected.liquidationDepositRefundExpenseRequestId}`
                                  : "Chưa có"
                              }
                            />
                            <InfoValue
                              label="Đã ghi nhận hoàn"
                              value={formatOptionalMoney(
                                mergedSelected.liquidationDepositRefundedAmount,
                              )}
                            />
                            <InfoValue
                              label="Mã giao dịch hoàn"
                              value={
                                mergedSelected.liquidationDepositRefundTransactionRef
                              }
                            />
                            <InfoValue
                              label="Hóa đơn chốt"
                              value={
                                mergedSelected.liquidationFinalInvoiceCode ||
                                (mergedSelected.liquidationFinalInvoiceId
                                  ? `#${mergedSelected.liquidationFinalInvoiceId}`
                                  : "Chưa có")
                              }
                            />
                            <InfoValue
                              label="Trạng thái hóa đơn"
                              value={
                                mergedSelected.liquidationFinalInvoiceStatus ||
                                "Chưa có"
                              }
                            />
                            <InfoValue
                              label="Tổng phí chốt"
                              value={formatOptionalMoney(
                                mergedSelected.liquidationFinalInvoiceSubtotalAmount,
                              )}
                            />
                            <InfoValue
                              label="Khách còn phải trả"
                              value={formatOptionalMoney(
                                mergedSelected.liquidationFinalInvoiceRemainingAmount,
                              )}
                            />
                            <InfoValue
                              label="Lý do thanh lý"
                              value={mergedSelected.liquidationReason}
                            />
                            <div className="sm:col-span-2">
                              <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-[#58667c]">
                                Chi tiết khoản thanh lý
                              </p>
                              <LiquidationInvoiceLines
                                lines={
                                  mergedSelected.liquidationFinalInvoiceLines ||
                                  []
                                }
                              />
                            </div>
                            {Number(
                              mergedSelected.liquidationDepositRefundAmount ||
                                0,
                            ) > 0 &&
                              mergedSelected.liquidationDepositRefundStatus !==
                                "TENANT_CONFIRMED" && (
                                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 sm:col-span-2">
                                  Cần hoàn cọc qua yêu cầu chi, upload minh
                                  chứng và chờ khách thuê xác nhận trước khi
                                  hoàn tất thanh lý.
                                </p>
                              )}
                          </>
                        )}
                      </div>
                      {!canUseLiquidationActions &&
                        mergedSelected.liquidationStatus !== "CONFIRMED" && (
                          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                            Chỉ chủ trọ được cập nhật hồ sơ và hoàn tất thanh lý
                            hợp đồng.
                          </p>
                        )}
                      {liquidationError && (
                        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                          {liquidationError}
                        </p>
                      )}
                      {canUseLiquidationActions &&
                        mergedSelected.liquidationStatus !== "CONFIRMED" && (
                          <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveLiquidationDraft(mergedSelected)
                              }
                              disabled={isBusy}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-extrabold text-[#091426] hover:bg-[#f8fafc] disabled:opacity-60"
                            >
                              {actionLoading ===
                              `liquidation-draft-${mergedSelected.leaseContractId}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Lưu hồ sơ
                            </button>
                            {!isEditingLiquidation &&
                              mergedSelected.liquidationFinalInvoiceId && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleLiquidate(mergedSelected)
                                  }
                                  disabled={
                                    isBusy ||
                                    (Number(
                                      mergedSelected.liquidationDepositRefundAmount ||
                                        0,
                                    ) > 0 &&
                                      mergedSelected.liquidationDepositRefundStatus !==
                                        "TENANT_CONFIRMED")
                                  }
                                  title={
                                    Number(
                                      mergedSelected.liquidationDepositRefundAmount ||
                                        0,
                                    ) > 0 &&
                                    mergedSelected.liquidationDepositRefundStatus !==
                                      "TENANT_CONFIRMED"
                                      ? "Cần hoàn cọc và chờ khách thuê xác nhận trước."
                                      : undefined
                                  }
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {actionLoading ===
                                  `liquidate-${mergedSelected.leaseContractId}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                  Hoàn tất thanh lý
                                </button>
                              )}
                          </div>
                        )}
                    </DetailCard>
                  )}

                  <DetailCard
                    title="Người ở trong hợp đồng"
                    icon={Users}
                    className="lg:col-span-2"
                  >
                    <div className="dashboard-table custom-scrollbar mt-5 rounded-lg border border-[#dfe5ef] bg-white">
                      <table className="w-full table-auto text-left">
                        <thead className="bg-[#f7f9fe] text-[11px] font-bold uppercase tracking-[0.04em] text-[#6b7280] xl:text-xs">
                          <tr>
                            <th className="min-w-44 px-4 py-3">Họ tên</th>
                            <th className="min-w-32 px-4 py-3">Vai trò</th>
                            <th className="min-w-44 px-4 py-3">Ý định</th>
                            <th className="min-w-32 px-4 py-3">SĐT</th>
                            <th className="min-w-36 px-4 py-3">CCCD</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf1f6] text-xs xl:text-sm">
                          {detailLoading && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-5 text-sm font-bold text-[#607089]"
                              >
                                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                Đang tải danh sách người ở...
                              </td>
                            </tr>
                          )}
                          {!detailLoading && selectedOccupants.length > 0
                            ? selectedOccupants.map((occupant, index) => (
                                <tr
                                  key={
                                    occupant.tenantProfileId ||
                                    occupant.id ||
                                    `${occupant.occupantRole}-${occupant.fullName}-${index}`
                                  }
                                >
                                  <td data-label="Họ tên" className="px-4 py-3">
                                    <p
                                      className="truncate font-bold text-[#091426]"
                                      title={
                                        occupant.fullName || "Chưa cập nhật"
                                      }
                                    >
                                      {occupant.fullName || "Chưa cập nhật"}
                                    </p>
                                  </td>
                                  <td
                                    data-label="Vai trò"
                                    className="px-4 py-3"
                                  >
                                    <span className="inline-flex max-w-full rounded-full border border-[#d8e1f2] bg-[#f8fbff] px-2.5 py-1 text-[11px] font-bold text-[#34445c] xl:text-xs">
                                      <span className="truncate">
                                        {ROLE_LABELS[occupant.occupantRole] ||
                                          occupant.occupantRole ||
                                          "Chưa rõ"}
                                      </span>
                                    </span>
                                  </td>
                                  <td data-label="Ý định" className="px-4 py-3">
                                    <span
                                      className="inline-flex max-w-full rounded-full border border-[#d8e1f2] bg-white px-2.5 py-1 text-[11px] font-bold text-[#34445c] xl:text-xs"
                                      title={
                                        occupant.occupantIntentionNote ||
                                        undefined
                                      }
                                    >
                                      <span className="truncate">
                                        {OCCUPANT_INTENTION_LABELS[
                                          occupant.occupantIntention
                                        ] || "Chưa phản hồi"}
                                      </span>
                                    </span>
                                  </td>
                                  <td
                                    data-label="SĐT"
                                    className="break-words px-4 py-3 text-[#4b5563]"
                                    title={occupant.phone || "Chưa có"}
                                  >
                                    {occupant.phone || "Chưa có"}
                                  </td>
                                  <td
                                    data-label="CCCD"
                                    className="break-words px-4 py-3 text-[#4b5563]"
                                    title={formatIdentityNumber(
                                      occupant.citizenId ||
                                        occupant.identityNumber,
                                    )}
                                  >
                                    {formatIdentityNumber(
                                      occupant.citizenId ||
                                        occupant.identityNumber,
                                    )}
                                  </td>
                                </tr>
                              ))
                            : !detailLoading && (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="px-4 py-5 text-sm font-semibold text-[#607089]"
                                  >
                                    Chưa có danh sách người ở trong hợp đồng.
                                  </td>
                                </tr>
                              )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:gap-5">
                      <InfoValue
                        label="Tổng số người"
                        value={`${getOccupantsCount(mergedSelected, details)} người`}
                      />
                      <InfoValue
                        label="Giá thuê"
                        value={formatMoney(mergedSelected.monthlyRent)}
                      />
                    </div>
                  </DetailCard>

                  {mergedSelected.leaseContractId &&
                    getWorkflow(mergedSelected) === "TERMINATION_PENDING" &&
                    !isRoomTransferManagedContract(mergedSelected) &&
                    !isRenewalContract(mergedSelected) && (
                      <ContractHandoverSection
                        key={`${mergedSelected.leaseContractId}-move-out`}
                        contractId={mergedSelected.leaseContractId}
                        tenantId={mergedSelected.tenantId || null}
                        roomId={mergedSelected.roomId || null}
                        roomCode={
                          mergedSelected.roomCode ||
                          mergedSelected.room?.roomCode
                        }
                        handoverType="MOVE_OUT"
                        title="Bàn giao trả phòng"
                        description="Chốt chỉ số, hiện trạng phòng và khoản bồi thường nếu có trước khi hoàn tất thanh lý."
                        showCompensation
                        readonly={[
                          "LIQUIDATED",
                          "RENEWED",
                          "CANCELLED",
                          "AUTO_TERMINATED",
                        ].includes(getWorkflow(mergedSelected))}
                        onSaved={handleHandoverSaved}
                      />
                    )}

                  {mergedSelected.leaseContractId &&
                    getWorkflow(mergedSelected) !== "TERMINATION_PENDING" &&
                    !isRoomTransferManagedContract(mergedSelected) &&
                    !isRenewalContract(mergedSelected) && (
                      <ContractHandoverSection
                        key={mergedSelected.leaseContractId}
                        contractId={mergedSelected.leaseContractId}
                        tenantId={mergedSelected.tenantId || null}
                        roomId={mergedSelected.roomId || null}
                        roomCode={
                          mergedSelected.roomCode ||
                          mergedSelected.room?.roomCode
                        }
                        readonly={[
                          "LIQUIDATED",
                          "RENEWED",
                          "CANCELLED",
                          "AUTO_TERMINATED",
                        ].includes(getWorkflow(mergedSelected))}
                        onSaved={handleHandoverSaved}
                      />
                    )}

                  {mergedSelected.leaseContractId &&
                    getWorkflow(mergedSelected) !== "CANCELLED" &&
                    !isRenewalContract(mergedSelected) && (
                      <HandoverDocumentCard
                        contract={mergedSelected}
                        refreshKey={handoverRefreshKey}
                        onUpdated={handleContractUpdated}
                      />
                    )}

                  {shouldShowSignedFileCard(mergedSelected) && (
                    <DetailCard
                      title="File hợp đồng đã ký"
                      icon={FileCheck2}
                      className="lg:col-span-2"
                    >
                      <div className="mt-5 rounded-lg bg-white p-4">
                        {getLeaseSignedFileId(mergedSelected) ? (
                          <>
                            <p className="break-words font-extrabold text-[#091426]">
                              {selectedSignedLeaseContractFilename}
                            </p>
                            <p className="mt-1 text-sm text-[#607089]">
                              Upload:{" "}
                              {formatDate(mergedSelected.signedFileUploadedAt)}
                            </p>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              <button
                                type="button"
                                onClick={() =>
                                  openLeaseContractFile(
                                    getLeaseSignedFileId(mergedSelected),
                                  )
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold hover:bg-[#f8fafc]"
                              >
                                <Eye className="h-4 w-4" />
                                Xem
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadLeaseContractSignedFile(
                                    mergedSelected.leaseContractId,
                                    selectedLeaseContractFilename,
                                  )
                                }
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
                              Chưa có file hợp đồng cho phòng{" "}
                              {mergedSelected.roomCode || "chưa rõ"}
                            </p>
                            <p className="mt-1 text-sm text-[#607089]">
                              Khách:{" "}
                              {mergedSelected.primaryTenantName ||
                                mergedSelected.customerName ||
                                "Chưa có"}{" "}
                              - SĐT: {mergedSelected.phone || "Chưa có"}
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
                    <DetailCard
                      title="Nguyện vọng khách thuê"
                      icon={FileWarning}
                      className="lg:col-span-2"
                    >
                      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <InfoValue
                          label="Trạng thái"
                          value={tenantIntentionInfo.label}
                        />
                        <InfoValue
                          label="Ngày dự kiến trả phòng"
                          value={formatDate(
                            tenantIntentionInfo.expectedVacantDate,
                          )}
                        />
                        <InfoValue
                          label="Nguồn ghi nhận"
                          value={tenantIntentionInfo.sourceLabel}
                        />
                        <InfoValue
                          label="Cập nhật lần cuối"
                          value={formatDateTime(tenantIntentionInfo.recordedAt)}
                        />
                      </div>
                      <div className="mt-4 rounded-xl border border-[#dfe5ef] bg-[#f8fafc] px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#718096]">
                          Lý do / ghi chú
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#091426]">
                          {tenantIntentionInfo.note || "Chưa có ghi chú"}
                        </p>
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-5 text-[#607089]">
                        Dữ liệu này được đọc trực tiếp từ backend. Nút bên dưới
                        chỉ dùng khi quản lý ghi nhận thay khách hoặc cập nhật
                        lại sau khi trao đổi trực tiếp.
                      </p>
                    </DetailCard>
                  )}

                  <section className="grid gap-3 lg:col-span-2 sm:grid-cols-2">
                    {!mergedSelected.leaseContractId &&
                      getDepositFormId(mergedSelected) && (
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
                        Hợp đồng đã gia hạn. Tài khoản khách thuê được sử dụng
                        tiếp ở hợp đồng mới.
                      </p>
                    )}
                    {(details?.canRenew ??
                      ["ACTIVE", "EXPIRING_SOON", "EXPIRED"].includes(
                        getWorkflow(mergedSelected),
                      )) && (
                      <button
                        type="button"
                        onClick={openRenewModal}
                        disabled={isBusy}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:opacity-60"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Gia hạn hợp đồng
                      </button>
                    )}
                    {details?.canRenew === false &&
                      ["ACTIVE", "EXPIRING_SOON", "EXPIRED"].includes(
                        getWorkflow(mergedSelected),
                      ) &&
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
                    {canUseLiquidationActions &&
                      (details?.canLiquidate ??
                        ["ACTIVE", "EXPIRING_SOON", "EXPIRED"].includes(
                          getWorkflow(mergedSelected),
                        )) &&
                      getWorkflow(mergedSelected) !== "TERMINATION_PENDING" && (
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
          </DialogContent>
        </Dialog>
      )}

      <TransferExecutionModal
        open={Boolean(transferExecutionModal)}
        transferRequestId={transferExecutionModal?.transferRequestId}
        contract={transferExecutionModal?.contract}
        onClose={closeTransferExecutionModal}
        onCompleted={async () => {
          if (transferExecutionModal?.contract) {
            await refreshSelectedContract(transferExecutionModal.contract);
          } else {
            await loadContracts();
          }
        }}
      />
      {printWizard && (
        <ContractPrintWizard
          contract={printWizard.contract}
          details={printWizard.details}
          occupants={
            printWizard.details?.occupants ||
            printWizard.contract?.occupants ||
            []
          }
          onClose={() => setPrintWizard(null)}
        />
      )}

      {renewModalOpen && mergedSelected && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/70 p-3 backdrop-blur-sm"
          onClick={() => setRenewModalOpen(false)}
        >
          <section
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#dfe5ef] px-5 py-5">
              <div>
                <h2 className="text-xl font-extrabold text-[#091426]">
                  Gia hạn hợp đồng
                </h2>
                <p className="mt-1 text-sm text-[#607089]">
                  Cập nhật thời hạn và điều khoản trên hợp đồng{" "}
                  {mergedSelected.contractCode}. Không tạo hợp đồng mới.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRenewModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-[#f3f6fa] dark:hover:bg-white/5"
                aria-label="Đóng modal gia hạn"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="rounded-xl border border-[#dfe5ef] bg-[#f8fafc] p-4 sm:col-span-2">
                <p className="text-sm font-extrabold text-[#091426]">
                  Hợp đồng hiện tại
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <InfoValue
                    label="Ngày bắt đầu"
                    value={
                      formatDisplayDate(renewForm.startDate) || "Chưa cập nhật"
                    }
                  />
                  <InfoValue
                    label="Ngày kết thúc hiện tại"
                    value={
                      formatDisplayDate(renewForm.currentEndDate) ||
                      "Chưa cập nhật"
                    }
                  />
                </div>
                {renewFieldErrors.startDate && (
                  <p className="mt-3 text-xs font-semibold text-red-600">
                    {renewFieldErrors.startDate}
                  </p>
                )}
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-[#34445c]">
                  Ngày kết thúc sau gia hạn *
                </span>
                <DateInput
                  value={renewForm.endDate}
                  min={
                    renewForm.currentEndDate
                      ? addDays(renewForm.currentEndDate, 1)
                      : undefined
                  }
                  onChange={(event) =>
                    updateRenewField("endDate", event.target.value)
                  }
                  className={`h-11 rounded-lg border px-3 text-sm font-semibold outline-none ${renewFieldErrors.endDate ? "border-red-500" : "border-[#cbd5e1] focus:border-[#091426]"}`}
                />
                {renewFieldErrors.endDate && (
                  <span className="text-xs font-semibold text-red-600">
                    {renewFieldErrors.endDate}
                  </span>
                )}
              </label>

              {[
                ["monthlyRent", "Giá thuê", "number"],
                ["depositAmount", "Tiền cọc", "number"],
              ].map(([field, label, type]) => (
                <label key={field} className="grid gap-1.5">
                  <span className="text-sm font-bold text-[#34445c]">
                    {label} *
                  </span>
                  <input
                    type={type}
                    min={
                      type === "number"
                        ? field === "depositAmount"
                          ? "0"
                          : "1"
                        : undefined
                    }
                    step={type === "number" ? "1000" : undefined}
                    value={renewForm[field]}
                    onChange={(event) =>
                      updateRenewField(field, event.target.value)
                    }
                    className={`h-11 rounded-lg border px-3 text-sm font-semibold outline-none ${
                      renewFieldErrors[field]
                        ? "border-red-500"
                        : "border-[#cbd5e1] focus:border-[#091426]"
                    }`}
                  />
                  {renewFieldErrors[field] && (
                    <span className="text-xs font-semibold text-red-600">
                      {renewFieldErrors[field]}
                    </span>
                  )}
                </label>
              ))}

              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-[#34445c]">
                  Chu kỳ thanh toán *
                </span>
                <select
                  value={renewForm.paymentCycleMonths}
                  onChange={(event) =>
                    updateRenewField("paymentCycleMonths", event.target.value)
                  }
                  className={`h-11 rounded-lg border bg-white px-3 text-sm font-semibold outline-none ${
                    renewFieldErrors.paymentCycleMonths
                      ? "border-red-500"
                      : "border-[#cbd5e1] focus:border-[#091426]"
                  }`}
                >
                  <option value="1">1 tháng/lần</option>
                  <option value="3">3 tháng/lần</option>
                </select>
                {renewFieldErrors.paymentCycleMonths && (
                  <span className="text-xs font-semibold text-red-600">
                    {renewFieldErrors.paymentCycleMonths}
                  </span>
                )}
              </label>

              <div className="rounded-xl border border-[#dfe5ef] bg-[#f8fafc] p-4 sm:col-span-2">
                <p className="text-sm font-extrabold text-[#091426]">
                  Người ở giữ nguyên trên hợp đồng hiện tại
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selectedOccupants.map((occupant, index) => (
                    <div
                      key={
                        occupant.tenantProfileId ||
                        `${occupant.fullName}-${index}`
                      }
                      className="rounded-lg border border-[#dfe5ef] bg-white px-3 py-2"
                    >
                      <p className="font-bold text-[#091426]">
                        {occupant.fullName || "Chưa cập nhật"}
                      </p>
                      <p className="text-xs text-[#607089]">
                        {ROLE_LABELS[occupant.occupantRole] ||
                          occupant.occupantRole}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#34445c]">
                        {OCCUPANT_INTENTION_LABELS[
                          occupant.occupantIntention
                        ] || "Chưa phản hồi ý định"}
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
                {actionLoading ===
                  `renew-${mergedSelected.leaseContractId}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Lưu gia hạn
              </button>
            </footer>
          </section>
        </div>
      )}

      {intentionModalOpen && mergedSelected && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/70 p-3 backdrop-blur-sm"
          onClick={() => setIntentionModalOpen(false)}
        >
          <section
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between border-b border-[#dfe5ef] px-5 py-5">
              <div>
                <h2 className="text-xl font-extrabold text-[#091426]">
                  Ghi nhận / Cập nhật ý định khách
                </h2>
                <p className="mt-1 text-sm text-[#607089]">
                  {mergedSelected.contractCode}
                </p>
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
                      expectedMoveOutDate: ["MOVE_OUT", "TRANSFER"].includes(
                        nextIntention,
                      )
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
                  <span className="text-sm font-bold text-[#34445c]">
                    Ngày dự kiến trả phòng / bàn giao phòng
                  </span>
                  <input
                    type="date"
                    value={intentionForm.expectedMoveOutDate}
                    onChange={(event) =>
                      setIntentionForm((current) => ({
                        ...current,
                        expectedMoveOutDate: event.target.value,
                      }))
                    }
                    required
                    className="h-11 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-3 text-sm font-semibold"
                  />
                </label>
              )}
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-[#34445c]">
                  Ghi chú
                </span>
                <textarea
                  rows={3}
                  value={intentionForm.note}
                  onChange={(event) =>
                    setIntentionForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
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
                {actionLoading ===
                  `intention-${mergedSelected.leaseContractId}` && (
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
