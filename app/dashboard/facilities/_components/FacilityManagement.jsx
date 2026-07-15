"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BedDouble,
  Building2,
  CheckCircle2,
  CircleAlert,
  Layers3,
  Plus,
  Search,
  ServerCrash,
  X,
} from "lucide-react";
import { FacilityFormDialog } from "./FacilityFormDialog";
import { FacilityList } from "./FacilityList";
import { FacilityStatusDialog } from "./FacilityStatusDialog";
import { FacilityUtilitySettingsDialog } from "./FacilityUtilitySettingsDialog";
import { useFacilityManagement } from "../_hooks/useFacilityManagement";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { facilityStatusOptions } from "@/services/facilityService";
import {
  fetchPropertyUtilitySettings,
  updatePropertyUtilitySettings,
} from "@/services/propertyUtilitySettingsService";
import { useAuth } from "@/app/dashboard/_contexts/AuthContext";
import { ROLES } from "@/app/dashboard/_lib/rbac";

const DEFAULT_UTILITY_VALUES = {
  electricityUnitPrice: "3500",
  electricityFreeAllowance: "0",
  waterUnitPrice: "20000",
  waterFreeAllowance: "6",
};

function utilitySettingsToValues(settings) {
  return {
    electricityUnitPrice: String(
      settings?.electricity?.unitPrice ?? DEFAULT_UTILITY_VALUES.electricityUnitPrice,
    ),
    electricityFreeAllowance: String(
      settings?.electricity?.freeAllowance ??
        DEFAULT_UTILITY_VALUES.electricityFreeAllowance,
    ),
    waterUnitPrice: String(
      settings?.water?.unitPrice ?? DEFAULT_UTILITY_VALUES.waterUnitPrice,
    ),
    waterFreeAllowance: String(
      settings?.water?.freeAllowance ?? DEFAULT_UTILITY_VALUES.waterFreeAllowance,
    ),
  };
}

const statCards = [
  {
    key: "totalFacilities",
    label: "Tổng cơ sở",
    icon: Building2,
    tone: "blue",
  },
  {
    key: "activeFacilities",
    label: "Đang hoạt động",
    icon: CheckCircle2,
    tone: "emerald",
  },
  {
    key: "totalRooms",
    label: "Tổng số phòng",
    icon: BedDouble,
    tone: "purple",
  },
  {
    key: "vacancyRate",
    label: "Tỷ lệ trống",
    icon: BarChart3,
    tone: "orange",
    suffix: "%",
  },
];

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[70] grid w-[min(420px,calc(100vw-2rem))] gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const isError = toast.tone === "error";
        const Icon = isError ? CircleAlert : CheckCircle2;

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl ${
              isError
                ? "border-rose-200 dark:border-rose-500/20 bg-rose-700 text-white"
                : "border-emerald-200 dark:border-emerald-500/20 bg-emerald-700 text-white"
            }`}
            role={isError ? "alert" : "status"}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-bold">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function FacilityLoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl border border-[#dbe1ea] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)]"
        />
      ))}
    </div>
  );
}

function FacilityErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-5 text-rose-700 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <ServerCrash className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-black">Không thể tải danh sách cơ sở</p>
          <p className="mt-1 text-sm font-semibold">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-300 bg-white dark:bg-[#0f172a] px-4 text-xs font-bold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-500/10"
      >
        Thử lại
      </button>
    </div>
  );
}

export function FacilityManagement() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [utilityState, setUtilityState] = useState({
    isOpen: false,
    facility: null,
    values: DEFAULT_UTILITY_VALUES,
    loading: false,
    saving: false,
    error: "",
  });
  const { user } = useAuth();
  const facility = useFacilityManagement({
    keyword: query,
    status: statusFilter,
    page,
    size,
  });

  function updateQuery(value) {
    setQuery(value);
    setPage(1);
  }

  function updateStatus(value) {
    setStatusFilter(value);
    setPage(1);
  }

  async function openUtilitySettings(targetFacility) {
    setUtilityState({
      isOpen: true,
      facility: targetFacility,
      values: DEFAULT_UTILITY_VALUES,
      loading: true,
      saving: false,
      error: "",
    });

    try {
      const settings = await fetchPropertyUtilitySettings(targetFacility.id);
      setUtilityState((current) => ({
        ...current,
        values: utilitySettingsToValues(settings),
        loading: false,
      }));
    } catch (error) {
      setUtilityState((current) => ({
        ...current,
        loading: false,
        error: error?.message || "Không thể tải giá điện nước.",
      }));
    }
  }

  function closeUtilitySettings() {
    setUtilityState((current) =>
      current.saving ? current : { ...current, isOpen: false, error: "" },
    );
  }

  function updateUtilityValue(name, value) {
    setUtilityState((current) => ({
      ...current,
      values: { ...current.values, [name]: value },
      error: "",
    }));
  }

  async function submitUtilitySettings(event) {
    event.preventDefault();
    if (!utilityState.facility?.id) return;

    setUtilityState((current) => ({ ...current, saving: true, error: "" }));
    try {
      const settings = await updatePropertyUtilitySettings(
        utilityState.facility.id,
        utilityState.values,
      );
      setUtilityState((current) => ({
        ...current,
        values: utilitySettingsToValues(settings),
        saving: false,
        isOpen: false,
      }));
      facility.pushToast("Đã cập nhật giá điện nước");
    } catch (error) {
      setUtilityState((current) => ({
        ...current,
        saving: false,
        error: error?.message || "Không thể lưu giá điện nước.",
      }));
    }
  }

  return (
    <>
      <DashboardPageHeader
        title="Quản lý cơ sở"
        description="Theo dõi cấu trúc cơ sở, tầng và phòng; cập nhật trạng thái vận hành với kiểm soát hợp đồng và công nợ."
        actions={
          <button
            type="button"
            onClick={facility.openCreateForm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#1e40af] px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Thêm cơ sở mới
          </button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, tone, suffix = "" }) => (
          <DashboardStatCard
            key={key}
            icon={Icon}
            label={label}
            value={facility.stats[key]}
            suffix={suffix}
            tone={tone}
            subtitle={
              key === "totalFacilities"
                ? `${facility.stats.totalFloors} t\u1ea7ng \u0111ang qu\u1ea3n l\u00fd`
                : undefined
            }
          />
        ))}
      </section>
      <section className="rounded-2xl border border-[#dbe1ea] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Tìm theo tên, mã hoặc địa chỉ cơ sở..."
              className="h-10 w-full rounded-lg border border-[#cbd3df] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 pl-10 pr-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-[#1e40af] focus:bg-white dark:focus:bg-[#0f172a] focus:ring-2 focus:ring-[#1e40af]/10"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => updateStatus(event.target.value)}
            className="h-10 rounded-lg border border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
            aria-label="Lọc trạng thái cơ sở"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {facilityStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <FacilityList
        facilities={facility.facilities}
        showMeterReadingsAction={user?.role === ROLES.OWNER}
        onEdit={facility.openEditForm}
        onStatusChange={facility.requestStatusChange}
        onUtilitySettings={openUtilitySettings}
      />
      <DashboardPagination
        page={page}
        size={size}
        totalElements={facility.pagination.totalElements}
        totalPages={facility.pagination.totalPages}
        itemLabel="cơ sở"
        onPageChange={setPage}
        onSizeChange={(nextSize) => {
          setSize(nextSize);
          setPage(1);
        }}
      />
      <FacilityFormDialog
        formState={facility.formState}
        onClose={facility.closeForm}
        onChange={facility.updateFormValue}
        onSubmit={facility.submitForm}
      />
      <FacilityStatusDialog
        flow={facility.statusFlow}
        isSubmitting={facility.isStatusSubmitting}
        onAcknowledgedChange={facility.setStatusAcknowledged}
        onClose={facility.closeStatusFlow}
        onConfirm={facility.confirmStatusChange}
      />
      <FacilityUtilitySettingsDialog
        state={utilityState}
        onClose={closeUtilitySettings}
        onChange={updateUtilityValue}
        onSubmit={submitUtilitySettings}
      />
      <ToastViewport
        toasts={facility.toasts}
        onDismiss={facility.dismissToast}
      />
    </>
  );
}
