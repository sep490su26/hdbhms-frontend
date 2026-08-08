"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  History,
  Loader2,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/app/dashboard/_contexts/AuthContext";
import { fetchSimpleProperties } from "@/services/identityAccessService";
import {
  fetchBatchHistory,
  fetchBatchMeterReadingsStatus,
  fetchUtilityDashboard,
} from "@/services/meterReadingService";
import { dedupeBatchHistory, getHistoryRowKey } from "@/lib/meterReadingHistory.mjs";

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

function formatTime(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const [sy, sm, sd] = String(startDate).slice(0, 10).split("-");
  const [ey, em, ed] = String(endDate).slice(0, 10).split("-");
  if (!sy || !sm || !sd || !ey || !em || !ed) return "";
  return `${sd}/${sm}/${sy} - ${ed}/${em}/${ey}`;
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
    period: periodValue(item),
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

function getMeterReadingsHref(propertyId, context = {}) {
  const params = new URLSearchParams();
  const normalizedPropertyId = normalizePropertyId(propertyId);
  if (normalizedPropertyId) params.set("propertyId", normalizedPropertyId);
  if (context.from) params.set("from", context.from);
  if (context.facilityName) params.set("facilityName", context.facilityName);
  const query = params.toString();
  return `/dashboard/meter-readings${query ? `?${query}` : ""}`;
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

export default function MeterReadingHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [backendFacilityName, setBackendFacilityName] = useState("");
  const [fallbackPropertyId, setFallbackPropertyId] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryPropertyId =
    normalizePropertyId(searchParams.get("propertyId") || searchParams.get("facilityId"));
  const assignedPropertyId = firstAssignedPropertyId(user);
  const propertyId = queryPropertyId || assignedPropertyId || fallbackPropertyId;
  const selectedPropertyId = propertyId || "";
  const fromFacilities = searchParams.get("from") === "facilities";
  const facilityName = backendFacilityName || searchParams.get("facilityName") || "";
  const queryContext = {
    from: fromFacilities ? "facilities" : "",
    facilityName,
  };
  const meterReadingsHref = getMeterReadingsHref(propertyId, queryContext);

  useEffect(() => {
    if (queryPropertyId || assignedPropertyId) {
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
  }, [assignedPropertyId, queryPropertyId]);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setErrorMessage("");
        setBackendFacilityName("");
        const [historyRes, dashboardRes] = await Promise.all([
          fetchBatchHistory(selectedPropertyId || null),
          fetchUtilityDashboard(selectedPropertyId || null),
        ]);

        let normalizedHistory = Array.isArray(historyRes?.history)
          ? historyRes.history.map(normalizeHistoryItem)
          : [];

        const dashboardCurrentPeriod =
          dashboardRes?.currentPeriod ?? dashboardRes?.current_period;
        const currentHistoryPeriod = normalizedHistory.find((item) => item.isCurrent);
        const activePeriod =
          periodValue(dashboardCurrentPeriod) || periodValue(currentHistoryPeriod);

        if (dashboardRes?.propertyName || dashboardRes?.property_name) {
          setBackendFacilityName(dashboardRes.propertyName ?? dashboardRes.property_name ?? "");
        }

        if (activePeriod) {
          try {
            const batchStatus = await fetchBatchMeterReadingsStatus(activePeriod, selectedPropertyId || null);
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
            }
          } catch (progressError) {
            console.warn("Could not refresh meter reading history progress", progressError);
          }
        }

        setHistory(dedupeBatchHistory(normalizedHistory));
      } catch (error) {
        setErrorMessage(error?.message || "Không tải được lịch sử kỳ ghi chỉ số.");
        console.error("Error fetching meter reading history", error);
      } finally {
        setLoading(false);
      }
    }

    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedPropertyId]);

  const displayHistory = useMemo(() => dedupeBatchHistory(history), [history]);
  const totalElements = displayHistory.length;
  const totalPages = Math.ceil(totalElements / size);
  const safePage = Math.min(page, totalPages || 1);
  const paginatedHistory = displayHistory.slice((safePage - 1) * size, safePage * size);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
      <div>
        <Link
          href={meterReadingsHref}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#3156b6]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quản lý chỉ số điện
        </Link>
        <div className="mt-2">
          <DashboardPageHeader
            title="Lịch sử các kỳ ghi chỉ số"
            description={
              facilityName
                ? `Tra cứu trạng thái, tiến độ và cảnh báo theo từng kỳ tại ${facilityName}.`
                : "Tra cứu trạng thái, tiến độ và cảnh báo theo từng kỳ ghi điện."
            }
          />
        </div>
      </div>

      {errorMessage ? (
        <section className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4" />
          {errorMessage}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-4 py-4 dark:border-white/10">
          <History className="h-4 w-4 text-[#3156b6] dark:text-blue-300" />
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Danh sách kỳ ghi chỉ số
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Chọn một kỳ để xem lại chi tiết phòng đã nhập và các cảnh báo.
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
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải lịch sử
                    </span>
                  </TableCell>
                </TableRow>
              ) : paginatedHistory.length === 0 ? (
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
                  const itemPeriod = periodValue(item);
                  const itemCompletedRooms = capCompletedRooms(item.completedRooms, item.totalRooms);
                  const progress = calculateProgress(itemCompletedRooms, item.totalRooms);
                  return (
                    <TableRow
                      key={getHistoryRowKey(item, index)}
                      className="border-t border-[#e2e8f0] transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <TableCell className="px-4 py-3">
                        <p className="font-black text-slate-900 dark:text-white">
                          {itemPeriod || "-"}
                        </p>
                        {item.isCurrent ? (
                          <p className="text-xs font-semibold text-[#3156b6] dark:text-blue-300">
                            Hiện tại
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {formatTime(item.startDate, item.endDate) || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <PeriodBadge status={item.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-10 text-sm font-black text-slate-700 dark:text-slate-200">
                            {progress}%
                          </span>
                          <ProgressBar value={progress} className="w-24" />
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
                              getBatchHref(itemPeriod, propertyId, {
                                ...queryContext,
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
          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 rounded-lg border border-dashed border-[#cbd5e1] p-5 text-center text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải lịch sử
            </div>
          ) : paginatedHistory.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#cbd5e1] p-5 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
              Chưa có kỳ ghi chỉ số.
            </div>
          ) : (
            paginatedHistory.map((item, index) => {
              const itemPeriod = periodValue(item);
              const itemCompletedRooms = capCompletedRooms(item.completedRooms, item.totalRooms);
              const progress = calculateProgress(itemCompletedRooms, item.totalRooms);
              return (
                <article
                  key={getHistoryRowKey(item, index)}
                  className="rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {itemPeriod || "-"}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatTime(item.startDate, item.endDate) || "-"}
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
                        {progress}%
                      </span>
                    </div>
                    <ProgressBar value={progress} />
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
                      router.push(getBatchHref(itemPeriod, propertyId, {
                        ...queryContext,
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

        {displayHistory.length > size ? (
          <DashboardPagination
            page={safePage}
            size={size}
            totalElements={totalElements}
            totalPages={totalPages}
            itemLabel="kỳ ghi chỉ số"
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
            className="border-t border-[#e2e8f0] dark:border-white/10"
          />
        ) : null}
      </section>
    </div>
  );
}
