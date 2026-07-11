"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  fetchBatchHistory,
  fetchUtilityDashboard,
  startBatchReading,
} from "@/services/meterReadingService";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

const NAV_ITEMS = [
  { icon: "grid", label: "Tổng quan" },
  { icon: "home", label: "Phòng trọ" },
  { icon: "file-text", label: "Hợp đồng" },
  { icon: "users", label: "Khách thuê" },
  { icon: "dollar", label: "Thu chi" },
  { icon: "alert-circle", label: "Công nợ" },
  { icon: "zap", label: "Điện nước", active: true },
  { icon: "tool", label: "Dịch vụ" },
  { icon: "clipboard", label: "Yêu cầu" },
  { icon: "bar-chart", label: "Báo cáo" },
  { icon: "settings", label: "Cài đặt" },
];

const STATUS_MAP = {
  DRAFT: {
    label: "ĐANG NHẬP DỮ LIỆU",
    bg: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20",
  },
  PREVIEWED: {
    label: "CHỜ DUYỆT",
    bg: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-500/20",
  },
  CONFIRMED: {
    label: "ĐÃ CHỐT",
    bg: "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-500/20",
  },
  CANCELLED: {
    label: "ĐÃ HỦY",
    bg: "bg-gray-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-gray-200 dark:border-white/10",
  },
};

const formatTime = (startDate, endDate) => {
  if (!startDate || !endDate) return "";
  const [sy, sm, sd] = startDate.split("-");
  const [ey, em, ed] = endDate.split("-");
  return `${sd}/${sm}/${sy} - ${ed}/${em}/${ey}`;
};

function NavIcon({ type, className = "w-5 h-5" }) {
  const p = {
    className,
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
  };
  const s = {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.8,
  };
  const icons = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" {...s} />
        <rect x="14" y="3" width="7" height="7" rx="1" {...s} />
        <rect x="3" y="14" width="7" height="7" rx="1" {...s} />
        <rect x="14" y="14" width="7" height="7" rx="1" {...s} />
      </>
    ),
    home: (
      <>
        <path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          {...s}
        />
        <path d="M9 21V12h6v9" {...s} />
      </>
    ),
    "file-text": (
      <>
        <path
          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
          {...s}
        />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" {...s} />
      </>
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" {...s} />
        <circle cx="9" cy="7" r="4" {...s} />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" {...s} />
      </>
    ),
    dollar: (
      <>
        <circle cx="12" cy="12" r="10" {...s} />
        <path
          d="M12 6v12M9 9h4.5a1.5 1.5 0 010 3H10.5a1.5 1.5 0 000 3H15"
          {...s}
        />
      </>
    ),
    "alert-circle": (
      <>
        <circle cx="12" cy="12" r="10" {...s} />
        <path d="M12 8v4M12 16h.01" {...s} />
      </>
    ),
    zap: (
      <>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" {...s} />
      </>
    ),
    tool: (
      <>
        <path
          d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
          {...s}
        />
      </>
    ),
    clipboard: (
      <>
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
          {...s}
        />
        <rect x="9" y="3" width="6" height="4" rx="1" {...s} />
      </>
    ),
    "bar-chart": (
      <>
        <path d="M18 20V10M12 20V4M6 20v-6" {...s} />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" {...s} />
        <path
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
          {...s}
        />
      </>
    ),
    headphones: (
      <>
        <path d="M3 18v-6a9 9 0 0118 0v6" {...s} />
        <path
          d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"
          {...s}
        />
      </>
    ),
  };
  return <svg {...p}>{icons[type]}</svg>;
}

export default function UtilityManagement() {
  const [activeNav, setActiveNav] = useState("Điện nước");
  const [history, setHistory] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [canStartCurrentPeriod, setCanStartCurrentPeriod] = useState(false);
  const [nextOpenDate, setNextOpenDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [historyRes, dashboardRes] = await Promise.all([
          fetchBatchHistory(null),
          fetchUtilityDashboard(null),
        ]);
        if (historyRes && historyRes.history) {
          const normalizedHistory = historyRes.history.map((h) => ({
            ...h,
            isCurrent: h.isCurrent ?? h.is_current,
            totalRooms: h.totalRooms ?? h.total_rooms,
            completedRooms: h.completedRooms ?? h.completed_rooms,
            anomalyCount: h.anomalyCount ?? h.anomaly_count,
            startDate: h.startDate ?? h.start_date,
            endDate: h.endDate ?? h.end_date,
          }));
          setHistory(normalizedHistory);
        }
        if (dashboardRes) {
          const canCreate =
            dashboardRes.canCreateCurrentPeriod ??
            dashboardRes.can_create_current_period;
          const nextDate =
            dashboardRes.nextAvailableDate ?? dashboardRes.next_available_date;

          setDashboard({
            ...dashboardRes,
            canCreateCurrentPeriod: canCreate,
            nextAvailableDate: nextDate,
            currentPeriod:
              dashboardRes.currentPeriod ?? dashboardRes.current_period,
          });
          setCanStartCurrentPeriod(canCreate);

          if (nextDate) {
            const dateStr = formatTime(nextDate, nextDate).split(" - ")[0];
            setNextOpenDate(dateStr);
          } else {
            setNextOpenDate(null);
          }
        }
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleStartBatch = async () => {
    try {
      const periodToStart =
        dashboard?.currentPeriod ||
        new Date().toLocaleDateString("en-GB", {
          month: "2-digit",
          year: "numeric",
        });
      await startBatchReading(periodToStart, 1);
      router.push(`/dashboard/meter-readings/batch?period=${periodToStart}`);
    } catch (error) {
      toast.error("Không thể tạo kỳ ghi chỉ số");
      console.error(error);
    }
  };

  const currentPeriod = history.find((h) => h.isCurrent);

  if (loading) {
    return (
      <div className="flex min-h-[320px] w-full items-center justify-center bg-gray-50 dark:bg-[#020817]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentStatus = currentPeriod
    ? STATUS_MAP[currentPeriod.status] || STATUS_MAP.DRAFT
    : STATUS_MAP.DRAFT;
  const totalRooms = currentPeriod?.totalRooms || 0;
  const completedRooms = currentPeriod?.completedRooms || 0;
  const missingRooms = totalRooms - completedRooms;
  const progress =
    totalRooms === 0 ? 0 : Math.round((completedRooms / totalRooms) * 100);

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const paginatedHistory = history.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-gray-50 font-sans text-slate-900 dark:bg-[#020817] dark:text-slate-100">
      <div className="flex w-full min-w-0 flex-col gap-6">
        {/* Page header */}
        <DashboardPageHeader
          title="Nhập điện nước hàng tháng"
          description="Quản lý ghi chỉ số điện nước hàng tháng"
          actions={
            <div className="flex items-center gap-3">
              {!currentPeriod && canStartCurrentPeriod && (
                <button
                  onClick={handleStartBatch}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Bắt đầu kỳ ghi tháng này
                </button>
              )}

              {!currentPeriod && !canStartCurrentPeriod && (
                <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300 border border-amber-200 dark:border-yellow-500/20 text-sm font-medium">
                  Kỳ ghi mới mở từ ngày {nextOpenDate}
                </div>
              )}

              {currentPeriod && (
                <button
                  onClick={() => router.push("/dashboard/meter-readings/batch")}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  Tiếp tục nhập
                </button>
              )}
            </div>
          }
        />

        {/* Current period card */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f172a]">
          {!currentPeriod ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-white/10 dark:bg-[#111827]">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Chưa có kỳ ghi chỉ số đang hoạt động
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {canStartCurrentPeriod
                  ? "Bạn có thể bắt đầu kỳ ghi mới."
                  : `Kỳ tiếp theo sẽ mở vào ${nextOpenDate}`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-stretch gap-6">
              {/* Period info */}
              <div className="w-full md:w-44 shrink-0 md:border-r border-b md:border-b-0 border-gray-100 dark:border-white/10 md:pr-6 pb-4 md:pb-0">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
                  Kỳ ghi chỉ số hiện tại
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-300 mb-2">
                  {currentPeriod?.period}
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${currentStatus.bg}`}
                >
                  {currentPeriod?.status === "DRAFT" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  )}
                  {currentStatus.label}
                </span>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400 dark:text-slate-500">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {currentPeriod
                    ? formatTime(currentPeriod.startDate, currentPeriod.endDate)
                    : ""}
                </div>
              </div>

              {/* Progress */}
              <div className="flex-1 md:border-r border-b md:border-b-0 border-gray-100 dark:border-white/10 md:pr-6 pb-4 md:pb-0">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                  Tiến độ nhập chỉ số
                </p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 bg-gray-100 dark:bg-white/5 rounded-full h-3 mr-4">
                    <div
                      className="bg-blue-500 h-3 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-300 shrink-0">
                    {progress}%
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {completedRooms} / {totalRooms} phòng
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6">
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-1">
                    <svg
                      className="w-5 h-5 text-blue-500 dark:text-blue-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {completedRooms}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Đã nhập
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-1">
                    <svg
                      className="w-5 h-5 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {currentPeriod?.anomalyCount || 0}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Cảnh báo
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-1">
                    <svg
                      className="w-5 h-5 text-slate-400 dark:text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {missingRooms}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Chưa nhập
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* History table */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0f172a]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-white/10">
            <h2 className="font-semibold text-slate-800 dark:text-white">
              Lịch sử các kỳ ghi chỉ số
            </h2>
          </div>
          <div className="w-full overflow-x-auto">
            <div className="hidden md:block">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-b border-gray-100 bg-gray-50 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/5">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Kỳ ghi chỉ số
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Thời gian
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Trạng thái
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Tiến độ
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Phòng đã nhập
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Cảnh báo
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHistory.map((h) => {
                    const st = STATUS_MAP[h.status] || STATUS_MAP.DRAFT;
                    const prog =
                      h.totalRooms === 0
                        ? 0
                        : Math.round((h.completedRooms / h.totalRooms) * 100);
                    return (
                      <TableRow
                        key={h.period}
                        className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <TableCell className="py-3.5">
                          {h.isCurrent ? (
                            <span className="font-semibold text-blue-600 dark:text-blue-300">
                              {h.period}
                              <span className="text-xs">(Hiện tại)</span>
                            </span>
                          ) : (
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              {h.period}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 text-slate-500 dark:text-slate-400">
                          {formatTime(h.startDate, h.endDate)}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span
                            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${st.bg}`}
                          >
                            {st.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-10">
                              {prog}%
                            </span>
                            <div className="w-24 bg-gray-100 dark:bg-white/5 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${prog}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-slate-600 dark:text-slate-300">
                          {h.completedRooms} / {h.totalRooms}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span
                            className={`text-sm font-semibold ${h.anomalyCount > 0 ? "text-orange-500 dark:text-orange-300" : "text-slate-400 dark:text-slate-500"}`}
                          >
                            {h.anomalyCount}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/dashboard/meter-readings/batch?period=${h.period}`,
                                )
                              }
                              className="text-sm font-medium text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-500/20 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Card List cho Mobile */}
            <div className="md:hidden flex flex-col p-4 gap-4">
              {paginatedHistory.map((h) => {
                const st = STATUS_MAP[h.status] || STATUS_MAP.DRAFT;
                const prog =
                  h.totalRooms === 0
                    ? 0
                    : Math.round((h.completedRooms / h.totalRooms) * 100);
                return (
                  <div
                    key={h.period}
                    className="border border-gray-200 dark:border-white/10 rounded-xl p-4 bg-gray-50/50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3
                          className={`font-bold text-lg ${h.isCurrent ? "text-blue-600 dark:text-blue-300" : "text-slate-900 dark:text-white"}`}
                        >
                          {h.period}{" "}
                          {h.isCurrent && (
                            <span className="text-xs font-medium ml-1">
                              (Hiện tại)
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatTime(h.startDate, h.endDate)}
                        </p>
                      </div>
                      <span
                        className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${st.bg}`}
                      >
                        {st.label}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="flex justify-between items-center mb-1 text-sm">
                          <span className="text-slate-500 dark:text-slate-400">
                            Tiến độ ({h.completedRooms} / {h.totalRooms})
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {prog}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${prog}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">
                          Cảnh báo:
                        </span>
                        <span
                          className={`font-semibold ${h.anomalyCount > 0 ? "text-orange-500 dark:text-orange-300" : "text-slate-700 dark:text-slate-200"}`}
                        >
                          {h.anomalyCount}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        router.push(
                          `/dashboard/meter-readings/batch?period=${h.period}`,
                        )
                      }
                      className="w-full text-sm font-medium text-blue-600 dark:text-blue-300 bg-white dark:bg-[#0f172a] hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 py-2 rounded-lg transition-colors"
                    >
                      Xem chi tiết
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="py-4 border-t border-gray-100 dark:border-white/10">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage - 1);
                        }}
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>

                    {[...Array(totalPages)].map((_, i) => (
                      <PaginationItem key={i + 1}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === i + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(i + 1);
                          }}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(currentPage + 1);
                        }}
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
        {/* Bottom: Hướng dẫn + Ghi chú */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Hướng dẫn nhanh */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f172a]">
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-4 h-4 text-slate-500 dark:text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  Hướng dẫn nhanh
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Các bước ghi chỉ số điện nước hàng tháng
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-1">
              {[
                { num: "1", label: "Tạo kỳ ghi chỉ số", icon: "📋" },
                { num: "2", label: "Nhập chỉ số", icon: "✏️" },
                { num: "3", label: "Chốt kỳ", icon: "✅" },
                { num: "4", label: "Tính tiêu thụ & tạo hóa đơn", icon: "📊" },
              ].map((step, i) => (
                <div key={step.num} className="flex items-center gap-1 flex-1">
                  <div className="flex flex-col items-center text-center flex-1">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl flex items-center justify-center text-lg mb-1.5">
                      {step.icon}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {step.num}. {step.label}
                    </p>
                  </div>
                  {i < 3 && (
                    <svg
                      className="hidden sm:block w-4 h-4 text-gray-300 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                  {i < 3 && (
                    <svg
                      className="block sm:hidden w-4 h-4 text-gray-300 shrink-0 my-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ghi chú */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f172a]">
            {" "}
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-4 h-4 text-yellow-500 dark:text-yellow-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Ghi chú
              </p>
            </div>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 pr-16">
              <li className="flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-0.5">
                  •
                </span>
                Nhập chỉ số ít nhất 1 lần trước khi chốt kỳ.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-0.5">
                  •
                </span>
                Sau khi chốt kỳ, bạn có thể xem, không thể chỉnh sửa.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400 dark:text-slate-500 mt-0.5">
                  •
                </span>
                Các phòng có cảnh báo cần được kiểm tra lại trước khi chốt.
              </li>
            </ul>
            {/* Decorative illustration */}
            <div className="absolute right-4 bottom-3 opacity-20">
              <svg
                className="w-16 h-16 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
