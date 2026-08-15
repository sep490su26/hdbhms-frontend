"use client";

import {
  AlertTriangle,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  Loader2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  buildHandoverDocumentFilename,
  downloadHandoverDraftPdf,
  downloadHandoverSignedPdf,
  fetchContractHandover,
  fetchHandoverSignedPdfBlob,
  uploadHandoverSignedDocument,
} from "@/services/contractHandoverService";

import { getHandoverDocumentState } from "./contractHandoverDocumentState";

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

function unwrapHandoverResponse(response) {
  return response?.data || response || null;
}

function isPdfFile(file) {
  return Boolean(
    file &&
      (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")),
  );
}

export default function HandoverDocumentCard({
  contract,
  refreshKey = 0,
  onUpdated,
}) {
  const inputRef = useRef(null);
  const contractId = contract?.leaseContractId || contract?.contractId;
  const [handover, setHandover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");

  const loadHandover = useCallback(async () => {
    if (!contractId) {
      setHandover(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetchContractHandover(contractId, "MOVE_IN");
      setHandover(unwrapHandoverResponse(response));
    } catch (error) {
      setHandover(null);
      if (error?.status !== 404) {
        toast.error(error?.message || "Không tải được biên bản bàn giao.");
      }
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    const timer = window.setTimeout(loadHandover, 0);
    return () => window.clearTimeout(timer);
  }, [loadHandover, refreshKey]);

  const documentState = getHandoverDocumentState(handover);
  const filename = buildHandoverDocumentFilename({
    ...contract,
    handoverDate: handover?.handoverDate ?? handover?.handover_date,
  });
  const busy = action !== "";

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDownloadDraft() {
    if (!documentState.hasHandoverData) return;
    try {
      setAction("draft");
      await downloadHandoverDraftPdf(contractId, "MOVE_IN", filename);
    } catch (error) {
      toast.error(error?.message || "Không tải được bản in bàn giao.");
    } finally {
      setAction("");
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isPdfFile(file)) {
      toast.error("Chỉ chấp nhận file PDF.");
      resetInput();
      return;
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      toast.error("File PDF vượt quá giới hạn 15 MB.");
      resetInput();
      return;
    }

    try {
      setAction("upload");
      await uploadHandoverSignedDocument(contractId, file, "MOVE_IN");
      await loadHandover();
      await onUpdated?.();
      toast.success("Đã lưu biên bản bàn giao có chữ ký.");
    } catch (error) {
      toast.error(error?.message || "Không upload được biên bản bàn giao.");
    } finally {
      setAction("");
      resetInput();
    }
  }

  async function handlePreview() {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.error("Trình duyệt đang chặn cửa sổ xem trước.");
      return;
    }

    try {
      setAction("preview");
      const blob = await fetchHandoverSignedPdfBlob(contractId, "MOVE_IN");
      const url = URL.createObjectURL(blob);
      previewWindow.opener = null;
      previewWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow.close();
      toast.error(error?.message || "Không xem được biên bản bàn giao.");
    } finally {
      setAction("");
    }
  }

  async function handleDownloadSigned() {
    try {
      setAction("download");
      await downloadHandoverSignedPdf(contractId, "MOVE_IN", filename);
    } catch (error) {
      toast.error(error?.message || "Không tải được biên bản bàn giao đã ký.");
    } finally {
      setAction("");
    }
  }

  const statusClasses =
    documentState.key === "COMPLETE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
      : documentState.key === "PENDING_SIGNED_FILE"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";

  return (
    <section className="rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-4 dark:border-white/10 dark:bg-white/5 lg:col-span-2 xl:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white xl:text-xl">
            <ClipboardCheck className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            Biên bản bàn giao
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 xl:text-sm">
            Bản PDF đã ký là tài liệu bổ sung, không ảnh hưởng trạng thái hợp đồng
            hoặc tài khoản người thuê.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold ${statusClasses}`}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : documentState.key === "COMPLETE" ? (
            <FileCheck2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {loading ? "Đang kiểm tra" : documentState.label}
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]">
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">
          {documentState.key === "COMPLETE"
            ? "Biên bản có chữ ký đã được lưu"
            : documentState.key === "PENDING_SIGNED_FILE"
              ? "Dữ liệu bàn giao đã chốt, có thể bổ sung bản scan bất cứ lúc nào."
              : "Hoàn tất dữ liệu bàn giao trước khi tạo và tải lên bản ký."}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Chấp nhận PDF tối đa 15 MB. Tải lại sẽ thay thế bản đang lưu.
        </p>

        <div
          className={`mt-4 grid gap-2 ${
            documentState.key === "COMPLETE" ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {documentState.key !== "COMPLETE" && (
            <button
              type="button"
              onClick={handleDownloadDraft}
              disabled={busy || loading || !documentState.hasHandoverData}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-extrabold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              {action === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Tải bản in
            </button>
          )}

          {documentState.key === "COMPLETE" && (
            <>
              <button
                type="button"
                onClick={handlePreview}
                disabled={busy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold text-slate-900 transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
              >
                {action === "preview" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Xem
              </button>
              <button
                type="button"
                onClick={handleDownloadSigned}
                disabled={busy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold text-slate-900 transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
              >
                {action === "download" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Tải
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || loading || !documentState.hasHandoverData}
            className={
              documentState.key === "COMPLETE"
                ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold text-slate-900 transition hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                : "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
            }
          >
            {action === "upload" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {documentState.key === "COMPLETE" ? "Thay" : "Upload bản đã ký"}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleUpload}
      />
    </section>
  );
}
