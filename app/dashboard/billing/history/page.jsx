"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { fetchManagementRoomCatalog } from "@/services/managementRoomsService";
import {
  downloadTransactionHistoryExport,
  fetchTransactionHistory,
} from "@/services/transactionService";

const money = new Intl.NumberFormat("vi-VN");

function currentExportPeriod() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0");
  return {
    periodType: "MONTH",
    billingPeriod: `${year}-${month}`,
    year,
    issueFromDate: `${year}-${month}-01`,
    issueToDate: `${year}-${month}-${lastDay}`,
  };
}

const TYPE_LABELS = {
  DEPOSIT: "Cọc",
  RENT: "Tiền phòng",
  UTILITY: "Điện nước",
  FINAL_SETTLEMENT: "Tất toán",
  COMPENSATION: "Bồi thường",
  OPERATING_REIMBURSEMENT: "Hoàn chi",
  TRANSFER_DIFFERENCE: "Chuyển phòng",
  OTHER: "Khác",
};

const STATUS_LABELS = {
  PENDING_RECONCILE: "Chờ đối soát",
  MATCHED: "Đã ghi nhận",
  PARTIALLY_ALLOCATED: "Phân bổ một phần",
  ALLOCATED: "Đã phân bổ",
  DUPLICATE: "Trùng giao dịch",
  REJECTED: "Từ chối",
  REFUNDED: "Đã hoàn",
};

function emptyFilters() {
  return { roomId: "", tenantName: "", fromDate: "", toDate: "" };
}

function hasFilters(filters) {
  return Boolean(filters.roomId || filters.tenantName?.trim() || filters.fromDate || filters.toDate);
}

function formatMoney(value) {
  return `${money.format(Number(value || 0))} đ`;
}

function formatDateTime(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function typeLabel(value) {
  return TYPE_LABELS[value] || value || "Khác";
}

function statusLabel(value) {
  return STATUS_LABELS[value] || value || "Chưa rõ";
}

export default function TransactionHistoryPage() {
  const [rooms, setRooms] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [query, setQuery] = useState(emptyFilters);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [exportPeriod, setExportPeriod] = useState(currentExportPeriod);
  const [error, setError] = useState("");

  const activeFilters = useMemo(() => hasFilters(query), [query]);
  const emptyMessage = activeFilters ? "Không tìm thấy giao dịch phù hợp" : "Chưa có lịch sử thanh toán";

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchTransactionHistory({ ...query, page, size });
      setTransactions(result.items);
      setTotalElements(result.totalElements);
      setTotalPages(result.totalPages);
    } catch (loadError) {
      setError(loadError?.message || "Không tải được lịch sử thanh toán.");
    } finally {
      setLoading(false);
    }
  }, [page, query, size]);

  useEffect(() => {
    fetchManagementRoomCatalog()
      .then(setRooms)
      .catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadTransactions, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadTransactions]);

  function submitFilters(event) {
    event.preventDefault();
    setPage(1);
    setQuery(filters);
  }

  function resetFilters() {
    const nextFilters = emptyFilters();
    setFilters(nextFilters);
    setQuery(nextFilters);
    setPage(1);
  }

  async function exportFile(format) {
    if (
      exportPeriod.periodType === "MONTH" &&
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(exportPeriod.billingPeriod)
    ) {
      setError("Vui lòng chọn tháng hóa đơn hợp lệ");
      return;
    }
    const exportYear = Number(exportPeriod.year);
    if (
      exportPeriod.periodType === "YEAR" &&
      (!Number.isInteger(exportYear) || exportYear < 1900 || exportYear > 2100)
    ) {
      setError("Vui lòng nhập năm hóa đơn hợp lệ");
      return;
    }
    const validIssueFromDate = /^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(exportPeriod.issueFromDate);
    const validIssueToDate = /^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(exportPeriod.issueToDate);
    if (
      exportPeriod.periodType === "DATE_RANGE" &&
      (!validIssueFromDate || !validIssueToDate || exportPeriod.issueFromDate > exportPeriod.issueToDate)
    ) {
      setError("Khoảng ngày phát hành hóa đơn không hợp lệ");
      return;
    }
    setExporting(format);
    setError("");
    try {
      await downloadTransactionHistoryExport({ ...query, ...exportPeriod }, format);
    } catch (exportError) {
      setError(exportError?.message || "Xuất file thất bại, vui lòng thử lại");
    } finally {
      setExporting("");
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#3156b6]"
          >
            <ArrowLeft className="h-4 w-4" />
            Hóa đơn & Thu tiền
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Lịch sử thanh toán</h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
            Phạm vi xuất
            <select
              value={exportPeriod.periodType}
              onChange={(event) => setExportPeriod((current) => ({
                ...current,
                periodType: event.target.value,
              }))}
              className="h-10 min-w-36 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100"
            >
              <option value="MONTH">Theo tháng</option>
              <option value="YEAR">Theo năm</option>
              <option value="DATE_RANGE">Theo khoảng ngày</option>
              <option value="ALL">Tất cả</option>
            </select>
          </label>
          {exportPeriod.periodType === "MONTH" && (
            <label className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              Tháng hóa đơn
              <input
                type="month"
                value={exportPeriod.billingPeriod}
                onChange={(event) => setExportPeriod((current) => ({
                  ...current,
                  billingPeriod: event.target.value,
                }))}
                className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100"
              />
            </label>
          )}
          {exportPeriod.periodType === "YEAR" && (
            <label className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              Năm hóa đơn
              <input
                type="number"
                min="1900"
                max="2100"
                value={exportPeriod.year}
                onChange={(event) => setExportPeriod((current) => ({
                  ...current,
                  year: event.target.value,
                }))}
                className="h-10 w-28 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100"
              />
            </label>
          )}
          {exportPeriod.periodType === "DATE_RANGE" && (
            <>
              <label className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                Phát hành từ ngày
                <input
                  type="date"
                  value={exportPeriod.issueFromDate}
                  onChange={(event) => setExportPeriod((current) => ({
                    ...current,
                    issueFromDate: event.target.value,
                  }))}
                  className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                Đến ngày phát hành
                <input
                  type="date"
                  value={exportPeriod.issueToDate}
                  min={exportPeriod.issueFromDate}
                  onChange={(event) => setExportPeriod((current) => ({
                    ...current,
                    issueToDate: event.target.value,
                  }))}
                  className="h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={() => exportFile("excel")}
            disabled={Boolean(exporting)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {exporting === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Xuất Excel
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </section>
      )}

      <form onSubmit={submitFilters} className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-bold">
            Phòng
            <select
              value={filters.roomId}
              onChange={(event) => setFilters((current) => ({ ...current, roomId: event.target.value }))}
              className="h-10 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-3"
            >
              <option value="">Tất cả phòng</option>
              {rooms.map((room) => (
                <option key={room.id || room.roomId} value={room.id || room.roomId}>
                  {room.propertyName ? `${room.propertyName} - ` : ""}{room.roomCode || room.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Khách thuê
            <input
              value={filters.tenantName}
              onChange={(event) => setFilters((current) => ({ ...current, tenantName: event.target.value }))}
              className="h-10 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Giao dịch từ ngày
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))}
              className="h-10 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Giao dịch đến ngày
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))}
              className="h-10 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-3"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white"
          >
            <Search className="h-4 w-4" />
            Lọc giao dịch
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-4 text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            <RotateCcw className="h-4 w-4" />
            Xóa lọc
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a]">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f2f4f6] dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Mã GD</th>
                  <th className="px-4 py-3">Ngày</th>
                  <th className="px-4 py-3">Phòng</th>
                  <th className="px-4 py-3">Khách thuê</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t border-[#e2e8f0] dark:border-white/10">
                    <td className="px-4 py-3">
                      <p className="font-black">{transaction.transactionCode}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{transaction.invoiceCode}</p>
                    </td>
                    <td className="px-4 py-3">{formatDateTime(transaction.transactionTime)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {transaction.roomCode || "Chưa gán"}
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{transaction.propertyName}</p>
                    </td>
                    <td className="px-4 py-3">{transaction.tenantName || transaction.payerName || "Chưa cập nhật"}</td>
                    <td className="px-4 py-3 text-right font-black">{formatMoney(transaction.amount)}</td>
                    <td className="px-4 py-3">{typeLabel(transaction.paymentType || transaction.invoiceType)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                        {statusLabel(transaction.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DashboardPagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          itemLabel="giao dịch"
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
        />
      </section>
    </div>
  );
}
