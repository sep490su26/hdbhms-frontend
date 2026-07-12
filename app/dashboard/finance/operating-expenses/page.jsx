"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  Droplets,
  Filter,
  Gavel,
  ListFilter,
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

const money = new Intl.NumberFormat("vi-VN");

const expenseRows = [
  { id: "MSC-2938", date: "15/06/2023", category: "Sửa chữa", detail: "Thay máy bơm nước lầu 2", amount: 3.2, status: "Đã thanh toán" },
  { id: "EVN-0623", date: "12/06/2023", category: "Điện", detail: "Tiền điện tổng EVN - Kỳ 06/23", amount: 12.54, status: "Đã thanh toán" },
  { id: "VP-042", date: "10/06/2023", category: "Phạt", detail: "Vi phạm PCCC (Tự ý lắp thêm bếp)", amount: 0.5, status: "Chờ xử lý" },
  { id: "NUOC-0623", date: "08/06/2023", category: "Nước", detail: "Tiền nước toàn khu - Kỳ 06/23", amount: 4.2, status: "Đã thanh toán" },
  { id: "SC-2910", date: "03/06/2023", category: "Sửa chữa", detail: "Bảo dưỡng hệ thống camera", amount: 5.8, status: "Đã thanh toán" },
  { id: "DV-0601", date: "01/06/2023", category: "Dịch vụ", detail: "Thu gom rác và vệ sinh khu chung", amount: 2.1, status: "Đã thanh toán" },
];

const trendData = [
  { label: "T1", value: 28.5 },
  { label: "T2", value: 34.2 },
  { label: "T3", value: 30.1 },
  { label: "T4", value: 39.4 },
  { label: "T5", value: 45.28 },
  { label: "T6", value: 41.7 },
];

const periodOptions = {
  month: { label: "Tháng", factor: 1 },
  quarter: { label: "Quý", factor: 3 },
  year: { label: "Năm", factor: 12 },
};

const categoryMeta = {
  "Sửa chữa": { color: "#3f5db5", bg: "bg-amber-50", text: "text-amber-700" },
  Điện: { color: "#9abcf5", bg: "bg-blue-50", text: "text-blue-700" },
  Nước: { color: "#0f1d33", bg: "bg-cyan-50", text: "text-cyan-700" },
  "Dịch vụ": { color: "#f5c8bd", bg: "bg-violet-50", text: "text-violet-700" },
  Phạt: { color: "#ef627f", bg: "bg-rose-50", text: "text-rose-700" },
};

function formatCurrency(value) {
  return `${money.format(Math.round(value * 1_000_000))}đ`;
}

function ExpenseCard({ icon: Icon, label, value, color, tone = "light", note }) {
  const dark = tone === "dark";
  return (
    <article className={`min-h-[132px] rounded-lg border p-4 shadow-sm ${dark ? "border-[#14243d] bg-[#0d1b31] text-white" : "border-[#dce2ec] bg-white text-[#0f1d33]"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded ${dark ? "bg-[#172b4b] text-[#8ca8ff]" : "bg-[#eef3ff]"}`} style={!dark ? { color } : undefined}>
          <Icon className="h-4 w-4" />
        </span>
        {dark && <span className="inline-flex items-center gap-1 rounded bg-[#172b4b] px-2 py-1 text-[10px] text-slate-300"><TrendingUp className="h-3 w-3" />12.4%</span>}
      </div>
      <p className={`mt-3 text-[10px] font-bold uppercase ${dark ? "text-slate-400" : "text-[#5f6b7c]"}`}>{label}</p>
      <p className="mt-1 text-lg font-black">{formatCurrency(value)}</p>
      {note && <p className={`mt-3 text-[10px] ${dark ? "text-slate-400" : "text-[#64748b]"}`}>{note}</p>}
    </article>
  );
}

function ExpenseTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#dce2ec] bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-bold">{label}</p>
      <p className="mt-1 text-[#3f5db5]">Chi phí: <strong>{formatCurrency(payload[0].value)}</strong></p>
    </div>
  );
}

export default function OperatingExpensesPage() {
  const [periodType, setPeriodType] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState("2023-10");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState("all");
  const [descending, setDescending] = useState(true);
  const factor = periodOptions[periodType].factor;

  const categories = [
    { name: "Sửa chữa", value: 18 * factor, color: "#3f5db5" },
    { name: "Điện", value: 12.5 * factor, color: "#9abcf5" },
    { name: "Nước", value: 6.8 * factor, color: "#0f1d33" },
    { name: "Khác", value: 7.98 * factor, color: "#f5c8bd" },
  ];
  const totalExpense = categories.reduce((sum, item) => sum + item.value, 0);
  const chartData = trendData.map((item) => ({ ...item, value: item.value * factor }));
  const visibleRows = useMemo(() => {
    const filtered = category === "all" ? expenseRows : expenseRows.filter((item) => item.category === category);
    return [...filtered].sort((left, right) => descending ? right.amount - left.amount : left.amount - right.amount);
  }, [category, descending]);

  const exportReport = () => {
    const header = ["Thời gian", "Hạng mục", "Nội dung chi tiết", "Mã chứng từ", "Số tiền", "Trạng thái"];
    const rows = visibleRows.map((item) => [item.date, item.category, `"${item.detail}"`, item.id, item.amount, item.status].join(","));
    const blob = new Blob([`\uFEFF${[header.join(","), ...rows].join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-chi-phi-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 text-[#0f1d33]">
      <DashboardPageHeader
        title="Báo cáo Chi phí vận hành"
        description="Theo dõi chi phí vận hành theo kỳ, hạng mục và chứng từ phát sinh."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 rounded-lg bg-[#edf2fb] p-1">
              {Object.entries(periodOptions).map(([key, item]) => (
                <button key={key} type="button" onClick={() => setPeriodType(key)} className={`min-w-14 rounded-md px-3 text-xs font-bold ${periodType === key ? "bg-white text-[#0f1d33] shadow-sm" : "text-[#5f6b7c]"}`}>{item.label}</button>
              ))}
            </div>
            <label className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6b7c]" />
              <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-10 rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-3 text-xs font-bold outline-none focus:border-[#3f5db5]" />
            </label>
            <button type="button" onClick={exportReport} className="inline-flex h-10 items-center gap-2 rounded-lg bg-black px-4 text-xs font-bold text-white hover:bg-[#17233a]"><Download className="h-4 w-4" />Xuất báo cáo</button>
          </div>
        }
      />
      <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-[#edf2fb] p-1 text-xs font-bold sm:w-fit">
        <Link href="/dashboard/finance" className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70">Doanh thu</Link>
        <Link href="/dashboard/finance/income-expense" className="rounded-md px-3 py-2 text-[#5f6b7c] hover:bg-white/70">Thu chi tổng hợp</Link>
        <span className="rounded-md bg-white px-3 py-2 text-[#3156b6] shadow-sm">Chi phí vận hành</span>
      </nav>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ExpenseCard icon={TrendingUp} label="Tổng chi phí vận hành" value={totalExpense} tone="dark" note={`+${formatCurrency(4.9 * factor)} so với tháng trước`} />
        <ExpenseCard icon={Zap} label="Điện nước" value={12.5 * factor} color="#3f5db5" note="Điện toàn trọ" />
        <ExpenseCard icon={Droplets} label="Phí dịch vụ" value={4.2 * factor} color="#19a9c7" note="Nước toàn trọ" />
        <ExpenseCard icon={Wrench} label="Sửa chữa" value={18 * factor} color="#e87822" note="Chi phí bảo trì" />
        <ExpenseCard icon={Gavel} label="Phạt" value={2.5 * factor} color="#ef627f" note="Phạt vi phạm" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="min-h-[310px] rounded-lg border border-[#dce2ec] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-sm font-black">Xu hướng chi phí (6 tháng)</h2><span className="text-lg font-black text-[#64748b]">...</span></div>
          <div className="mt-5 h-[235px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 5, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#edf1f6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }} />
                <YAxis hide />
                <Tooltip content={<ExpenseTooltip />} cursor={{ fill: "#f8faff" }} />
                <Bar dataKey="value" fill="#dbe7fb" radius={[3, 3, 0, 0]} maxBarSize={34}>
                  {chartData.map((item, index) => <Cell key={item.label} fill={index === 4 ? "#3f5db5" : "#dbe7fb"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-h-[310px] rounded-lg border border-[#dce2ec] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black">Phân bổ hạng mục</h2>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(180px,1fr)_minmax(150px,0.8fr)]">
            <div className="relative mx-auto h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" nameKey="name" innerRadius={58} outerRadius={78} paddingAngle={1} stroke="none">
                    {categories.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-[10px] font-semibold text-[#64748b]">Hạng mục</p><p className="text-sm font-black">Tháng 6</p></div></div>
            </div>
            <div className="grid gap-3">
              {categories.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#64748b]"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><strong>{Math.round((item.value / totalExpense) * 100)}%</strong></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#dce2ec] bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-[#dce2ec] px-5 py-4">
          <h2 className="text-sm font-black">Chi tiết các khoản chi</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowFilters((value) => !value)} className={`grid h-9 w-9 place-items-center rounded border ${showFilters ? "border-[#3f5db5] bg-[#eef3ff] text-[#3f5db5]" : "border-[#cbd5e1] text-[#64748b]"}`} aria-label="Lọc khoản chi"><Filter className="h-4 w-4" /></button>
            <button type="button" onClick={() => setDescending((value) => !value)} className="grid h-9 w-9 place-items-center rounded border border-[#cbd5e1] text-[#64748b]" aria-label="Đổi thứ tự sắp xếp"><ListFilter className={`h-4 w-4 transition ${descending ? "" : "rotate-180"}`} /></button>
          </div>
        </header>
        {showFilters && (
          <div className="border-b border-[#dce2ec] bg-[#f8faff] px-5 py-3">
            <label className="flex max-w-xs items-center gap-3 text-xs font-bold">Hạng mục
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 flex-1 rounded border border-[#cbd5e1] bg-white px-3 outline-none">
                <option value="all">Tất cả</option>
                {[...new Set(expenseRows.map((item) => item.category))].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-[#eef3fb] text-[10px] font-black uppercase text-[#5f6b7c]"><tr><th className="px-5 py-3.5">Thời gian</th><th className="px-5 py-3.5">Hạng mục</th><th className="px-5 py-3.5">Nội dung chi tiết</th><th className="px-5 py-3.5">Số tiền</th><th className="px-5 py-3.5 text-right">Trạng thái</th></tr></thead>
            <tbody>
              {visibleRows.map((item) => {
                const meta = categoryMeta[item.category] || categoryMeta["Dịch vụ"];
                return (
                  <tr key={item.id} className="border-t border-[#e7ebf2] hover:bg-[#f8faff]">
                    <td className="px-5 py-4 font-semibold">{item.date}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.bg} ${meta.text}`}>{item.category}</span></td>
                    <td className="px-5 py-4 text-[#334155]">{item.detail} <span className="ml-2 rounded bg-[#e8edf5] px-1.5 py-0.5 text-[9px] text-[#64748b]">#{item.id}</span></td>
                    <td className="px-5 py-4 font-black">{formatCurrency(item.amount * factor)}</td>
                    <td className="px-5 py-4 text-right"><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${item.status === "Đã thanh toán" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{item.status === "Đã thanh toán" ? "✓" : "…"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-[#dce2ec] bg-[#eef3fb] px-5 py-3 text-[10px] text-[#64748b]">Hiển thị {visibleRows.length} trong tổng số 42 bản ghi chi phí</footer>
      </section>
    </div>
  );
}
