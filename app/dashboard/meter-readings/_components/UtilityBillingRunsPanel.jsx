"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, ReceiptText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  createUtilityBillingRun,
  fetchUtilityBillingRun,
  fetchUtilityBillingRuns,
  publishUtilityBillingRun,
} from "@/services/billingService";

const money = new Intl.NumberFormat("vi-VN");
const PUBLISHED_STATUS = "INVOICES_CREATED";

const BILLING_BATCH_STATUS_LABELS = {
  DRAFT: "Nháp",
  PREVIEWED: "Đang review",
  CONFIRMED: "Đã duyệt",
  INVOICES_CREATED: "Đã phát hành",
  CANCELLED: "Đã hủy",
};

const BILLING_BATCH_ITEM_STATUS_LABELS = {
  READY: "Sẵn sàng",
  WARNING: "Cần kiểm tra",
  SKIPPED: "Bỏ qua",
  INVOICED: "Đã phát hành",
};

function normalizeBillingPeriod(value) {
  const text = String(value || "").trim();
  const billingPeriodMatch = /^(\d{4})-(\d{1,2})$/.exec(text);
  if (billingPeriodMatch) {
    return `${billingPeriodMatch[1]}-${billingPeriodMatch[2].padStart(2, "0")}`;
  }

  const meterPeriodMatch = /^(\d{1,2})-(\d{4})$/.exec(text);
  if (meterPeriodMatch) {
    return `${meterPeriodMatch[2]}-${meterPeriodMatch[1].padStart(2, "0")}`;
  }

  return "";
}

function formatBillingPeriod(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  return match ? `${match[2]}/${match[1]}` : value || "-";
}

function displayRoomCode(value) {
  const code = String(value || "").trim();
  if (!code) return "Chưa gán";
  if (/^p\d+$/i.test(code)) return `P${code.slice(1)}`;
  return /^\d+$/.test(code) ? `P${code}` : code;
}

function formatMoney(value) {
  return `${money.format(Number(value || 0))} VNĐ`;
}

function billingBatchStatusLabel(value) {
  return BILLING_BATCH_STATUS_LABELS[value] || value || "Chưa rõ";
}

function billingBatchItemStatusLabel(value) {
  return BILLING_BATCH_ITEM_STATUS_LABELS[value] || value || "Chưa rõ";
}

function billingBatchStatusClasses(status) {
  if (status === PUBLISHED_STATUS) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  }
  if (status === "PREVIEWED" || status === "CONFIRMED") {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20";
  }
  if (status === "CANCELLED") {
    return "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
}

function billingBatchItemStatusClasses(status) {
  if (status === "READY") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  }
  if (status === "WARNING") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
  }
  if (status === "INVOICED") {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20";
  }
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10";
}

export function UtilityBillingRunsPanel({ propertyId, defaultPeriod }) {
  const billingPeriod = normalizeBillingPeriod(defaultPeriod);
  const [billingRun, setBillingRun] = useState(null);
  const [billingRunDetail, setBillingRunDetail] = useState(null);
  const [loadingRun, setLoadingRun] = useState(false);
  const [saving, setSaving] = useState("");

  const activeRun = billingRunDetail || billingRun;
  const runItems = activeRun?.items || [];
  const warningRunItems = runItems.filter((item) => item.status === "WARNING");
  const publishBlocked =
    !activeRun?.runId ||
    activeRun.status === PUBLISHED_STATUS ||
    Number(activeRun.warningCount || 0) > 0;

  const loadBillingRun = useCallback(async () => {
    if (!propertyId || !billingPeriod) {
      setBillingRun(null);
      setBillingRunDetail(null);
      return;
    }

    setLoadingRun(true);
    try {
      const runs = await fetchUtilityBillingRuns({ billingPeriod, propertyId });
      const nextRun =
        runs.find((run) => run.status && run.status !== PUBLISHED_STATUS) ||
        runs[0] ||
        null;

      setBillingRun(nextRun);
      setBillingRunDetail(null);

      if (nextRun?.runId && nextRun.status !== PUBLISHED_STATUS) {
        const detail = await fetchUtilityBillingRun(nextRun.runId);
        setBillingRunDetail(detail);
      }
    } catch (error) {
      toast.error(error?.message || "Không tải được bản nháp hóa đơn điện nước.");
    } finally {
      setLoadingRun(false);
    }
  }, [billingPeriod, propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(loadBillingRun, 0);
    return () => window.clearTimeout(timer);
  }, [loadBillingRun]);

  async function generateBillingBatch() {
    if (!propertyId) {
      toast.error("Vui lòng chọn cơ sở trước khi tạo bản nháp hóa đơn điện nước.");
      return;
    }
    if (!billingPeriod) {
      toast.error("Không xác định được kỳ ghi chỉ số để tạo hóa đơn điện nước.");
      return;
    }

    setSaving("generate-batch");
    try {
      const run = await createUtilityBillingRun({ propertyId, billingPeriod });
      toast.success("Đã tạo bản nháp hóa đơn điện nước để quản lý review.");
      setBillingRun(run);
      setBillingRunDetail(run);
    } catch (error) {
      toast.error(error?.message || "Không tạo được bản nháp hóa đơn điện nước.");
    } finally {
      setSaving("");
    }
  }

  async function publishBillingBatch() {
    if (!activeRun?.runId) return;

    setSaving(`publish-batch-${activeRun.runId}`);
    try {
      const run = await publishUtilityBillingRun(activeRun.runId);
      toast.success("Đã phát hành hóa đơn điện nước và gửi thông báo cho khách thuê.");
      setBillingRun(run);
      setBillingRunDetail(run);
    } catch (error) {
      toast.error(error?.message || "Không phát hành được hóa đơn điện nước.");
    } finally {
      setSaving("");
    }
  }

  if (!billingPeriod) return null;
  if (!loadingRun && activeRun?.status === PUBLISHED_STATUS) return null;

  return (
    <section className="rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex flex-col gap-3 border-b border-[#e2e8f0] px-4 py-3 dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            <ReceiptText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Gửi hóa đơn điện nước
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Kỳ ghi chỉ số đã chốt. Kiểm tra bản nháp rồi phát hành hóa đơn cho khách thuê.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="inline-flex h-10 items-center justify-center rounded-lg border border-[#cbd5e1] px-3 text-sm font-black text-slate-700 dark:border-white/10 dark:text-slate-200">
            Kỳ {formatBillingPeriod(billingPeriod)}
          </span>
          <button
            type="button"
            onClick={loadBillingRun}
            disabled={!propertyId || loadingRun}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRun ? "animate-spin" : ""}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={generateBillingBatch}
            disabled={!propertyId || saving === "generate-batch"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {saving === "generate-batch" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {activeRun ? "Tạo lại bản nháp" : "Tạo bản nháp"}
          </button>
        </div>
      </div>

      <div className="p-4">
        {!propertyId ? (
          <div className="rounded-lg border border-dashed border-[#cbd5e1] p-6 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
            Vui lòng chọn cơ sở để phát hành hóa đơn điện nước.
          </div>
        ) : loadingRun ? (
          <div className="rounded-lg border border-dashed border-[#cbd5e1] p-6 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Đang tải bản nháp hóa đơn điện nước...
          </div>
        ) : !activeRun ? (
          <div className="rounded-lg border border-dashed border-[#cbd5e1] p-6 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
            Chưa có bản nháp hóa đơn điện nước cho kỳ này.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Bản nháp kỳ {formatBillingPeriod(activeRun.billingPeriod)} - {activeRun.propertyName || "Cơ sở"}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${billingBatchStatusClasses(activeRun.status)}`}
                  >
                    {billingBatchStatusLabel(activeRun.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {activeRun.totalRooms} phòng, tổng dự kiến {formatMoney(activeRun.totalAmount)}.
                </p>
              </div>
              <button
                type="button"
                onClick={publishBillingBatch}
                disabled={publishBlocked || saving === `publish-batch-${activeRun.runId}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving === `publish-batch-${activeRun.runId}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Phát hành hóa đơn
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sẵn sàng</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{activeRun.readyCount}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-500/10">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Cần kiểm tra</p>
                <p className="mt-1 text-xl font-black text-amber-800 dark:text-amber-200">{activeRun.warningCount}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-white/5">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Bỏ qua</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{activeRun.skippedCount}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-500/10">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Đã phát hành</p>
                <p className="mt-1 text-xl font-black text-emerald-800 dark:text-emerald-200">{activeRun.generatedInvoiceCount}</p>
              </div>
            </div>

            {warningRunItems.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                Còn {warningRunItems.length} phòng cần kiểm tra. Hãy sửa chỉ số hoặc tạo lại bản nháp trước khi phát hành.
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] dark:border-white/10">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-[#f2f4f6] text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Phòng</th>
                    <th className="px-4 py-3 text-right">Điện</th>
                    <th className="px-4 py-3 text-right">Nước</th>
                    <th className="px-4 py-3 text-right">Dịch vụ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {runItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Chưa có phòng trong bản nháp.
                      </td>
                    </tr>
                  ) : (
                    runItems.map((item) => (
                      <tr key={item.itemId} className="border-t border-[#e2e8f0] dark:border-white/10">
                        <td className="px-4 py-3">
                          <p className="font-black">{displayRoomCode(item.roomCode)}</p>
                          {item.warningMessage ? (
                            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                              {item.warningMessage}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold">{item.electricityUsage}</p>
                          <p className="text-xs text-slate-500">{formatMoney(item.electricityAmount)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold">{item.waterUsage}</p>
                          <p className="text-xs text-slate-500">{formatMoney(item.waterAmount)}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.serviceFeeAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${billingBatchItemStatusClasses(item.status)}`}>
                            {billingBatchItemStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black">{formatMoney(item.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
