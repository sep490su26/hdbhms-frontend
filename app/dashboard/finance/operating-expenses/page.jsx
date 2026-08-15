"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Droplets,
  Filter,
  Gavel,
  ListFilter,
  Package,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { MonthYearField } from "../../_components/MonthYearField";
import { useTheme } from "../../_contexts/ThemeContext";
import { compareByNewest } from "@/lib/sortByNewest.mjs";
import { fetchAllExpenseRequests } from "@/services/expenseReportService";
import { formatThousandVND } from "../_lib/formatters";
import { enumLabel } from "@/lib/enumLabels";

const money = new Intl.NumberFormat("vi-VN");
const PERIOD_COUNT = 6;

const periodOptions = {
  month: { label: "Tháng" },
  quarter: { label: "Quý" },
  year: { label: "Năm" },
};

const expenseTypeOrder = [
  "REPAIR",
  "COMMON_UTILITY",
  "SUPPLIES",
  "REPLACEMENT",
  "CLEANING",
  "OTHER",
];

const expenseTypeMeta = {
  REPAIR: {
    label: "Sửa chữa",
    color: "#3f5db5",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    icon: Wrench,
    note: "Bảo trì, sửa chữa",
  },
  COMMON_UTILITY: {
    label: "Điện nước",
    color: "#9abcf5",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    icon: Zap,
    note: "Chi phí dùng chung",
  },
  SUPPLIES: {
    label: "Vật tư",
    color: "#0f1d33",
    bg: "bg-cyan-50 dark:bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
    icon: Package,
    note: "Mua sắm vật tư",
  },
  REPLACEMENT: {
    label: "Thay thế",
    color: "#f5c8bd",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-300",
    icon: Gavel,
    note: "Thay mới thiết bị",
  },
  CLEANING: {
    label: "Vệ sinh",
    color: "#19a9c7",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: Sparkles,
    note: "Vệ sinh khu chung",
  },
  OTHER: {
    label: "Khác",
    color: "#ef627f",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    icon: Droplets,
    note: "Chi phí khác",
  },
};

const statusLabels = {
  DRAFT: "Nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  READY_FOR_PAYMENT: "Chờ thanh toán",
  REJECTED: "Từ chối",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

function formatCurrency(value) {
  return `${money.format(Math.round(Number(value) || 0))} VNĐ`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function parseYearMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  if (match) return { year: Number(match[1]), month: Number(match[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function addMonths(year, month, offset) {
  const date = new Date(year, month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function formatIsoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function monthStartDate(year, month) {
  return `${year}-${pad2(month)}-01`;
}

function monthEndDate(year, month) {
  return formatIsoDate(new Date(year, month, 0));
}

function displayPeriod(key, periodType) {
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(key);
  if (periodType === "month" && monthMatch)
    return `Tháng ${monthMatch[2]}/${monthMatch[1]}`;
  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(key);
  if (periodType === "quarter" && quarterMatch)
    return `Quý ${quarterMatch[2]}/${quarterMatch[1]}`;
  return key;
}

function buildPeriodWindows(periodType, endPeriod, count = PERIOD_COUNT) {
  const end = parseYearMonth(endPeriod);
  const windows = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    if (periodType === "year") {
      const year = end.year - index;
      windows.push({
        key: String(year),
        label: String(year),
        period: String(year),
        fromDate: `${year}-01-01`,
        toDate: `${year}-12-31`,
      });
      continue;
    }

    if (periodType === "quarter") {
      const quarterStartMonth = Math.floor((end.month - 1) / 3) * 3 + 1;
      const start = addMonths(end.year, quarterStartMonth, -index * 3);
      const quarter = Math.floor((start.month - 1) / 3) + 1;
      const endMonth = addMonths(start.year, start.month, 2);
      const key = `${start.year}-Q${quarter}`;
      windows.push({
        key,
        label: `Q${quarter}/${start.year}`,
        period: displayPeriod(key, periodType),
        fromDate: monthStartDate(start.year, start.month),
        toDate: monthEndDate(endMonth.year, endMonth.month),
      });
      continue;
    }

    const month = addMonths(end.year, end.month, -index);
    const key = `${month.year}-${pad2(month.month)}`;
    windows.push({
      key,
      label: `T${month.month}`,
      period: displayPeriod(key, periodType),
      fromDate: monthStartDate(month.year, month.month),
      toDate: monthEndDate(month.year, month.month),
    });
  }

  return windows;
}

function periodKeyFromDate(value, periodType) {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(String(value || ""));
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (periodType === "year") return String(year);
  if (periodType === "quarter")
    return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
  return `${year}-${pad2(month)}`;
}

function expenseReportDate(item = {}) {
  return (
    item.expenseDate ||
    item.paymentDate ||
    item.expectedPaymentDate ||
    item.createdAt?.slice(0, 10) ||
    ""
  );
}

function formatDisplayDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function statusTone(status) {
  if (status === "PAID" || status === "APPROVED")
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (status === "REJECTED" || status === "CANCELLED")
    return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";
  return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300";
}

function statusMark(status) {
  if (status === "PAID" || status === "APPROVED") return "✓";
  if (status === "REJECTED" || status === "CANCELLED") return "×";
  return "…";
}

function normalizeExpenseRow(item = {}) {
  const categoryKey = expenseTypeMeta[item.expenseType]
    ? item.expenseType
    : "OTHER";
  const meta = expenseTypeMeta[categoryKey];
  const dateValue = expenseReportDate(item);
  return {
    id: item.expenseCode || `EXP-${item.id || ""}`.trim(),
    rawId: item.id,
    date: formatDisplayDate(dateValue),
    rawDate: dateValue,
    categoryKey,
    category: meta.label,
    detail: item.description || "Khoản chi vận hành",
    amount: Number(item.amount) || 0,
    status: item.status || "",
    statusLabel: enumLabel(item.status, statusLabels, "Chưa rõ"),
  };
}

function buildTrendData(expenses, windows, periodType) {
  const buckets = new Map(windows.map((window) => [window.key, 0]));
  expenses.forEach((item) => {
    const key = periodKeyFromDate(expenseReportDate(item), periodType);
    if (buckets.has(key))
      buckets.set(key, buckets.get(key) + (Number(item.amount) || 0));
  });
  return windows.map((window) => ({
    ...window,
    value: buckets.get(window.key) || 0,
  }));
}

function buildCategories(rows) {
  const byType = new Map(
    expenseTypeOrder.map((key) => {
      const meta = expenseTypeMeta[key];
      return [
        key,
        {
          key,
          name: meta.label,
          value: 0,
          color: meta.color,
          icon: meta.icon,
          note: meta.note,
        },
      ];
    }),
  );

  rows.forEach((row) => {
    const current = byType.get(row.categoryKey) || byType.get("OTHER");
    current.value += row.amount;
  });

  return Array.from(byType.values());
}

function growthPercent(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) * 1000) / previous) / 10;
}

function signedPercent(value) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function signedThousandVND(value) {
  return `${value >= 0 ? "+" : "-"}${formatThousandVND(Math.abs(value))}`;
}

function ExpenseCard({
  icon: Icon,
  label,
  value,
  color,
  tone = "light",
  note,
  badge,
}) {
  const dark = tone === "dark";
  return (
    <article
      className={`min-h-[132px] rounded-lg border p-4 shadow-sm ${dark ? "border-[#14243d] bg-[#0d1b31] text-white dark:border-white/10 dark:bg-[#111827]" : "border-[#dce2ec] bg-white text-[#0f1d33] dark:border-white/10 dark:bg-[#0f172a] dark:text-white"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`grid h-9 w-9 place-items-center rounded ${dark ? "bg-[#172b4b] text-[#8ca8ff] dark:bg-blue-500/20 dark:text-blue-200" : "bg-[#eef3ff] dark:bg-white/10"}`}
          style={!dark ? { color } : undefined}
        >
          <Icon className="h-4 w-4" />
        </span>
        {badge && (
          <span className="inline-flex items-center gap-1 rounded bg-[#172b4b] px-2 py-1 text-[10px] text-slate-300 dark:bg-white/10">
            <TrendingUp className="h-3 w-3" />
            {badge}
          </span>
        )}
      </div>
      <p
        className={`mt-3 text-[10px] font-bold uppercase ${dark ? "text-slate-400" : "text-[#5f6b7c] dark:text-slate-400"}`}
      >
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black">
        {formatThousandVND(value)}
      </p>
      {note && (
        <p
          className={`mt-3 text-[10px] ${dark ? "text-slate-400" : "text-[#64748b] dark:text-slate-400"}`}
        >
          {note}
        </p>
      )}
    </article>
  );
}

function ExpenseTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#dce2ec] bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-[#0f172a]">
      <p className="font-bold text-[#0f1d33] dark:text-white">{label}</p>
      <p className="mt-1 text-[#3f5db5] dark:text-blue-300">
        Chi phí: <strong>{formatCurrency(payload[0].value)}</strong>
      </p>
    </div>
  );
}

export default function OperatingExpensesPage() {
  const { theme } = useTheme();
  const [periodType, setPeriodType] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState("all");
  const [descending, setDescending] = useState(true);

  const windows = useMemo(
    () => buildPeriodWindows(periodType, selectedMonth),
    [periodType, selectedMonth],
  );

  useEffect(() => {
    let ignore = false;
    const firstWindow = windows[0];
    const lastWindow = windows.at(-1);

    fetchAllExpenseRequests({
      fromDate: firstWindow?.fromDate,
      toDate: lastWindow?.toDate,
    })
      .then((data) => {
        if (!ignore) setExpenses(data);
      })
      .catch((error) => {
        if (!ignore) {
          setExpenses([]);
          setErrorMessage(error?.message || "Không tải được báo cáo chi phí");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [windows]);

  const rows = useMemo(() => expenses.map(normalizeExpenseRow), [expenses]);
  const currentWindowKey = windows.at(-1)?.key || "";
  const currentRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          periodKeyFromDate(row.rawDate, periodType) === currentWindowKey,
      ),
    [currentWindowKey, periodType, rows],
  );
  const categories = useMemo(() => buildCategories(currentRows), [currentRows]);
  const filterCategories = useMemo(() => buildCategories(rows), [rows]);
  const totalExpense = categories.reduce((sum, item) => sum + item.value, 0);
  const chartData = useMemo(
    () => buildTrendData(expenses, windows, periodType),
    [expenses, periodType, windows],
  );
  const currentExpense = chartData.at(-1)?.value || 0;
  const previousExpense = chartData.at(-2)?.value || 0;
  const expenseGrowth = growthPercent(currentExpense, previousExpense);
  const isDark = theme === "dark";
  const chartGridColor = isDark ? "rgba(148, 163, 184, 0.2)" : "#edf1f6";
  const chartAxisColor = isDark ? "#cbd5e1" : "#64748b";
  const chartCursorFill = isDark ? "rgba(96, 165, 250, 0.12)" : "#f8faff";
  const inactiveBarColor = isDark ? "#1e293b" : "#dbe7fb";
  const emptyPieColor = isDark ? "#1e293b" : "#e8edf7";
  const tooltipBoxStyle = {
    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#dce2ec",
    backgroundColor: isDark ? "#0f172a" : "#ffffff",
    color: isDark ? "#e2e8f0" : "#0f1d33",
  };
  const visibleCategories = categories.filter((item) => item.value > 0);
  const pieCategories = visibleCategories.length
    ? visibleCategories
    : [{ key: "empty", name: "Chưa có dữ liệu", value: 1, color: emptyPieColor }];
  const cardCategories = (
    visibleCategories.length ? visibleCategories : categories
  ).slice(0, 4);
  const visibleRows = useMemo(() => {
    const filtered =
      category === "all"
        ? rows
        : rows.filter((item) => item.categoryKey === category);
    return [...filtered].sort((left, right) => {
      const dateDiff = compareByNewest(left, right, ["rawDate"], ["rawId"]);
      if (dateDiff !== 0) return dateDiff;
      return descending
        ? right.amount - left.amount
        : left.amount - right.amount;
    });
  }, [category, descending, rows]);

  const beginReload = () => {
    setIsLoading(true);
    setErrorMessage("");
  };

  const handlePeriodTypeChange = (key) => {
    if (key === periodType) return;
    beginReload();
    setPeriodType(key);
  };

  const handleSelectedMonthChange = (value) => {
    if (!value || value === selectedMonth) return;
    beginReload();
    setSelectedMonth(value);
  };

  const exportReport = () => {
    const header = [
      "Thời gian",
      "Hạng mục",
      "Nội dung chi tiết",
      "Mã chứng từ",
      "Số tiền",
      "Trạng thái",
    ];
    const exportRows = visibleRows.map((item) =>
      [
        item.date,
        item.category,
        item.detail,
        item.id,
        item.amount,
        item.statusLabel,
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob(
      [`\uFEFF${[header.join(","), ...exportRows].join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-chi-phi-${periodType}-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 text-[#0f1d33] dark:text-white">
      <DashboardPageHeader
        title="Báo cáo Chi phí vận hành"
        description="Theo dõi chi phí vận hành theo kỳ, hạng mục và chứng từ phát sinh."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 rounded-lg border border-[#d7deea] bg-[#edf2fb] p-1 dark:border-white/10 dark:bg-white/5">
              {Object.entries(periodOptions).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePeriodTypeChange(key)}
                  className={`min-w-14 rounded-md px-3 text-xs font-bold ${
                    periodType === key
                      ? "bg-white text-[#0f1d33] shadow-sm dark:bg-blue-500/20 dark:text-blue-200"
                      : "text-[#5f6b7c] dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <MonthYearField value={selectedMonth} onChange={handleSelectedMonthChange} label="Tháng/năm" />
            <button
              type="button"
              onClick={exportReport}
              disabled={isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-4 text-xs font-bold text-white hover:bg-[#17233a] disabled:cursor-not-allowed disabled:bg-[#64748b] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
            >
              <Download className="h-4 w-4" />
              Xuất báo cáo
            </button>
          </div>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-[#edf2fb] p-1 text-xs font-bold dark:bg-white/5 sm:w-fit">
          <Link
            href="/dashboard/finance"
            className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Doanh thu
          </Link>
          <Link
            href="/dashboard/finance/income-expense"
            className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Thu chi tổng hợp
          </Link>
          <span className="rounded-md bg-white px-3 py-2 text-[#3156b6] shadow-sm dark:bg-blue-500/20 dark:text-blue-200">
            Chi phí vận hành
          </span>
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

      {isLoading && (
        <div className="rounded-lg border border-[#dce2ec] bg-white px-4 py-3 text-xs font-semibold text-[#5f6b7c] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-300">
          Đang tải báo cáo chi phí...
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ExpenseCard
          icon={TrendingUp}
          label="Tổng chi phí vận hành"
          value={totalExpense}
          tone="dark"
          badge={signedPercent(expenseGrowth)}
          note={`So với kỳ trước: ${signedThousandVND(currentExpense - previousExpense)}`}
        />
        {cardCategories.map((item) => (
          <ExpenseCard
            key={item.key}
            icon={item.icon}
            label={item.name}
            value={item.value}
            color={item.color}
            note={`${totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0}% tổng chi`}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="min-h-[310px] rounded-lg border border-[#dce2ec] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black">Xu hướng chi phí (6 kỳ)</h2>
            <span className="text-lg font-black text-[#64748b] dark:text-slate-400">...</span>
          </div>
          <div className="mt-5 h-[235px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 5, left: -24, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={chartGridColor} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: chartAxisColor, fontWeight: 700 }}
                />
                <YAxis hide />
                <Tooltip
                  content={<ExpenseTooltip />}
                  cursor={{ fill: chartCursorFill }}
                />
                <Bar
                  dataKey="value"
                  fill={inactiveBarColor}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={34}
                >
                  {chartData.map((item, index) => (
                    <Cell
                      key={item.key}
                      fill={
                        index === chartData.length - 1 ? "#3f5db5" : inactiveBarColor
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-h-[310px] rounded-lg border border-[#dce2ec] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
          <h2 className="text-sm font-black">Phân bổ hạng mục</h2>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(180px,1fr)_minmax(150px,0.8fr)]">
            <div className="relative mx-auto h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieCategories}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={1}
                    stroke="none"
                  >
                    {pieCategories.map((item) => (
                      <Cell key={item.key} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name]}
                    contentStyle={tooltipBoxStyle}
                    itemStyle={{ color: tooltipBoxStyle.color }}
                    labelStyle={{ color: tooltipBoxStyle.color }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-[10px] font-semibold text-[#64748b] dark:text-slate-400">
                    Hạng mục
                  </p>
                  <p className="text-sm font-black">{windows.at(-1)?.period}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              {(visibleCategories.length
                ? visibleCategories
                : categories.slice(0, 4)
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-[#64748b] dark:text-slate-400">
                    <i
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </span>
                  <strong>
                    {totalExpense > 0
                      ? Math.round((item.value / totalExpense) * 100)
                      : 0}
                    %
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#dce2ec] bg-white shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
        <header className="flex items-center justify-between border-b border-[#dce2ec] px-5 py-4 dark:border-white/10">
          <h2 className="text-sm font-black">Chi tiết các khoản chi</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className={`grid h-9 w-9 place-items-center rounded border ${
                showFilters
                  ? "border-[#3f5db5] bg-[#eef3ff] text-[#3f5db5] dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-200"
                  : "border-[#cbd5e1] text-[#64748b] dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
              aria-label="Lọc khoản chi"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDescending((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded border border-[#cbd5e1] text-[#64748b] dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
              aria-label="Đổi thứ tự sắp xếp"
            >
              <ListFilter
                className={`h-4 w-4 transition ${descending ? "" : "rotate-180"}`}
              />
            </button>
          </div>
        </header>
        {showFilters && (
          <div className="border-b border-[#dce2ec] bg-[#f8faff] px-5 py-3 dark:border-white/10 dark:bg-white/5">
            <label className="flex max-w-xs items-center gap-3 text-xs font-bold">
              Hạng mục
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-9 flex-1 rounded border border-[#cbd5e1] bg-white px-3 outline-none dark:border-white/10 dark:bg-[#020817] dark:text-white"
              >
                <option value="all" className="bg-white text-[#0f1d33] dark:bg-[#020817] dark:text-white">Tất cả</option>
                {filterCategories.map((item) => (
                  <option key={item.key} value={item.key} className="bg-white text-[#0f1d33] dark:bg-[#020817] dark:text-white">
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-[#eef3fb] text-[10px] font-black uppercase text-[#5f6b7c] dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Thời gian</th>
                <th className="px-5 py-3.5">Hạng mục</th>
                <th className="px-5 py-3.5">Nội dung chi tiết</th>
                <th className="px-5 py-3.5">Số tiền</th>
                <th className="px-5 py-3.5 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((item) => {
                const meta =
                  expenseTypeMeta[item.categoryKey] || expenseTypeMeta.OTHER;
                return (
                  <tr
                    key={`${item.id}-${item.rawId || item.rawDate}`}
                    className="border-t border-[#e7ebf2] hover:bg-[#f8faff] dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="px-5 py-4 font-semibold">
                      {item.date || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.bg} ${meta.text}`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#334155] dark:text-slate-300">
                      {item.detail}{" "}
                      <span className="ml-2 rounded bg-[#e8edf5] px-1.5 py-0.5 text-[9px] text-[#64748b] dark:bg-white/10 dark:text-slate-400">
                        #{item.id}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${statusTone(item.status)}`}
                        title={item.statusLabel}
                      >
                        {statusMark(item.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!visibleRows.length && (
                <tr className="border-t border-[#e7ebf2] dark:border-white/10">
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-xs font-semibold text-[#64748b] dark:text-slate-400"
                  >
                    Không có khoản chi trong kỳ này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-[#dce2ec] bg-[#eef3fb] px-5 py-3 text-[10px] text-[#64748b] dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          Hiển thị {visibleRows.length} trong tổng số {rows.length} bản ghi chi
          phí
        </footer>
      </section>
    </div>
  );
}
