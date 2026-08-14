"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  Bike,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Contact,
  Eye,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  IdCard,
  ImageOff,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  RefreshCcw,
  Search,
  Send,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  fetchPrivateFileObjectUrl,
  fetchTenantProfiles,
  downloadTenantProfilesPoliceReportPackageExport,
  downloadTenantProfilesPoliceReportExport,
} from "@/services/tenantProfilesService";
import { fetchManagementLeaseContractDetails } from "@/services/leaseContractsService";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/lib/dateFormat";
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import {
  dedupeTenantProfileEmergencyContacts,
  dedupeTenantProfileVehicles,
  dedupeTenantProfiles,
} from "@/lib/tenantProfileDedupe.mjs";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermission } from "@/app/dashboard/_hooks/usePermission";
import {
  fetchTenantAccountCandidates,
  sendTenantAccountCredentials,
} from "@/services/identityAccessService";

const TENANT_PROFILE_FETCH_SIZE = 1000;

const PROFILE_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "COMPLETED", label: "Hồ sơ đủ" },
  { value: "MISSING_CCCD", label: "Thiếu CCCD" },
  { value: "MISSING_PORTRAIT", label: "Thiếu ảnh chân dung" },
];

const POLICE_REPORT_EXPORT_COLUMNS = [
  { key: "propertyName", label: "Cơ sở" },
  { key: "roomCode", label: "Phòng" },
  { key: "contractCode", label: "Mã hợp đồng" },
  { key: "fullName", label: "Họ tên" },
  { key: "cccdNumber", label: "CCCD" },
  { key: "documentType", label: "Loại giấy tờ" },
  { key: "dateOfBirth", label: "Ngày sinh" },
  { key: "gender", label: "Giới tính" },
  { key: "phone", label: "Số điện thoại" },
  { key: "permanentAddress", label: "Địa chỉ thường trú" },
  { key: "issuedDate", label: "Ngày cấp" },
  { key: "issuedPlace", label: "Nơi cấp" },
  { key: "expiryDate", label: "Ngày hết hạn" },
  { key: "cccdImageLinks", label: "Link ảnh CCCD" },
];
const DEFAULT_POLICE_REPORT_EXPORT_COLUMNS = POLICE_REPORT_EXPORT_COLUMNS.map(
  (column) => column.key,
);

const valueOf = (item, ...keys) => {
  for (const key of keys) {
    if (
      item &&
      item[key] !== undefined &&
      item[key] !== null &&
      item[key] !== ""
    ) {
      return item[key];
    }
  }
  return "";
};

const moneyFormatter = new Intl.NumberFormat("vi-VN");

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getInitials = (value) => {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
};

const floorFromRoomCode = (roomCode) => {
  const digits = String(roomCode || "").match(/^\d+/)?.[0] || "";
  if (!digits) return "";
  return digits.length >= 3 ? digits.slice(0, -2) : digits.slice(0, -1) || digits;
};

const formatDate = (value) => {
  return formatDisplayDate(value);
};

const formatDateTime = (value) => {
  return formatDisplayDateTime(value);
};

const formatYear = (value) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa cập nhật"
    : String(date.getFullYear());
};

const formatMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `${moneyFormatter.format(amount)} VNĐ`
    : "Chưa cập nhật";
};

const roleLabel = (role) =>
  String(role).toUpperCase() === "PRIMARY" ? "Người ký chính" : "Người ở cùng";

const roleClass = (role) =>
  String(role).toUpperCase() === "PRIMARY"
    ? "border-indigo-200 dark:border-blue-500/20 bg-indigo-50 dark:bg-blue-500/10 text-indigo-700 dark:text-blue-300"
    : "border-slate-200 bg-slate-50 text-slate-700";

function resolveAccountState(item) {
  if (
    item?.occupantStatus === "DISABLED" ||
    item?.provisioningStatus === "DISABLED"
  ) {
    return {
      key: "DISABLED",
      label: "Đã vô hiệu hóa",
      hint: item?.disabledReason || "Quyền truy cập tenant đã bị vô hiệu hóa.",
    };
  }

  if (item?.provisioningStatus === "PENDING") {
    return {
      key: "PENDING",
      label: "Đang gửi",
      hint: "Hệ thống đang xử lý gửi tài khoản.",
    };
  }

  if (item?.provisioningStatus === "FAILED") {
    return {
      key: "FAILED",
      label: "Gửi thất bại",
      hint: item?.failureReason || "Có thể thử gửi lại.",
    };
  }

  if (item?.provisioningStatus === "NOT_PROVISIONED") {
    return {
      key: "NOT_SENT",
      label: "Chưa cấp",
      hint: "Chưa gửi tài khoản mobile.",
    };
  }

  if (item?.provisioningStatus === "SENT") {
    return {
      key: "SENT",
      label: "Đã gửi",
      hint: "Chờ khách kích hoạt tài khoản.",
    };
  }

  return {
    key: "ACTIVATED",
    label: "Đã kích hoạt",
    hint: "Khách đã kích hoạt tài khoản.",
  };
}

function FilterDropdown({ label, value, options, onChange, disabled = false }) {
  const selectedOption = options.find(
    (option) => String(option.value) === String(value),
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-left text-sm font-semibold text-slate-900 outline-none transition hover:bg-slate-50 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:hover:bg-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-500"
          aria-label={label}
        >
          <span className="truncate">{selectedOption?.label || label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-48 overflow-y-auto rounded-lg border border-[#d9dde5] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#0f172a]"
      >
        {options.map((option) => {
          const selected = String(option.value) === String(value);
          return (
            <DropdownMenuItem
              key={option.value}
              asChild
              className="rounded-md p-0 focus:bg-transparent"
            >
              <button
                type="button"
                onClick={() => onChange(option.value)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 ${
                  selected ? "bg-slate-100 dark:bg-white/10" : ""
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {option.label}
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-[#1e40af] dark:text-blue-300" />}
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const accountStatusLabel = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "Đã kích hoạt";
  if (
    value === "INACTIVE" ||
    value === "DISABLED" ||
    value === "CLOSED" ||
    value === "ARCHIVED"
  ) {
    return "Bị vô hiệu hóa";
  }
  return "Chưa kích hoạt";
};

const accountStatusClass = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE")
    return "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (
    value === "INACTIVE" ||
    value === "DISABLED" ||
    value === "CLOSED" ||
    value === "ARCHIVED"
  ) {
    return "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const residenceStatusLabel = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "RENTING") return "Đang thuê";
  if (value === "MOVED_OUT") return "Đã rời đi";
  return "Chờ duyệt";
};

const contractStatusLabel = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "Đang hiệu lực";
  if (value === "EXPIRING_SOON") return "Sắp hết hạn";
  if (value === "EXPIRED") return "Hết hạn";
  if (value === "PENDING_SIGNATURE") return "Chờ ký";
  if (value === "DRAFT") return "Bản nháp";
  if (value === "WAITING_UPLOAD") return "Chờ upload";
  if (value === "WAITING_ACTIVATE") return "Chờ kích hoạt";
  if (value === "RENEWED") return "Đã gia hạn";
  if (value === "LIQUIDATED") return "Đã thanh lý";
  if (value === "CANCELLED") return "Đã hủy";
  return value || "Chưa cập nhật";
};

const contractStatusClass = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE")
    return "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value === "EXPIRING_SOON")
    return "border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300";
  if (value === "EXPIRED")
    return "border-red-200 dark:border-rose-500/20 bg-red-50 dark:bg-rose-500/10 text-red-700 dark:text-rose-300";
  if (
    [
      "PENDING_SIGNATURE",
      "DRAFT",
      "WAITING_UPLOAD",
      "WAITING_ACTIVATE",
    ].includes(value)
  ) {
    return "border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (value === "RENEWED")
    return "border-indigo-200 dark:border-blue-500/20 bg-indigo-50 dark:bg-blue-500/10 text-indigo-700 dark:text-blue-300";
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const genderLabel = (gender) => {
  const value = String(gender || "").toUpperCase();
  if (value === "MALE") return "Nam";
  if (value === "FEMALE") return "Nữ";
  if (value === "OTHER") return "Khác";
  return gender || "Chưa cập nhật";
};

const vehicleTypeLabel = (type) => {
  const value = String(type || "").toUpperCase();
  if (value === "MOTORBIKE") return "Xe máy";
  if (value === "BICYCLE") return "Xe đạp";
  if (value === "CAR") return "Ô tô";
  if (value === "E_BIKE") return "Xe điện";
  return type || "Khác";
};

const roomOccupancyText = (profile) => {
  const current =
    Number(valueOf(profile, "roomOccupantCount", "room_occupant_count")) || 0;
  const max =
    Number(valueOf(profile, "roomMaxOccupants", "room_max_occupants")) || 3;
  return `${current}/${max}`;
};

const profileRowKey = (profile, index) => {
  const profileId = valueOf(profile, "id", "profileId", "profile_id");
  if (profileId) return `profile-${profileId}`;
  return [
    "profile-row",
    valueOf(profile, "contractId", "contract_id") || "contract",
    valueOf(profile, "roomRole", "room_role") || "role",
    valueOf(profile, "phone") || "phone",
    valueOf(profile, "fullName", "full_name") || "name",
    index,
  ].join("-");
};

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {children}
    </span>
  );
}

function TenantProfileActionsMenu({
  profile,
  onViewProfile,
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white text-slate-600 transition hover:border-[#1e40af] hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:text-white"
            aria-label={`Thao tác hồ sơ ${valueOf(profile, "fullName", "full_name") || ""}`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 max-w-[calc(100vw-1rem)] rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)] dark:border-white/10 dark:bg-[#0f172a]"
        >
          <DropdownMenuItem
            asChild
            className="rounded-lg p-0 focus:bg-transparent"
          >
            <button
              type="button"
              onClick={() => onViewProfile(profile)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              Xem hồ sơ
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function InfoItem({ label, value, strong = false }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#7b8494]">{label}</p>
      <p
        className={`mt-1 text-sm ${strong ? "font-black text-slate-900 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-200"}`}
      >
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}

function DetailSection({ icon: Icon, title, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-[#d8dee8] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 ${className}`}
    >
      <div className="mb-5 flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-900 dark:text-white" />
        <h3 className="text-sm font-black uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function ProtectedImage({ fileUrl, alt, placeholder }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [state, setState] = useState(fileUrl ? "loading" : "empty");

  useEffect(() => {
    let isActive = true;
    let createdUrl = "";

    if (!fileUrl) {
      return undefined;
    }

    fetchPrivateFileObjectUrl(fileUrl)
      .then((url) => {
        if (!isActive) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setObjectUrl(url);
        setState("ready");
      })
      .catch(() => {
        if (isActive) setState("error");
      });

    return () => {
      isActive = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileUrl]);

  const displayState = fileUrl ? state : "empty";

  if (displayState !== "ready") {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] dark:border-white/10 bg-[#f1f5f9] dark:bg-white/5 p-4 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
        <div>
          <ImageOff className="mx-auto mb-3 h-8 w-8 text-slate-400 dark:text-slate-500" />
          {displayState === "loading" ? "Đang tải ảnh..." : placeholder}
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={objectUrl}
      alt={alt}
      className="h-[220px] w-full rounded-xl border border-[#d8dee8] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 object-contain"
      onError={() => setState("error")}
    />
  );
}

function ChecklistRow({ label, done, doneText, missingText }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#f1f5ff] dark:bg-white/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-[#1e40af] dark:text-[#93c5fd]" />
        <span className="font-bold text-slate-700 dark:text-slate-200">
          {label}
        </span>
      </div>
      <span
        className={`flex items-center gap-1 text-xs font-black uppercase ${done ? "text-emerald-600 dark:text-emerald-300" : "text-amber-700 dark:text-yellow-300"}`}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        {done ? doneText : missingText}
      </span>
    </div>
  );
}

function ContactLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ff] text-[#1e40af] dark:text-[#93c5fd]">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xs font-bold text-[#7b8494]">{label}</span>
        <span className="block text-sm font-black text-slate-900 dark:text-white">
          {value || "Chưa cập nhật"}
        </span>
      </span>
    </div>
  );
}

function getProfileContractId(profile) {
  return valueOf(
    profile,
    "contractId",
    "contract_id",
    "leaseContractId",
    "lease_contract_id",
  );
}

function ContractDetailInfo({ label, value, strong = false }) {
  return (
    <div className="rounded-xl bg-[#f8fafc] dark:bg-white/5 p-4">
      <p className="text-xs font-black uppercase tracking-[0.06em] text-[#7b8494]">
        {label}
      </p>
      <p
        className={`mt-2 text-sm ${strong ? "font-black text-slate-900 dark:text-white" : "font-bold text-slate-700 dark:text-slate-200"}`}
      >
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}

function LeaseContractDetailModal({ contract, onClose }) {
  if (!contract) return null;

  const room = valueOf(contract, "room") || {};
  const property = valueOf(contract, "property") || {};
  const occupants = sortByNewest(valueOf(contract, "occupants") || [], [
    "createdAt",
    "created_at",
    "moveInDate",
    "move_in_date",
    "signedAt",
    "signed_at",
  ]);
  const contractFile =
    valueOf(contract, "contractFile", "contract_file") || null;
  const paymentCycleMonths =
    Number(valueOf(contract, "paymentCycleMonths", "payment_cycle_months")) ||
    0;
  const monthlyRent =
    Number(valueOf(contract, "monthlyRent", "monthly_rent")) || 0;
  const amountPerPeriod =
    paymentCycleMonths > 0 && monthlyRent > 0
      ? monthlyRent * paymentCycleMonths
      : null;
  const status = valueOf(
    contract,
    "status",
    "contractStatus",
    "contract_status",
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white dark:bg-[#0f172a] shadow-2xl">
        <header className="relative bg-[#05091d] px-6 py-7 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết hợp đồng"
            className="absolute right-4 top-4 rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-slate-300">
            Chi tiết hợp đồng
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.02em]">
            {valueOf(contract, "contractCode", "contract_code") ||
              "Chưa có mã hợp đồng"}
          </h2>
          <span
            className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-black ${contractStatusClass(status)}`}
          >
            {contractStatusLabel(status)}
          </span>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto bg-[#fbfcfe] dark:bg-white/5 p-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <DetailSection icon={MapPin} title="Thông tin phòng">
              <div className="grid gap-4 md:grid-cols-2">
                <ContractDetailInfo
                  label="Cơ sở"
                  value={
                    valueOf(contract, "propertyName", "property_name") ||
                    valueOf(property, "name", "propertyName", "property_name")
                  }
                />
                <ContractDetailInfo
                  label="Phòng"
                  value={
                    valueOf(contract, "roomCode", "room_code") ||
                    valueOf(room, "roomCode", "room_code")
                  }
                  strong
                />
                <ContractDetailInfo
                  label="Giá thuê/tháng"
                  value={formatMoney(monthlyRent)}
                />
                <ContractDetailInfo
                  label="Số tiền đóng mỗi kỳ"
                  value={
                    amountPerPeriod
                      ? formatMoney(amountPerPeriod)
                      : "Chưa cập nhật"
                  }
                />
                <ContractDetailInfo
                  label="Tiền cọc"
                  value={formatMoney(
                    valueOf(contract, "depositAmount", "deposit_amount"),
                  )}
                />
                <ContractDetailInfo
                  label="Số người"
                  value={`${occupants.length || valueOf(contract, "occupantsCount", "occupants_count") || 1} người`}
                />
              </div>
            </DetailSection>

            <DetailSection icon={BriefcaseBusiness} title="Thông tin hợp đồng">
              <div className="grid gap-4 md:grid-cols-2">
                <ContractDetailInfo
                  label="Mã hợp đồng"
                  value={valueOf(contract, "contractCode", "contract_code")}
                  strong
                />
                <ContractDetailInfo
                  label="Trạng thái"
                  value={contractStatusLabel(status)}
                />
                <ContractDetailInfo
                  label="Ngày bắt đầu"
                  value={formatDate(
                    valueOf(contract, "startDate", "start_date"),
                  )}
                />
                <ContractDetailInfo
                  label="Ngày kết thúc"
                  value={formatDate(valueOf(contract, "endDate", "end_date"))}
                />
                <ContractDetailInfo
                  label="Ngày bắt đầu tính tiền"
                  value={formatDate(
                    valueOf(contract, "rentStartDate", "rent_start_date"),
                  )}
                />
                <ContractDetailInfo
                  label="Chu kỳ thanh toán"
                  value={
                    paymentCycleMonths
                      ? `${paymentCycleMonths} tháng/lần`
                      : "Chưa cập nhật"
                  }
                />
                <ContractDetailInfo
                  label="Hợp đồng trước"
                  value={
                    valueOf(
                      contract,
                      "previousContractCode",
                      "previous_contract_code",
                    ) || "Không có"
                  }
                />
                <ContractDetailInfo
                  label="Hợp đồng gia hạn"
                  value={
                    valueOf(
                      contract,
                      "renewedContractCode",
                      "renewed_contract_code",
                    ) || "Chưa có"
                  }
                />
              </div>
            </DetailSection>
          </div>

          <DetailSection icon={Users} title="Người ở trong hợp đồng">
            {occupants.length ? (
              <div className="dashboard-table rounded-xl border border-[#e2e8f0] dark:border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f8fafc] dark:bg-white/5 text-xs font-black uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">Vai trò</th>
                      <th className="px-4 py-3">SĐT</th>
                      <th className="px-4 py-3">CCCD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {occupants.map((occupant, index) => (
                      <tr
                        key={
                          valueOf(
                            occupant,
                            "tenantProfileId",
                            "tenant_profile_id",
                            "id",
                          ) || index
                        }
                      >
                        <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                          {valueOf(occupant, "fullName", "full_name") ||
                            "Chưa cập nhật"}
                        </td>
                        <td className="px-4 py-3">
                          {roleLabel(
                            valueOf(
                              occupant,
                              "occupantRole",
                              "occupant_role",
                              "roomRole",
                              "room_role",
                            ),
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {valueOf(occupant, "phone") || "Chưa cập nhật"}
                        </td>
                        <td className="px-4 py-3">
                          {valueOf(
                            occupant,
                            "citizenId",
                            "citizen_id",
                            "docNumber",
                            "doc_number",
                          ) || "Chưa cập nhật"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl bg-[#f8fafc] dark:bg-white/5 px-4 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Chưa có danh sách người ở trong hợp đồng.
              </p>
            )}
          </DetailSection>

          <DetailSection icon={FileText} title="File hợp đồng đã ký">
            {contractFile ? (
              <div className="rounded-xl bg-[#f8fafc] dark:bg-white/5 p-4">
                <p className="font-black text-slate-900 dark:text-white">
                  {valueOf(contractFile, "fileName", "file_name", "name") ||
                    "File hợp đồng"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Upload:{" "}
                  {formatDate(
                    valueOf(
                      contractFile,
                      "uploadedAt",
                      "uploaded_at",
                      "createdAt",
                      "created_at",
                    ),
                  )}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-[#f8fafc] dark:bg-white/5 px-4 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Chưa có file hợp đồng đã ký.
              </p>
            )}
          </DetailSection>
        </div>
      </section>
    </div>
  );
}

function TenantProfileModal({
  profile,
  profiles,
  onClose,
  onSelectProfile,
  onOpenContractDetails,
  contractDetailsLoadingId,
  contractDetailsError,
}) {
  const identity =
    valueOf(profile, "identityDocument", "identity_document") || {};
  const vehicles = dedupeTenantProfileVehicles(
    valueOf(profile, "vehicles") || [],
  );
  const emergencyContacts = dedupeTenantProfileEmergencyContacts(
    valueOf(profile, "emergencyContacts", "emergency_contacts") || [],
  );
  const roommates = dedupeTenantProfiles(
    sortByNewest(valueOf(profile, "roommates") || [], [
      "createdAt",
      "created_at",
      "accountCreatedAt",
      "account_created_at",
      "moveInDate",
      "move_in_date",
    ]),
  );
  const maxOccupants =
    Number(valueOf(profile, "roomMaxOccupants", "room_max_occupants")) || 3;
  const occupantCount =
    Number(valueOf(profile, "roomOccupantCount", "room_occupant_count")) || 1;
  const firstEmergency = emergencyContacts[0];
  const contractId = getProfileContractId(profile);
  const isLoadingContractDetails =
    contractId && String(contractDetailsLoadingId) === String(contractId);

  const openRoommateProfile = (roommateId) => {
    const nextProfile = profiles.find(
      (item) => Number(valueOf(item, "id")) === Number(roommateId),
    );
    if (nextProfile) onSelectProfile(nextProfile);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white dark:bg-[#0f172a] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d8dee8] dark:border-white/10 px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-blue-500/10 text-indigo-700 dark:text-blue-300">
              <UserRound className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Chi tiết hồ sơ khách thuê
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-[#f2f4f6] dark:hover:bg-white/5"
            aria-label="Đóng"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto bg-[#fbfcfe] dark:bg-white/5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid content-start gap-5">
            <DetailSection icon={IdCard} title="Thông tin cá nhân">
              <div className="grid gap-5 md:grid-cols-3">
                <InfoItem
                  label="Họ và tên"
                  value={valueOf(profile, "fullName", "full_name")}
                  strong
                />
                <InfoItem
                  label="Ngày sinh"
                  value={formatDate(valueOf(profile, "dob"))}
                />
                <InfoItem
                  label="Giới tính"
                  value={genderLabel(valueOf(profile, "gender"))}
                />
                <InfoItem
                  label="Số CCCD"
                  value={valueOf(identity, "docNumber", "doc_number")}
                />
                <InfoItem
                  label="Ngày cấp"
                  value={formatDate(
                    valueOf(identity, "issuedDate", "issued_date"),
                  )}
                />
                <InfoItem
                  label="Nơi cấp"
                  value={valueOf(identity, "issuedPlace", "issued_place")}
                />
                <div className="md:col-span-3">
                  <InfoItem
                    label="Hộ khẩu thường trú"
                    value={valueOf(
                      profile,
                      "permanentAddress",
                      "permanent_address",
                    )}
                  />
                </div>
              </div>
            </DetailSection>

            <DetailSection icon={MapPin} title="Nơi cư trú">
              <div className="grid gap-5 md:grid-cols-3">
                <InfoItem
                  label="Tên cơ sở trọ"
                  value={valueOf(profile, "propertyName", "property_name")}
                />
                <InfoItem
                  label="Số phòng"
                  value={`Phòng ${valueOf(profile, "roomCode", "room_code")}`}
                  strong
                />
                <InfoItem
                  label="Vai trò trong phòng"
                  value={roleLabel(valueOf(profile, "roomRole", "room_role"))}
                />
                <InfoItem
                  label="Số người trong phòng"
                  value={`${occupantCount}/${maxOccupants}`}
                />
                <InfoItem
                  label="Ngày vào ở"
                  value={formatDate(
                    valueOf(profile, "moveInDate", "move_in_date"),
                  )}
                />
                <InfoItem
                  label="Trạng thái cư trú"
                  value={residenceStatusLabel(
                    valueOf(profile, "residenceStatus", "residence_status"),
                  )}
                />
              </div>
            </DetailSection>

            <DetailSection icon={Users} title="Danh sách người cùng phòng">
              {roommates.length ? (
                <div className="dashboard-table rounded-xl border border-[#e2e8f0] dark:border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f8fafc] dark:bg-white/5 text-xs font-black uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Họ tên</th>
                        <th className="px-4 py-3">Năm sinh</th>
                        <th className="px-4 py-3">Số điện thoại</th>
                        <th className="px-4 py-3">Vai trò</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {roommates.map((roommate, index) => (
                        <tr
                          key={
                            valueOf(roommate, "id") ||
                            `${valueOf(roommate, "roomRole", "room_role")}-${valueOf(roommate, "phone")}-${index}`
                          }
                        >
                          <td
                            data-label="Họ tên"
                            className="px-4 py-3 font-bold text-slate-900 dark:text-white"
                          >
                            {valueOf(roommate, "fullName", "full_name")}
                          </td>
                          <td data-label="Năm sinh" className="px-4 py-3">
                            {formatYear(valueOf(roommate, "dob"))}
                          </td>
                          <td data-label="Số điện thoại" className="px-4 py-3">
                            {valueOf(roommate, "phone") || "Chưa cập nhật"}
                          </td>
                          <td data-label="Vai trò" className="px-4 py-3">
                            {roleLabel(
                              valueOf(roommate, "roomRole", "room_role"),
                            )}
                          </td>
                          <td
                            data-label="Thao tác"
                            className="px-4 py-3 text-right"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openRoommateProfile(valueOf(roommate, "id"))
                              }
                              className="rounded-lg border border-[#d8dee8] dark:border-white/10 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white hover:bg-[#f2f4f6] dark:hover:bg-white/5"
                            >
                              Xem hồ sơ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl bg-[#f8fafc] dark:bg-white/5 px-4 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Phòng hiện chỉ có 1 người ở.
                </p>
              )}
            </DetailSection>

            <DetailSection icon={Bike} title="Thông tin xe">
              {vehicles.length ? (
                <div className="grid gap-4">
                  {vehicles.map((vehicle, index) => (
                    <div
                      key={valueOf(vehicle, "id") || index}
                      className="grid gap-5 rounded-xl bg-[#f8fafc] dark:bg-white/5 p-4 md:grid-cols-3"
                    >
                      <InfoItem
                        label="Hãng xe"
                        value={vehicleTypeLabel(
                          valueOf(vehicle, "vehicleType", "vehicle_type"),
                        )}
                      />
                      <InfoItem
                        label="Biển số"
                        value={valueOf(
                          vehicle,
                          "licensePlate",
                          "license_plate",
                        )}
                        strong
                      />
                      <InfoItem label="Số lượng xe" value={vehicles.length} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-[#f8fafc] dark:bg-white/5 px-4 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Chưa đăng ký xe
                </p>
              )}
            </DetailSection>

            <DetailSection icon={Contact} title="Ảnh căn cước công dân">
              <div className="grid gap-5 md:grid-cols-2">
                <ProtectedImage
                  fileUrl={valueOf(identity, "frontFileUrl", "front_file_url")}
                  alt="Ảnh mặt trước CCCD"
                  placeholder="Chưa có ảnh mặt trước CCCD, thêm sau"
                />
                <ProtectedImage
                  fileUrl={valueOf(identity, "backFileUrl", "back_file_url")}
                  alt="Ảnh mặt sau CCCD"
                  placeholder="Chưa có ảnh mặt sau CCCD, thêm sau"
                />
              </div>
            </DetailSection>

            <DetailSection icon={UserRound} title="Ảnh chân dung">
              <ProtectedImage
                fileUrl={valueOf(profile, "portraitUrl", "portrait_url")}
                alt="Ảnh chân dung khách thuê"
                placeholder="Chưa có ảnh chân dung"
              />
            </DetailSection>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-xl bg-[#050505] p-6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-3">
                <BriefcaseBusiness className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-[0.08em]">
                  Hợp đồng thuê
                </h3>
              </div>
              <p className="mt-7 text-2xl font-black">
                {valueOf(profile, "contractCode", "contract_code") ||
                  "Chưa có mã"}
              </p>
              <p className="mt-3 text-sm font-semibold text-white/70">
                Tiền thuê:{" "}
                {formatMoney(valueOf(profile, "monthlyRent", "monthly_rent"))}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/70">
                Thời hạn:{" "}
                {formatDate(
                  valueOf(profile, "contractStartDate", "contract_start_date"),
                )}{" "}
                -{" "}
                {formatDate(
                  valueOf(profile, "contractEndDate", "contract_end_date"),
                )}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/70">
                Trạng thái:{" "}
                {contractStatusLabel(
                  valueOf(profile, "contractStatus", "contract_status"),
                )}
              </p>
              <button
                type="button"
                onClick={() => onOpenContractDetails(profile)}
                disabled={!contractId || isLoadingContractDetails}
                className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 text-sm font-black hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingContractDetails ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {isLoadingContractDetails ? "Đang tải..." : "Xem chi tiết"}
              </button>
              {!contractId && (
                <p className="mt-3 text-xs font-semibold text-white/60">
                  Chưa có hợp đồng để xem chi tiết.
                </p>
              )}
              {contractDetailsError && contractId && (
                <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100">
                  {contractDetailsError}
                </p>
              )}
            </section>

            <DetailSection icon={FolderOpen} title="Danh mục hồ sơ">
              <div className="grid gap-3">
                <ChecklistRow
                  label="CCCD"
                  done={Boolean(
                    valueOf(identity, "docNumber", "doc_number") &&
                    valueOf(identity, "frontFileId", "front_file_id") &&
                    valueOf(identity, "backFileId", "back_file_id"),
                  )}
                  doneText="Hoàn tất"
                  missingText="Thiếu"
                />
                <ChecklistRow
                  label="Ảnh chân dung"
                  done={Boolean(
                    valueOf(profile, "portraitFileId", "portrait_file_id"),
                  )}
                  doneText="Hoàn tất"
                  missingText="Thiếu"
                />
                <ChecklistRow
                  label="Liên hệ khẩn cấp"
                  done={emergencyContacts.length > 0}
                  doneText="Hoàn tất"
                  missingText="Thiếu"
                />
                <ChecklistRow
                  label="Xe"
                  done={vehicles.length > 0}
                  doneText="Có"
                  missingText="Không có"
                />
                <ChecklistRow
                  label="Tài khoản app"
                  done={
                    String(
                      valueOf(profile, "appStatus", "app_status"),
                    ).toUpperCase() === "ACTIVE"
                  }
                  doneText="Đã kích hoạt"
                  missingText="Chưa kích hoạt"
                />
              </div>
            </DetailSection>

            <DetailSection icon={Phone} title="Liên hệ">
              <div className="grid gap-4">
                <ContactLine
                  icon={Phone}
                  label="Số điện thoại"
                  value={valueOf(profile, "phone")}
                />
                <ContactLine
                  icon={Mail}
                  label="Email"
                  value={valueOf(profile, "email")}
                />
                <div className="rounded-xl bg-[#f8fafc] dark:bg-white/5 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    Liên hệ khẩn cấp
                  </p>
                  {firstEmergency ? (
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <p>{valueOf(firstEmergency, "fullName", "full_name")}</p>
                      <p>Quan hệ: {valueOf(firstEmergency, "relationship")}</p>
                      <p>SĐT: {valueOf(firstEmergency, "phone")}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Chưa cập nhật liên hệ khẩn cấp
                    </p>
                  )}
                </div>
              </div>
            </DetailSection>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PoliceReportExportModal({
  columns,
  selectedColumns,
  exporting,
  error,
  onToggleColumn,
  onSelectAll,
  onClear,
  onClose,
  onExport,
  onExportPackage,
}) {
  const selectedCount = selectedColumns.length;

  return (
    <Dialog open onOpenChange={(open) => !open && !exporting && onClose()}>
      <DialogContent
        showCloseButton={false}
        lockScroll={false}
        overlayClassName="bg-[#091426]/70"
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-white p-0 shadow-2xl sm:max-w-lg dark:bg-[#0f172a]"
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b border-[#d8dee8] px-6 py-5 text-left dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#64748b] dark:text-slate-400">
                Hồ sơ khách thuê
              </p>
              <DialogTitle className="mt-1 text-xl font-black text-[#091426] dark:text-white">
                Xuất hồ sơ khách thuê
              </DialogTitle>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#45474c] hover:bg-[#f2f4f6] dark:text-slate-300 dark:hover:bg-white/5"
            aria-label="Đóng xuất Excel"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black text-[#091426] dark:text-white">
              Chọn cột ({selectedCount}/{columns.length})
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="rounded-lg border border-[#d8dee8] px-3 py-2 text-xs font-black text-[#091426] hover:bg-[#f2f4f6] dark:border-white/10 dark:text-white dark:hover:bg-white/5"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg border border-[#d8dee8] px-3 py-2 text-xs font-black text-[#64748b] hover:bg-[#f2f4f6] dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div className="custom-scrollbar grid max-h-[min(48vh,420px)] gap-2 overflow-y-auto pr-1">
            {columns.map((column) => {
              const checked = selectedColumns.includes(column.key);
              return (
                <label
                  key={column.key}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#d8dee8] bg-[#fbfcfe] px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#f2f4f6] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleColumn(column.key)}
                    className="h-4 w-4 rounded border-[#cbd5e1] text-[#1e40af] focus:ring-[#1e40af]"
                  />
                  {column.label}
                </label>
              );
            })}
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#d8dee8] bg-[#fbfcfe] px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="h-11 rounded-lg border border-[#c5c6cd] px-5 text-sm font-bold text-slate-600 hover:bg-[#f2f4f6] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={exporting || selectedCount === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-5 text-sm font-black text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
          <button
            type="button"
            onClick={onExportPackage}
            disabled={exporting || selectedCount === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            <Archive className="h-4 w-4" />
            {exporting ? "Đang xuất..." : "Xuất ZIP hồ sơ"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantsPage() {
  const { role: activeRole } = usePermission();
  const [profiles, setProfiles] = useState([]);
  const [accountCandidates, setAccountCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [sendingContractId, setSendingContractId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractDetailsLoadingId, setContractDetailsLoadingId] = useState("");
  const [contractDetailsError, setContractDetailsError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [profileStatusFilter, setProfileStatusFilter] = useState("all");
  const [expandedRoomKeys, setExpandedRoomKeys] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState(
    DEFAULT_POLICE_REPORT_EXPORT_COLUMNS,
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const canExportProfiles = ["owner", "manager"].includes(
    String(activeRole).toLowerCase(),
  );

  const accountStateFor = (profile) => {
    const account = accountCandidates.find(
      (item) =>
        String(item.contractId) ===
          String(valueOf(profile, "contractId", "contract_id")) &&
        String(item.profileId) ===
          String(valueOf(profile, "id", "profileId", "profile_id")),
    );
    if (account) return resolveAccountState(account);
    return {
      key: "NOT_SENT",
      label: "Chưa cấp",
      hint: "Chưa gửi tài khoản mobile.",
    };
  };

  const toggleRoomExpanded = (roomKey) => {
    setExpandedRoomKeys((current) =>
      current.includes(roomKey)
        ? current.filter((key) => key !== roomKey)
        : [...current, roomKey],
    );
  };

  const loadAccountCandidates = async () => {
    const data = await fetchTenantAccountCandidates({ page: 0, size: 1000 });
    setAccountCandidates(data.items || []);
  };

  const openExportDialog = () => {
    setExportError("");
    setExportDialogOpen(true);
  };

  const toggleExportColumn = (columnKey) => {
    setSelectedExportColumns((current) =>
      current.includes(columnKey)
        ? current.filter((key) => key !== columnKey)
        : [...current, columnKey],
    );
    setExportError("");
  };

  const handleExportPoliceReport = async () => {
    if (selectedExportColumns.length === 0) {
      setExportError("Vui lòng chọn ít nhất một cột để xuất.");
      return;
    }

    try {
      setIsExporting(true);
      setExportError("");
      await downloadTenantProfilesPoliceReportExport(selectedExportColumns);
      setExportDialogOpen(false);
    } catch (downloadError) {
      setExportError(
        downloadError?.message || "Xuất file Excel thất bại, vui lòng thử lại.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPoliceReportPackage = async () => {
    if (selectedExportColumns.length === 0) {
      setExportError("Vui lòng chọn ít nhất một cột để xuất.");
      return;
    }

    try {
      setIsExporting(true);
      setExportError("");
      await downloadTenantProfilesPoliceReportPackageExport(
        selectedExportColumns,
      );
      setExportDialogOpen(false);
    } catch (downloadError) {
      setExportError(
        downloadError?.message || "Xuất file ZIP thất bại, vui lòng thử lại.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const openContractDetails = async (profile) => {
    const contractId = getProfileContractId(profile);
    if (!contractId) {
      setContractDetailsError("Chưa có hợp đồng để xem chi tiết.");
      return;
    }

    try {
      setContractDetailsError("");
      setContractDetailsLoadingId(contractId);
      const details = await fetchManagementLeaseContractDetails(contractId);
      setSelectedContract({
        ...details,
        contractId: details?.contractId || contractId,
        roomCode:
          details?.roomCode ||
          details?.room_code ||
          valueOf(profile, "roomCode", "room_code"),
        propertyName:
          details?.propertyName ||
          details?.property_name ||
          valueOf(profile, "propertyName", "property_name"),
        contractCode:
          details?.contractCode ||
          details?.contract_code ||
          valueOf(profile, "contractCode", "contract_code"),
      });
    } catch (loadError) {
      setContractDetailsError(
        loadError?.message || "Không tải được chi tiết hợp đồng.",
      );
    } finally {
      setContractDetailsLoadingId("");
    }
  };

  const handleSendAccounts = async (contractId) => {
    if (!contractId || sendingContractId) return;
    const contractRows = accountCandidates.filter(
      (item) => String(item.contractId) === String(contractId),
    );
    const retry = contractRows.some((item) =>
      ["FAILED", "SENT"].includes(resolveAccountState(item).key),
    );
    const confirmed = window.confirm(
      retry
        ? "Hệ thống sẽ gửi lại tài khoản cho người thuê chưa kích hoạt. Tài khoản đã kích hoạt sẽ được bỏ qua."
        : "Hệ thống sẽ gửi tài khoản cho những người thuê chưa được cấp. Không gửi lại cho tài khoản đã có.",
    );
    if (!confirmed) return;

    setSendingContractId(contractId);
    setAccountMessage("");
    setError("");
    try {
      const result = await sendTenantAccountCredentials(contractId, { retry });
      setAccountMessage(
        result?.message || "Đã gửi thông tin tài khoản khách thuê.",
      );
      await Promise.all([loadProfiles(), loadAccountCandidates()]);
    } catch (sendError) {
      setError(sendError?.message || "Không gửi được tài khoản khách thuê.");
    } finally {
      setSendingContractId(null);
    }
  };

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await fetchTenantProfiles({
        page: 0,
        size: TENANT_PROFILE_FETCH_SIZE,
      });
      setProfiles(
        dedupeTenantProfiles(
          sortByNewest(data.items, [
            "createdAt",
            "created_at",
            "accountCreatedAt",
            "account_created_at",
            "contractCreatedAt",
            "contract_created_at",
            "signedAt",
            "signed_at",
          ]),
        ),
      );
      await loadAccountCandidates();
    } catch (loadError) {
      setError(loadError?.message || "Không tải được hồ sơ khách thuê.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    fetchTenantProfiles({
      page: 0,
      size: TENANT_PROFILE_FETCH_SIZE,
    })
      .then((data) => {
        if (!isActive) return;
        setProfiles(
          dedupeTenantProfiles(
            sortByNewest(data.items, [
              "createdAt",
              "created_at",
              "accountCreatedAt",
              "account_created_at",
              "contractCreatedAt",
              "contract_created_at",
              "signedAt",
              "signed_at",
            ]),
          ),
        );
        setError("");
      })
      .catch((loadError) => {
        if (!isActive) return;
        setError(loadError?.message || "Không tải được hồ sơ khách thuê.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    fetchTenantAccountCandidates({ page: 0, size: 1000 })
      .then((data) => {
        if (isActive) setAccountCandidates(data.items || []);
      })
      .catch(() => {
        // The profile list remains usable even if account status loading fails.
      });

    return () => {
      isActive = false;
    };
  }, []);

  const propertyOptions = useMemo(() => {
    const properties = [
      ...new Set(
        profiles
          .map((profile) => valueOf(profile, "propertyName", "property_name"))
          .filter(Boolean),
      ),
    ];
    return properties.sort((a, b) => String(a).localeCompare(String(b), "vi"));
  }, [profiles]);

  const floorFilterOptions = useMemo(() => {
    if (propertyFilter === "all") {
      return [{ value: "all", label: "Chọn cơ sở trước" }];
    }

    const floors = new Set();
    profiles.forEach((profile) => {
      const profileProperty = valueOf(profile, "propertyName", "property_name");
      if (propertyFilter !== "all" && profileProperty !== propertyFilter) return;
      const floor = floorFromRoomCode(valueOf(profile, "roomCode", "room_code"));
      if (floor) floors.add(floor);
    });

    return [
      { value: "all", label: "Tất cả tầng" },
      ...[...floors]
        .sort((left, right) => Number(left) - Number(right))
        .map((floor) => ({ value: floor, label: `Tầng ${floor}` })),
    ];
  }, [profiles, propertyFilter]);

  const propertyFilterOptions = useMemo(
    () => [
      { value: "all", label: "Tất cả cơ sở" },
      ...propertyOptions.map((property) => ({ value: property, label: property })),
    ],
    [propertyOptions],
  );

  const filteredProfiles = useMemo(() => {
    const normalizedKeyword = normalizeText(keyword);
    return sortByNewest(
      profiles.filter((profile) => {
        const searchable = normalizeText(
          [
            valueOf(profile, "fullName", "full_name"),
            valueOf(profile, "phone"),
            valueOf(profile, "email"),
            valueOf(profile, "roomCode", "room_code"),
          ].join(" "),
        );
        const matchKeyword =
          !normalizedKeyword || searchable.includes(normalizedKeyword);
        const matchProperty =
          propertyFilter === "all" ||
          valueOf(profile, "propertyName", "property_name") === propertyFilter;
        const matchFloor =
          floorFilter === "all" ||
          floorFromRoomCode(valueOf(profile, "roomCode", "room_code")) ===
            floorFilter;
        const matchStatus =
          profileStatusFilter === "all" ||
          valueOf(profile, "profileStatus", "profile_status") ===
            profileStatusFilter;
        return (
          matchKeyword && matchProperty && matchFloor && matchStatus
        );
      }),
      [
        "createdAt",
        "created_at",
        "accountCreatedAt",
        "account_created_at",
        "contractCreatedAt",
        "contract_created_at",
        "signedAt",
        "signed_at",
      ],
    );
  }, [
    keyword,
    floorFilter,
    profiles,
    profileStatusFilter,
    propertyFilter,
  ]);

  // Keep every profile in a room together before applying pagination.
  const allRoomGroups = useMemo(() => {
    const groups = new Map();
    filteredProfiles.forEach((profile) => {
      const key = `${valueOf(profile, "propertyId", "property_id") || "property"}-${valueOf(profile, "roomId", "room_id") || valueOf(profile, "roomCode", "room_code")}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(profile);
    });
    return [...groups.values()];
  }, [filteredProfiles]);

  const filteredTotalElements = allRoomGroups.length;
  const filteredTotalPages =
    filteredTotalElements === 0
      ? 0
      : Math.ceil(filteredTotalElements / Math.max(1, size));
  const displayedProfilePage =
    filteredTotalPages > 0 ? Math.min(page, filteredTotalPages) : 1;
  const groupedByRoom = useMemo(() => {
    const start = (displayedProfilePage - 1) * size;
    return allRoomGroups.slice(start, start + size);
  }, [allRoomGroups, displayedProfilePage, size]);

  return (
    <section className="w-full min-w-0 flex flex-col gap-6">
      <DashboardPageHeader
        title="Hồ sơ khách thuê"
        description="Quản lý hồ sơ từng người ở trong phòng, bao gồm người ký chính và người ở cùng."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canExportProfiles && (
              <button
                type="button"
                onClick={openExportDialog}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Xuất hồ sơ khách thuê
              </button>
            )}
          </div>
        }
      />

      <section className="grid min-w-0 gap-4 rounded-xl border border-[#d8dee8] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_repeat(2,minmax(180px,1fr))]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b97aa]" />
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên, SĐT, email hoặc phòng"
              className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-white pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 dark:border-white/10 dark:bg-[#0f172a] dark:text-white"
            />
          </div>
          <FilterDropdown
            label="Cơ sở"
            value={propertyFilter}
            options={propertyFilterOptions}
            onChange={(value) => {
              setPropertyFilter(value);
              setFloorFilter("all");
              setPage(1);
            }}
          />
          <FilterDropdown
            label="Tầng"
            value={floorFilter}
            options={floorFilterOptions}
            onChange={(value) => {
              setFloorFilter(value);
              setPage(1);
            }}
            disabled={propertyFilter === "all" || floorFilterOptions.length <= 1}
          />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/10">
          {PROFILE_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setProfileStatusFilter(option.value);
                setPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                profileStatusFilter === option.value
                  ? "bg-[#1e40af] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && (
        <section className="rounded-xl border border-[#d8dee8] dark:border-white/10 bg-white dark:bg-[#0f172a] p-10 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Đang tải hồ sơ khách thuê...
          </p>
        </section>
      )}

      {accountMessage ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {accountMessage}
        </section>
      ) : null}

      {!isLoading && error && (
        <section className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-600 dark:text-rose-300" />
          <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-300">
            {error}
          </p>
          <button
            type="button"
            onClick={loadProfiles}
            className="mt-5 h-10 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white"
          >
            Thử lại
          </button>
        </section>
      )}

      {!isLoading && !error && groupedByRoom.length === 0 && (
        <section className="rounded-xl border border-dashed border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] py-16 text-center">
          <UserRound className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
          <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
            Không tìm thấy hồ sơ khách thuê phù hợp.
          </p>
        </section>
      )}

      {!isLoading && !error && groupedByRoom.length > 0 && (
        <section className="grid gap-5">
          {groupedByRoom.map((roomProfiles) => {
            const roomProfile = roomProfiles[0];
            const contractId = valueOf(
              roomProfile,
              "contractId",
              "contract_id",
            );
            const accountRows = accountCandidates.filter(
              (item) => String(item.contractId) === String(contractId),
            );
            const accountStates = accountRows.map((item) =>
              resolveAccountState(item).key,
            );
            const canSendAccounts = accountStates.some((state) =>
              ["NOT_SENT", "FAILED", "SENT"].includes(state),
            );
            const hasFailedAccounts = accountStates.includes("FAILED");
            const hasSentAccounts = accountStates.includes("SENT");
            const allAccountsActivated =
              accountStates.length > 0 &&
              accountStates.every((state) => state === "ACTIVATED");
            const isSendingAccounts =
              String(sendingContractId) === String(contractId);
            const contractCanSend =
              valueOf(roomProfile, "contractStatus", "contract_status") ===
              "ACTIVE";
            const sendAccountsDisabled =
              !contractId ||
              !contractCanSend ||
              !canSendAccounts ||
              isSendingAccounts;
            const roomKey = `${valueOf(roomProfile, "propertyId", "property_id")}-${valueOf(roomProfile, "roomCode", "room_code")}`;
            const isExpanded = expandedRoomKeys.includes(roomKey);
            const maxOccupants =
              Number(
                valueOf(roomProfile, "roomMaxOccupants", "room_max_occupants"),
              ) || 3;
            const currentOccupants =
              Number(
                valueOf(
                  roomProfile,
                  "roomOccupantCount",
                  "room_occupant_count",
                ),
              ) || roomProfiles.length;

            return (
              <div
                key={roomKey}
                className="overflow-hidden rounded-xl border border-[#d8dee8] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)]"
              >
                <div
                  onClick={() => toggleRoomExpanded(roomKey)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      toggleRoomExpanded(roomKey);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-controls={`room-tenants-${roomKey}`}
                  className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-[#d8dee8] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 px-6 py-4 text-left"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        Phòng {valueOf(roomProfile, "roomCode", "room_code")}
                      </h2>
                      <Badge className="border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        {residenceStatusLabel(
                          valueOf(
                            roomProfile,
                            "residenceStatus",
                            "residence_status",
                          ),
                        )}
                      </Badge>
                      {currentOccupants >= maxOccupants && (
                        <Badge className="border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300">
                          Đã đủ người
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {valueOf(roomProfile, "propertyName", "property_name") ||
                        "Chưa có cơ sở"}{" "}
                      · Hợp đồng{" "}
                      {valueOf(roomProfile, "contractCode", "contract_code") ||
                        "chưa cập nhật"}
                    </p>
                  </div>
                  <span className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
                    <span className="flex items-center gap-2 rounded-lg bg-white dark:bg-[#0f172a] px-4 py-2 text-sm font-black text-slate-900 dark:text-white ring-1 ring-[#d8dee8]">
                      <Users className="h-4 w-4 text-[#1e40af] dark:text-[#93c5fd]" />
                      {roomOccupancyText(roomProfile)} người
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleSendAccounts(contractId);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      disabled={sendAccountsDisabled}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0f1d33] px-4 text-sm font-bold text-white transition hover:bg-[#172842] disabled:cursor-not-allowed disabled:bg-[#9aa3b2] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8] dark:disabled:bg-slate-700"
                    >
                      <Send className="h-4 w-4" />
                      <span className="whitespace-nowrap">
                        {!contractCanSend
                          ? "Chỉ gửi khi ACTIVE"
                          : isSendingAccounts
                            ? "Đang gửi..."
                            : hasFailedAccounts
                              ? "Thử gửi lại"
                              : hasSentAccounts
                                ? "Gửi bổ sung"
                                : allAccountsActivated
                                  ? "Đã hoàn tất"
                                  : canSendAccounts
                                    ? "Gửi tài khoản"
                                    : "Chưa có dữ liệu tài khoản"}
                      </span>
                    </button>
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-[#d8dee8] dark:bg-[#0f172a] dark:text-slate-300 dark:ring-white/10">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </span>
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      id={`room-tenants-${roomKey}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="dashboard-table overflow-x-auto table-fixed w-full">
                        <table className="w-full text-left">
                          <thead className="bg-white dark:bg-[#0f172a] text-xs font-black uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
                            <tr className="hover:bg-[#f8fafc] dark:hover:bg-white/5">
                              <th className="w-[28%] px-6 py-3 text-left">Họ tên</th>
                              <th className="w-[14%] px-6 py-3 text-center">SĐT</th>
                              <th className="w-[22%] px-6 py-3 text-center">Email</th>
                              <th className="w-[14%] px-6 py-3 text-center">Vai trò</th>
                              <th className="w-[16%] px-6 py-3 text-center">Tài khoản app</th>
                              <th className="w-[6%] px-6 py-3 text-center">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {roomProfiles.map((profile, index) => (
                              <tr
                                key={profileRowKey(profile, index)}
                                className="hover:bg-[#f8fafc] dark:hover:bg-white/5"
                              >
                                <td data-label="Họ tên" className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ecf3ff] text-xs font-bold text-[#465fff]">
                            {getInitials(valueOf(profile, "fullName", "full_name"))}
                          </span>
                                    <div className="min-w-0">
                                      <p className="font-bold text-[#0f1d33]">
                                        {valueOf(profile, "fullName", "full_name")}
                                      </p>
                                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#687184]">
                                        <span>{valueOf(profile, "phone") || "Chưa có SĐT"}</span>
                                        <span className="inline-flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                          {valueOf(profile, "email") || "Chưa có email"}
                              </span>
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td
                                  data-label="SĐT"
                                  className="px-6 py-5 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center"
                                >
                                  {valueOf(profile, "phone") || "Chưa cập nhật"}
                                </td>
                                <td
                                  data-label="Email"
                                  className="break-words px-6 py-5 text-sm font-semibold text-slate-700 dark:text-slate-200 text-center"
                                >
                                  {valueOf(profile, "email") || "Chưa cập nhật"}
                                </td>

                                <td
                                  data-label="Vai trò"
                                  className="px-6 py-5 text-center"
                                >
                                  <Badge
                                    className={roleClass(
                                      valueOf(profile, "roomRole", "room_role"),
                                    )}
                                  >
                                    {roleLabel(
                                      valueOf(profile, "roomRole", "room_role"),
                                    )}
                                  </Badge>
                                </td>

                              <td
  data-label="Tài khoản app"
  className="px-6 py-5 text-center"
>
  {(() => {
    const accountState = accountStateFor(profile);
    return (
      <div className="flex flex-col items-center gap-1 justify-center">
        <Badge
          className={accountStatusClass(
            accountState.key === "ACTIVATED"
              ? "ACTIVE"
              : accountState.key === "DISABLED"
                ? "DISABLED"
                : "PENDING",
          )}
        >
          {accountState.label}
        </Badge>
        <span className="text-xs font-semibold text-slate-500">
          {accountState.hint}
        </span>
      </div>
    );
  })()}
</td>
                                <td
                                  data-label="Thao tác"
                                  className="px-6 py-5 text-left"
                                >
                                  <TenantProfileActionsMenu
                                    profile={profile}
                                    onViewProfile={setSelectedProfile}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </section>
      )}

      {!error && (
        <DashboardPagination
          page={page}
          size={size}
          totalElements={filteredTotalElements}
          totalPages={filteredTotalPages}
          itemLabel="phòng"
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
        />
      )}

      {exportDialogOpen && (
        <PoliceReportExportModal
          columns={POLICE_REPORT_EXPORT_COLUMNS}
          selectedColumns={selectedExportColumns}
          exporting={isExporting}
          error={exportError}
          onToggleColumn={toggleExportColumn}
          onSelectAll={() => {
            setSelectedExportColumns(DEFAULT_POLICE_REPORT_EXPORT_COLUMNS);
            setExportError("");
          }}
          onClear={() => {
            setSelectedExportColumns([]);
            setExportError("");
          }}
          onClose={() => {
            if (!isExporting) setExportDialogOpen(false);
          }}
          onExport={handleExportPoliceReport}
          onExportPackage={handleExportPoliceReportPackage}
        />
      )}

      {selectedProfile && (
        <TenantProfileModal
          profile={selectedProfile}
          profiles={profiles}
          onClose={() => setSelectedProfile(null)}
          onSelectProfile={setSelectedProfile}
          onOpenContractDetails={openContractDetails}
          contractDetailsLoadingId={contractDetailsLoadingId}
          contractDetailsError={contractDetailsError}
        />
      )}

      {selectedContract && (
        <LeaseContractDetailModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </section>
  );
}
