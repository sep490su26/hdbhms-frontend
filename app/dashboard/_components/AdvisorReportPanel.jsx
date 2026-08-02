"use client";

import { useState } from "react";
import { Download, FileText, Loader2, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  currentAdvisorPeriod,
  downloadAdvisorReportDocx,
  fetchAdvisorReport,
  refreshAdvisorReport,
} from "@/services/advisorService";
import { MarkdownContent } from "./MarkdownContent";
import { MonthYearField } from "./MonthYearField";

const REPORT_CACHE_KEY = "advisor:report-cache:v2";

function readCachedReports() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(REPORT_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCachedReports(reports) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REPORT_CACHE_KEY, JSON.stringify(reports));
}

function formatVietnamesePeriod(value) {
  const [year, month] = String(value || "").split("-");
  if (!year || !month) return "Chưa chọn kỳ báo cáo";
  return `Tháng ${Number(month)} năm ${year}`;
}

export function AdvisorReportPanel({ period = currentAdvisorPeriod() }) {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [reports, setReports] = useState(() => readCachedReports());
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDownloading, setDownloading] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const report = reports[selectedPeriod];
  const periodLabel = formatVietnamesePeriod(selectedPeriod);

  const updatePeriod = (value) => {
    setSelectedPeriod(value);
    setError("");
  };

  const saveReport = (reportPeriod, nextReport) => {
    setReports((currentReports) => {
      const nextReports = { ...currentReports, [reportPeriod]: nextReport };
      saveCachedReports(nextReports);
      return nextReports;
    });
  };

  const loadReport = async ({ refresh = false } = {}) => {
    if (isLoading || !selectedPeriod) return;

    const reportPeriod = selectedPeriod;
    setLoading(true);
    setError("");
    try {
      const data = refresh ? await refreshAdvisorReport(reportPeriod) : await fetchAdvisorReport(reportPeriod);
      saveReport(reportPeriod, data);
    } catch (loadError) {
      setError(loadError?.message || "Không tạo được báo cáo AI.");
    } finally {
      setLoading(false);
    }
  };

  const openReportDialog = () => {
    setDialogOpen(true);
    loadReport();
  };

  const downloadReport = async () => {
    if (isDownloading) return;
    setDownloading(true);
    setError("");
    try {
      const { blob, filename } = await downloadAdvisorReportDocx(selectedPeriod);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError?.message || "Không tải được báo cáo AI.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openReportDialog}
          disabled={isLoading || !selectedPeriod}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#080f1f] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#17233a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Mở báo cáo
        </button>
      </div>

      <DialogContent
        lockScroll={false}
        showCloseButton={false}
        overlayProps={{
          "aria-hidden": true,
          onClick: () => setDialogOpen(false),
          onTouchMove: (event) => event.preventDefault(),
          onWheel: (event) => event.preventDefault(),
        }}
        className="flex max-h-[86vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <div className="flex flex-col gap-3 border-b border-[#dce2ec] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <DialogHeader className="min-w-0 gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3156b6]" />
              <DialogTitle className="text-base font-black text-[#0f1d33]">
                Báo cáo AI quản trị tài chính
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs font-semibold text-[#64748b]">
              {periodLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <MonthYearField value={selectedPeriod} onChange={updatePeriod} label="Tháng/năm" />
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dce2ec] text-[#475569] hover:bg-[#f8fafc]"
                aria-label="Đóng báo cáo"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] p-5">
          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-sm font-bold text-[#475569]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tạo báo cáo...
            </div>
          ) : report?.report ? (
            <MarkdownContent content={report.report} className="text-sm leading-6 text-[#1f2937]" />
          ) : (
            <p className="text-sm font-semibold leading-6 text-[#64748b]">
              Chưa có báo cáo cho {periodLabel}. Bấm tạo báo cáo để AI phân tích KPI, công nợ, chi phí và đề xuất hành động.
            </p>
          )}
        </div>

        <DialogFooter className="flex-row flex-wrap justify-end border-t border-[#dce2ec] px-5 py-4">
          <button
            type="button"
            onClick={() => loadReport({ refresh: true })}
            disabled={isLoading || !selectedPeriod}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#0f1d33] hover:bg-[#f8fafc] disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {report?.report ? "Tạo lại báo cáo" : "Tạo báo cáo"}
          </button>
          <button
            type="button"
            onClick={downloadReport}
            disabled={isDownloading}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#080f1f] px-3 text-xs font-bold text-white hover:bg-[#17233a] disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Word
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
