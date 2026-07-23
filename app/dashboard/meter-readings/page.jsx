"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  Edit3,
  History,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { dedupeBatchHistory, getHistoryRowKey } from "@/lib/meterReadingHistory.mjs";
import {
  fetchBatchHistory,
  fetchBatchMeterReadingsStatus,
  fetchUtilityDashboard,
  startBatchReading,
} from "@/services/meterReadingService";
import { useAuth } from "@/app/dashboard/_contexts/AuthContext";
import { fetchSimpleProperties } from "@/services/identityAccessService";
import { UtilityBillingRunsPanel } from "./_components/UtilityBillingRunsPanel";

const STATUS_MAP = {
  DRAFT: {
    label: "Đang nhập dữ liệu",
    badge:
      "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
  },
  PREVIEWED: {
    label: "Chờ duyệt",
    badge:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  },
  CONFIRMED: {
    label: "Đã chốt",
    badge:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  },
  CANCELLED: {
    label: "Đã hủy",
    badge:
      "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10",
  },
};

const workflowSteps = [
  { num: "1", label: "Tạo kỳ ghi chỉ số", icon: ClipboardList },
  { num: "2", label: "Nhập chỉ số", icon: Edit3 },
  { num: "3", label: "Chốt kỳ", icon: CheckCircle2 },
  { num: "4", label: "Tính tiêu thụ & tạo hóa đơn", icon: BarChart3 },
];

function formatTime(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const [sy, sm, sd] = String(startDate).slice(0, 10).split("-");
  const [ey, em, ed] = String(endDate).slice(0, 10).split("-");
  if (!sy || !sm || !sd || !ey || !em || !ed) return "";
  return `${sd}/${sm}/${sy} - ${ed}/${em}/${ey}`;
}

function formatMonthYearPeriod(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}-${date.getFullYear()}`;
}

function normalizePropertyId(value) {
  const text = String(value || "").trim();
  return /^\d+$/.test(text) ? text : "";
}

function firstAssignedPropertyId(user) {
  const assignedProperty = Array.isArray(user?.assignedProperties)
    ? user.assignedProperties[0]
    : null;
  return normalizePropertyId(
    assignedProperty?.id ||
    assignedProperty?.propertyId ||
    assignedProperty?.property_id,
  );
}

function periodValue(period) {
  return period?.readingPeriod || period?.reading_period || period?.period || "";
}

function normalizeCount(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function capCompletedRooms(completedRooms, totalRooms) {
  const completed = normalizeCount(completedRooms);
  const total = normalizeCount(totalRooms);
  if (total <= 0) return Math.max(0, completed);
  return Math.min(Math.max(0, completed), total);
}

function calculateProgress(completedRooms, totalRooms) {
  const total = normalizeCount(totalRooms);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((capCompletedRooms(completedRooms, total) / total) * 100));
}

function normalizeHistoryItem(item) {
  const totalRooms = normalizeCount(item.totalRooms ?? item.total_rooms);
  return {
    ...item,
    batchId: item.batchId ?? item.batch_id ?? item.id,
    isCurrent: item.isCurrent ?? item.is_current,
    totalRooms,
    completedRooms: capCompletedRooms(item.completedRooms ?? item.completed_rooms, totalRooms),
    anomalyCount: normalizeCount(item.anomalyCount ?? item.anomaly_count),
    startDate: item.startDate ?? item.start_date,
    endDate: item.endDate ?? item.end_date,
  };
}

function computeProgressFromBatchStatus(batchStatus) {
  const rooms = Array.isArray(batchStatus?.rooms) ? batchStatus.rooms : [];
  if (rooms.length === 0) return null;

  const totalRooms =
    normalizeCount(batchStatus.totalRooms ?? batchStatus.total_rooms, rooms.length) || rooms.length;
  const completedRooms = rooms.filter((room) => {
    const status = String(room?.status || "").toLowerCase();
    return status === "synced";
  }).length;
  const anomalyCount = rooms.filter((room) => {
    const status = String(room?.status || "").toLowerCase();
    return status === "warning" ||
      status === "error" ||
      Boolean(room?.needsReview ?? room?.needs_review ?? room?.isAnomaly ?? room?.is_anomaly);
  }).length;

  return {
    batchId: batchStatus.batchId ?? batchStatus.batch_id ?? null,
    status: batchStatus.status ?? batchStatus.batchStatus ?? batchStatus.batch_status,
    totalRooms,
    completedRooms: capCompletedRooms(completedRooms, totalRooms),
    anomalyCount,
  };
}

function getBatchHref(period, propertyId, context = {}) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  const normalizedPropertyId = normalizePropertyId(propertyId);
  if (normalizedPropertyId) params.set("propertyId", normalizedPropertyId);
  if (context.batchId) params.set("batchId", context.batchId);
  if (context.from) params.set("from", context.from);
  if (context.facilityName) params.set("facilityName", context.facilityName);
  const query = params.toString();
  return `/dashboard/meter-readings/batch${query ? `?${query}` : ""}`;
}

function MeterReadingsBreadcrumb({ facilityName }) {
  return (
    <Breadcrumb className="-mb-2">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard/facilities">Quản lý cơ sở</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {facilityName ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {facilityName}
              </span>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function PeriodBadge({ status }) {
  const currentStatus = STATUS_MAP[status] || STATUS_MAP.DRAFT;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${currentStatus.badge}`}>
      {currentStatus.label}
    </span>
  );
}

function ProgressBar({ value, className = "" }) {
  return (
    <div className={`h-2 rounded-full bg-slate-100 dark:bg-white/5 ${className}`}>
      <div className="h-2 rounded-full bg-[#3156b6]" style={{ width: `${value}%` }} />
    </div>
  );
}

function EmptyPeriodState({ canStartCurrentPeriod, nextOpenDate }) {
  return (
    <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center dark:border-white/10 dark:bg-white/5">
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white">
          Chưa có kỳ ghi chỉ số đang hoạt động
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          {canStartCurrentPeriod
            ? "Bạn có thể bắt đầu kỳ ghi mới."
            : `Kỳ tiếp theo sẽ mở vào ${nextOpenDate || "-"}`}
        </p>
      </div>
    </div>
  );
}

export default function UtilityManagement() {
  const [history, setHistory] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [canStartCurrentPeriod, setCanStartCurrentPeriod] = useState(false);
  const [nextOpenDate, setNextOpenDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [backendFacilityName, setBackendFacilityName] = useState("");
  const [fallbackPropertyId, setFallbackPropertyId] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryPropertyId =
    normalizePropertyId(searchParams.get("propertyId") || searchParams.get("facilityId"));
  const propertyId = queryPropertyId || firstAssignedPropertyId(user) || fallbackPropertyId;
  const fromFacilities = searchParams.get("from") === "facilities";
  const facilityName = backendFacilityName || "";
  const batchQueryContext = {
    from: fromFacilities ? "facilities" : "",
    facilityName,
  };

  useEffect(() => {
    if (queryPropertyId || firstAssignedPropertyId(user)) {
      return undefined;
    }

    let isActive = true;
    fetchSimpleProperties()
      .then((properties) => {
        if (!isActive) return;
        setFallbackPropertyId(normalizePropertyId(properties?.[0]?.id));
      })
      .catch(() => {
        if (isActive) setFallbackPropertyId("");
      });

    return () => {
      isActive = false;
    };
  }, [queryPropertyId, user]);

  const loadData = useCallback(async ({ showLoading = true } = {}) => {
      try {
        if (showLoading) setLoading(true);
        setErrorMessage("");
        setBackendFacilityName("");
        const [historyRes, dashboardRes] = await Promise.all([
          fetchBatchHistory(propertyId || null),
          fetchUtilityDashboard(propertyId || null),
        ]);

        let normalizedHistory = [];
        let normalizedDashboard = null;

        if (historyRes?.history) {
          normalizedHistory = historyRes.history.map(normalizeHistoryItem);
        }

        if (dashboardRes) {
          setBackendFacilityName(dashboardRes.propertyName ?? dashboardRes.property_name ?? "");
          const canCreate =
            dashboardRes.canCreateCurrentPeriod ??
            dashboardRes.can_create_current_period;
          const nextDate =
            dashboardRes.nextAvailableDate ?? dashboardRes.next_available_date;

          normalizedDashboard = {
            ...dashboardRes,
            canCreateCurrentPeriod: canCreate,
            nextAvailableDate: nextDate,
            currentPeriod:
              dashboardRes.currentPeriod ?? dashboardRes.current_period,
          };
          setCanStartCurrentPeriod(Boolean(canCreate));

          if (nextDate) {
            const dateStr = formatTime(nextDate, nextDate).split(" - ")[0];
            setNextOpenDate(dateStr);
          } else {
            setNextOpenDate(null);
          }
        }

        const currentHistoryPeriod = normalizedHistory.find((item) => item.isCurrent);
        const activePeriod =
          periodValue(normalizedDashboard?.currentPeriod) ||
          periodValue(currentHistoryPeriod);

        if (activePeriod) {
          try {
            const batchStatus = await fetchBatchMeterReadingsStatus(activePeriod, propertyId || null);
            const refreshedProgress = computeProgressFromBatchStatus(batchStatus);
            if (batchStatus?.propertyName || batchStatus?.property_name) {
              setBackendFacilityName(batchStatus.propertyName ?? batchStatus.property_name ?? "");
            }
            if (refreshedProgress) {
              normalizedHistory = normalizedHistory.map((item) => {
                const samePeriod = periodValue(item) === activePeriod;
                const sameBatch = refreshedProgress.batchId &&
                  String(item.batchId || "") === String(refreshedProgress.batchId);
                if (!samePeriod && !sameBatch) return item;
                return {
                  ...item,
                  ...refreshedProgress,
                  status: refreshedProgress.status || item.status,
                };
              });
              if (normalizedDashboard?.currentPeriod) {
                normalizedDashboard = {
                  ...normalizedDashboard,
                  currentPeriod: {
                    ...normalizedDashboard.currentPeriod,
                    ...refreshedProgress,
                    status: refreshedProgress.status || normalizedDashboard.currentPeriod.status,
                  },
                };
              }
            }
          } catch (progressError) {
            console.warn("Could not refresh current meter reading progress", progressError);
          }
        }

        setHistory(dedupeBatchHistory(normalizedHistory));
        if (normalizedDashboard) setDashboard(normalizedDashboard);
      } catch (error) {
        setErrorMessage("Không tải được dữ liệu ghi chỉ số điện nước.");
        console.error("Error fetching data", error);
      } finally {
        if (showLoading) setLoading(false);
      }
    }, [propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshVisiblePage = () => {
      if (document.visibilityState === "hidden") return;
      void loadData({ showLoading: false });
    };

    window.addEventListener("focus", refreshVisiblePage);
    window.addEventListener("pageshow", refreshVisiblePage);
    document.addEventListener("visibilitychange", refreshVisiblePage);

    return () => {
      window.removeEventListener("focus", refreshVisiblePage);
      window.removeEventListener("pageshow", refreshVisiblePage);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, [loadData]);

  const displayHistory = dedupeBatchHistory(history);
  const currentPeriod = displayHistory.find((item) => item.isCurrent);

  const handleStartBatch = async () => {
    try {
      let targetPropertyId = propertyId;
      if (!targetPropertyId) {
        const properties = await fetchSimpleProperties();
        targetPropertyId = normalizePropertyId(properties?.[0]?.id);
        if (targetPropertyId) setFallbackPropertyId(targetPropertyId);
      }

      if (!targetPropertyId) {
        toast.error("Vui lòng chọn cơ sở trước khi tạo kỳ ghi chỉ số");
        return;
      }

      const periodToStart =
        dashboard?.currentPeriod?.readingPeriod ||
        dashboard?.currentPeriod?.reading_period ||
        periodValue(currentPeriod) ||
        formatMonthYearPeriod();
      const batchStatus = await fetchBatchMeterReadingsStatus(periodToStart, targetPropertyId);
      if (!batchStatus?.rooms?.length) {
        toast.info("Không có phòng cần ghi chỉ số trong kỳ này.");
        return;
      }
      await startBatchReading(periodToStart, targetPropertyId);
      router.push(getBatchHref(periodToStart, targetPropertyId, batchQueryContext));
    } catch (error) {
      if (error?.code === 40910) {
        toast.info("Không có phòng cần ghi chỉ số trong kỳ này.");
      } else {
        toast.error(error?.message || "Không thể tạo kỳ ghi chỉ số");
      }
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[320px] w-full place-items-center text-slate-900 dark:text-white">
        <Loader2 className="h-7 w-7 animate-spin text-[#3156b6]" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
        <DashboardPageHeader
          title="Nhập điện nước hàng tháng"
          description="Quản lý kỳ ghi chỉ số, tiến độ nhập liệu và lịch sử chốt điện nước."
        />
        <section className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4" />
          {errorMessage}
        </section>
      </div>
    );
  }

  const totalRooms = currentPeriod?.totalRooms || 0;
  const completedRooms = capCompletedRooms(currentPeriod?.completedRooms, totalRooms);
  const missingRooms = Math.max(0, totalRooms - completedRooms);
  const progress = calculateProgress(completedRooms, totalRooms);
  const utilityBillingReady =
    String(currentPeriod?.status || "").toUpperCase() === "CONFIRMED";
  const totalPages = Math.ceil(displayHistory.length / itemsPerPage);
  const effectiveCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedHistory = displayHistory.slice(
    (effectiveCurrentPage - 1) * itemsPerPage,
    effectiveCurrentPage * itemsPerPage,
  );

  function handlePageChange(page) {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }

  function openCurrentPeriod() {
    router.push(getBatchHref(periodValue(currentPeriod), propertyId, {
      ...batchQueryContext,
      batchId: currentPeriod?.batchId,
    }));
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
      {fromFacilities ? (
        <MeterReadingsBreadcrumb facilityName={facilityName} />
      ) : null}

      <DashboardPageHeader
        title="Nhập điện nước hàng tháng"
        description="Quản lý kỳ ghi chỉ số, tiến độ nhập liệu và lịch sử chốt điện nước."
        actions={
          <>
            {!currentPeriod && canStartCurrentPeriod ? (
              <button
                type="button"
                onClick={handleStartBatch}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Bắt đầu kỳ ghi tháng này
              </button>
            ) : null}
            {!currentPeriod && !canStartCurrentPeriod ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <CalendarDays className="h-4 w-4" />
                Kỳ mới mở từ {nextOpenDate || "-"}
              </span>
            ) : null}
            {currentPeriod ? (
              <button
                type="button"
                onClick={openCurrentPeriod}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:shadow-md"
              >
                <ArrowRight className="h-4 w-4" />
                Tiếp tục nhập
              </button>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard
          icon={CalendarDays}
          label="Kỳ hiện tại"
          value={periodValue(currentPeriod) || "Chưa mở"}
          tone="blue"
          subtitle={currentPeriod ? formatTime(currentPeriod.startDate, currentPeriod.endDate) : "Chờ tạo kỳ ghi"}
        />
        <DashboardStatCard
          icon={CheckCircle2}
          label="Đã nhập"
          value={`${completedRooms}/${totalRooms}`}
          tone="emerald"
          subtitle={`${progress}% tiến độ`}
        />
        <DashboardStatCard
          icon={CircleDashed}
          label="Chưa nhập"
          value={missingRooms}
          tone="slate"
          subtitle="Phòng còn thiếu chỉ số"
        />
        <DashboardStatCard
          icon={AlertTriangle}
          label="Cảnh báo"
          value={currentPeriod?.anomalyCount || 0}
          tone="orange"
          subtitle="Cần kiểm tra trước khi chốt"
        />
      </section>

      <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Kỳ ghi chỉ số đang hoạt động
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Theo dõi kỳ hiện tại, trạng thái và tiến độ nhập chỉ số.
            </p>
          </div>
          {currentPeriod ? <PeriodBadge status={currentPeriod.status} /> : null}
        </div>

        {!currentPeriod ? (
          <EmptyPeriodState
            canStartCurrentPeriod={canStartCurrentPeriod}
            nextOpenDate={nextOpenDate}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-[#e2e8f0] pb-4 dark:border-white/10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
              <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                Kỳ ghi chỉ số
              </p>
              <p className="mt-2 text-3xl font-black text-[#3156b6] dark:text-blue-300">
                {periodValue(currentPeriod)}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <CalendarDays className="h-4 w-4" />
                {formatTime(currentPeriod.startDate, currentPeriod.endDate)}
              </p>
            </div>

            <div className="grid gap-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-black text-slate-700 dark:text-slate-200">
                    Tiến độ nhập chỉ số
                  </span>
                  <span className="font-black text-[#3156b6] dark:text-blue-300">
                    {progress}%
                  </span>
                </div>
                <ProgressBar value={progress} />
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {completedRooms} / {totalRooms} phòng đã nhập
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#e2e8f0] p-3 dark:border-white/10">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đã nhập</p>
                  <p className="mt-1 text-2xl font-black">{completedRooms}</p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] p-3 dark:border-white/10">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chưa nhập</p>
                  <p className="mt-1 text-2xl font-black">{missingRooms}</p>
                </div>
                <div className="rounded-lg border border-[#e2e8f0] p-3 dark:border-white/10">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cảnh báo</p>
                  <p className="mt-1 text-2xl font-black text-orange-600 dark:text-orange-300">
                    {currentPeriod?.anomalyCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {utilityBillingReady ? (
        <UtilityBillingRunsPanel
          key={`${propertyId || "all"}-${periodValue(currentPeriod) || formatMonthYearPeriod()}`}
          propertyId={propertyId}
          defaultPeriod={periodValue(currentPeriod) || formatMonthYearPeriod()}
        />
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-4 py-4 dark:border-white/10">
          <History className="h-4 w-4 text-[#3156b6] dark:text-blue-300" />
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Lịch sử các kỳ ghi chỉ số
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Xem lại trạng thái, tiến độ và cảnh báo theo từng kỳ.
            </p>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="border-b border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#f8fafc] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/5">
                <TableHead className="px-4 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Kỳ ghi chỉ số
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Thời gian
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Trạng thái
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Tiến độ
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Phòng đã nhập
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Cảnh báo
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHistory.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                  >
                    Chưa có kỳ ghi chỉ số.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedHistory.map((item, index) => {
                  const itemCompletedRooms = capCompletedRooms(item.completedRooms, item.totalRooms);
                  const prog = calculateProgress(itemCompletedRooms, item.totalRooms);
                  return (
                    <TableRow
                      key={getHistoryRowKey(item, index)}
                      className="border-t border-[#e2e8f0] transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <TableCell className="px-4 py-3">
                        <p className="font-black text-slate-900 dark:text-white">
                          {item.period}
                        </p>
                        {item.isCurrent ? (
                          <p className="text-xs font-semibold text-[#3156b6] dark:text-blue-300">
                            Hiện tại
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {formatTime(item.startDate, item.endDate)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <PeriodBadge status={item.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-10 text-sm font-black text-slate-700 dark:text-slate-200">
                            {prog}%
                          </span>
                          <ProgressBar value={prog} className="w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                        {itemCompletedRooms} / {item.totalRooms}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span
                          className={`text-sm font-black ${item.anomalyCount > 0 ? "text-orange-600 dark:text-orange-300" : "text-slate-400 dark:text-slate-500"}`}
                        >
                          {item.anomalyCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              getBatchHref(item.period, propertyId, {
                                ...batchQueryContext,
                                batchId: item.batchId,
                              }),
                            )
                          }
                          className="inline-flex h-9 items-center rounded-lg border border-[#cbd5e1] px-3 text-xs font-black text-[#3156b6] transition hover:bg-blue-50 dark:border-white/10 dark:text-blue-300 dark:hover:bg-blue-500/10"
                        >
                          Xem chi tiết
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {paginatedHistory.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#cbd5e1] p-5 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
              Chưa có kỳ ghi chỉ số.
            </div>
          ) : (
            paginatedHistory.map((item, index) => {
              const itemCompletedRooms = capCompletedRooms(item.completedRooms, item.totalRooms);
              const prog = calculateProgress(itemCompletedRooms, item.totalRooms);
              return (
                <article
                  key={getHistoryRowKey(item, index)}
                  className="rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {item.period}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatTime(item.startDate, item.endDate)}
                      </p>
                    </div>
                    <PeriodBadge status={item.status} />
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Tiến độ ({itemCompletedRooms} / {item.totalRooms})
                      </span>
                      <span className="font-black text-slate-700 dark:text-slate-200">
                        {prog}%
                      </span>
                    </div>
                    <ProgressBar value={prog} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      Cảnh báo
                    </span>
                    <span
                      className={`font-black ${item.anomalyCount > 0 ? "text-orange-600 dark:text-orange-300" : "text-slate-700 dark:text-slate-200"}`}
                    >
                      {item.anomalyCount}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(getBatchHref(item.period, propertyId, {
                        ...batchQueryContext,
                        batchId: item.batchId,
                      }))
                    }
                    className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#cbd5e1] text-sm font-black text-[#3156b6] transition hover:bg-blue-50 dark:border-white/10 dark:text-blue-300 dark:hover:bg-blue-500/10"
                  >
                    Xem chi tiết
                  </button>
                </article>
              );
            })
          )}
        </div>

        {displayHistory.length > itemsPerPage ? (
          <DashboardPagination
            page={effectiveCurrentPage}
            size={itemsPerPage}
            totalElements={displayHistory.length}
            totalPages={totalPages}
            itemLabel="kỳ ghi chỉ số"
            onPageChange={handlePageChange}
            onSizeChange={(nextSize) => {
              setItemsPerPage(nextSize);
              setCurrentPage(1);
            }}
            className="border-t border-[#e2e8f0] dark:border-white/10"
          />
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <ClipboardList className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Hướng dẫn nhanh
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Quy trình ghi chỉ số điện nước hàng tháng
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-1">
            {workflowSteps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.num} className="flex flex-1 items-center gap-1">
                  <div className="flex flex-1 flex-col items-center text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <p className="text-[11px] font-semibold leading-tight text-slate-500 dark:text-slate-400">
                      {step.num}. {step.label}
                    </p>
                  </div>
                  {index < workflowSteps.length - 1 ? (
                    <>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" />
                      <ChevronDown className="block h-4 w-4 shrink-0 text-slate-300 sm:hidden" />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Ghi chú vận hành
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Điều kiện cần kiểm tra trước khi chốt kỳ
              </p>
            </div>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            <li>Nhập chỉ số ít nhất 1 lần trước khi chốt kỳ.</li>
            <li>Sau khi chốt kỳ, bạn có thể xem nhưng không thể chỉnh sửa.</li>
            <li>Các phòng có cảnh báo cần được kiểm tra lại trước khi chốt.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
