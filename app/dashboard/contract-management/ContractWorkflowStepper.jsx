import {useEffect, useRef, useState} from "react";
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ClipboardEdit,
    Download,
    FileText,
    Info,
    Loader2,
    Upload,
    Zap,
} from "lucide-react";
import {toast} from "sonner";

import {
    buildHandoverDocumentFilename,
    downloadHandoverDraftPdf,
    fetchContractHandover,
    uploadHandoverSignedDocument,
} from "@/services/contractHandoverService";
import {
    buildLeaseContractDocumentFilename,
    downloadLeaseContractDraftPdf,
    uploadSignedLeaseContractFile,
} from "@/services/leaseContractsService";

import {
    getContractActivationReadiness,
    isLeaseSignedUploadDisabled,
} from "./contractWorkflowState";

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

const ACTION = {
    DOWNLOAD_LEASE: "download-lease",
    UPLOAD_LEASE: "upload-lease",
    DOWNLOAD_HANDOVER: "download-handover",
    UPLOAD_HANDOVER: "upload-handover",
};

function unwrapHandoverResponse(response) {
    return response?.data || response || null;
}

function hasHandoverReadings(handover) {
    return Boolean(handover?.electricity);
}

function getSignedHandoverDocumentId(handover) {
    return handover?.signedDocumentId ?? handover?.signed_document_id ?? null;
}

function getReadingValue(reading) {
    return reading?.currentValue ?? reading?.current_value ?? null;
}

function isPdfFile(file) {
    return Boolean(
        file &&
        (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")),
    );
}

function StatusPill({complete = false, children, warning = false}) {
    const style = complete
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
        : warning
            ? "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
            : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400";

    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold ${style}`}
        >
      {children}
    </span>
    );
}

function PanelHeader({kicker, title, description, count}) {
    return (
        <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
            <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-blue-700 dark:text-blue-300">
                    {kicker}
                </p>
                <h3 className="mt-1 text-base font-extrabold tracking-[-0.015em] text-slate-950 dark:text-white sm:text-lg">
                    {title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>
            {count != null && (
                <span
                    className="grid h-7 min-w-8 shrink-0 place-items-center rounded-lg border border-slate-200 px-2 text-[11px] font-extrabold text-slate-500 dark:border-white/10 dark:text-slate-400">
          {count}
        </span>
            )}
        </div>
    );
}

function DocumentRow({
                         title,
                         meta,
                         complete = true,
                         children,
                         statusLabel
                     }) {
    return (
        <div
            className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-slate-200 px-4 py-3 dark:border-white/10 sm:grid-cols-[38px_minmax(0,1fr)_auto_auto] sm:px-5">
            <div
                className="grid h-9.5 w-9.5 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-blue-300">
                <FileText className="h-[18px] w-[18px]"/>
            </div>
            <div className="min-w-0">
                <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                    {title}
                </p>
                <p className="mt-0.5 truncate text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    {meta}
                </p>
            </div>
            <div className="col-start-2 sm:col-start-auto">
                {statusLabel !== null && (
                    <StatusPill complete={complete} warning={!complete}>
                        {statusLabel}
                    </StatusPill>
                )}
            </div>
            <div className="col-start-2 flex flex-wrap gap-2 sm:col-start-auto sm:justify-end">
                {children}
            </div>
        </div>
    );
}

function UploadRow({
                       title,
                       description,
                       complete,
                       optional = false,
                       fileName,
                       loading,
                       disabled,
                       onClick,
                   }) {
    return (
        <div
            className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-slate-200 px-4 py-3 dark:border-white/10 sm:grid-cols-[38px_minmax(0,1fr)_auto] sm:px-5">
            <div
                className="grid h-9.5 w-9.5 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                <Upload className="h-[18px] w-[18px]"/>
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                        {title}
                    </p>
                </div>
                <p
                    className={`mt-1 truncate text-[11px] leading-4 ${
                        complete
                            ? "font-bold text-emerald-700 dark:text-emerald-300"
                            : "text-slate-500 dark:text-slate-400"
                    }`}
                >
                    {complete && fileName ? fileName : description}
                </p>
            </div>
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className="col-start-2 inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 text-[11px] font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-white/10 dark:disabled:text-slate-500 sm:col-start-auto"
            >
                {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                ) : (
                    <Upload className="h-3.5 w-3.5"/>
                )}
                {loading ? "Đang tải..." : complete ? "Thay PDF" : "Chọn PDF"}
            </button>
        </div>
    );
}

function ChecklistItem({label, description, complete}) {
    return (
        <div
            className={`grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 border-b border-slate-200 py-3.5 last:border-b-0 dark:border-white/10 sm:px-4 sm:[&:nth-child(odd)]:border-r ${
                complete ? "text-slate-800 dark:text-slate-100" : "text-slate-400"
            }`}
        >
      <span
          className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${
              complete
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 text-transparent dark:border-slate-600"
          }`}
      >
        <Check className="h-3 w-3"/>
      </span>
            <div>
                <p className="text-xs font-extrabold leading-4">{label}</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            </div>
        </div>
    );
}

export default function ContractWorkflowStepper({
                                                    contractDetails,
                                                    refreshKey = 0,
                                                    onContractUpdated,
                                                    onRequestShowHandover,
                                                    onActivate,
                                                    onReadinessChange,
                                                    leaseVersion = 0,
                                                    isActivating = false,
                                                }) {
    const leaseInputRef = useRef(null);
    const handoverInputRef = useRef(null);
    const leaseUploadInFlightRef = useRef(false);
    const prevLeaseVersionRef = useRef(0);
    const prevRefreshKeyRef = useRef(0);
    const isInitialMountRef = useRef(true);

    const [loadingStep, setLoadingStep] = useState(null);
    const [handoverData, setHandoverData] = useState(null);
    const [handoverLoading, setHandoverLoading] = useState(true);
    const [confirmedLeaseVersion, setConfirmedLeaseVersion] = useState(0);

    const contractId =
        contractDetails?.contractId || contractDetails?.leaseContractId;
    const leaseSignedFileId =
        contractDetails?.signedFileId ?? contractDetails?.signed_file_id ?? null;
    const isRenewalContract = Boolean(
        contractDetails?.previousContractId ?? contractDetails?.previous_contract_id,
    );
    const requiresMoveInHandover = !isRenewalContract;

    useEffect(() => {
        if (
            requiresMoveInHandover &&
            leaseVersion > 0 &&
            leaseVersion !== prevLeaseVersionRef.current
        ) {
            setConfirmedLeaseVersion(0);
            toast.info(
                "Bản hợp đồng thuê đã thay đổi. Vui lòng kiểm tra và lưu lại thông tin bàn giao.",
            );
        }
        prevLeaseVersionRef.current = leaseVersion;
    }, [leaseVersion, requiresMoveInHandover]);

    useEffect(() => {
        let ignore = false;
        const wasSaveTriggered = refreshKey > prevRefreshKeyRef.current;
        prevRefreshKeyRef.current = refreshKey;

        async function loadHandover() {
            if (!contractId || !requiresMoveInHandover) {
                setHandoverData(null);
                setConfirmedLeaseVersion(leaseVersion);
                setHandoverLoading(false);
                return;
            }

            setHandoverLoading(true);
            try {
                const response = await fetchContractHandover(contractId, "MOVE_IN");
                if (ignore) return;

                const handover = unwrapHandoverResponse(response);
                setHandoverData(handover);
                if (wasSaveTriggered || isInitialMountRef.current) {
                    if (hasHandoverReadings(handover)) {
                        setConfirmedLeaseVersion(leaseVersion);
                    }
                }
            } catch {
                if (!ignore) setHandoverData(null);
            } finally {
                if (!ignore) {
                    isInitialMountRef.current = false;
                    setHandoverLoading(false);
                }
            }
        }

        loadHandover();
        return () => {
            ignore = true;
        };
    }, [contractId, refreshKey, leaseSignedFileId, leaseVersion, requiresMoveInHandover]);

    const handoverHasData = hasHandoverReadings(handoverData);
    const handoverMatchesLease = confirmedLeaseVersion === leaseVersion;
    const handoverReady = handoverHasData && handoverMatchesLease;
    const handoverSignedFileId = getSignedHandoverDocumentId(handoverData);
    const signedHandoverReady =
        Boolean(handoverSignedFileId) && handoverMatchesLease;
    const signedHandoverDescription = handoverHasData
        ? "PDF toi da 15 MB - can upload truoc khi kich hoat"
        : "Mo sau khi hoan tat thong tin ban giao";
    const readiness = getContractActivationReadiness({
        leaseSignedFileId,
        requiresMoveInHandover,
        hasHandoverData: handoverReady,
        handoverSignedFileId: signedHandoverReady ? handoverSignedFileId : null,
    });
    const isBusy = loadingStep != null;
    const uploadLeaseDisabled = isLeaseSignedUploadDisabled({
        contractId,
        leaseContractId: contractDetails?.leaseContractId,
        loadingStep,
    });
    const requiredUploadTotal = 1 + Number(requiresMoveInHandover);
    const requiredUploadedCount =
        Number(Boolean(leaseSignedFileId)) +
        (requiresMoveInHandover ? Number(Boolean(signedHandoverReady)) : 0);
    const missingCount = readiness.totalCount - readiness.completedCount;
    const electricValue = getReadingValue(handoverData?.electricity);

    useEffect(() => {
        onReadinessChange?.({
            ready: readiness.ready,
            completedCount: readiness.completedCount,
            totalCount: readiness.totalCount,
        });
    }, [
        onReadinessChange,
        readiness.completedCount,
        readiness.ready,
        readiness.totalCount,
    ]);

    function resetFileInput(ref) {
        if (ref.current) ref.current.value = "";
    }

    function validateSelectedPdf(file, ref) {
        if (!file) return false;
        if (!isPdfFile(file)) {
            toast.error("Chỉ chấp nhận file PDF.");
            resetFileInput(ref);
            return false;
        }
        if (file.size > MAX_PDF_SIZE_BYTES) {
            toast.error("File PDF vượt quá giới hạn 15 MB.");
            resetFileInput(ref);
            return false;
        }
        return true;
    }

    /* async function handleDownloadDeposit() {
        if (!depositAgreementId) return;
        try {
            setLoadingStep(ACTION.DOWNLOAD_DEPOSIT);
            await downloadDepositContractPdf(
                depositAgreementId,
                buildDepositContractDocumentFilename(contractDetails),
            );
            toast.success("Đã tải hợp đồng đặt cọc để in và ký.");
        } catch (error) {
            toast.error(error?.message || "Không tải được hợp đồng đặt cọc.");
        } finally {
            setLoadingStep(null);
        }
    }

    } */

    async function handleDownloadLease() {
        try {
            setLoadingStep(ACTION.DOWNLOAD_LEASE);
            await downloadLeaseContractDraftPdf(
                contractId,
                buildLeaseContractDocumentFilename(contractDetails),
            );
            toast.success("Đã tải hợp đồng thuê để in và ký.");
        } catch (error) {
            toast.error(error?.message || "Không tải được hợp đồng thuê.");
        } finally {
            setLoadingStep(null);
        }
    }

    async function handleDownloadHandover() {
        try {
            setLoadingStep(ACTION.DOWNLOAD_HANDOVER);
            await downloadHandoverDraftPdf(
                contractId,
                "MOVE_IN",
                buildHandoverDocumentFilename(contractDetails),
            );
            toast.success("Đã tải biên bản bàn giao để in và ký.");
        } catch (error) {
            toast.error(
                error?.message ||
                "Không tải được biên bản. Vui lòng kiểm tra thông tin bàn giao.",
            );
        } finally {
            setLoadingStep(null);
        }
    }

    /* async function handleUploadDeposit(event) {
        const file = event.target.files?.[0];
        if (!validateSelectedPdf(file, depositInputRef)) return;

        try {
            setLoadingStep(ACTION.UPLOAD_DEPOSIT);
            await uploadSignedDepositContractFile(depositAgreementId, file);
            await onContractUpdated?.();
            toast.success("Đã lưu hợp đồng đặt cọc có chữ ký.");
        } catch (error) {
            toast.error(error?.message || "Không upload được hợp đồng đặt cọc.");
        } finally {
            setLoadingStep(null);
            resetFileInput(depositInputRef);
        }
    }

    } */

    async function handleUploadLease(event) {
        const file = event.target.files?.[0];
        if (!validateSelectedPdf(file, leaseInputRef)) return;
        if (leaseUploadInFlightRef.current) {
            resetFileInput(leaseInputRef);
            return;
        }

        leaseUploadInFlightRef.current = true;
        try {
            setLoadingStep(ACTION.UPLOAD_LEASE);
            await uploadSignedLeaseContractFile(contractDetails, file, {
                replace: Boolean(leaseSignedFileId),
            });
            await onContractUpdated?.();
            toast.success("Đã lưu hợp đồng thuê có chữ ký.");
        } catch (error) {
            toast.error(error?.message || "Không upload được hợp đồng thuê.");
        } finally {
            leaseUploadInFlightRef.current = false;
            setLoadingStep(null);
            resetFileInput(leaseInputRef);
        }
    }

    async function handleUploadHandover(event) {
        const file = event.target.files?.[0];
        if (!validateSelectedPdf(file, handoverInputRef)) return;

        try {
            setLoadingStep(ACTION.UPLOAD_HANDOVER);
            await uploadHandoverSignedDocument(contractId, file, "MOVE_IN");
            const response = await fetchContractHandover(contractId, "MOVE_IN");
            setHandoverData(unwrapHandoverResponse(response));
            setConfirmedLeaseVersion(leaseVersion);
            await onContractUpdated?.();
            toast.success("Đã lưu biên bản bàn giao có chữ ký.");
        } catch (error) {
            toast.error(error?.message || "Không upload được biên bản bàn giao.");
        } finally {
            setLoadingStep(null);
            resetFileInput(handoverInputRef);
        }
    }

    const leaseDocumentFilename = buildLeaseContractDocumentFilename(contractDetails);
    const handoverDocumentFilename = buildHandoverDocumentFilename(contractDetails);

    return (
        <div className="space-y-4 bg-[#f7f8fb] p-4 dark:bg-[#081225] sm:p-6">
            <section
                className="grid overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0d182c] sm:grid-cols-2">
                <div
                    className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-white/10 sm:border-b-0 sm:border-r">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-700 text-xs font-extrabold text-white">
            01
          </span>
                    <div>
                        <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                            Chuẩn bị hồ sơ
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {requiresMoveInHandover
                                ? "Tải bản in và nhập thông tin bàn giao"
                                : "Tải hợp đồng gia hạn để in và ký"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5">
          <span
              className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
            02
          </span>
                    <div>
                        <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                            Lưu bản đã ký
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            Upload PDF và kích hoạt hợp đồng
                        </p>
                    </div>
                </div>
            </section>

            <section
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_16px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#0d182c]">
                <PanelHeader
                    kicker="Chuẩn bị hồ sơ"
                    title={requiresMoveInHandover ? "Tải tài liệu và nhập bàn giao" : "Tải hợp đồng gia hạn"}
                    description={
                        requiresMoveInHandover
                            ? "Tải từng tài liệu để in, ký trực tiếp tại cơ sở và chốt dữ liệu bàn giao."
                            : "Gia hạn giữ nguyên phòng hiện tại, không cần nhập bàn giao phòng."
                    }
                    count={1 + Number(requiresMoveInHandover)}
                />

                {/* {hasDeposit && (
                    <DocumentRow
                        title={depositDocumentFilename}
                        meta="Hợp đồng đặt cọc · PDF · 2 bản"
                    >
                        <button
                            type="button"
                            onClick={handleDownloadDeposit}
                            disabled={isBusy}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07112f] px-3 text-[11px] font-extrabold text-white hover:bg-[#10204a] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loadingStep === ACTION.DOWNLOAD_DEPOSIT ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                            ) : (
                                <Download className="h-3.5 w-3.5"/>
                            )}
                            Tải PDF
                        </button>
                    </DocumentRow>
                )} */}

                <DocumentRow
                    title={leaseDocumentFilename}
                    meta="Hợp đồng thuê · PDF · 2 bản"
                >
                    <button
                        type="button"
                        onClick={handleDownloadLease}
                        disabled={isBusy || !contractId}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07112f] px-3 text-[11px] font-extrabold text-white hover:bg-[#10204a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loadingStep === ACTION.DOWNLOAD_LEASE ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                        ) : (
                            <Download className="h-3.5 w-3.5"/>
                        )}
                        Tải PDF
                    </button>
                </DocumentRow>

                {requiresMoveInHandover && (
                    <>
                        <DocumentRow
                            title={handoverDocumentFilename}
                            meta={
                                handoverHasData
                                    ? `Biên bản bàn giao · Điện ${electricValue ?? "—"} kWh`
                                    : "Biên bản bàn giao · Cần chốt chỉ số điện và hiện trạng thiết bị"
                            }
                            complete={handoverReady}
                            statusLabel={handoverReady ? "Đã đủ dữ liệu" : "Cần nhập dữ liệu"}
                        >
                            <button
                                type="button"
                                onClick={onRequestShowHandover}
                                disabled={isBusy || handoverLoading}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-extrabold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white"
                            >
                                {handoverLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                ) : (
                                    <ClipboardEdit className="h-3.5 w-3.5"/>
                                )}
                                {handoverHasData ? "Xem bàn giao" : "Nhập bàn giao"}
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadHandover}
                                disabled={isBusy || !handoverHasData}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07112f] px-3 text-[11px] font-extrabold text-white hover:bg-[#10204a] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10"
                            >
                                {loadingStep === ACTION.DOWNLOAD_HANDOVER ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                ) : (
                                    <Download className="h-3.5 w-3.5"/>
                                )}
                                Tải PDF
                            </button>
                        </DocumentRow>

                        <div
                            className="mx-4 mb-4 mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-4 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:mx-5">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
                            Nút “Nhập bàn giao” chuyển sang màn con ngay trong popup hiện tại,
                            không mở thêm popup lồng nhau.
                        </div>
                    </>
                )}
            </section>

            <section
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_16px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#0d182c]">
                <PanelHeader
                    kicker="Lưu bản đã ký"
                    title="Upload các bản PDF đã ký"
                    description="Chọn đúng loại tài liệu; có thể thay từng file nếu bản scan cần chỉnh lại."
                    count={`${requiredUploadedCount}/${requiredUploadTotal}`}
                />

                {/* {hasDeposit && (
                    <UploadRow
                        title={depositDocumentFilename}
                        description="PDF tối đa 15 MB · cần đủ chữ ký các bên"
                        complete={Boolean(depositSignedFileId)}
                        fileName={
                            contractDetails?.depositSignedFileName ||
                            depositDocumentFilename
                        }
                        loading={loadingStep === ACTION.UPLOAD_DEPOSIT}
                        disabled={isBusy}
                        onClick={() => depositInputRef.current?.click()}
                    />
                )} */}

                <UploadRow
                    title={leaseDocumentFilename}
                    description="PDF tối đa 15 MB · cần đủ chữ ký các bên"
                    complete={Boolean(leaseSignedFileId)}
                    fileName={contractDetails?.signedFileName || leaseDocumentFilename}
                    loading={loadingStep === ACTION.UPLOAD_LEASE}
                    disabled={uploadLeaseDisabled}
                    onClick={() => leaseInputRef.current?.click()}
                />

                {requiresMoveInHandover && (
                    <UploadRow
                        title={handoverDocumentFilename}
                        description={signedHandoverDescription}
                        complete={signedHandoverReady}
                        fileName={handoverDocumentFilename}
                        loading={loadingStep === ACTION.UPLOAD_HANDOVER}
                        disabled={isBusy || handoverLoading || !handoverHasData}
                        onClick={() => handoverInputRef.current?.click()}
                    />
                )}

                {requiresMoveInHandover && !handoverHasData && (
                    <div
                        className="mx-4 mb-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-4 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300 sm:mx-5">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0"/>
                        Cần nhập thông tin bàn giao trước khi upload biên bản đã ký.
                    </div>
                )}
            </section>

            <section
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_16px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#0d182c]">
                <PanelHeader
                    kicker="Kiểm tra trước khi kích hoạt"
                    title="Đảm bảo đủ điều kiện kích hoạt"
                    description={`Hoàn tất đủ ${readiness.totalCount} điều kiện trước khi kích hoạt hợp đồng và cấp tài khoản.`}
                />
                <div className="grid border-t border-slate-200 px-4 dark:border-white/10 sm:grid-cols-2 sm:px-1">
                    {readiness.requirements.map((item) => {
                        const descriptions = {
                            lease: "Upload đúng file PDF có đầy đủ chữ ký.",
                            "handover-data": "Chỉ số điện và thiết bị đã được chốt.",
                            "handover-signed-file": "Upload biên bản bàn giao PDF có chữ ký.",
                        };
                        return (
                            <ChecklistItem
                                key={item.key}
                                label={item.label}
                                description={descriptions[item.key]}
                                complete={item.complete}
                            />
                        );
                    })}
                </div>
                <div
                    className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03] sm:px-5">
                    <button
                        type="button"
                        onClick={onActivate}
                        disabled={
                            !readiness.ready ||
                            isActivating ||
                            (requiresMoveInHandover && handoverLoading) ||
                            isBusy
                        }
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
                    >
                        {isActivating ? (
                            <Loader2 className="h-4 w-4 animate-spin"/>
                        ) : readiness.ready ? (
                            <Zap className="h-4 w-4"/>
                        ) : (
                            <CheckCircle2 className="h-4 w-4"/>
                        )}
                        {isActivating
                            ? "Đang kích hoạt..."
                            : "Kích hoạt hợp đồng và cấp tài khoản"}
                    </button>
                    <p className="mt-2 text-center text-[10.5px] leading-4 text-slate-500 dark:text-slate-400">
                        {readiness.ready
                            ? "Hồ sơ đã đủ điều kiện. Có thể kích hoạt hợp đồng và cấp tài khoản."
                            : `Còn thiếu ${missingCount} điều kiện. Nút kích hoạt chỉ mở khi hồ sơ hoàn tất.`}
                    </p>
                </div>
            </section>

            <input
                ref={leaseInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleUploadLease}
            />
            {requiresMoveInHandover && (
                <input
                    ref={handoverInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={handleUploadHandover}
                />
            )}
        </div>
    );
}
