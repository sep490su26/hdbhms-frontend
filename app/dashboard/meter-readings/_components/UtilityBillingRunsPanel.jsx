"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createUtilityBillingRun,
  fetchUtilityBillingRun,
  fetchUtilityBillingRuns,
  publishUtilityBillingRun,
} from "@/services/billingService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { enumLabel } from "@/lib/enumLabels";

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
  return enumLabel(value, BILLING_BATCH_STATUS_LABELS, "Chưa rõ");
}

function billingBatchItemStatusLabel(value) {
  return enumLabel(value, BILLING_BATCH_ITEM_STATUS_LABELS, "Chưa rõ");
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

export function UtilityBillingRunsPanel({
  propertyId,
  defaultPeriod,
  refreshToken = 0,
  openToken = 0,
  showTrigger = true,
  onPublished,
}) {
  const billingPeriod = normalizeBillingPeriod(defaultPeriod);
  const [billingRun, setBillingRun] = useState(null);
  const [billingRunDetail, setBillingRunDetail] = useState(null);
  const [loadingRun, setLoadingRun] = useState(false);
  const [saving, setSaving] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closedOpenToken, setClosedOpenToken] = useState(0);

  const activeRun = billingRunDetail || billingRun;
  const runItems = activeRun?.items || [];
  const warningRunItems = runItems.filter((item) => item.status === "WARNING" || item.warningMessage);
  const publishBlocked =
    !activeRun?.runId ||
    activeRun.status === PUBLISHED_STATUS ||
    Number(activeRun.warningCount || 0) > 0 ||
    warningRunItems.length > 0;

  const loadBillingRun = useCallback(async () => {
    if (!propertyId || !billingPeriod) {
      setBillingRun(null);
      setBillingRunDetail(null);
      return;
    }

    setLoadingRun(true);
    try {
      const runs = await fetchUtilityBillingRuns({ billingPeriod, propertyId, invoiceReason: "MONTHLY" });
      const nextRun = runs.find((run) => run.status === PUBLISHED_STATUS) || runs[0] || null;

      setBillingRun(nextRun);
      setBillingRunDetail(null);

      if (nextRun?.runId) {
        const detail = await fetchUtilityBillingRun(nextRun.runId);
        setBillingRunDetail(detail);
      }
    } catch (error) {
      toast.error(error?.message || "Không tải được bản nháp hóa đơn điện.");
    } finally {
      setLoadingRun(false);
    }
  }, [billingPeriod, propertyId]);

  useEffect(() => {
    const timer = window.setTimeout(loadBillingRun, 0);
    return () => window.clearTimeout(timer);
  }, [loadBillingRun, refreshToken]);

  async function generateBillingBatch() {
    if (!propertyId) {
      toast.error("Vui lòng chọn cơ sở trước khi tạo bản nháp hóa đơn điện.");
      return;
    }
    if (!billingPeriod) {
      toast.error("Không xác định được kỳ ghi chỉ số để tạo hóa đơn điện.");
      return;
    }

    setSaving("generate-batch");
    try {
      const run = await createUtilityBillingRun({ propertyId, billingPeriod });
      toast.success("Đã tạo bản nháp hóa đơn điện để quản lý review.");
      setBillingRun(run);
      setBillingRunDetail(run);
      setDialogOpen(true);
    } catch (error) {
      toast.error(error?.message || "Không tạo được bản nháp hóa đơn điện.");
    } finally {
      setSaving("");
    }
  }

  async function publishBillingBatch() {
    if (!activeRun?.runId) return;

    setSaving(`publish-batch-${activeRun.runId}`);
    try {
      const run = await publishUtilityBillingRun(activeRun.runId);
      toast.success("Đã xuất hóa đơn điện và gửi thông báo cho khách thuê.");
      setBillingRun(run);
      setBillingRunDetail(run);
      await onPublished?.(run);
    } catch (error) {
      toast.error(error?.message || "Không phát hành được hóa đơn điện.");
    } finally {
      setSaving("");
    }
  }

  if (!billingPeriod) return null;
  const isPublished = activeRun?.status === PUBLISHED_STATUS;

  return (
    <>
      {showTrigger ? (
        <section className="rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Gửi hóa đơn điện</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Xem lại dữ liệu hóa đơn cho kỳ {formatBillingPeriod(billingPeriod)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={!propertyId || !activeRun}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mở khu vực gửi hóa đơn
            </button>
          </div>
        </section>
      ) : null}

      <Dialog
        open={(dialogOpen || openToken > closedOpenToken) && Boolean(activeRun)}
        onOpenChange={(nextOpen) => {
          if (saving) return;
          setDialogOpen(nextOpen);
          if (!nextOpen) setClosedOpenToken(openToken);
        }}
      >
      {activeRun ? (
        <DialogContent
          lockScroll={false}
          className="grid min-h-0 w-[calc(100%-2rem)] max-h-[min(92vh,900px)] max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0 sm:max-w-6xl"
        >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-lg font-black">
            {isPublished ? "Hóa đơn đã phát hành" : "Bản nháp hóa đơn"} kỳ {formatBillingPeriod(activeRun.billingPeriod)}
          </DialogTitle>
          <DialogDescription>
            {activeRun.totalRooms} phòng, tổng dự kiến {formatMoney(activeRun.totalAmount)}.
          </DialogDescription>
        </DialogHeader>

        <section className="flex min-h-0 flex-1 flex-col border-t border-[#e2e8f0] dark:border-white/10">
          <div className="flex flex-col gap-3 border-b border-[#e2e8f0] px-6 py-4 dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-black ${billingBatchStatusClasses(activeRun.status)}`}>
              {billingBatchStatusLabel(activeRun.status)}
            </span>
            {activeRun && !isPublished ? (
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
                Xuất hóa đơn
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4">
            {isPublished ? (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Hóa đơn kỳ này đã phát hành. Chỉ được xem lại dữ liệu, không thể tạo bản nháp hoặc phát hành lại.
              </div>
            ) : null}
            {!isPublished && warningRunItems.length > 0 ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                Còn {warningRunItems.length} phòng cần kiểm tra. Hãy xử lý các cảnh báo trước khi phát hành.
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] dark:border-white/10">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f2f4f6] text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-center">Phòng</th>
                    <th className="px-4 py-3 text-center">Điện</th>
                    <th className="px-4 py-3 text-center">Dịch vụ</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {runItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Chưa có phòng trong bản nháp.
                      </td>
                    </tr>
                  ) : (
                    runItems.map((item) => {
                      const itemStatus = item.warningMessage ? "WARNING" : item.status;
                      return (
                      <tr key={item.itemId} className="border-t border-[#e2e8f0] dark:border-white/10">
                        <td className="px-4 py-3 text-center">
                          <p className="font-black">{displayRoomCode(item.roomCode)}</p>
                          {item.warningMessage ? (
                            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                              {item.warningMessage}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="font-bold">{item.electricityUsage}</p>
                          <p className="text-xs text-slate-500">{formatMoney(item.electricityAmount)}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{formatMoney(item.serviceFeeAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${billingBatchItemStatusClasses(itemStatus)}`}>
                            {billingBatchItemStatusLabel(itemStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-black text-center">{formatMoney(item.totalAmount)}</td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        </DialogContent>
      ) : null}
      </Dialog>
    </>
  );
}
