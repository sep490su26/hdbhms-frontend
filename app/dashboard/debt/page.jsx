"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { fetchDebtSummary } from "@/services/debtService";

const CACHE_KEY = "debt_summary_cache";
const money = new Intl.NumberFormat("vi-VN");

const DEBT_TYPE_LABELS = {
  RENT: "Nợ phòng",
  UTILITY: "Nợ điện nước",
  MIXED: "Nợ hỗn hợp",
  OTHER: "Nợ khác",
};

function formatMoney(value) {
  return `${money.format(Number(value || 0))} đ`;
}

function debtTypeLabel(value) {
  return DEBT_TYPE_LABELS[value] || value || "Nợ khác";
}

function readDebtCache() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeDebtCache(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    cachedAt: new Date().toISOString(),
  }));
}

export default function DebtDashboardPage() {
  const [debts, setDebts] = useState([]);
  const [propertyId, setPropertyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const loadDebts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDebtSummary();
      setDebts(data);
      writeDebtCache(data);
      setOffline(false);
    } catch (loadError) {
      const cached = readDebtCache();
      if (cached?.data) {
        setDebts(cached.data);
        setOffline(true);
        setError("Mất kết nối. Đang hiển thị dữ liệu lưu tạm.");
      } else {
        setDebts([]);
        setOffline(false);
        setError(loadError?.message || "Không tải được dashboard công nợ.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDebts, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDebts]);

  const properties = useMemo(() => {
    const propertyMap = new Map();
    debts.forEach((debt) => {
      if (!debt.propertyId) return;
      const id = String(debt.propertyId);
      if (!propertyMap.has(id)) {
        propertyMap.set(id, { id, name: debt.propertyName || `Cơ sở ${id}` });
      }
    });
    return Array.from(propertyMap.values());
  }, [debts]);

  const visibleDebts = useMemo(() => {
    if (!propertyId) return debts;
    return debts.filter((debt) => String(debt.propertyId) === String(propertyId));
  }, [debts, propertyId]);

  const totals = useMemo(() => visibleDebts.reduce(
    (acc, debt) => ({
      rent: acc.rent + debt.rentDebtAmount,
      utility: acc.utility + debt.utilityDebtAmount,
      total: acc.total + debt.totalDebt,
      warning: acc.warning + (debt.isWarning ? 1 : 0),
    }),
    { rent: 0, utility: 0, total: 0, warning: 0 },
  ), [visibleDebts]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-[#0f1d33]">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Công nợ tổng hợp</h1>
          <p className="mt-2 text-sm text-[#64748b]">
            Theo dõi phòng đang nợ tiền phòng, điện nước và các phòng vượt ngưỡng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
            className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-bold"
          >
            <option value="">Tất cả cơ sở</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadDebts}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </button>
        </div>
      </section>

      {error && (
        <section
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
            offline ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {offline ? <WifiOff className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {error}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
          <p className="text-xs font-black uppercase text-[#64748b]">Tổng công nợ</p>
          <p className="mt-2 text-xl font-black">{formatMoney(totals.total)}</p>
        </article>
        <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
          <p className="text-xs font-black uppercase text-[#64748b]">Nợ phòng</p>
          <p className="mt-2 text-xl font-black text-[#3156b6]">{formatMoney(totals.rent)}</p>
        </article>
        <article className="rounded-lg border border-[#e2e8f0] bg-white p-4">
          <p className="text-xs font-black uppercase text-[#64748b]">Nợ điện nước</p>
          <p className="mt-2 text-xl font-black text-emerald-700">{formatMoney(totals.utility)}</p>
        </article>
        <article className="rounded-lg border border-rose-200 bg-white p-4">
          <p className="text-xs font-black uppercase text-rose-600">Vượt ngưỡng</p>
          <p className="mt-2 text-xl font-black text-rose-700">{totals.warning}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }, (_, index) => (
            <article key={index} className="h-52 animate-pulse rounded-lg border border-[#e2e8f0] bg-white" />
          ))}

        {!loading && visibleDebts.length === 0 && (
          <div className="col-span-full grid min-h-64 place-items-center rounded-lg border border-[#e2e8f0] bg-white text-sm font-bold text-[#64748b]">
            Không có công nợ
          </div>
        )}

        {!loading && visibleDebts.map((debt) => (
          <article
            key={debt.roomId}
            className={`rounded-lg border bg-white p-4 ${
              debt.isWarning ? "border-rose-300 shadow-[0_0_0_1px_rgba(225,29,72,0.12)]" : "border-[#e2e8f0]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase text-[#64748b]">
                  <Building2 className="h-4 w-4" />
                  {debt.propertyName || "Chưa có cơ sở"}
                </p>
                <h2 className="mt-2 text-xl font-black">{debt.roomName || "Chưa gán phòng"}</h2>
                <p className="mt-1 text-sm text-[#64748b]">{debt.tenantName || "Chưa cập nhật khách thuê"}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-black ${
                  debt.isWarning ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                }`}
              >
                {debtTypeLabel(debt.debtType)}
              </span>
            </div>

            <div className="mt-5 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-[#64748b]">Tiền phòng</p>
                <p className="font-black">{formatMoney(debt.rentDebtAmount)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-[#64748b]">Điện nước</p>
                <p className="font-black">{formatMoney(debt.utilityDebtAmount)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#e2e8f0] pt-4">
              <p className="flex items-center gap-2 text-sm font-black">
                <Banknote className="h-4 w-4 text-[#3156b6]" />
                {formatMoney(debt.totalDebt)}
              </p>
              <p className={`text-sm font-black ${debt.isWarning ? "text-rose-700" : "text-[#64748b]"}`}>
                {debt.monthsOverdue}{debt.isWarning ? "+" : ""} tháng
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
