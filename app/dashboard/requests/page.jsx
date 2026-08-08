"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  fetchChangeRequests,
  fetchChangeRequestStats,
  approveChangeRequest,
  rejectChangeRequest,
} from "@/services/changeRequestsService";
import {
  confirmTransferContract,
  getRoomTransferByCode,
  getRoomTransferById,
  signTransferContract,
  signTransferContractDocument,
} from "@/services/roomTransferService";
import {
  downloadLeaseContractDraftPdf,
  fetchManagementLeaseContractDetails,
  uploadSignedLeaseContractFile,
} from "@/services/leaseContractsService";
import {
  approveExpenseRequest,
  markExpensePaid,
  rejectExpenseRequest,
} from "@/services/expenseReportService";
import { uploadFile } from "@/services/contractHandoverService";
import {
  Loader2,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  LogOut,
  FileText,
  Wrench,
  Wallet,
  MessageSquareWarning,
  Key,
  Search,
  FileCheck2,
  CalendarCheck,
  CalendarRange,
  AlertCircle,
  Info,
  Hourglass,
  Download,
  Upload,
  RotateCcw,
  SlidersHorizontal,
  CalendarDays,
  MoreVertical,
  Trash2,
  UserPlus,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import TimeTreeFilter, { buildTreeFromCustomers } from "@/components/dashboard/TimeTreeFilter";
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import {
  TransferRequestDetail,
  MoveoutRequestDetail,
  RenewalRequestDetail,
  TerminationRequestDetail,
  MaintenanceRequestDetail,
  ComplaintRequestDetail,
  MeterReadingCorrectionRequestDetail,
  AccessRequestDetail,
  ExpenseApprovalRequestDetail,
} from "./_components/RequestTypeDetails";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import TransferExecutionModal from "../_components/TransferExecutionModal";
import { useAuth } from "../_contexts/AuthContext";
import { ROLES } from "../_lib/rbac";
import { toDate } from "@/lib/dateFormat";

const REQUEST_TIME_ZONE = "Asia/Ho_Chi_Minh";

const translateType = (type) => {
  const map = {
    ROOM_TRANSFER: "Chuyển phòng",
    MOVE_OUT: "Trả phòng",
    CONTRACT_RENEWAL: "Gia hạn Hợp Đồng",
    PERMISSION_ACCESS: "Quyền truy cập",
    TENANT_PROFILE_ACCESS: "Xem hồ sơ khách thuê",
    METER_READING_CORRECTION: "Điều chỉnh chỉ số",
    INVOICE_ADJUSTMENT: "Điều chỉnh hóa đơn",
    RENT_PRICE_ADJUSTMENT: "Điều chỉnh giá thuê",
    DEPOSIT_REFUND_REQUEST: "Hoàn cọc",
    EXPENSE_APPROVAL: "Duyệt khoản chi",
    TRANSFER: "Chuyển phòng",
    MOVEOUT: "Trả phòng",
    RENEWAL: "Gia hạn Hợp Đồng",
    TERMINATION: "Thanh lý Hợp Đồng",
    CONTRACT_LIQUIDATION: "Thanh lý Hợp Đồng",
    ADD_CO_OCCUPANT: "Thêm người ở cùng",
    MAINTENANCE: "Bảo trì",
    COMPLAINT: "Khiếu nại",
    ACCESS: "Yêu cầu thẻ",
  };
  return map[type] || type;
};

// Map backend request type to frontend type key
const mapRequestType = (type) => {
  const map = {
    ROOM_TRANSFER: "TRANSFER",
    MOVE_OUT: "MOVEOUT",
    CONTRACT_RENEWAL: "RENEWAL",
    CONTRACT_TERMINATION: "TERMINATION",
    CONTRACT_LIQUIDATION: "TERMINATION",
    ADD_CO_OCCUPANT: "ADD_CO_OCCUPANT",
    PERMISSION_ACCESS: "PERMISSION_ACCESS",
    TENANT_PROFILE_ACCESS: "TENANT_PROFILE_ACCESS",
    METER_READING_CORRECTION: "METER_READING_CORRECTION",
    INVOICE_ADJUSTMENT: "INVOICE_ADJUSTMENT",
    RENT_PRICE_ADJUSTMENT: "RENT_PRICE_ADJUSTMENT",
    DEPOSIT_REFUND_REQUEST: "DEPOSIT_REFUND_REQUEST",
    EXPENSE_APPROVAL: "EXPENSE_APPROVAL",
    MAINTENANCE: "MAINTENANCE",
    COMPLAINT: "COMPLAINT",
    ACCESS_REQUEST: "ACCESS",
  };
  return map[type] || type;
};

const translateStatus = (status) => {
  const map = {
    PENDING: "Đang chờ",
    PROCESSING: "Đang xử lý",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };
  return map[status] || status;
};

function formatRequestDateTime(value) {
  const date = toDate(value);
  return date
    ? date.toLocaleString("vi-VN", {
        timeZone: REQUEST_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";
}

function formatRequestDate(value) {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString("vi-VN", {
        timeZone: REQUEST_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "--";
}

function formatRequestTime(value) {
  const date = toDate(value);
  return date
    ? date.toLocaleTimeString("vi-VN", {
        timeZone: REQUEST_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";
}

function requesterName(request) {
  return String(request?.requesterName || "").trim() || "Chưa có tên";
}

function requesterSecondaryText(request) {
  return (
    String(request?.requesterPhone || "").trim() ||
    String(request?.requestCode || "").trim() ||
    (request?.requesterId ? `ID #${request.requesterId}` : "")
  );
}

function requesterInitials(request) {
  const name = requesterName(request);
  if (name === "Chưa có tên") return "?";
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words.at(-1)[0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const STATUS_FILTERS = [
    { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Đang chờ" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const statusBadgeClass = (status) => {
  if (status === "PENDING")
    return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:border-yellow-400/30 dark:bg-yellow-500/10 dark:text-yellow-300";
  if (status === "APPROVED" || status === "COMPLETED")
    return "text-green-600 bg-green-50 border-green-200 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-300";
  if (status === "PROCESSING")
    return "text-blue-600 bg-blue-50 border-blue-200 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300";
  if (status === "REJECTED" || status === "CANCELLED")
    return "text-red-600 bg-red-50 border-red-200 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300";
  return "text-gray-600 bg-gray-50 border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";
};

const TYPE_CONFIG = {
  TRANSFER: {
    color: "bg-violet-50 dark:bg-violet-500/10",
    icon: <ArrowRightLeft className="w-5 h-5 text-violet-500 dark:text-violet-300" />,
    accent: "violet",
  },
  MOVEOUT: {
    color: "bg-green-50 dark:bg-green-500/10",
    icon: <LogOut className="w-5 h-5 text-green-500 dark:text-green-300" />,
    accent: "green",
  },
  RENEWAL: {
    color: "bg-indigo-50 dark:bg-indigo-500/10",
    icon: <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />,
    accent: "indigo",
  },
  TERMINATION: {
    color: "bg-red-50 dark:bg-red-500/10",
    icon: <XCircle className="w-5 h-5 text-red-500 dark:text-red-300" />,
    accent: "red",
  },
  CONTRACT_LIQUIDATION: {
    color: "bg-red-50 dark:bg-red-500/10",
    icon: <XCircle className="w-5 h-5 text-red-500 dark:text-red-300" />,
    accent: "red",
  },
  ADD_CO_OCCUPANT: {
    color: "bg-orange-50 dark:bg-orange-500/10",
    icon: <UserPlus className="w-5 h-5 text-orange-500 dark:text-orange-300" />,
    accent: "orange",
  },
  MAINTENANCE: {
    color: "bg-emerald-50 dark:bg-emerald-500/10",
    icon: <Wrench className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />,
    accent: "emerald",
  },
  COMPLAINT: {
    color: "bg-blue-50 dark:bg-blue-500/10",
    icon: <MessageSquareWarning className="w-5 h-5 text-blue-500 dark:text-blue-300" />,
    accent: "blue",
  },
  ACCESS: {
    color: "bg-orange-50 dark:bg-orange-500/10",
    icon: <Key className="w-5 h-5 text-orange-500 dark:text-orange-300" />,
    accent: "orange",
  },
  PERMISSION_ACCESS: {
    color: "bg-gray-50 dark:bg-white/5",
    icon: <Key className="w-5 h-5 text-gray-500 dark:text-slate-300" />,
    accent: "gray",
  },
  TENANT_PROFILE_ACCESS: {
    color: "bg-gray-50 dark:bg-white/5",
    icon: <Key className="w-5 h-5 text-gray-500 dark:text-slate-300" />,
    accent: "gray",
  },
  METER_READING_CORRECTION: {
    color: "bg-cyan-50 dark:bg-cyan-500/10",
    icon: <Wrench className="w-5 h-5 text-cyan-500 dark:text-cyan-300" />,
    accent: "cyan",
  },
  INVOICE_ADJUSTMENT: {
    color: "bg-indigo-50 dark:bg-indigo-500/10",
    icon: <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />,
    accent: "indigo",
  },
  RENT_PRICE_ADJUSTMENT: {
    color: "bg-indigo-50 dark:bg-indigo-500/10",
    icon: <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />,
    accent: "indigo",
  },
  DEPOSIT_REFUND_REQUEST: {
    color: "bg-green-50 dark:bg-green-500/10",
    icon: <FileCheck2 className="w-5 h-5 text-green-500 dark:text-green-300" />,
    accent: "green",
  },
  EXPENSE_APPROVAL: {
    color: "bg-emerald-50 dark:bg-emerald-500/10",
    icon: <Wallet className="w-5 h-5 text-emerald-500 dark:text-emerald-300" />,
    accent: "emerald",
  },
};

const translateTransferStatus = (status) => {
  const map = {
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
  return map[status] || status || "--";
};

const getTransferStatusTone = (status) => {
  switch (status) {
    case "WAITING_PAYMENT":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300";
    case "WAITING_CONTRACT_CONFIRMATION":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300";
    case "WAITING_SIGNING":
    case "WAITING_CONTRACT_SIGNING":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-300";
    case "WAITING_TRANSFER_DATE":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300";
    case "READY_FOR_HANDOVER":
    case "WAITING_EXECUTION":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "EXECUTED":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-300";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";
  }
};

const requiresFullMoveIn = (transfer) =>
  transfer?.targetTransferType === "NEW_CONTRACT";

const isTransferSigningStatus = (status) =>
  status === "WAITING_SIGNING" || status === "WAITING_CONTRACT_SIGNING";

const getTransferTimingNote = (transfer) => {
  if (!transfer) return "";
  const moveOutNote =
    "Chỉ thực hiện full move-out khi sau chuyển phòng cũ trở thành phòng trống. Nếu phòng cũ vẫn còn người ở thì chỉ xử lý phần occupant rời đi, không làm room-level move-out đầy đủ.";
  const moveInNote = requiresFullMoveIn(transfer)
    ? "Chốt phòng cũ chỉ ghi nhận người rời phòng và tạo hóa đơn điện nếu phát sinh; sau khi hóa đơn này đã thanh toán, manager mới nhập check-in phòng mới và hoàn tất chuyển phòng."
    : "Ca này không cần full move-in kiểu nhận phòng trống vì tenant đi vào hợp đồng/phòng đang có người.";
  return `${moveOutNote} ${moveInNote}`;
};

const getTransferActionMeta = (transfer) => {
  if (!transfer) {
    return {
      primaryAction: null,
      helperText:
        "Chưa tải được chi tiết transfer từ backend. Màn này vẫn hiển thị thông tin cơ bản từ yêu cầu để tránh chặn quản lý.",
    };
  }

  switch (transfer.status) {
    case "WAITING_PAYMENT":
      return {
        primaryAction: null,
        helperText:
          "Đang chờ khách thuê thanh toán khoản bắt buộc trước khi quản lý xác nhận hợp đồng.",
      };
    case "WAITING_CONTRACT_CONFIRMATION":
      return {
        primaryAction: "confirm-contract",
        helperText:
          "Đã đủ điều kiện thương mại/pháp lý. Quản lý cần xác nhận hợp đồng trước khi đi tới pha vận hành.",
      };
    case "WAITING_SIGNING":
    case "WAITING_CONTRACT_SIGNING":
      return {
        primaryAction: null,
        helperText:
          "Đang chờ khách thuê ký hợp đồng. Chưa nên thực hiện move-out/move-in.",
      };
    case "WAITING_TRANSFER_DATE":
      return {
        primaryAction: "execute-transfer",
        helperText:
          "Hồ sơ đã sẵn sàng. Manager có thể bấm Chốt phòng cũ khi tenant và quản lý có mặt.",
      };
    case "READY_FOR_HANDOVER":
      return {
        primaryAction: "execute-transfer",
        helperText:
          "Hồ sơ đã sẵn sàng. Manager bấm Chốt phòng cũ để ghi nhận người rời phòng và chỉ số điện.",
      };
    case "WAITING_EXECUTION":
      return {
        primaryAction: "complete-transfer",
        helperText:
          "Phiên chuyển phòng đang diễn ra. Nếu có hóa đơn điện chốt chuyển phòng thì cần thanh toán trước, sau đó nhập check-in phòng mới và bấm Complete Transfer.",
      };
    case "EXECUTED":
      return {
        primaryAction: null,
        helperText: "Yêu cầu chuyển phòng đã hoàn tất trên hệ thống.",
      };
    default:
      return {
        primaryAction: null,
        helperText: "Yêu cầu chưa tới bước vận hành cho quản lý.",
      };
  }
};

/* Type-specific detail renderer */
const TYPE_DETAIL_COMPONENTS = {
  TRANSFER: TransferRequestDetail,
  MOVEOUT: MoveoutRequestDetail,
  RENEWAL: RenewalRequestDetail,
  TERMINATION: TerminationRequestDetail,
  MAINTENANCE: MaintenanceRequestDetail,
  COMPLAINT: ComplaintRequestDetail,
  ACCESS: AccessRequestDetail,
  METER_READING_CORRECTION: MeterReadingCorrectionRequestDetail,
  EXPENSE_APPROVAL: ExpenseApprovalRequestDetail,
};

function parseRequestPayload(rawPayload) {
  if (!rawPayload) return null;
  if (typeof rawPayload === "object") return rawPayload;
  try {
    return JSON.parse(rawPayload);
  } catch {
    return null;
  }
}

function getExpenseIdFromRequest(req) {
  const payload = parseRequestPayload(req?.requestPayload) || {};
  return (
    payload.operatingExpenseId ||
    payload.operating_expense_id ||
    req?.targetId ||
    null
  );
}

function isExpenseApprovalRequest(req) {
  return req?.requestType === "EXPENSE_APPROVAL";
}

function isContractLiquidationRequest(req) {
  return [
    "CONTRACT_LIQUIDATION",
    "CONTRACT_TERMINATION",
    "TERMINATION",
  ].includes(req?.requestType);
}

function isLiquidationRefundExpenseRequest(req) {
  if (!isExpenseApprovalRequest(req)) return false;
  const payload = parseRequestPayload(req?.requestPayload) || {};
  return (
    (payload.sourceRequestType || payload.source_request_type) ===
    "CONTRACT_LIQUIDATION"
  );
}

function canResolveRequest(req, isOwner) {
  if (req?.status !== "PENDING") return false;
  if (
    isContractLiquidationRequest(req) ||
    isLiquidationRefundExpenseRequest(req)
  )
    return isOwner;
  return true;
}

function buildTransferFallback(req) {
  const payload = parseRequestPayload(req?.requestPayload);
  if (req?.requestType !== "ROOM_TRANSFER") {
    return null;
  }

  return {
    id: req?.targetId ?? null,
    requestCode:
      payload?.transferRequestCode ||
      payload?.transfer_code ||
      payload?.requestCode ||
      null,
    oldRoomName:
      payload?.currentRoom ||
      payload?.current_room ||
      payload?.fromRoom ||
      payload?.from_room ||
      null,
    oldRoomCode: payload?.currentRoomCode || payload?.current_room_code || null,
    targetRoomName:
      payload?.targetRoom ||
      payload?.target_room ||
      payload?.desiredRoom ||
      payload?.desired_room ||
      payload?.toRoom ||
      payload?.to_room ||
      null,
    targetRoomCode:
      payload?.targetRoomCode || payload?.target_room_code || null,
    requestedTransferDate:
      payload?.expectedTransferDate ||
      payload?.expected_transfer_date ||
      payload?.transferDate ||
      payload?.transfer_date ||
      payload?.requestedDate ||
      payload?.requested_date ||
      null,
    expectedTransferDate:
      payload?.expectedTransferDate ||
      payload?.expected_transfer_date ||
      payload?.transferDate ||
      payload?.transfer_date ||
      payload?.requestedDate ||
      payload?.requested_date ||
      null,
    reason:
      payload?.reason ||
      payload?.transferReason ||
      payload?.transfer_reason ||
      req?.description ||
      null,
    targetTransferType:
      payload?.targetTransferType || payload?.target_transfer_type || null,
    status: null,
    positiveDifferenceSettlementType: null,
    priceDifferenceToPay: null,
    transferDifferenceInvoiceId: null,
    oldRoomFinalInvoiceId: null,
  };
}

function buildRequiredSigningDocuments(transfer) {
  if (!transfer) return [];
  const documents = [];
  if (transfer.newContractId) {
    documents.push({
      id: transfer.newContractId,
      kind: "target",
      label:
        transfer.targetTransferType === "OTHER_CONTRACT"
          ? "Thoa thuan chuyen vao phong dich"
          : "Hop dong phong dich",
    });
  }
  if (transfer.replacementOldContractId) {
    documents.push({
      id: transfer.replacementOldContractId,
      kind: "source-replacement",
      label: "Hợp đồng gia hạn phòng cũ",
    });
  }
  return documents;
}

function getTransferSigningDocuments(transfer) {
  if (Array.isArray(transfer?.signingDocuments)) {
    return transfer.signingDocuments;
  }
  return buildRequiredSigningDocuments(transfer);
}

function isTransferSigningDocumentSigned(document) {
  return document?.contractStatus === "SIGNED";
}

function allTransferSigningDocumentsSigned(transfer) {
  const documents = getTransferSigningDocuments(transfer);
  return (
    documents.length > 0 && documents.every(isTransferSigningDocumentSigned)
  );
}

function getMissingTransferSigningDocumentLabels(transfer) {
  return getTransferSigningDocuments(transfer)
    .filter((document) => !isTransferSigningDocumentSigned(document))
    .map(
      (document) =>
        document.label || document.contractCode || `Hợp đồng #${document.id}`,
    );
}

function allowsTransferAction(transfer, action) {
  return (
    Array.isArray(transfer?.allowedActions) &&
    transfer.allowedActions.includes(action)
  );
}

async function hydrateTransferSigningDocuments(transfer) {
  if (!transfer) return transfer;
  const documents = buildRequiredSigningDocuments(transfer);
  if (documents.length === 0) {
    return { ...transfer, signingDocuments: [] };
  }

  const signingDocuments = await Promise.all(
    documents.map(async (document) => {
      try {
        const details = await fetchManagementLeaseContractDetails(document.id);
        const contractFile = details?.contractFile || null;
        return {
          ...document,
          contractCode: details?.contractCode || null,
          contractStatus: details?.status || null,
          contractFileId: details?.contractFileId ?? contractFile?.id ?? null,
          contractFileName:
            details?.contractFileName ?? contractFile?.fileName ?? null,
          contractFileUploadedAt:
            details?.contractFileUploadedAt ?? contractFile?.uploadedAt ?? null,
          signedFileId:
            details?.signedFileId ?? details?.signedFile?.id ?? null,
          signedFileName:
            details?.signedFileName ?? details?.signedFile?.fileName ?? null,
          signedFileUploadedAt:
            details?.signedFileUploadedAt ??
            details?.signedFile?.uploadedAt ??
            null,
        };
      } catch (error) {
        console.warn(
          "Unable to load transfer contract signing metadata.",
          error,
        );
        return { ...document, loadError: true };
      }
    }),
  );

  return { ...transfer, signingDocuments };
}

function RequestDetailContent({ req, detailTransfer }) {
  const mappedType = mapRequestType(req.requestType);
  const payload = parseRequestPayload(req.requestPayload);
  const TypeDetailComponent = TYPE_DETAIL_COMPONENTS[mappedType];
  const resolvedTone = statusBadgeClass(req.status);
  const isPositiveStatus =
    req.status === "APPROVED" || req.status === "COMPLETED";
  const isProcessingStatus = req.status === "PROCESSING";

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${TYPE_CONFIG[mappedType]?.color || "bg-gray-50 dark:bg-white/5"}`}
        >
          {TYPE_CONFIG[mappedType]?.icon || (
            <FileCheck2 className="w-6 h-6 text-gray-500 dark:text-slate-300" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {req.title || translateType(mappedType)}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5 font-mono dark:text-slate-400">
            {req.requestCode || `#${req.id}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className={`capitalize ${resolvedTone}`}>
              {translateStatus(req.status)}
            </Badge>
            <Badge
              variant="outline"
              className="bg-white text-gray-600 border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              {translateType(mappedType)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Description */}
      {req.description && (
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
          <p className="text-sm font-semibold text-gray-700 mb-1 dark:text-slate-200">Mô tả</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap dark:text-slate-300">
            {req.description}
          </p>
        </div>
      )}

      {/* Type-specific detail component */}
      {TypeDetailComponent && payload && (
        <TypeDetailComponent
          payload={payload}
          transfer={mappedType === "TRANSFER" ? detailTransfer : null}
          request={req}
        />
      )}

      {/* Resolution info */}
      {req.status !== "PENDING" && (
        <div className={`rounded-xl p-4 border ${resolvedTone}`}>
          <div className="flex items-center gap-2 mb-2">
            {isProcessingStatus ? (
              <Hourglass className="w-4 h-4 text-blue-600" />
            ) : isPositiveStatus ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <p className="text-sm font-semibold">
              {translateStatus(req.status)}
            </p>
          </div>
          {req.resolutionNote && (
            <p className="text-sm whitespace-pre-wrap">{req.resolutionNote}</p>
          )}
          {req.resolvedAt && (
            <p className="text-xs mt-2">
              {formatRequestDateTime(req.resolvedAt)}
            </p>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-white/10 dark:text-slate-500">
        <span>
          Tạo:{" "}
          {formatRequestDateTime(req.createdAt)}
        </span>
      </div>

      {!payload && req.requestType && req.requestType !== "ROOM_TRANSFER" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3 dark:border-white/10 dark:bg-white/5">
          <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 shrink-0 dark:text-slate-400" />
          <div className="text-xs text-gray-600 dark:text-slate-300">
            <p className="font-semibold mb-1">Không có chi tiết bổ sung</p>
            <p>Yêu cầu này không có thông tin chi tiết bổ sung.</p>
          </div>
        </div>
      )}
    </div>
  );
}
export default function ApprovalCenter() {
  const router = useRouter();
  const { user } = useAuth();
  const isOwner = user?.role === ROLES.OWNER;
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [fullTreeData, setFullTreeData] = useState(null);
  const [timeFilter, setTimeFilter] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    breakdown: [],
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [detailModal, setDetailModal] = useState(null);
  const [detailTransfer, setDetailTransfer] = useState(null);
  const [executeModal, setExecuteModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: "",
    paymentReference: "",
    note: "",
    proofFile: null,
  });
  const [selectedTransferContractId, setSelectedTransferContractId] =
    useState(null);
  const signedTransferContractInputRef = useRef(null);

  useEffect(() => {
    fetchChangeRequests({ page: 0, size: 10000 })
      .then((res) => {
        const mappedForTree = (res.requests || []).map((req) => ({
          ...req,
          appointmentAt: req.createdAt,
        }));
        setFullTreeData(buildTreeFromCustomers(mappedForTree));
      })
      .catch((err) => console.error("Error fetching full tree data", err));
  }, []);

  const handleTimeFilterSelect = useCallback((dateSelection) => {
    setTimeFilter(dateSelection);
    if (!dateSelection) {
      setFromDate("");
      setToDate("");
      setPage(1);
      return;
    }
    const { year, quarter, month, day } = dateSelection;

    if (quarter === "all" && month === "all") {
      setFromDate(`${year}-01-01`);
      setToDate(`${year}-12-31`);
    } else if (month === "all") {
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = quarter * 3;
      const mmStart = String(startMonth).padStart(2, "0");
      const mmEnd = String(endMonth).padStart(2, "0");
      const lastDay = new Date(year, endMonth, 0).getDate();
      setFromDate(`${year}-${mmStart}-01`);
      setToDate(`${year}-${mmEnd}-${String(lastDay).padStart(2, "0")}`);
    } else if (day === "all" || day == null) {
      const mm = String(month).padStart(2, "0");
      const lastDay = new Date(year, month, 0).getDate();
      setFromDate(`${year}-${mm}-01`);
      setToDate(`${year}-${mm}-${String(lastDay).padStart(2, "0")}`);
    } else {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      setFromDate(`${year}-${mm}-${dd}`);
      setToDate(`${year}-${mm}-${dd}`);
    }
    setPage(1);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const apiStatus = statusFilter === "ALL" ? undefined : statusFilter;
      const [dataRes, statsRes] = await Promise.all([
        fetchChangeRequests({
          page: page - 1,
          size,
          type: typeFilter === "All Types" ? undefined : typeFilter,
          status: apiStatus,
          search,
          fromDate,
          toDate,
        }),
        fetchChangeRequestStats(),
      ]);
      setData(sortByNewest(dataRes.requests, ["createdAt", "created_at"]));
      setTotal(dataRes.total || 0);
      setTotalPages(dataRes.totalPages || 1);

      if (statsRes) {
        const colors = {
          ROOM_TRANSFER: "#3B82F6",
          MOVE_OUT: "#22C55E",
          PERMISSION_ACCESS: "#9CA3AF",
          TENANT_PROFILE_ACCESS: "#9CA3AF",
          METER_READING_CORRECTION: "#06B6D4",
          INVOICE_ADJUSTMENT: "#6366F1",
          RENT_PRICE_ADJUSTMENT: "#6366F1",
          DEPOSIT_REFUND_REQUEST: "#22C55E",
          EXPENSE_APPROVAL: "#10B981",
          TRANSFER: "#3B82F6",
          MOVEOUT: "#22C55E",
          TERMINATION: "#FACC15",
          MAINTENANCE: "#A855F7",
          COMPLAINT: "#F472B6",
          ACCESS: "#9CA3AF",
          RENEWAL: "#6366F1",
        };
        const breakdown = (statsRes.breakdown || []).map((b) => ({
          ...b,
          label: translateType(b.type),
          color: colors[b.type] || "#D1D5DB",
        }));
        setStats({
          pendingCount: statsRes.pendingCount || 0,
          approvedCount: statsRes.approvedCount || 0,
          rejectedCount: statsRes.rejectedCount || 0,
          totalCount: statsRes.totalCount || 0,
          breakdown,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, size, statusFilter, typeFilter, fromDate, toDate]);

  const handleApprove = async (requestOrId) => {
    const req =
      typeof requestOrId === "object"
        ? requestOrId
        : data.find((item) => item.id === requestOrId);
    const id = typeof requestOrId === "object" ? requestOrId.id : requestOrId;
    if (!canResolveRequest(req, isOwner)) {
      window.alert("Chỉ chủ trọ được quyết định yêu cầu thanh lý hợp đồng.");
      return;
    }
    setActionLoading(`approve-${id}`);
    try {
      if (isExpenseApprovalRequest(req)) {
        await approveExpenseRequest(getExpenseIdFromRequest(req));
      } else {
        await approveChangeRequest(id);
      }
      await loadData();
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "Không thể duyệt yêu cầu.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!canResolveRequest(rejectModal, isOwner)) {
      window.alert("Chỉ chủ trọ được quyết định yêu cầu thanh lý hợp đồng.");
      setRejectModal(null);
      setRejectNote("");
      return;
    }
    setActionLoading(`reject-${rejectModal.id}`);
    try {
      if (isExpenseApprovalRequest(rejectModal)) {
        await rejectExpenseRequest(
          getExpenseIdFromRequest(rejectModal),
          rejectNote || "Không có lý do",
        );
      } else {
        await rejectChangeRequest(
          rejectModal.id,
          rejectNote || "Không có lý do",
        );
      }
      setRejectModal(null);
      setRejectNote("");
      await loadData();
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "Không thể từ chối yêu cầu.");
    } finally {
      setActionLoading(null);
    }
  };

  const openPaymentModal = (req) => {
    setPaymentModal(req);
    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentReference: "",
      note: "",
      proofFile: null,
    });
  };

  const handleMarkExpensePaid = async () => {
    if (!paymentModal) return;
    const expenseId = getExpenseIdFromRequest(paymentModal);
    if (!expenseId) {
      window.alert("Không xác định được khoản chi cần ghi nhận.");
      return;
    }
    if (!paymentForm.proofFile) {
      window.alert("Vui lòng upload ảnh minh chứng đã hoàn tiền.");
      return;
    }
    setActionLoading(`mark-paid-${paymentModal.id}`);
    try {
      const uploaded = await uploadFile(paymentForm.proofFile, "RECEIPT");
      await markExpensePaid(expenseId, {
        paymentDate: paymentForm.paymentDate,
        paymentMethod: "BANK_TRANSFER",
        paymentReference: paymentForm.paymentReference,
        receiptFileId: uploaded?.id || uploaded?.fileId,
        note: paymentForm.note,
      });
      setPaymentModal(null);
      await loadData();
      if (detailModal?.id === paymentModal.id) {
        closeDetailModal();
      }
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "Không thể ghi nhận đã hoàn tiền.");
    } finally {
      setActionLoading(null);
    }
  };

  const loadTransferDetail = useCallback(async (req) => {
    if (req?.requestType !== "ROOM_TRANSFER") {
      return null;
    }

    const fallbackTransfer = buildTransferFallback(req);

    try {
      if (req?.targetId) {
        const transfer = await getRoomTransferById(req.targetId);
        return await hydrateTransferSigningDocuments(transfer);
      }

      const requestCode =
        fallbackTransfer?.requestCode?.trim() || req?.requestCode?.trim();

      if (requestCode) {
        const transfer = await getRoomTransferByCode(requestCode);
        return await hydrateTransferSigningDocuments(transfer);
      }
    } catch (e) {
      console.warn(
        "Unable to load room transfer detail from API, fallback to request payload.",
        e,
      );
    }

    return await hydrateTransferSigningDocuments(fallbackTransfer);
  }, []);

  const openDetailModal = async (req) => {
    setDetailModal(req);
    setDetailTransfer(null);
    if (req?.requestType !== "ROOM_TRANSFER") return;

    setActionLoading(`load-transfer-${req.id}`);
    try {
      const transfer = await loadTransferDetail(req);
      setDetailTransfer(transfer);
    } catch (e) {
      console.error(e);
      setDetailTransfer(buildTransferFallback(req));
    } finally {
      setActionLoading(null);
    }
  };

  const closeDetailModal = () => {
    setDetailModal(null);
    setDetailTransfer(null);
  };

  const openExecuteModal = (req, preloadedTransfer = null) => {
    setExecuteModal({ request: req, transfer: preloadedTransfer });
  };

  const closeExecuteModal = () => {
    setExecuteModal(null);
  };

  const handleConfirmTransferContract = async () => {
    if (!detailModal || !detailTransfer) return;
    setActionLoading(`confirm-contract-${detailModal.id}`);
    try {
      await confirmTransferContract(detailTransfer.id);
      const refreshedTransfer = await loadTransferDetail(detailModal);
      setDetailTransfer(refreshedTransfer);
      await loadData();
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "Không thể xác nhận hợp đồng chuyển phòng.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignTransferContract = async () => {
    if (!detailModal || !detailTransfer) return;
    if (!isTransferSigningStatus(detailTransfer.status)) {
      window.alert("Hợp đồng chuyển phòng đã qua bước xác nhận ký.");
      return;
    }
    const missingDocuments =
      getMissingTransferSigningDocumentLabels(detailTransfer);
    if (missingDocuments.length > 0) {
      window.alert(
        `Vui lòng xác nhận từng hợp đồng đã ký trước khi xác nhận đủ bộ. Còn thiếu: ${missingDocuments.join(", ")}.`,
      );
      return;
    }
    setActionLoading(`sign-transfer-contract-${detailModal.id}`);
    try {
      await signTransferContract(detailTransfer.id);
      const refreshedTransfer = await loadTransferDetail(detailModal);
      setDetailTransfer(refreshedTransfer);
      await loadData();
    } catch (e) {
      console.error(e);
      window.alert(
        e?.message || "Không thể xác nhận đã ký hợp đồng chuyển phòng.",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadTransferContractDraft = async (contractId) => {
    if (!contractId) {
      window.alert("Chua co hop dong de tai.");
      return;
    }
    setActionLoading(`download-transfer-contract-${contractId}`);
    try {
      await downloadLeaseContractDraftPdf(contractId);
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "Khong the tai hop dong chuyen phong.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUploadSignedTransferContract = async (event) => {
    const file = event.target.files?.[0];
    const contractId = selectedTransferContractId;
    if (!file || !detailModal || !detailTransfer || !contractId) return;
    setActionLoading(`upload-transfer-contract-${contractId}`);
    try {
      await uploadSignedLeaseContractFile(
        { leaseContractId: contractId },
        file,
      );
      const refreshedTransfer = await loadTransferDetail(detailModal);
      setDetailTransfer(refreshedTransfer);
      await loadData();
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "Khong the upload hop dong da ky.");
    } finally {
      event.target.value = "";
      setSelectedTransferContractId(null);
      setActionLoading(null);
    }
  };

  const handleSignTransferContractDocument = async (document) => {
    if (!detailModal || !detailTransfer || !document?.id) return;
    if (!document.signedFileId) {
      window.alert("Vui lòng upload file hợp đồng đã ký trước khi xác nhận.");
      return;
    }
    setActionLoading(`sign-transfer-contract-document-${document.id}`);
    try {
      await signTransferContractDocument(detailTransfer.id, document.id);
      const refreshedTransfer = await loadTransferDetail(detailModal);
      setDetailTransfer(refreshedTransfer);
      await loadData();
    } catch (e) {
      console.error(e);
      window.alert(e?.message || "Không thể xác nhận hợp đồng này đã ký.");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [loadData]);

  const overdueItems = data
    .filter((req) => req.status === "PENDING" || req.status === "REJECTED")
    .slice(0, 3);

  const processingVisibleCount = data.filter(
    (req) => req.status === "PROCESSING",
  ).length;
  const openVisibleCount = data.filter(
    (req) => req.status === "PENDING" || req.status === "PROCESSING",
  ).length;



  const OPEN_REQUEST_STATUSES = new Set([
    "PENDING",
    "PROCESSING",
    "IN_PROGRESS",
    "WAITING_HOLDER",
    "WAITING_PAYMENT",
    "WAITING_MANAGER_APPROVAL",
    "WAITING_TARGET_HOLDER_APPROVAL",
    "WAITING_TENANT_CONFIRMATION",
    "WAITING_CONTRACT_CONFIRMATION",
    "WAITING_SIGNING",
    "WAITING_CONTRACT_SIGNING",
    "WAITING_TRANSFER_DATE",
    "READY_FOR_HANDOVER",
    "WAITING_EXECUTION",
  ]);

  const activeRequestBreakdown = Object.values(
    data.reduce((acc, req) => {
      if (!OPEN_REQUEST_STATUSES.has(req.status)) {
        return acc;
      }

      const key = req.requestType || "OTHER";
      if (!acc[key]) {
        acc[key] = {
          type: key,
          label: translateType(key),
          count: 0,
          color:
            (TYPE_CONFIG[key]?.accent === "violet" && "#8B5CF6") ||
            (TYPE_CONFIG[key]?.accent === "green" && "#22C55E") ||
            (TYPE_CONFIG[key]?.accent === "indigo" && "#6366F1") ||
            (TYPE_CONFIG[key]?.accent === "red" && "#EF4444") ||
            (TYPE_CONFIG[key]?.accent === "emerald" && "#10B981") ||
            (TYPE_CONFIG[key]?.accent === "blue" && "#3B82F6") ||
            (TYPE_CONFIG[key]?.accent === "orange" && "#F97316") ||
            "#94A3B8",
        };
      }

      acc[key].count += 1;
      return acc;
    }, {}),
  );

  return (
    <div className="bg-[#f8fafc] font-sans dark:bg-[#020817]">
      <div className="mx-auto w-full space-y-6">
        <DashboardPageHeader
          title={
            <span className="flex items-center gap-2">Quản lý yêu cầu</span>
          }
          actions={
            <Button
              onClick={() => router.push("/dashboard/room-transfer-history")}
              className="h-11 rounded-xl bg-[#1e40af] px-5 text-white hover:bg-slate-800"
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Lịch sử chuyển phòng
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-6 2xl:items-start">
          {/* LEFT: main content */}
          <div className="min-w-0 space-y-4">
            {/* Table */}
            <div className="flex gap-[24px]">
              {/* Left Column: TimeTreeFilter */}
              <TimeTreeFilter 
                treeData={fullTreeData}
                selectedDate={timeFilter}
                onDateSelect={handleTimeFilterSelect}
                className="hidden lg:flex"
              />

              {/* Right Column: Main Data Table & Pagination */}
              <div className="w-full min-w-0 flex-1 space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {STATUS_FILTERS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setStatusFilter(item.value);
                          setPage(1);
                        }}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                          statusFilter === item.value
                            ? "bg-[#1e40af] text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="w-full sm:w-auto shrink-0">
                    <select
                      className="h-9 w-full sm:w-[200px] rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:border-slate-300 focus:ring-0 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:hover:bg-white/5"
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="All Types">Tất cả loại</option>
                      {Object.keys(TYPE_CONFIG).map((t) => (
                        <option key={t} value={t}>
                          {translateType(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
              <div className="hidden min-[1536px]:block">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 dark:bg-white/5 dark:hover:bg-white/5">
                      <TableHead className="h-12 w-[16%] px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 min-[1650px]:w-[14%] text-center">
                        Người gửi
                      </TableHead>
                      <TableHead className="h-12 w-[13%] px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 min-[1650px]:w-[12%] text-center">
                        Loại yêu cầu
                      </TableHead>
                      <TableHead className="h-12 w-[12%] px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 min-[1650px]:w-[9%] text-center">
                        Trạng thái
                      </TableHead>
                      <TableHead className="hidden h-12 w-[13%] px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 min-[1650px]:table-cell text-center">
                        Hạn xử lý
                      </TableHead>
                      <TableHead className="h-12 w-[8%] whitespace-nowrap px-2 text-center text-xs font-semibold uppercase tracking-normal text-slate-400 min-[1650px]:w-[7%] text-center">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-12 text-center text-slate-500 dark:text-slate-400"
                        >
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                          Đang tải dữ liệu...
                        </TableCell>
                      </TableRow>
                    ) : data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-12 text-center text-slate-500 dark:text-slate-400"
                        >
                          Không tìm thấy yêu cầu nào.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((req) => {
                        const tc =
                          TYPE_CONFIG[mapRequestType(req.requestType)] ||
                          TYPE_CONFIG.ACCESS;
                        return (
                          <TableRow
                            key={req.id}
                            className="border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-white/10 dark:hover:bg-white/5"
                          >
                          <TableCell className="px-3 py-3 align-top">
  <div className="flex min-w-0 items-center">
    <div className="min-w-0 flex-1">
      <p className="font-extrabold leading-5 text-slate-900 text-center dark:text-white">
        {requesterName(req)}
      </p>

      <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 xl:text-xs text-center">
        {requesterSecondaryText(req) || "--"}
      </p>
    </div>
  </div>
</TableCell>
                           <TableCell className="px-3 py-3 align-middle">
  <div className="flex items-center gap-3 ml-10">
    {/* Cố định kích thước khung chứa icon để chúng luôn thẳng hàng */}
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tc.color}`}>
      {tc.icon}
    </div>
    
    {/* Phần chữ có thể đặt chiều rộng hoặc flex-1 tùy ý */}
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
        {translateType(req.requestType)}
      </p>
    </div>
  </div>
</TableCell>
                            <TableCell className="px-3 py-3 align-middle text-center">
                              <Badge
                                variant="outline"
                                className={`rounded-full capitalize ${statusBadgeClass(req.status)}`}
                              >
                                {translateStatus(req.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden min-[1650px]:table-cell px-3 py-3 align-top text-sm text-center">
                              <p
                                className={`${req.status === "REJECTED" ? "text-red-500 dark:text-red-300" : "text-slate-900 dark:text-white"}`}
                              >
                                {formatRequestDate(req.createdAt)}
                              </p>
                              <p
                                className={`mt-2 ${req.status === "PENDING" ? "text-orange-500 dark:text-orange-300" : req.status === "REJECTED" ? "text-red-500 dark:text-red-300" : "text-slate-400 dark:text-slate-500"}`}
                              >
                                {req.status === "PENDING"
                                  ? "Còn 1 ngày"
                                  : req.status === "REJECTED"
                                    ? "Quá hạn"
                                    : "Đúng hạn"}
                              </p>
                            </TableCell>
                            <TableCell className="px-2 py-3 align-top">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openDetailModal(req)}
                                  className="h-8 w-8 rounded-xl border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-white/10 min-[1536px]:hidden">
                {loading ? (
                  <div className="py-10 text-center text-gray-500 dark:text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Đang tải dữ liệu...
                  </div>
                ) : data.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 dark:text-slate-400">
                    Không tìm thấy yêu cầu nào.
                  </div>
                ) : (
                  data.map((req) => {
                    const tc =
                      TYPE_CONFIG[mapRequestType(req.requestType)] ||
                      TYPE_CONFIG.ACCESS;
                    return (
                      <div key={req.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-sans text-sm font-semibold text-gray-900 dark:text-white" title={requesterName(req)}>
                              {requesterName(req)}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-semibold text-gray-500 dark:text-slate-400" title={requesterSecondaryText(req)}>
                              {requesterSecondaryText(req) || req.requestCode || `#${req.id}`}
                            </p>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-200">
                              {req.title || "--"}
                            </p>
                          </div>
                          <div
                            className={`w-9 h-9 ${tc.color} rounded-lg flex items-center justify-center shrink-0`}
                          >
                            {tc.icon}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`capitalize ${statusBadgeClass(req.status)}`}
                          >
                            {translateStatus(req.status)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-white text-gray-600 border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                          >
                            {translateType(req.requestType)}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {formatRequestDate(req.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDetailModal(req)}
                            className="rounded-lg h-8 px-3 text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Xem
                          </Button>
                          {canResolveRequest(req, isOwner) && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(req)}
                                disabled={
                                  actionLoading?.startsWith("approve") ||
                                  actionLoading?.startsWith("reject")
                                }
                                className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-8 px-3 disabled:opacity-60"
                              >
                                {actionLoading === `approve-${req.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  "Duyệt"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectModal(req);
                                  setRejectNote("");
                                }}
                                disabled={
                                  actionLoading?.startsWith("approve") ||
                                  actionLoading?.startsWith("reject")
                                }
                                className="rounded-lg h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-60 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-500/10"
                              >
                                Từ chối
                              </Button>
                            </>
                          )}
                          {isExpenseApprovalRequest(req) &&
                            req.status === "APPROVED" && (
                              <Button
                                size="sm"
                                onClick={() => openPaymentModal(req)}
                                disabled={Boolean(actionLoading)}
                                className="rounded-lg h-8 px-3 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                Ghi nhận đã hoàn tiền
                              </Button>
                            )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DashboardPagination
              page={page}
              size={size}
              totalElements={total}
              totalPages={totalPages}
              itemLabel="yêu cầu"
              className="rounded-b-3xl"
              onPageChange={setPage}
              onSizeChange={(nextSize) => {
                setSize(nextSize);
                setPage(1);
              }}
            />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-2 sm:p-3 backdrop-blur-sm"
          onClick={closeDetailModal}
        >
          <div
            className="w-full max-w-4xl max-h-[96vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between z-10 dark:border-white/10 dark:bg-[#0f172a]">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Chi tiết yêu cầu
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDetailModal}
                className="rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <RequestDetailContent
                req={detailModal}
                detailTransfer={detailTransfer}
              />
            </div>
            {(canResolveRequest(detailModal, isOwner) ||
              (isExpenseApprovalRequest(detailModal) &&
                detailModal.status === "APPROVED") ||
              (detailModal.requestType === "ROOM_TRANSFER" &&
                detailTransfer)) && (
              <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 flex flex-wrap items-center justify-end gap-3 dark:border-white/10 dark:bg-[#0f172a]">
                {canResolveRequest(detailModal, isOwner) && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRejectModal(detailModal);
                        setRejectNote("");
                        closeDetailModal();
                      }}
                      className="rounded-lg text-red-600 border-red-200 hover:bg-red-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      Từ chối
                    </Button>
                    <Button
                      onClick={() => {
                        handleApprove(detailModal);
                        closeDetailModal();
                      }}
                      disabled={actionLoading?.startsWith("approve")}
                      className="rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
                    >
                      {actionLoading === `approve-${detailModal.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Duyệt yêu cầu"
                      )}
                    </Button>
                  </>
                )}
                {isExpenseApprovalRequest(detailModal) &&
                  detailModal.status === "APPROVED" && (
                    <Button
                      onClick={() => openPaymentModal(detailModal)}
                      disabled={Boolean(actionLoading)}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                    >
                      Ghi nhận đã hoàn tiền
                    </Button>
                  )}
                {detailModal.requestType === "ROOM_TRANSFER" &&
                  detailTransfer?.status ===
                    "WAITING_CONTRACT_CONFIRMATION" && (
                    <Button
                      onClick={handleConfirmTransferContract}
                      disabled={Boolean(actionLoading)}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                    >
                      {actionLoading ===
                      `confirm-contract-${detailModal.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Xác nhận hợp đồng"
                      )}
                    </Button>
                  )}
                {detailModal.requestType === "ROOM_TRANSFER" &&
                  isTransferSigningStatus(detailTransfer?.status) &&
                  getTransferSigningDocuments(detailTransfer).length > 0 && (
                    <>
                      {getTransferSigningDocuments(detailTransfer).map(
                        (document) => (
                          <div
                            key={document.kind}
                            className="flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10 dark:bg-white/5"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                                  {document.label}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    isTransferSigningDocumentSigned(document)
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                      : document.signedFileId
                                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300"
                                        : "border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                                  }
                                >
                                  {isTransferSigningDocumentSigned(document)
                                    ? "Đã xác nhận ký"
                                    : document.signedFileId
                                      ? "Đã upload, chờ xác nhận"
                                      : "Chưa upload"}
                                </Badge>
                              </div>
                              {(document.signedFileName ||
                                document.contractFileName) && (
                                <p className="mt-1 max-w-[220px] truncate text-[11px] text-gray-500 dark:text-slate-400">
                                  {document.signedFileName ||
                                    document.contractFileName}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              onClick={() =>
                                handleDownloadTransferContractDraft(document.id)
                              }
                              disabled={Boolean(actionLoading)}
                              className="rounded-lg"
                            >
                              {actionLoading ===
                              `download-transfer-contract-${document.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              Tải
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedTransferContractId(document.id);
                                signedTransferContractInputRef.current?.click();
                              }}
                              disabled={Boolean(actionLoading)}
                              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                            >
                              {actionLoading ===
                              `upload-transfer-contract-${document.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {document.signedFileId ? "Upload lại" : "Upload"}
                            </Button>
                            <Button
                              onClick={() =>
                                handleSignTransferContractDocument(document)
                              }
                              disabled={
                                Boolean(actionLoading) ||
                                !document.signedFileId ||
                                isTransferSigningDocumentSigned(document)
                              }
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                            >
                              {actionLoading ===
                              `sign-transfer-contract-document-${document.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              {isTransferSigningDocumentSigned(document)
                                ? "Đã xác nhận"
                                : "Xác nhận ký"}
                            </Button>
                          </div>
                        ),
                      )}
                      <input
                        ref={signedTransferContractInputRef}
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={handleUploadSignedTransferContract}
                      />
                      {isTransferSigningStatus(detailTransfer.status) &&
                        allowsTransferAction(
                          detailTransfer,
                          "SIGN_TRANSFER_CONTRACT",
                        ) && (
                          <div className="flex flex-col items-end gap-1">
                            <Button
                              onClick={handleSignTransferContract}
                              disabled={
                                Boolean(actionLoading) ||
                                !allTransferSigningDocumentsSigned(
                                  detailTransfer,
                                )
                              }
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                            >
                              {actionLoading ===
                              `sign-transfer-contract-${detailModal.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              Xác nhận đã ký đủ
                            </Button>
                            {!allTransferSigningDocumentsSigned(
                              detailTransfer,
                            ) && (
                              <p className="max-w-xs text-right text-xs font-semibold text-amber-700">
                                Còn thiếu:{" "}
                                {getMissingTransferSigningDocumentLabels(
                                  detailTransfer,
                                ).join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                    </>
                  )}
                {detailModal.requestType === "ROOM_TRANSFER" &&
                  detailTransfer &&
                  [
                    "WAITING_TRANSFER_DATE",
                    "READY_FOR_HANDOVER",
                    "WAITING_EXECUTION",
                  ].includes(detailTransfer.status) &&
                  (detailTransfer.status !== "WAITING_EXECUTION" ||
                    allowsTransferAction(
                      detailTransfer,
                      "COMPLETE_TRANSFER",
                    )) && (
                    <Button
                      onClick={() =>
                        openExecuteModal(detailModal, detailTransfer)
                      }
                      disabled={Boolean(actionLoading)}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                    >
                      {detailTransfer?.status === "WAITING_EXECUTION"
                        ? "Hoàn tất chuyển phòng"
                        : "Chốt phòng cũ"}
                    </Button>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {paymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-3 backdrop-blur-sm"
          onClick={() => setPaymentModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 py-4 dark:border-white/10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Ghi nhận đã hoàn tiền
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {paymentModal.title || paymentModal.requestCode}
              </p>
            </div>
            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Ngày hoàn tiền
                </span>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      paymentDate: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#020817] dark:text-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Mã giao dịch
                </span>
                <input
                  value={paymentForm.paymentReference}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      paymentReference: event.target.value,
                    }))
                  }
                  placeholder="VD: mã giao dịch ngân hàng"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#020817] dark:text-white dark:placeholder:text-slate-500"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Ảnh minh chứng *
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      proofFile: event.target.files?.[0] || null,
                    }))
                  }
                  className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white dark:text-slate-300 dark:file:bg-blue-600"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200">
                  Ghi chú
                </span>
                <textarea
                  rows={3}
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-[#020817] dark:text-white"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-white/10">
              <Button
                variant="outline"
                onClick={() => setPaymentModal(null)}
                className="rounded-lg"
              >
                Hủy
              </Button>
              <Button
                onClick={handleMarkExpensePaid}
                disabled={actionLoading === `mark-paid-${paymentModal.id}`}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
              >
                {actionLoading === `mark-paid-${paymentModal.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Lưu và gửi khách xác nhận"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <TransferExecutionModal
        open={Boolean(executeModal)}
        transferRequestId={executeModal?.transfer?.id}
        transfer={executeModal?.transfer}
        request={executeModal?.request}
        onClose={closeExecuteModal}
        onCompleted={async (refreshedTransfer) => {
          if (refreshedTransfer) {
            setDetailTransfer(refreshedTransfer);
          } else if (detailModal) {
            setDetailTransfer(await loadTransferDetail(detailModal));
          }
          await loadData();
        }}
      />
      {/* Reject modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-3 backdrop-blur-sm"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:border dark:border-white/10 dark:bg-[#0f172a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 py-4 dark:border-white/10">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Từ chối yêu cầu
              </h3>
              <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">
                {rejectModal.title || rejectModal.requestCode}
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-200">
                Lý do từ chối
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:border-white/10 dark:bg-[#020817] dark:text-white dark:placeholder:text-slate-500"
                rows={4}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Nhập lý do từ chối..."
              />
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 dark:border-white/10">
              <Button
                variant="outline"
                onClick={() => setRejectModal(null)}
                className="rounded-lg"
              >
                Hủy
              </Button>
              <Button
                onClick={handleReject}
                disabled={actionLoading?.startsWith("reject")}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              >
                {actionLoading === `reject-${rejectModal.id}` ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Xác nhận từ chối"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
