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
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { fetchDebtSummary } from "@/services/debtService";
import { enumLabel } from "@/lib/enumLabels";

const CACHE_KEY = "debt_summary_cache";
const money = new Intl.NumberFormat("vi-VN");

const DEBT_TYPE_LABELS = {
  RENT: "Nợ phòng",
  UTILITY: "Nợ điện nước",
  MIXED: "Nợ hỗn hợp",
  OTHER: "Nợ khác",
};

function formatMoney(value) {
  return `${money.format(Number(value || 0))} VNĐ`;
}

function formatThousandMoney(value) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    Number(value || 0) / 1000,
  );
}

function debtTypeLabel(value) {
  return enumLabel(value, DEBT_TYPE_LABELS, "Nợ khác");
}

function UnitBadge() {
  return (
    <div className="inline-flex h-10 shrink-0 overflow-hidden rounded-lg border border-[#dce2ec] bg-white text-xs font-bold shadow-sm dark:border-white/10">
      <span className="inline-flex items-center bg-white px-3 text-[#5f6b7c]">
        Đơn vị: Nghìn VND
      </span>
    </div>
  );
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
  window.localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      data,
      cachedAt: new Date().toISOString(),
    }),
  );
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
    return debts.filter(
      (debt) => String(debt.propertyId) === String(propertyId),
    );
  }, [debts, propertyId]);

  const totals = useMemo(
    () =>
      visibleDebts.reduce(
        (acc, debt) => ({
          rent: acc.rent + debt.rentDebtAmount,
          utility: acc.utility + debt.utilityDebtAmount,
          total: acc.total + debt.totalDebt,
          warning: acc.warning + (debt.isWarning ? 1 : 0),
        }),
        { rent: 0, utility: 0, total: 0, warning: 0 },
      ),
    [visibleDebts],
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
      <DashboardPageHeader
        title="Công nợ tổng hợp"
        description="Theo dõi phòng đang nợ tiền phòng, điện nước và các phòng vượt ngưỡng."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <UnitBadge />
            <select
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className="h-10 rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-bold"
            >
              <option value="">Tất cả cơ sở</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {error && (
        <section
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${
            offline
              ? "border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-300"
              : "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {offline ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {error}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <article className="relative flex h-full flex-col rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]">
          <p className="truncate text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            Tổng công nợ
          </p>
          <p className="mt-2 text-xl font-black">
            {formatThousandMoney(totals.total)}
          </p>
        </article>
        <article className="relative flex h-full flex-col rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]">
          <p className="truncate text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            Nợ phòng
          </p>
          <p className="mt-2 text-xl font-black text-[#3156b6]">
            {formatThousandMoney(totals.rent)}
          </p>
        </article>
        <article className="relative flex h-full flex-col rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]">
          <p className="truncate text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            Nợ điện nước
          </p>
          <p className="mt-2 text-xl font-black text-emerald-700 dark:text-emerald-300">
            {formatThousandMoney(totals.utility)}
          </p>
        </article>
        <article className="flex h-full flex-col rounded-lg border border-rose-200 bg-white p-4 dark:border-rose-500/20 dark:bg-[#0f172a]">
          <p className="truncate text-xs font-black uppercase text-rose-600 dark:text-rose-300">
            Vượt ngưỡng
          </p>
          <p className="mt-2 text-xl font-black text-rose-700 dark:text-rose-300">
            {totals.warning}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }, (_, index) => (
            <article
              key={index}
              className="h-52 animate-pulse rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a]"
            />
          ))}

        {!loading && visibleDebts.length === 0 && (
          <div className="col-span-full grid min-h-64 place-items-center rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] text-sm font-bold text-slate-500 dark:text-slate-400">
            Không có công nợ
          </div>
        )}

        {!loading &&
          visibleDebts.map((debt) => (
            <article
              key={debt.roomId}
              className={`rounded-lg border bg-white dark:bg-[#0f172a] p-4 ${
                debt.isWarning
                  ? "border-rose-300 shadow-[0_0_0_1px_rgba(225,29,72,0.12)]"
                  : "border-[#e2e8f0] dark:border-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                    <Building2 className="h-4 w-4" />
                    {debt.propertyName || "Chưa có cơ sở"}
                  </p>
                  <h2 className="mt-2 text-xl font-black">
                    {debt.roomName || "Chưa gán phòng"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {debt.tenantName || "Chưa cập nhật khách thuê"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${
                    debt.isWarning
                      ? "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {debtTypeLabel(debt.debtType)}
                </span>
              </div>

              <div className="mt-5 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-500 dark:text-slate-400">
                    Tiền phòng
                  </p>
                  <p className="font-black">
                    {formatMoney(debt.rentDebtAmount)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-slate-500 dark:text-slate-400">
                    Điện nước
                  </p>
                  <p className="font-black">
                    {formatMoney(debt.utilityDebtAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#e2e8f0] dark:border-white/10 pt-4">
                <p className="flex items-center gap-2 text-sm font-black">
                  <Banknote className="h-4 w-4 text-[#3156b6]" />
                  {formatMoney(debt.totalDebt)}
                </p>
                <p
                  className={`text-sm font-black ${debt.isWarning ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {debt.monthsOverdue}
                  {debt.isWarning ? "+" : ""} tháng
                </p>
              </div>
            </article>
          ))}
      </section>
    </div>
  );
}
