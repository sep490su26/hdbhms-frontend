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
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { AdvisorReportPanel } from "./_components/AdvisorReportPanel";
import { useAuth } from "./_contexts/AuthContext";
import { useTheme } from "./_contexts/ThemeContext";
import { ROLES } from "./_lib/rbac";
import { getDashboardOverview } from "@/services/dashboardService";

const numberFormatter = new Intl.NumberFormat("vi-VN");
const chartPrimary = "#315ac8";
const chartSecondary = "#8fa0d6";
const chartMuted = "#e7edf8";
const revenuePeriodOptions = [
  { value: "month", label: "Tháng", subtitle: "6 tháng gần nhất" },
  { value: "quarter", label: "Quý", subtitle: "Theo quý" },
  { value: "year", label: "Năm", subtitle: "Theo năm" },
];

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatMoney(value) {
  return formatNumber(value);
}

function formatThousandMoney(value) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    Number(value || 0) / 1000,
  );
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

function UnitBadge() {
  return (
    <p className="shrink-0 rounded-md border border-[#dce2ec] bg-white px-3 py-2 text-xs font-bold text-[#5f6b7c] shadow-sm dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-300">
      Đơn vị: Nghìn VND
    </p>
  );
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
    blue: "bg-[#eef3ff] text-[#4360b6] dark:bg-blue-500/10 dark:text-blue-300",
    red: "bg-[#fff1f1] text-[#df2727] dark:bg-rose-500/10 dark:text-rose-300",
    amber:
      "bg-[#fff4e8] text-[#8f5b22] dark:bg-amber-500/10 dark:text-amber-300",
  };

  const badgeClasses = {
    green:
      "bg-[#e8fbef] text-[#14934a] dark:bg-emerald-500/10 dark:text-emerald-300",
    red: "bg-[#ffe5e5] text-[#d72222] dark:bg-rose-500/10 dark:text-rose-300",
  };

  return (
    <article className="relative flex h-full flex-col rounded-lg border border-[#dfe5f0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex items-center justify-between gap-3">
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
      <p className="mt-5 truncate text-xs font-bold uppercase text-[#526070] dark:text-slate-400">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1.5 text-[#102039] dark:text-white">
        <span className="text-2xl font-extrabold leading-none">{value}</span>
        {suffix ? (
          <span className="text-sm font-semibold">{suffix}</span>
        ) : null}
      </div>
      {note ? (
        <p className="mt-auto pt-3 text-xs font-semibold text-[#d71920] dark:text-rose-300">
          {note}
        </p>
      ) : null}
    </article>
  );
}

function SegmentControl({ value, onChange }) {
  return (
    <div className="inline-grid h-8 grid-cols-3 rounded-lg bg-[#eef3fb] p-1 text-xs font-bold text-[#4b5563] dark:bg-white/5 dark:text-slate-300">
      {revenuePeriodOptions.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            className={`rounded-md px-4 transition ${
              active
                ? "bg-white text-[#315ac8] shadow-sm dark:bg-blue-500/20 dark:text-blue-200"
                : "hover:text-[#102039] dark:hover:text-white"
            }`}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
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
  const amount = payload.find((entry) => entry.dataKey === "amount")?.value;
  return (
    <div className="rounded-lg border border-[#dfe5f0] bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#0f172a]">
      <p className="font-bold text-[#102039] dark:text-white">{item.label}</p>
      <p className="mt-1 font-semibold text-[#315ac8] dark:text-blue-300">
        {formatMoney(amount)} VNĐ
      </p>
      {item.average ? (
        <p className="mt-1 font-semibold text-[#7c3aed] dark:text-violet-300">
          TB: {formatMoney(item.average)} VNĐ
        </p>
      ) : null}
    </div>
  );
}

function revenuePeriodKey(item, periodType) {
  const match = String(item.period || "").match(/^(\d{4})-(\d{2})/);
  if (!match || periodType === "month") {
    return {
      key: item.period || item.label,
      label: item.label || item.period,
    };
  }

  const year = match[1];
  const month = Number(match[2]);
  if (periodType === "quarter") {
    const quarter = Math.ceil(month / 3);
    return {
      key: `${year}-Q${quarter}`,
      label: `Quý ${quarter}/${year}`,
    };
  }

  return { key: year, label: `Năm ${year}` };
}

function aggregateRevenueItems(items, periodType) {
  if (periodType === "month") return items;

  const grouped = new Map();
  items.forEach((item) => {
    const period = revenuePeriodKey(item, periodType);
    const current = grouped.get(period.key) || {
      period: period.key,
      label: period.label,
      amount: 0,
    };
    current.amount += Number(item.amount || 0);
    grouped.set(period.key, current);
  });
  return [...grouped.values()];
}

function RevenueChart({ items = [], periodType, onPeriodTypeChange, isDark }) {
  const chartData = aggregateRevenueItems(items, periodType);
  const periodMeta =
    revenuePeriodOptions.find((option) => option.value === periodType) ||
    revenuePeriodOptions[0];
  const values = chartData.map((item) => Number(item.amount || 0));
  const average = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  const chartItems = chartData.map((item, index) => {
    const amount = Number(item.amount || 0);
    return {
      ...item,
      amount,
      average,
      fill:
        amount === 0
          ? chartMuted
          : index === chartData.length - 1
            ? chartPrimary
            : chartSecondary,
    };
  });
  const axisTextColor = isDark ? "#cbd5e1" : "#64748b";
  const mutedAxisTextColor = isDark ? "#94a3b8" : "#94a3b8";
  const gridColor = isDark ? "rgba(148, 163, 184, 0.2)" : "#e5ebf4";
  const lineColor = isDark ? "#e2e8f0" : "#102039";
  const cursorFill = isDark
    ? "rgba(96, 165, 250, 0.12)"
    : "rgba(49, 90, 200, 0.08)";

  return (
    <section className="h-full rounded-lg border border-[#dfe5f0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a] lg:col-span-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[#102039] dark:text-white">
            Biểu đồ doanh thu
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#64748b] dark:text-slate-400">
            {periodMeta.subtitle}
          </p>
        </div>
        <SegmentControl value={periodType} onChange={onPeriodTypeChange} />
      </div>
      <div
        className="h-[270px] rounded-lg border border-[#e5ebf4] bg-[#f8fafc] px-3 py-4 dark:border-white/10 dark:bg-[#020817]"
        role="img"
        aria-label={`Biểu đồ doanh thu ${periodMeta.label.toLowerCase()}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartItems}
            margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
          >
            <defs>
              <linearGradient id="overviewRevenueBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#315ac8" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#6aa6ff" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={gridColor}
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 700 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: mutedAxisTextColor, fontSize: 11, fontWeight: 600 }}
              tickFormatter={formatCompactMoney}
              width={46}
            />
            <Tooltip
              cursor={{ fill: cursorFill }}
              content={<RevenueTooltip />}
            />
            {average > 0 ? (
              <ReferenceLine
                y={average}
                stroke="#7c3aed"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
            ) : null}
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={34}>
              {chartItems.map((item) => (
                <Cell
                  key={item.period || item.label}
                  fill={item.amount === 0 ? item.fill : "url(#overviewRevenueBar)"}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="amount"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-[#64748b] dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-2.5 rounded-sm bg-[#315ac8]" />
          Doanh thu
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-0.5 w-5 rounded bg-[#7c3aed]" />
          Trung bình kỳ
        </span>
      </div>
    </section>
  );
}

function OccupancyChart({ occupiedRooms, totalRooms, vacantRooms, loading, isDark }) {
  const occupiedRate = occupancyPercent(occupiedRooms, totalRooms);
  const vacantRate = totalRooms ? Math.max(0, 100 - occupiedRate) : 0;
  const chartData = [
    { name: "Đã thuê", value: occupiedRate, fill: chartPrimary },
  ];

  return (
    <section className="h-full rounded-lg border border-[#dfe5f0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-[#102039] dark:text-white">
            Tỷ lệ lấp đầy
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#64748b] dark:text-slate-400">
            {loading ? "Đang tải dữ liệu" : `${formatNumber(totalRooms)} phòng`}
          </p>
        </div>
        <span className="rounded-md bg-[#eef3fb] px-2.5 py-1 text-xs font-bold text-[#315ac8] dark:bg-blue-500/10 dark:text-blue-300">
          {loading ? "..." : `${occupiedRate}%`}
        </span>
      </div>
      <div
        className="relative h-[270px] rounded-lg border border-[#e5ebf4] bg-[#f8fafc] dark:border-white/10 dark:bg-[#020817]"
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
              background={{ fill: isDark ? "rgba(148, 163, 184, 0.18)" : chartMuted }}
              cornerRadius={12}
              fill={chartPrimary}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-extrabold text-[#102039] dark:text-white">
              {loading ? "..." : `${occupiedRate}%`}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-3 text-sm font-semibold">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-[#334155] dark:text-slate-300">
            <i className="h-2.5 w-2.5 rounded-full bg-[#315ac8]" />
            Đã thuê ({formatNumber(occupiedRooms)} phòng)
          </span>
          <span className="text-[#102039] dark:text-white">
            {loading ? "..." : `${occupiedRate}%`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-[#334155] dark:text-slate-300">
            <i className="h-2.5 w-2.5 rounded-full bg-[#c5161d]" />
            Phòng trống ({formatNumber(vacantRooms)} phòng)
          </span>
          <span className="text-[#c5161d] dark:text-rose-300">
            {loading ? "..." : `${vacantRate}%`}
          </span>
        </div>
      </div>
    </section>
  );
}

function ActivityFeed({ items = [] }) {
  const toneClasses = {
    success:
      "bg-[#dcfce7] text-[#16a34a] dark:bg-emerald-500/10 dark:text-emerald-300",
    info: "bg-[#dbeafe] text-[#315ac8] dark:bg-blue-500/10 dark:text-blue-300",
    warning:
      "bg-[#ffedd5] text-[#ef5f1b] dark:bg-amber-500/10 dark:text-amber-300",
  };
  const iconByType = {
    MAINTENANCE: Wrench,
    PAYMENT: CheckCircle2,
    TENANT: UserPlus,
  };

  return (
    <section className="rounded-lg border border-[#dfe5f0] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-[#102039] dark:text-white">
          Hoạt động gần đây
        </h2>
        <Link
          href="/dashboard/requests"
          className="text-sm font-bold text-[#315ac8] dark:text-blue-300"
        >
          Xem tất cả
        </Link>
      </div>
      {items.length ? (
        <div className="space-y-7">
          {items.map((activity, index) => {
            const Icon = iconByType[activity.type] || CheckCircle2;
            return (
              <div
                key={activity.id || `${activity.type}-${activity.occurredAt}-${activity.title}-${index}`}
                className="flex items-center gap-4"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[activity.tone] || toneClasses.info}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#253146] dark:text-slate-100">
                    {activity.title}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#6b7280] dark:text-slate-400">
                    {activity.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-[#dfe5f0] text-sm font-bold text-[#6b7280] dark:border-white/10 dark:text-slate-400">
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
      <p className="text-xs font-bold uppercase tracking-wide text-white/55">
        {label}
      </p>
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
    <section className="rounded-lg border border-[#dfe5f0] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#6b7280] dark:text-slate-400">
            Sắp hết hạn hợp đồng
          </p>
          <p className="mt-2 text-2xl font-extrabold text-[#102039] dark:text-white">
            {formatNumber(count)} Người thuê
          </p>
          <Link
            href="/dashboard/tenants"
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#315ac8] dark:text-blue-300"
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
                className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[#dbe7ff] text-xs font-extrabold text-[#315ac8] dark:border-[#0f172a] dark:bg-blue-500/10 dark:text-blue-300"
              >
                {tenant.initials}
              </span>
            ))}
            {remaining ? (
              <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[#e9eef9] text-xs font-bold text-[#42526b] dark:border-[#0f172a] dark:bg-white/10 dark:text-slate-300">
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
    <section className="mb-5 flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-sm font-bold">
        <ServerCrash className="h-4 w-4" />
        {message}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
      >
        <RefreshCw className="h-4 w-4" />
        Thử lại
      </button>
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revenuePeriodType, setRevenuePeriodType] = useState("month");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await getDashboardOverview());
    } catch (loadError) {
      setOverview(null);
      setError(
        loadError?.message || "Không tải được dữ liệu tổng quan từ backend.",
      );
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
  const canUseAiReport = user?.role === ROLES.OWNER;
  const isDark = theme === "dark";

  return (
    <div className="w-full min-w-0 bg-[#f6f8fd] text-[#102039] dark:bg-[#020817] dark:text-white">
      <DashboardPageHeader
        title="Dashboard tổng quan"
        description="Thống kê hoạt động của Nhà trọ Hải Đăng"
        className="mb-5"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <UnitBadge />
            {canUseAiReport ? <AdvisorReportPanel /> : null}
          </div>
        }
      />

      {error ? (
        <DashboardNotice message={error} onRetry={loadDashboard} />
      ) : null}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={HandCoins}
          label="Doanh thu tháng"
          value={
            loading ? "..." : formatThousandMoney(overview?.currentMonthRevenue)
          }
          badge={`${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}%`}
        />
        <StatCard
          icon={Building2}
          label="Tỷ lệ lấp đầy"
          value={loading ? "..." : `${occupiedRate}%`}
          badge={
            totalRooms
              ? `${formatNumber(occupiedRooms)}/${formatNumber(totalRooms)}`
              : ""
          }
        />
        <StatCard
          icon={DoorOpenIcon}
          label="Phòng trống"
          value={loading ? "..." : formatNumber(vacantRooms)}
          suffix="Phòng"
          note={
            vacantRooms
              ? `Có ${formatNumber(vacantRooms)} phòng đang trống`
              : ""
          }
          badge={vacantRooms ? "Cần chú ý" : ""}
          badgeTone="red"
          accent="red"
        />
        <StatCard
          icon={AlertTriangle}
          label="Tổng công nợ"
          value={
            loading ? "..." : formatThousandMoney(overview?.totalDebtAmount)
          }
          note={
            debtWarningRoomCount
              ? `${formatNumber(debtWarningRoomCount)} phòng vượt ngưỡng`
              : ""
          }
          accent="amber"
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <RevenueChart
          items={overview?.revenueSeries ?? []}
          periodType={revenuePeriodType}
          onPeriodTypeChange={setRevenuePeriodType}
          isDark={isDark}
        />
        <OccupancyChart
          occupiedRooms={occupiedRooms}
          totalRooms={totalRooms}
          vacantRooms={vacantRooms}
          loading={loading}
          isDark={isDark}
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ActivityFeed items={overview?.recentActivities ?? []} />
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <UtilityCard
              icon={Zap}
              label="Tiêu thụ điện"
              value={
                loading
                  ? "..."
                  : formatUsage(utilityUsage.electricityUsage, "kWh")
              }
              note={`Kỳ ${utilityUsage.period || "hiện tại"} từ backend`}
              dark
            />
            <UtilityCard
              icon={Droplets}
              label="Tiêu thụ nước"
              value={
                loading ? "..." : formatUsage(utilityUsage.waterUsage, "m³")
              }
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
