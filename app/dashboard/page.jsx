"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleAlert,
  DoorOpen,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { getDashboardOverview } from "@/services/dashboardService";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

function SummaryCard({ icon: Icon, label, value, loading }) {
  return (
    <article className="rounded-lg border border-[#dce2ec] dark:border-white/10 bg-white dark:bg-[#0f172a] p-6 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded bg-[#e7edff] text-[#3e5db7]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{label}</p>
      {loading ? (
        <div className="mt-3 h-9 w-20 animate-pulse rounded bg-[#e8edf5]" />
      ) : (
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      )}
    </article>
  );
}

function ErrorState({ error, onRetry }) {
  const forbidden = error?.status === 403;
  return (
    <section
      className="grid min-h-64 place-items-center rounded-lg border border-rose-200 dark:border-rose-500/20 bg-white dark:bg-[#0f172a] p-8 text-center"
      role="alert"
    >
      <div>
        <CircleAlert className="mx-auto h-10 w-10 text-rose-600 dark:text-rose-300" />
        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
          {forbidden
            ? "Bạn không có quyền truy cập."
            : "Không thể tải dữ liệu tổng quan."}
        </h2>
        {!forbidden && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded bg-[#0f1d33] px-4 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        )}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboardOverview());
    } catch (loadError) {
      setData(null);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getDashboardOverview()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const occupancyRate = useMemo(() => {
    const total = data?.totalRoomCount ?? 0;
    const occupied = data?.totalOccupiedRoomCount ?? 0;
    return total > 0 ? `${Math.round((occupied / total) * 100)}%` : "0%";
  }, [data]);

  if (error) {
    return <ErrorState error={error} onRetry={loadDashboard} />;
  }

  const floors = data?.floorEfficiencies ?? [];
  return (
    <div className="w-full min-w-0 flex flex-col gap-6 text-slate-900 dark:text-white">
      <DashboardPageHeader
        title="Dashboard tổng quan"
        description="Số liệu phòng được tổng hợp trực tiếp từ hệ thống."
        actions={
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 text-sm font-bold disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        }
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-5">
        <SummaryCard
          icon={Building2}
          label="Tổng số phòng"
          value={data?.totalRoomCount ?? 0}
          loading={loading}
        />
        <SummaryCard
          icon={UsersRound}
          label="Phòng đang thuê"
          value={data?.totalOccupiedRoomCount ?? 0}
          loading={loading}
        />
        <SummaryCard
          icon={DoorOpen}
          label="Phòng trống"
          value={data?.totalVacantRoomCount ?? 0}
          loading={loading}
        />
        <SummaryCard
          icon={Building2}
          label="Tỷ lệ lấp đầy"
          value={occupancyRate}
          loading={loading}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-[#dce2ec] dark:border-white/10 bg-white dark:bg-[#0f172a]">
        <div className="border-b border-[#dce2ec] dark:border-white/10 px-6 py-5">
          <h2 className="text-lg font-bold">Hiệu suất theo tầng</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#eef3fb] text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4">Cơ sở</th>
                <th className="px-6 py-4">Tầng</th>
                <th className="px-6 py-4 text-right">Tổng phòng</th>
                <th className="px-6 py-4 text-right">Phòng trống</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {loading &&
                Array.from({ length: 3 }, (_, index) => (
                  <tr key={index}>
                    <td colSpan={4} className="px-6 py-4">
                      <div className="h-5 animate-pulse rounded bg-[#e8edf5]" />
                    </td>
                  </tr>
                ))}
              {!loading &&
                floors.map((floor) => (
                  <tr key={`${floor.propertyId}-${floor.floorId}`}>
                    <td className="px-6 py-4 font-semibold">
                      {floor.propertyName || "Chưa cập nhật"}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {floor.floorName || "Chưa cập nhật"}
                    </td>
                    <td className="px-6 py-4 text-right">{floor.roomCount}</td>
                    <td className="px-6 py-4 text-right">
                      {floor.vacantRoomCount}
                    </td>
                  </tr>
                ))}
              {!loading && floors.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    Chưa có dữ liệu tầng và phòng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
