"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CircleDollarSign, Loader2, Wrench } from "lucide-react";
import { fetchInternalMaintenanceCosts } from "@/services/maintenanceService";
import { formatDate as formatDisplayDate } from "@/lib/dateFormat";

const money = new Intl.NumberFormat("vi-VN");

function formatMoney(value) {
  return `${money.format(Number(value || 0))} đ`;
}

function monthValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinancePage() {
  const [costs, setCosts] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetchInternalMaintenanceCosts()
      .then((items) => mounted && setCosts(items))
      .catch((loadError) => mounted && setError(loadError?.message || "Không tải được báo cáo chi phí nội bộ."))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const properties = useMemo(() => Array.from(new Map(
    costs.filter((item) => item.propertyId).map((item) => [String(item.propertyId), item.propertyName || `Cơ sở ${item.propertyId}`])
  )), [costs]);

  const filteredCosts = useMemo(() => costs.filter((item) => {
    if (propertyId && String(item.propertyId) !== propertyId) return false;
    if (month && monthValue(item.recordedAt) !== month) return false;
    return true;
  }), [costs, month, propertyId]);

  const total = filteredCosts.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="grid gap-6 text-[#0f1d33]">
      <section>
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Báo cáo Tài chính</h1>
        <p className="mt-2 text-sm leading-6 text-[#45474c]">Theo dõi chi phí bảo trì nội bộ từ dữ liệu hệ thống.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <CircleDollarSign className="h-5 w-5 text-teal-700" />
          <p className="mt-4 text-xs font-black uppercase text-[#64748b]">Chi phí chủ trọ chịu</p>
          <p className="mt-2 text-2xl font-black">{formatMoney(total)}</p>
        </article>
        <article className="rounded-xl border border-[#e2e8f0] bg-white p-5">
          <Wrench className="h-5 w-5 text-[#3156b6]" />
          <p className="mt-4 text-xs font-black uppercase text-[#64748b]">Phiếu bảo trì nội bộ</p>
          <p className="mt-2 text-2xl font-black">{filteredCosts.length}</p>
        </article>
      </section>

      <section className="grid gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="grid flex-1 gap-1 text-sm font-bold">
            Cơ sở
            <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="h-11 rounded-lg border border-[#cbd5e1] px-3">
              <option value="">Tất cả cơ sở</option>
              {properties.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label className="grid flex-1 gap-1 text-sm font-bold">
            Tháng
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-11 rounded-lg border border-[#cbd5e1] px-3" />
          </label>
          <label className="grid flex-1 gap-1 text-sm font-bold">
            Loại chi phí
            <input value="Bảo trì nội bộ" readOnly className="h-11 rounded-lg border border-[#cbd5e1] bg-slate-50 px-3" />
          </label>
        </div>
        <p className="text-xs font-semibold text-[#64748b]">Chi phí này không được tính vào doanh thu, công nợ tenant hoặc khoản phải thu.</p>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-bold text-[#64748b]"><Loader2 className="h-4 w-4 animate-spin" />Đang tải chi phí...</div>
        ) : error ? (
          <div className="m-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>
        ) : filteredCosts.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center text-center"><Building2 className="h-8 w-8 text-[#94a3b8]" /><p className="mt-3 font-bold">Chưa có chi phí bảo trì nội bộ phù hợp.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-[#f2f4f6] text-xs uppercase text-[#64748b]"><tr><th className="px-5 py-4">Phiếu</th><th className="px-5 py-4">Cơ sở / phòng</th><th className="px-5 py-4">Ngày ghi nhận</th><th className="px-5 py-4">Người chịu phí</th><th className="px-5 py-4 text-right">Chi phí</th></tr></thead>
              <tbody>{filteredCosts.map((item) => (
                <tr key={`${item.ticketId}-${item.recordedAt}`} className="border-t border-[#e2e8f0]">
                  <td className="px-5 py-4"><Link href={`/dashboard/maintenance/${item.ticketId}`} className="font-black text-[#3156b6]">{item.ticketCode}</Link><p className="mt-1 text-xs text-[#64748b]">Bảo trì nội bộ</p></td>
                  <td className="px-5 py-4 font-semibold">{item.propertyName || "Chưa cập nhật"}<p className="mt-1 text-xs text-[#64748b]">{item.roomCode ? `Phòng ${item.roomCode}` : "Khu vực chung"}</p></td>
                  <td className="px-5 py-4">{formatDisplayDate(item.recordedAt)}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">Chủ trọ</span></td>
                  <td className="px-5 py-4 text-right font-black">{formatMoney(item.amount)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
