"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Droplets,
  HandCoins,
  Home,
  Loader2,
  RefreshCw,
  ServerCrash,
  UserPlus,
  Wrench,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { getDashboardOverview } from "@/services/dashboardService";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const chartPrimary = "#315ac8";
const chartSecondary = "#8fa0d6";
const chartMuted = "#e7edf8";

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatMoney(value) {
  return formatNumber(value);
}

function formatUsage(value, unit) {
  const parsed = Number(value || 0);
  const formatted = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 1,
  }).format(parsed);
  return `${formatted} ${unit}`;
}

function occupancyPercent(occupied, total) {
  if (!total) return 0;
  return Math.round((Number(occupied || 0) / Number(total || 0)) * 100);
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  note,
  badge,
  badgeTone = "green",
  accent = "blue",
}) {
  const accentClasses = {
    blue: "bg-[#eef3ff] text-[#4360b6]",
    red: "bg-[#fff1f1] text-[#df2727]",
    amber: "bg-[#fff4e8] text-[#8f5b22]",
  };

  const badgeClasses = {
    green: "bg-[#e8fbef] text-[#14934a]",
    red: "bg-[#ffe5e5] text-[#d72222]",
  };

  return (
    <article className="rounded-lg border border-[#dfe5f0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${accentClasses[accent]}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        {badge ? (
          <span
            className={`rounded px-2.5 py-1 text-xs font-bold ${badgeClasses[badgeTone]}`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-5 text-xs font-bold uppercase text-[#526070]">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5 text-[#102039]">
        <span className="text-2xl font-extrabold leading-none">{value}</span>
        {suffix ? <span className="text-sm font-semibold">{suffix}</span> : null}
      </div>
      {note ? <p className="mt-3 text-xs font-semibold text-[#d71920]">{note}</p> : null}
    </article>
  );
}

function SegmentControl() {
  return (
    <div className="inline-grid h-8 grid-cols-3 rounded-lg bg-[#eef3fb] p-1 text-xs font-bold text-[#4b5563]">
      <button className="rounded-md bg-white px-4 text-[#315ac8] shadow-sm" type="button">
        Tháng
      </button>
      <button className="rounded-md px-4" type="button">
        Quý
      </button>
      <button className="rounded-md px-4" type="button">
        Năm
      </button>
    </div>
  );
}

function formatCompactMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function RevenueTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#dfe5f0] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-[#102039]">{item.label}</p>
      <p className="mt-1 font-semibold text-[#315ac8]">
        {formatMoney(item.amount)} VND
      </p>
    </div>
  );
}

function RevenueChart({ items = [] }) {
  const chartItems = items.map((item, index) => {
    const amount = Number(item.amount || 0);
    return {
      ...item,
      amount,
      fill: amount === 0
        ? chartMuted
        : index === items.length - 1
          ? chartPrimary
          : chartSecondary,
    };
  });

  return (
    <section className="h-full rounded-lg border border-[#dfe5f0] bg-white p-5 shadow-sm lg:col-span-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[#102039]">Biểu đồ doanh thu</h2>
          <p className="mt-1 text-xs font-semibold text-[#64748b]">6 tháng gần nhất</p>
        </div>
        <SegmentControl />
      </div>
      <div
        className="h-[270px] rounded-lg border border-[#e5ebf4] bg-[#f8fafc] px-3 py-4"
        role="img"
        aria-label="Biểu đồ doanh thu 6 tháng gần nhất"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartItems} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#e5ebf4" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
              tickFormatter={formatCompactMoney}
              width={46}
            />
            <Tooltip cursor={{ fill: "rgba(49, 90, 200, 0.08)" }} content={<RevenueTooltip />} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={34}>
              {chartItems.map((item) => (
                <Cell key={item.period || item.label} fill={item.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function OccupancyChart({ occupiedRooms, totalRooms, vacantRooms, loading }) {
  const occupiedRate = occupancyPercent(occupiedRooms, totalRooms);
  const vacantRate = totalRooms ? Math.max(0, 100 - occupiedRate) : 0;
  const chartData = [{ name: "Đã thuê", value: occupiedRate, fill: chartPrimary }];

  return (
    <section className="h-full rounded-lg border border-[#dfe5f0] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[#102039]">Tỷ lệ lấp đầy</h2>
          <p className="mt-1 text-xs font-semibold text-[#64748b]">
            {loading ? "Đang tải dữ liệu" : `${formatNumber(totalRooms)} phòng`}
          </p>
        </div>
        <span className="rounded-md bg-[#eef3fb] px-2.5 py-1 text-xs font-bold text-[#315ac8]">
          {loading ? "..." : `${occupiedRate}%`}
        </span>
      </div>
      <div
        className="relative h-[270px] rounded-lg border border-[#e5ebf4] bg-[#f8fafc]"
        role="img"
        aria-label="Biểu đồ tỷ lệ lấp đầy"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={chartData}
            innerRadius="68%"
            outerRadius="92%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              background={{ fill: chartMuted }}
              cornerRadius={12}
              fill={chartPrimary}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-extrabold text-[#102039]">
              {loading ? "..." : `${occupiedRate}%`}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#64748b]">
              Theo backend
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-3 text-sm font-semibold">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-[#334155]">
            <i className="h-2.5 w-2.5 rounded-full bg-[#315ac8]" />
            Đã thuê ({formatNumber(occupiedRooms)} phòng)
          </span>
          <span className="text-[#102039]">{loading ? "..." : `${occupiedRate}%`}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-[#334155]">
            <i className="h-2.5 w-2.5 rounded-full bg-[#c5161d]" />
            Phòng trống ({formatNumber(vacantRooms)} phòng)
          </span>
          <span className="text-[#c5161d]">{loading ? "..." : `${vacantRate}%`}</span>
        </div>
      </div>
    </section>
  );
}

function ActivityFeed({ items = [] }) {
  const toneClasses = {
    success: "bg-[#dcfce7] text-[#16a34a]",
    info: "bg-[#dbeafe] text-[#315ac8]",
    warning: "bg-[#ffedd5] text-[#ef5f1b]",
  };
  const iconByType = {
    MAINTENANCE: Wrench,
    PAYMENT: CheckCircle2,
    TENANT: UserPlus,
  };

  return (
    <section className="rounded-lg border border-[#dfe5f0] bg-white p-6 shadow-sm">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-[#102039]">Hoạt động gần đây</h2>
        <Link href="/dashboard/requests" className="text-sm font-bold text-[#315ac8]">
          Xem tất cả
        </Link>
      </div>
      {items.length ? (
        <div className="space-y-7">
          {items.map((activity) => {
            const Icon = iconByType[activity.type] || CheckCircle2;
            return (
              <div key={`${activity.type}-${activity.occurredAt}-${activity.title}`} className="flex items-center gap-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[activity.tone] || toneClasses.info}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#253146]">
                    {activity.title}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#6b7280]">
                    {activity.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-[#dfe5f0] text-sm font-bold text-[#6b7280]">
          Chưa có hoạt động gần đây
        </div>
      )}
    </section>
  );
}

function UtilityCard({ icon: Icon, label, value, note, dark = false }) {
  return (
    <article
      className={`relative overflow-hidden rounded-lg p-6 shadow-sm ${
        dark ? "bg-[#102039] text-white" : "bg-[#425db3] text-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-white/55">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold">{value}</span>
      </div>
      <p className="mt-5 text-xs font-medium text-white/70">{note}</p>
      <Icon className="absolute -bottom-3 -right-3 h-20 w-20 text-white/10" />
    </article>
  );
}

function ExpiringContractCard({ summary }) {
  const count = summary?.count ?? 0;
  const tenants = summary?.tenants ?? [];
  const remaining = Math.max(0, count - tenants.length);

  return (
    <section className="rounded-lg border border-[#dfe5f0] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#6b7280]">
            Sắp hết hạn hợp đồng
          </p>
          <p className="mt-2 text-2xl font-extrabold text-[#102039]">
            {formatNumber(count)} Người thuê
          </p>
          <Link
            href="/dashboard/tenants"
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#315ac8]"
          >
            Xem danh sách <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {count ? (
          <div className="flex -space-x-3">
            {tenants.map((tenant) => (
              <span
                key={`${tenant.fullName}-${tenant.roomName}`}
                title={`${tenant.fullName} - ${tenant.roomName}`}
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[#dbe7ff] text-xs font-extrabold text-[#315ac8]"
              >
                {tenant.initials}
              </span>
            ))}
            {remaining ? (
              <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[#e9eef9] text-xs font-bold text-[#42526b]">
                +{remaining}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DashboardNotice({ message, onRetry }) {
  return (
    <section className="mb-5 flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-sm font-bold">
        <ServerCrash className="h-4 w-4" />
        {message}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
      >
        <RefreshCw className="h-4 w-4" />
        Thử lại
      </button>
    </section>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await getDashboardOverview());
    } catch (loadError) {
      setOverview(null);
      setError(loadError?.message || "Không tải được dữ liệu tổng quan từ backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const totalRooms = overview?.totalRoomCount ?? 0;
  const occupiedRooms = overview?.totalOccupiedRoomCount ?? 0;
  const vacantRooms = overview?.totalVacantRoomCount ?? 0;
  const occupiedRate = occupancyPercent(occupiedRooms, totalRooms);
  const revenueGrowth = overview?.revenueGrowthPercent ?? 0;
  const debtWarningRoomCount = overview?.debtWarningRoomCount ?? 0;
  const utilityUsage = overview?.utilityUsage ?? {};

  return (
    <div className="w-full min-w-0 bg-[#f6f8fd] text-[#102039]">
      <DashboardPageHeader
        title="Dashboard tổng quan"
        description="Thống kê hoạt động của Nhà trọ Hải Đăng"
        className="mb-8"
        actions={
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Làm mới
          </button>
        }
      />

      {error ? <DashboardNotice message={error} onRetry={loadDashboard} /> : null}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={HandCoins}
          label="Doanh thu tháng"
          value={loading ? "..." : formatMoney(overview?.currentMonthRevenue)}
          suffix="VND"
          badge={`${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}%`}
        />
        <StatCard
          icon={Building2}
          label="Tỷ lệ lấp đầy"
          value={loading ? "..." : `${occupiedRate}%`}
          badge={totalRooms ? `${formatNumber(occupiedRooms)}/${formatNumber(totalRooms)}` : ""}
        />
        <StatCard
          icon={DoorOpenIcon}
          label="Phòng trống"
          value={loading ? "..." : formatNumber(vacantRooms)}
          suffix="Phòng"
          note={vacantRooms ? `Có ${formatNumber(vacantRooms)} phòng đang trống` : ""}
          badge={vacantRooms ? "Cần chú ý" : ""}
          badgeTone="red"
          accent="red"
        />
        <StatCard
          icon={AlertTriangle}
          label="Tổng công nợ"
          value={loading ? "..." : formatNumber(overview?.totalDebtAmount)}
          suffix="VND"
          note={
            debtWarningRoomCount
              ? `${formatNumber(debtWarningRoomCount)} phòng vượt ngưỡng`
              : ""
          }
          accent="amber"
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <RevenueChart items={overview?.revenueSeries ?? []} />
        <OccupancyChart
          occupiedRooms={occupiedRooms}
          totalRooms={totalRooms}
          vacantRooms={vacantRooms}
          loading={loading}
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ActivityFeed items={overview?.recentActivities ?? []} />
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <UtilityCard
              icon={Zap}
              label="Tiêu thụ điện"
              value={loading ? "..." : formatUsage(utilityUsage.electricityUsage, "kWh")}
              note={`Kỳ ${utilityUsage.period || "hiện tại"} từ backend`}
              dark
            />
            <UtilityCard
              icon={Droplets}
              label="Tiêu thụ nước"
              value={loading ? "..." : formatUsage(utilityUsage.waterUsage, "m³")}
              note={`Kỳ ${utilityUsage.period || "hiện tại"} từ backend`}
            />
          </div>
          <ExpiringContractCard summary={overview?.expiringContractSummary} />
        </div>
      </section>
    </div>
  );
}

function DoorOpenIcon(props) {
  return <Home {...props} />;
}
