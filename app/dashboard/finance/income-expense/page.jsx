"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { MonthYearField } from "../../_components/MonthYearField";
import { fetchPaidExpenseRequests } from "@/services/expenseReportService";
import { fetchRevenueReport } from "@/services/revenueReportService";
import { formatThousandVND } from "../_lib/formatters";

const money = new Intl.NumberFormat("vi-VN");
const PERIOD_COUNT = 6;

const periodOptions = {
  month: { label: "Tháng" },
  quarter: { label: "Quý" },
  year: { label: "Năm" },
};

const emptyReport = {
  label: "",
  period: "",
  periodKey: "",
  income: 0,
  expense: 0,
  profit: 0,
  reconciled: true,
};

function formatCurrency(value) {
  return `${money.format(Math.round(Number(value) || 0))} VNĐ`;
}

function formatChartTick(value) {
  const millions = (Number(value) || 0) / 1_000_000;
  if (Math.abs(millions) >= 1000) return `${(millions / 1000).toFixed(1)}B`;
  return `${Math.round(millions)}M`;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
  if (periodType === "month" && monthMatch) {
    return `Tháng ${monthMatch[2]}/${monthMatch[1]}`;
  }
  const quarterMatch = /^(\d{4})-Q([1-4])$/.exec(key);
  if (periodType === "quarter" && quarterMatch) {
    return `Quý ${quarterMatch[2]}/${quarterMatch[1]}`;
  }
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

function buildExpenseBuckets(expenses, periodType) {
  return expenses.reduce((buckets, item) => {
    const key = periodKeyFromDate(expenseReportDate(item), periodType);
    if (!key) return buckets;
    buckets.set(key, (buckets.get(key) || 0) + numberValue(item.amount));
    return buckets;
  }, new Map());
}

function periodIncome(item = {}) {
  return (
    numberValue(item.total) ||
    numberValue(item.room) +
      numberValue(item.utilities) +
      numberValue(item.service) +
      numberValue(item.extra)
  );
}

function buildReports(revenueReport, expenses, periodType, endPeriod) {
  const windows = buildPeriodWindows(
    periodType,
    revenueReport?.endPeriod || endPeriod,
  );
  const revenueByKey = new Map(
    (revenueReport?.periods || []).map((item) => [item.period, item]),
  );
  const expenseByKey = buildExpenseBuckets(expenses, periodType);

  return windows.map((window) => {
    const revenue = revenueByKey.get(window.key) || {};
    const income = periodIncome(revenue);
    const expense = expenseByKey.get(window.key) || 0;
    return {
      label: revenue.label || window.label,
      period: window.period,
      periodKey: window.key,
      income,
      expense,
      profit: income - expense,
      reconciled: true,
    };
  });
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

function MetricCard({
  icon: Icon,
  label,
  value,
  badge,
  note,
  tone = "blue",
  inverse = false,
}) {
  const themes = {
    blue: {
      card: "border-[#dfe5ef] bg-white text-[#0f1d33]",
      icon: "bg-[#e9efff] text-[#3f5db5]",
      badge: "bg-emerald-50 text-emerald-600",
      note: "text-[#64748b]",
    },
    red: {
      card: "border-[#dfe5ef] bg-white text-[#0f1d33]",
      icon: "bg-rose-50 text-rose-600",
      badge: "bg-rose-50 text-rose-600",
      note: "text-[#64748b]",
    },
    dark: {
      card: "border-[#172744] bg-[#0d1b31] text-white",
      icon: "bg-[#5773d7] text-white",
      badge: "bg-[#233555] text-slate-200",
      note: "text-slate-400",
    },
  };
  const theme = themes[tone];

  return (
    <article
      className={`min-h-[150px] rounded-lg border p-5 shadow-sm ${theme.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded ${theme.icon}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${theme.badge}`}
        >
          {inverse ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <TrendingUp className="h-3 w-3" />
          )}
          {badge}
        </span>
      </div>
      <p
        className={`mt-4 text-xs font-semibold ${tone === "dark" ? "text-slate-300" : "text-[#64748b]"}`}
      >
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-black">
        {formatThousandVND(value)}
      </p>
      <p
        className={`mt-4 border-t border-current/10 pt-3 text-[10px] italic ${theme.note}`}
      >
        {note}
      </p>
    </article>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#dce2ec] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-[#0f1d33]">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="mt-1" style={{ color: item.color }}>
          {item.name}: <strong>{formatCurrency(item.value)}</strong>
        </p>
      ))}
    </div>
  );
}

export default function IncomeExpenseReportPage() {
  const [periodType, setPeriodType] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [reports, setReports] = useState(() =>
    buildReports(null, [], "month", currentYearMonth()),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    const windows = buildPeriodWindows(periodType, selectedMonth);
    const firstWindow = windows[0];
    const lastWindow = windows.at(-1);

    Promise.all([
      fetchRevenueReport({ periodType, endPeriod: selectedMonth }),
      fetchPaidExpenseRequests({
        fromDate: firstWindow?.fromDate,
        toDate: lastWindow?.toDate,
      }),
    ])
      .then(([revenueReport, expenses]) => {
        if (!ignore)
          setReports(
            buildReports(revenueReport, expenses, periodType, selectedMonth),
          );
      })
      .catch((error) => {
        if (!ignore) {
          setReports(buildReports(null, [], periodType, selectedMonth));
          setErrorMessage(error?.message || "Không tải được báo cáo thu chi");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [periodType, selectedMonth]);

  const current = reports.at(-1) || emptyReport;
  const previous = reports.at(-2) || emptyReport;
  const incomeGrowth = growthPercent(current.income, previous.income);
  const expenseGrowth = growthPercent(current.expense, previous.expense);
  const profitGrowth = growthPercent(current.profit, previous.profit);
  const profitMargin =
    current.income > 0
      ? Math.round((current.profit / current.income) * 1000) / 10
      : 0;

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
      "Doanh thu",
      "Chi phí",
      "Lợi nhuận",
      "Trạng thái",
    ];
    const rows = reports.map((item) =>
      [
        item.period,
        item.income,
        item.expense,
        item.profit,
        item.reconciled ? "Đã chốt" : "Chưa chốt",
      ].join(","),
    );
    const blob = new Blob([`\uFEFF${[header.join(","), ...rows].join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-thu-chi-${periodType}-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 text-[#0f1d33]">
      <DashboardPageHeader
        title="Báo cáo thu chi tổng hợp"
        description="Đối chiếu doanh thu, chi phí và lợi nhuận theo kỳ báo cáo."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 rounded-lg bg-[#edf2fb] p-1">
              {Object.entries(periodOptions).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePeriodTypeChange(key)}
                  className={`min-w-14 rounded-md px-3 text-xs font-bold transition ${periodType === key ? "bg-[#3f5db5] text-white shadow-sm" : "text-[#5f6b7c]"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <MonthYearField value={selectedMonth} onChange={handleSelectedMonthChange} label="Tháng/năm" />
          </div>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-[#edf2fb] p-1 text-xs font-bold sm:w-fit">
          <Link
            href="/dashboard/finance"
            className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70"
          >
            Doanh thu
          </Link>
          <span className="rounded-md bg-white px-3 py-2 text-[#3156b6] shadow-sm">
            Thu chi tổng hợp
          </span>
          <Link
            href="/dashboard/finance/operating-expenses"
            className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70"
          >
            Chi phí vận hành
          </Link>
        </nav>
        <p className="shrink-0 rounded-md border border-[#dce2ec] bg-white px-3 py-2 text-xs font-bold text-[#5f6b7c] shadow-sm">
          Đơn vị: Nghìn VND
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-[#dce2ec] bg-white px-4 py-3 text-xs font-semibold text-[#5f6b7c]">
          Đang tải báo cáo thu chi...
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={WalletCards}
          label="Tổng doanh thu"
          value={current.income}
          badge={signedPercent(incomeGrowth)}
          note={`So với kỳ trước: ${signedThousandVND(current.income - previous.income)}`}
        />
        <MetricCard
          icon={ReceiptText}
          label="Tổng chi phí"
          value={current.expense}
          badge={signedPercent(expenseGrowth)}
          note={`So với kỳ trước: ${signedThousandVND(current.expense - previous.expense)}`}
          tone="red"
          inverse={expenseGrowth < 0}
        />
        <MetricCard
          icon={TrendingUp}
          label="Lợi nhuận ròng"
          value={current.profit}
          badge={signedPercent(profitGrowth)}
          note={`Biên lợi nhuận: ${profitMargin}%`}
          tone="dark"
        />
      </section>

      <section className="min-h-[360px] rounded-lg border border-[#dce2ec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black">Biểu đồ so sánh Thu - Chi</h2>
            <p className="mt-1 text-xs text-[#64748b]">
              Thống kê 6 kỳ gần nhất
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-semibold text-[#64748b]">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-[#3f5db5]" />
              Doanh thu
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full bg-[#e89ca2]" />
              Chi phí
            </span>
          </div>
        </div>
        <div className="mt-5 h-[275px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={reports}
              barGap={4}
              margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#edf1f6" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={42}
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickFormatter={formatChartTick}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "#f8faff" }}
              />
              <Bar
                dataKey="income"
                name="Doanh thu"
                fill="#3f5db5"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="expense"
                name="Chi phí"
                fill="#e89ca2"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#dce2ec] bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2ec] px-5 py-4">
          <h2 className="text-sm font-black">Chi tiết theo thời gian</h2>
          <button
            type="button"
            onClick={exportReport}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#3156b6] hover:text-[#233f91]"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất báo cáo (CSV)
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-[#eef3fb] text-[10px] font-black uppercase text-[#5f6b7c]">
              <tr>
                <th className="px-5 py-3.5">Thời gian</th>
                <th className="px-5 py-3.5">Doanh thu</th>
                <th className="px-5 py-3.5">Chi phí</th>
                <th className="px-5 py-3.5">Lợi nhuận</th>
                <th className="px-5 py-3.5 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {[...reports].reverse().map((item, index) => (
                <tr
                  key={item.periodKey}
                  className="border-t border-[#e7ebf2] hover:bg-[#f8faff]"
                >
                  <td
                    className={`px-5 py-4 ${index < 3 ? "font-black" : "font-semibold"}`}
                  >
                    {item.period}
                  </td>
                  <td className="px-5 py-4 font-semibold text-[#3156b6]">
                    {formatCurrency(item.income)}
                  </td>
                  <td className="px-5 py-4 font-semibold text-rose-600">
                    {formatCurrency(item.expense)}
                  </td>
                  <td className="px-5 py-4 font-black">
                    {formatCurrency(item.profit)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                      <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Đã chốt
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
