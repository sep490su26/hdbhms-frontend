"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, ReceiptText, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
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

const money = new Intl.NumberFormat("vi-VN");

const baseReports = [
  { label: "T10", period: "Tháng 10/2023", income: 112, expense: 34, reconciled: true },
  { label: "T11", period: "Tháng 11/2023", income: 124, expense: 36, reconciled: true },
  { label: "T12", period: "Tháng 12/2023", income: 118, expense: 32, reconciled: true },
  { label: "T1/24", period: "Tháng 01/2024", income: 135, expense: 40, reconciled: true },
  { label: "T2", period: "Tháng 02/2024", income: 140, expense: 42, reconciled: true },
  { label: "Tháng này", period: "Tháng 03/2024", income: 155, expense: 45, reconciled: true },
];

const periodOptions = {
  month: { label: "Tháng", factor: 1 },
  quarter: { label: "Quý", factor: 3 },
  year: { label: "Năm", factor: 12 },
};

function formatCurrency(value) {
  return `${money.format(Math.round(value * 1_000_000))} VNĐ`;
}

function formatCompactCurrency(value) {
  return `${money.format(Math.round(value * 1_000_000))} VNĐ`;
}

function MetricCard({ icon: Icon, label, value, badge, note, tone = "blue", inverse = false }) {
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
    <article className={`min-h-[150px] rounded-lg border p-5 shadow-sm ${theme.card}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded ${theme.icon}`}><Icon className="h-4 w-4" /></span>
        <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold ${theme.badge}`}>
          {inverse ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {badge}
        </span>
      </div>
      <p className={`mt-4 text-xs font-semibold ${tone === "dark" ? "text-slate-300" : "text-[#64748b]"}`}>{label}</p>
      <p className="mt-1 text-xl font-black">{formatCompactCurrency(value)}</p>
      <p className={`mt-4 border-t border-current/10 pt-3 text-[10px] italic ${theme.note}`}>{note}</p>
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
  const factor = periodOptions[periodType].factor;
  const reports = useMemo(
    () => baseReports.map((item) => ({
      ...item,
      income: item.income * factor,
      expense: item.expense * factor,
      profit: (item.income - item.expense) * factor,
    })),
    [factor],
  );
  const current = reports.at(-1);
  const profitMargin = Math.round((current.profit / current.income) * 1000) / 10;

  const exportReport = () => {
    const header = ["Thời gian", "Doanh thu", "Chi phí", "Lợi nhuận", "Trạng thái"];
    const rows = reports.map((item) => [item.period, item.income, item.expense, item.profit, item.reconciled ? "Đã chốt" : "Chưa chốt"].join(","));
    const blob = new Blob([`\uFEFF${[header.join(","), ...rows].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-thu-chi-${periodType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 text-[#0f1d33]">
      <DashboardPageHeader
        title="Báo cáo thu chi tổng hợp"
        description="Đối chiếu doanh thu, chi phí và lợi nhuận theo kỳ báo cáo."
        actions={
          <div className="inline-flex h-10 rounded-lg bg-[#edf2fb] p-1">
            {Object.entries(periodOptions).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriodType(key)}
                className={`min-w-14 rounded-md px-3 text-xs font-bold transition ${periodType === key ? "bg-[#3f5db5] text-white shadow-sm" : "text-[#5f6b7c]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />
      <nav className="flex items-center gap-1 rounded-lg bg-[#edf2fb] p-1 text-xs font-bold sm:w-fit">
        <Link href="/dashboard/finance" className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70">Doanh thu</Link>
        <span className="rounded-md bg-white px-3 py-2 text-[#3156b6] shadow-sm">Thu chi tổng hợp</span>
        <Link href="/dashboard/finance/operating-expenses" className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70">Chi phí vận hành</Link>
      </nav>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={WalletCards}
          label="Tổng doanh thu"
          value={current.income}
          badge="12.5%"
          note={`So với tháng trước: +${formatCurrency(15.8 * factor)}`}
        />
        <MetricCard
          icon={ReceiptText}
          label="Tổng chi phí"
          value={current.expense}
          badge="4.2%"
          note={`Điện nước chiếm ${Math.round((29.25 / 45) * 100)}% tổng chi`}
          tone="red"
          inverse
        />
        <MetricCard
          icon={TrendingUp}
          label="Lợi nhuận ròng"
          value={current.profit}
          badge="18.3%"
          note={`Biên lợi nhuận: ${profitMargin}%`}
          tone="dark"
        />
      </section>

      <section className="min-h-[360px] rounded-lg border border-[#dce2ec] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black">Biểu đồ so sánh Thu - Chi</h2>
            <p className="mt-1 text-xs text-[#64748b]">Thống kê 6 kỳ gần nhất</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-semibold text-[#64748b]">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#3f5db5]" />Doanh thu</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#e89ca2]" />Chi phí</span>
          </div>
        </div>
        <div className="mt-5 h-[275px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reports} barGap={4} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#edf1f6" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} width={42} tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={(value) => `${value}M`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f8faff" }} />
              <Bar dataKey="income" name="Doanh thu" fill="#3f5db5" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name="Chi phí" fill="#e89ca2" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#dce2ec] bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2ec] px-5 py-4">
          <h2 className="text-sm font-black">Chi tiết theo thời gian</h2>
          <button type="button" onClick={exportReport} className="inline-flex items-center gap-2 text-xs font-bold text-[#3156b6] hover:text-[#233f91]">
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
                <tr key={item.period} className="border-t border-[#e7ebf2] hover:bg-[#f8faff]">
                  <td className={`px-5 py-4 ${index < 3 ? "font-black" : "font-semibold"}`}>{item.period}</td>
                  <td className="px-5 py-4 font-semibold text-[#3156b6]">{formatCurrency(item.income)}</td>
                  <td className="px-5 py-4 font-semibold text-rose-600">{formatCurrency(item.expense)}</td>
                  <td className="px-5 py-4 font-black">{formatCurrency(item.profit)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                      <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Đã chốt
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
