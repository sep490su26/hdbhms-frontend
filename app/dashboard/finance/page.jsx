"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, TrendingUp } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { MonthYearField } from "../_components/MonthYearField";
import { useTheme } from "../_contexts/ThemeContext";
import { fetchRevenueReport } from "@/services/revenueReportService";
import { formatThousandVND } from "./_lib/formatters";

const money = new Intl.NumberFormat("vi-VN");

const periodConfig = {
  month: { label: "Tháng" },
  quarter: { label: "Quý" },
  year: { label: "Năm" },
};

const sourceLabels = {
  room: "Tiền phòng",
  utilities: "Điện/Nước",
  service: "Dịch vụ",
  extra: "Thu khác",
};

const emptyPeriod = {
  period: "",
  label: "",
  room: 0,
  utilities: 0,
  service: 0,
  extra: 0,
  total: 0,
  previous: 0,
};

const sourceColors = {
  room: "#3f5db5",
  utilities: "#f8b91f",
  service: "#a865ef",
  extra: "#ef627f",
};

function formatCurrency(value) {
  return `${money.format(Math.round(Number(value) || 0))} VNĐ`;
}

function formatCompact(value) {
  const millions = (Number(value) || 0) / 1_000_000;
  return `${millions.toFixed(1)}M`;
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function percentOf(value, total) {
  return total > 0 ? Math.round(((Number(value) || 0) / total) * 100) : 0;
}

function displayPeriod(item, periodType) {
  const period = item.period || "";
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(period);
  if (periodType === "month" && monthMatch) {
    return `Tháng ${monthMatch[2]}/${monthMatch[1]}`;
  }
  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(period);
  if (periodType === "quarter" && quarterMatch) {
    return `Quý ${quarterMatch[2]}/${quarterMatch[1]}`;
  }
  return period || item.label || "";
}

function SummaryCard({ label, value, note, color, trend }) {
  return (
    <article className="relative min-h-[112px] overflow-hidden rounded-lg border border-[#dce2ec] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
      <span
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ backgroundColor: color }}
      />
      <p className="max-w-[120px] text-[10px] font-bold uppercase leading-4 text-[#5f6b7c] dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-black text-[#0f1d33] dark:text-white">
        {formatThousandVND(value)}
      </p>
      <p
        className={`mt-2 flex items-center gap-1 text-[10px] font-semibold ${
          trend
            ? "text-emerald-600 dark:text-emerald-300"
            : "text-[#5f6b7c] dark:text-slate-400"
        }`}
      >
        {trend && <TrendingUp className="h-3 w-3" />}
        {note}
      </p>
    </article>
  );
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#dce2ec] bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#0f172a]">
      <p className="font-bold text-[#0f1d33] dark:text-white">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="mt-1 text-[#5f6b7c] dark:text-slate-400">
          {item.name}:{" "}
          <strong className="text-[#0f1d33] dark:text-white">
            {formatCompact(item.value)}
          </strong>
        </p>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const { theme } = useTheme();
  const [periodType, setPeriodType] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.resolve()
      .then(() => {
        if (ignore) return null;
        setIsLoading(true);
        setErrorMessage("");
        return fetchRevenueReport({ periodType, endPeriod: selectedMonth });
      })
      .then((data) => {
        if (!ignore && data) setReport(data);
      })
      .catch((error) => {
        if (!ignore)
          setErrorMessage(error?.message || "Không tải được báo cáo doanh thu");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [periodType, selectedMonth]);

  const reports = report?.periods ?? [];
  const selectedReport = reports.at(-1) ?? emptyPeriod;
  const totalRevenue =
    selectedReport.total ||
    selectedReport.room +
      selectedReport.utilities +
      selectedReport.service +
      selectedReport.extra;
  const growth = report?.revenueGrowthPercent ?? 0;
  const chartData = reports.map((item) => ({
    ...item,
    short: item.label || item.period,
    previous: item.previous,
    current: item.total,
  }));
  const sources = (
    report?.sources?.length
      ? report.sources
      : Object.keys(sourceLabels).map((key) => ({
          key,
          amount: selectedReport[key] ?? 0,
          percent: percentOf(selectedReport[key], totalRevenue),
        }))
  ).map((source) => ({
    ...source,
    label: sourceLabels[source.key] || source.key,
    value: source.amount,
    percent: source.percent ?? percentOf(source.amount, totalRevenue),
  }));
  const sourceByKey = Object.fromEntries(
    sources.map((source) => [source.key, source]),
  );
  const dominantSource = sources.reduce(
    (best, source) => (source.value > (best?.value || 0) ? source : best),
    null,
  );
  const isDark = theme === "dark";
  const chartGridColor = isDark ? "rgba(148, 163, 184, 0.2)" : "#edf1f6";
  const chartAxisColor = isDark ? "#cbd5e1" : "#5f6b7c";
  const chartMutedAxisColor = isDark ? "#94a3b8" : "#94a3b8";
  const chartLineColor = isDark ? "#e2e8f0" : "#0f1d33";
  const chartCursorFill = isDark ? "rgba(96, 165, 250, 0.12)" : "#f7f9fc";
  const donutStops = useMemo(() => {
    if (totalRevenue <= 0) {
      return { parts: ["#e8edf7 0% 100%"], end: 100 };
    }
    return sources.reduce(
      (result, source, index) => {
        const previous = index === 0 ? 0 : result.end;
        const end = previous + (source.value / totalRevenue) * 100;
        result.parts.push(`${sourceColors[source.key]} ${previous}% ${end}%`);
        result.end = end;
        return result;
      },
      { parts: [], end: 0 },
    );
  }, [sources, totalRevenue]);

  const exportReport = () => {
    if (!reports.length) return;
    const header = [
      "Kỳ báo cáo",
      "Doanh thu phòng",
      "Tiền điện nước",
      "Phí dịch vụ",
      "Thu khác",
      "Tổng cộng",
    ];
    const rows = reports.map((item) => {
      const total =
        item.total || item.room + item.utilities + item.service + item.extra;
      return [
        displayPeriod(item, periodType),
        item.room,
        item.utilities,
        item.service,
        item.extra,
        total,
      ].join(",");
    });
    const blob = new Blob([`\uFEFF${[header.join(","), ...rows].join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-doanh-thu-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 text-[#0f1d33] dark:text-white">
      <DashboardPageHeader
        title="Báo cáo doanh thu"
        description="Phân tích dòng tiền và hiệu quả kinh doanh"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 rounded-lg border border-[#d7deea] bg-[#eef2f8] p-1 dark:border-white/10 dark:bg-white/5">
              {Object.entries(periodConfig).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriodType(key)}
                  className={`min-w-14 rounded-md px-3 text-xs font-bold transition ${
                    periodType === key
                      ? "bg-white text-[#0f1d33] shadow-sm dark:bg-blue-500/20 dark:text-blue-200"
                      : "text-[#5f6b7c] dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <MonthYearField value={selectedMonth} onChange={setSelectedMonth} label="Tháng/năm" />
            <button
              type="button"
              onClick={exportReport}
              disabled={isLoading || !reports.length}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#080f1f] px-4 text-xs font-bold text-white hover:bg-[#17233a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
            >
              <Download className="h-4 w-4" />
              Xuất báo cáo
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-[#edf2fb] p-1 text-xs font-bold dark:bg-white/5 sm:w-fit">
          <span className="rounded-md bg-white px-3 py-2 text-[#3156b6] shadow-sm dark:bg-blue-500/20 dark:text-blue-200">
            Doanh thu
          </span>
          <Link
            href="/dashboard/finance/income-expense"
            className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Thu chi tổng hợp
          </Link>
          <Link
            href="/dashboard/finance/operating-expenses"
            className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Chi phí vận hành
          </Link>
        </nav>
        <p className="shrink-0 rounded-md border border-[#dce2ec] bg-white px-3 py-2 text-xs font-bold text-[#5f6b7c] shadow-sm dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-300">
          Đơn vị: Nghìn VND
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {isLoading && !report && (
        <div className="rounded-lg border border-[#dce2ec] bg-white px-4 py-3 text-xs font-semibold text-[#5f6b7c] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-300">
          Đang tải báo cáo doanh thu...
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          label="Tổng doanh thu"
          value={totalRevenue}
          note={`${growth >= 0 ? "+" : ""}${growth}%`}
          color="#3f5db5"
          trend={growth >= 0}
        />
        <SummaryCard
          label="Tiền phòng"
          value={sourceByKey.room?.value ?? 0}
          note={`${sourceByKey.room?.percent ?? 0}% tổng thu`}
          color="#82b4ff"
        />
        <SummaryCard
          label="Tiền điện nước"
          value={sourceByKey.utilities?.value ?? 0}
          note={`${sourceByKey.utilities?.percent ?? 0}% tổng thu`}
          color="#f8b91f"
        />
        <SummaryCard
          label="Phí dịch vụ"
          value={sourceByKey.service?.value ?? 0}
          note={`${sourceByKey.service?.percent ?? 0}% tổng thu`}
          color="#a865ef"
        />
        <SummaryCard
          label="Thu khác"
          value={sourceByKey.extra?.value ?? 0}
          note={`${sourceByKey.extra?.percent ?? 0}% tổng thu`}
          color="#ef627f"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(250px,0.95fr)]">
        <div className="min-h-[330px] rounded-lg border border-[#dce2ec] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-black">Xu hướng doanh thu</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold text-[#5f6b7c] dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-[#3f5db5]" />
                Tiền phòng
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-[#f8b91f]" />
                Điện/nước
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-[#a865ef]" />
                Dịch vụ
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-[#ef627f]" />
                Thu khác
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-0.5 w-5 rounded bg-[#0f1d33] dark:bg-slate-200" />
                Tổng thu
              </span>
            </div>
          </div>
          <div className="mt-5 h-[255px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                barGap={0}
                margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={chartGridColor} />
                <XAxis
                  dataKey="short"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: chartAxisColor, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCompact}
                  tick={{ fontSize: 10, fill: chartMutedAxisColor, fontWeight: 700 }}
                  width={50}
                />
                <Tooltip
                  content={<RevenueTooltip />}
                  cursor={{ fill: chartCursorFill }}
                />
                <Bar
                  dataKey="room"
                  name="Tiền phòng"
                  stackId="revenue"
                  fill={sourceColors.room}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="utilities"
                  name="Điện/nước"
                  stackId="revenue"
                  fill={sourceColors.utilities}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="service"
                  name="Dịch vụ"
                  stackId="revenue"
                  fill={sourceColors.service}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="extra"
                  name="Thu khác"
                  stackId="revenue"
                  fill={sourceColors.extra}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="Tổng thu"
                  stroke={chartLineColor}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name="Kỳ trước"
                  stroke="#9aa3b2"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[#dce2ec] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
          <h2 className="text-base font-black">Phân bổ nguồn thu</h2>
          <div
            className="mx-auto mt-5 grid h-44 w-44 place-items-center rounded-[24px]"
            style={{
              background: `conic-gradient(${donutStops.parts.join(",")})`,
            }}
          >
            <div className="grid h-28 w-28 place-items-center bg-white text-center dark:bg-[#0f172a]">
              <div>
                <p className="text-2xl font-black">
                  {totalRevenue > 0 ? `${dominantSource?.percent ?? 0}%` : "0%"}
                </p>
                <p className="text-[10px] font-semibold text-[#5f6b7c] dark:text-slate-400">
                  {totalRevenue > 0 ? dominantSource?.label : "Chưa có thu"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {sources.map((source) => (
              <div
                key={source.key}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-2 font-semibold text-[#5f6b7c] dark:text-slate-300">
                  <i
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: sourceColors[source.key] }}
                  />
                  {source.label}
                </span>
                <span className="flex min-w-[96px] items-center justify-end gap-2">
                  <span className="inline-flex h-2 w-14 overflow-hidden rounded-full bg-[#edf1f6] dark:bg-white/10">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, source.percent))}%`,
                        backgroundColor: sourceColors[source.key],
                      }}
                    />
                  </span>
                  <strong>{source.percent}%</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#dce2ec] bg-white shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
        <header className="flex items-center justify-between border-b border-[#dce2ec] px-5 py-4 dark:border-white/10">
          <h2 className="text-base font-black">Chi tiết theo thời gian</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-[#eef3fb] text-[10px] font-black uppercase text-[#5f6b7c] dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Kỳ báo cáo</th>
                <th className="px-5 py-3.5">Doanh thu phòng</th>
                <th className="px-5 py-3.5">Tiền điện/nước</th>
                <th className="px-5 py-3.5">Phí dịch vụ</th>
                <th className="px-5 py-3.5">Thu khác</th>
                <th className="px-5 py-3.5 text-right">Tổng cộng</th>
              </tr>
            </thead>
            <tbody>
              {[...reports]
                .reverse()
                .slice(0, 5)
                .map((item) => {
                  const total =
                    item.room + item.utilities + item.service + item.extra;
                  return (
                    <tr
                      key={item.period}
                      className="border-t border-[#e7ebf2] hover:bg-[#f8faff] dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <td className="px-5 py-4 font-bold">
                        {displayPeriod(item, periodType)}
                      </td>
                      <td className="px-5 py-4 text-[#4b5563] dark:text-slate-300">
                        {formatCurrency(item.room)}
                      </td>
                      <td className="px-5 py-4 text-[#4b5563] dark:text-slate-300">
                        {formatCurrency(item.utilities)}
                      </td>
                      <td className="px-5 py-4 text-[#4b5563] dark:text-slate-300">
                        {formatCurrency(item.service)}
                      </td>
                      <td className="px-5 py-4 text-[#4b5563] dark:text-slate-300">
                        {formatCurrency(item.extra)}
                      </td>
                      <td className="px-5 py-4 text-right font-black">
                        {formatCurrency(item.total || total)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
