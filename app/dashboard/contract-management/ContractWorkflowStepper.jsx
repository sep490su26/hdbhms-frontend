import {useEffect, useMemo, useRef, useState} from "react";
import Image from "next/image";
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ClipboardEdit,
    Download,
    FileText,
    ImageIcon,
    Info,
    Loader2,
    Upload,
    X,
    Zap,
} from "lucide-react";
import {toast} from "sonner";

import DateInput from "@/components/DateInput";

import {
    buildHandoverDocumentFilename,
    downloadHandoverDraftPdf,
    fetchContractHandover,
    fetchLatestReadings,
    uploadFile,
    uploadHandoverSignedDocument,
} from "@/services/contractHandoverService";
import {
    buildLeaseContractDocumentFilename,
    downloadLeaseContractDraftPdf,
    updateLeaseContractActivationReading,
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
    SAVE_ACTIVATION_READING: "save-activation-reading",
};

function parseNonNegativeNumberInput(value) {
    const trimmedValue = String(value ?? "").trim();
    if (trimmedValue === "") return null;

    const parsedValue = Number(trimmedValue);
    return Number.isFinite(parsedValue) && parsedValue >= 0
        ? parsedValue
        : undefined;
}

function unwrapHandoverResponse(response) {
    return response?.data ?? response ?? {};
}

function hasHandoverReadings(handover) {
    return Boolean(
        handover?.handoverRecordId ??
        handover?.handover_record_id ??
        handover?.status,
    );
}

function getSignedHandoverDocumentId(handover) {
    return handover?.signedDocumentId ?? handover?.signed_document_id ?? null;
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

function MeterPhotoUpload({file, disabled = false, onChange, onRemove}) {
    const inputRef = useRef(null);
    const previewUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : ""),
        [file],
    );

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    function openPicker() {
        if (!disabled) inputRef.current?.click();
    }

    function removeFile() {
        if (inputRef.current) inputRef.current.value = "";
        onRemove?.();
    }

    return (
        <div className="flex min-h-10 w-full min-w-0 self-center items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 dark:border-white/10 dark:bg-[#0f172a]">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onChange}
                disabled={disabled}
            />
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <button
                    type="button"
                    onClick={openPicker}
                    disabled={disabled}
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:hover:border-blue-400 dark:hover:bg-blue-400/10"
                    aria-label={file ? "Đổi ảnh công tơ" : "Chọn ảnh công tơ"}
                >
                    {previewUrl ? (
                        <Image
                            src={previewUrl}
                            alt="Ảnh công tơ"
                            fill
                            sizes="32px"
                            unoptimized
                            className="object-cover"
                        />
                    ) : (
                        <ImageIcon className="h-4 w-4" />
                    )}
                </button>

                <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                        {file?.name || "Chưa chọn ảnh"}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                        {file ? "Đã chọn ảnh công tơ" : "JPG, PNG hoặc HEIC · tùy chọn"}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={openPicker}
                        disabled={disabled}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2.5 text-[11px] font-bold text-slate-700 transition hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        {file ? "Đổi" : "Chọn ảnh"}
                    </button>
                    {file && (
                        <button
                            type="button"
                            onClick={removeFile}
                            disabled={disabled}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"
                            aria-label="Xóa ảnh công tơ"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
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
    const activationSaveTimerRef = useRef(null);
    const prevLeaseVersionRef = useRef(0);
    const prevRefreshKeyRef = useRef(0);
    const isInitialMountRef = useRef(true);

    const [loadingStep, setLoadingStep] = useState(null);
    const [handoverData, setHandoverData] = useState(null);
    const [handoverLoading, setHandoverLoading] = useState(true);
    const [confirmedLeaseVersion, setConfirmedLeaseVersion] = useState(0);
    const [activationReading, setActivationReading] = useState(() => {
        const value =
            contractDetails?.activationElectricityValue ??
            contractDetails?.activation_electricity_value;
        return value == null ? "" : String(value);
    });
    const [activationReadingDate, setActivationReadingDate] = useState(
        () =>
            contractDetails?.activationReadingDate ??
            contractDetails?.activation_reading_date ??
            new Date().toISOString().split("T")[0],
    );
    const [activationPhotoFile, setActivationPhotoFile] = useState(null);
    const [activationPhotoFileId, setActivationPhotoFileId] = useState(null);
    const [activationReadingLoading, setActivationReadingLoading] = useState(false);
    const [previousElectricityReading, setPreviousElectricityReading] = useState(null);

    const contractId =
        contractDetails?.contractId || contractDetails?.leaseContractId;
    const roomId =
        contractDetails?.roomId ??
        contractDetails?.room_id ??
        contractDetails?.room?.id ??
        null;
    const leaseSignedFileId =
        contractDetails?.signedFileId ?? contractDetails?.signed_file_id ?? null;
    const isRenewalContract = Boolean(
        contractDetails?.previousContractId ?? contractDetails?.previous_contract_id,
    );
    const isTransferReSignContract = Boolean(
        contractDetails?.transferRequestId && isRenewalContract,
    );
    const isTransferTargetContract =
        isTransferReSignContract &&
        contractDetails?.transferContractRole !== "REPLACEMENT_OLD_CONTRACT";
    const requiresActivationReading =
        !isRenewalContract || isTransferReSignContract;
    const requiresMoveInHandover =
        !isRenewalContract || isTransferTargetContract;
    const accountProvisioningStatus = String(
        contractDetails?.accountProvisioningStatus ??
        contractDetails?.account_provisioning_status ??
        "",
    ).toUpperCase();
    const accountAlreadyExists =
        isTransferReSignContract ||
        ["ACTIVE", "SENT"].includes(accountProvisioningStatus) ||
        (!accountProvisioningStatus &&
            (contractDetails?.accountProvisioned === true ||
                contractDetails?.account_provisioned === true));

    useEffect(() => {
        const persistedValue =
            contractDetails?.activationElectricityValue ??
            contractDetails?.activation_electricity_value;
        const persistedDate =
            contractDetails?.activationReadingDate ??
            contractDetails?.activation_reading_date;
        // The form mirrors values refreshed from the contract details response.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActivationReading(persistedValue == null ? "" : String(persistedValue));
        setActivationReadingDate(
            persistedDate || new Date().toISOString().split("T")[0],
        );
    }, [
        contractId,
        contractDetails?.activationElectricityValue,
        contractDetails?.activationReadingDate,
        contractDetails?.activation_electricity_value,
        contractDetails?.activation_reading_date,
    ]);

    useEffect(() => {
        if (!roomId || !requiresActivationReading) return undefined;

        const controller = new AbortController();
        const persistedValue =
            contractDetails?.activationElectricityValue ??
            contractDetails?.activation_electricity_value;
        const persistedDate =
            contractDetails?.activationReadingDate ??
            contractDetails?.activation_reading_date;

        async function loadLatestReading() {
            setActivationReadingLoading(true);
            setPreviousElectricityReading(null);
            try {
                const response = await fetchLatestReadings(roomId);
                if (controller.signal.aborted) return;

                const electricity = response?.electricity || {};
                const previousValue =
                    electricity.previousValue ??
                    electricity.previous_value ??
                    electricity.suggestedValue ??
                    electricity.suggested_value;
                const suggestedValue =
                    electricity.suggestedValue ??
                    electricity.suggested_value ??
                    electricity.previousValue ??
                    electricity.previous_value;
                const latestDate =
                    electricity.lastReadingDate ??
                    electricity.last_reading_date;

                setPreviousElectricityReading(
                    previousValue == null ? null : String(previousValue),
                );
                if (persistedValue == null && suggestedValue != null) {
                    setActivationReading((current) =>
                        current.trim() === "" ? String(suggestedValue) : current,
                    );
                }
                if (persistedDate == null && latestDate) {
                    setActivationReadingDate((current) =>
                        current === new Date().toISOString().split("T")[0]
                            ? latestDate
                            : current,
                    );
                }
            } catch {
                // The field remains editable manually if the latest reading is unavailable.
            } finally {
                if (!controller.signal.aborted) setActivationReadingLoading(false);
            }
        }

        loadLatestReading();
        return () => controller.abort();
    }, [
        contractDetails?.activationElectricityValue,
        contractDetails?.activationReadingDate,
        contractDetails?.activation_electricity_value,
        contractDetails?.activation_reading_date,
        requiresActivationReading,
        roomId,
    ]);

    useEffect(() => {
        if (!contractId || !requiresActivationReading) return undefined;

        const currentValue = parseNonNegativeNumberInput(activationReading);
        if (currentValue === undefined) {
            return undefined;
        }

        const persistedValue =
            contractDetails?.activationElectricityValue ??
            contractDetails?.activation_electricity_value;
        const persistedDate =
            contractDetails?.activationReadingDate ??
            contractDetails?.activation_reading_date;
        const hasChanged = currentValue === null
            ? persistedValue != null || persistedDate != null
            : Number(persistedValue) !== currentValue ||
              (activationReadingDate || null) !== (persistedDate || null);
        if (!hasChanged) return undefined;

        if (activationSaveTimerRef.current) {
            clearTimeout(activationSaveTimerRef.current);
        }
        activationSaveTimerRef.current = setTimeout(async () => {
            try {
                await updateLeaseContractActivationReading(contractId, {
                    currentValue,
                    readingDate: currentValue === null ? null : activationReadingDate,
                });
            } catch (error) {
                toast.error(error?.message || "Không lưu được chỉ số điện đầu kỳ.");
            }
        }, 450);

        return () => {
            if (activationSaveTimerRef.current) {
                clearTimeout(activationSaveTimerRef.current);
                activationSaveTimerRef.current = null;
            }
        };
    }, [
        activationReading,
        activationReadingDate,
        contractDetails?.activationElectricityValue,
        contractDetails?.activationReadingDate,
        contractDetails?.activation_electricity_value,
        contractDetails?.activation_reading_date,
        contractId,
        requiresActivationReading,
    ]);

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
        ? "PDF tối đa 15 MB - có thể tải lên trước khi kích hoạt"
        : "Mở sau khi hoàn tất thông tin bàn giao";
    const parsedActivationReading =
        parseNonNegativeNumberInput(activationReading);
    const activationReadingReady =
        !requiresActivationReading || parsedActivationReading != null;
    const leaseDraftReady = !requiresActivationReading || activationReadingReady;
    const readiness = getContractActivationReadiness({
        leaseSignedFileId,
        requiresMoveInHandover,
        requiresActivationReading,
        hasHandoverData: handoverReady,
        handoverSignedFileId: signedHandoverReady ? handoverSignedFileId : null,
        activationReadingReady,
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

    async function handleActivation() {
        const currentValue = parseNonNegativeNumberInput(activationReading);
        if (requiresActivationReading && currentValue == null) {
            toast.error("Vui lòng nhập chỉ số điện đầu kỳ.");
            return;
        }
        let photoFileId = activationPhotoFileId;
        if (activationPhotoFile) {
            const response = await uploadFile(activationPhotoFile, "METER_PHOTO");
            photoFileId = response?.fileId || response?.id || null;
        }
        try {
            await onActivate?.({
                electricity: requiresActivationReading
                    ? {
                        currentValue,
                        photoFileId,
                        readingDate: activationReadingDate || undefined,
                    }
                    : undefined,
            });
        } catch (error) {
            toast.error(error?.message || "Không thể kích hoạt hợp đồng.");
        }
    }

    async function handleRequestShowHandover() {
        if (requiresActivationReading) {
            const currentValue = parseNonNegativeNumberInput(activationReading);
            if (currentValue == null) {
                toast.error("Vui lòng nhập chỉ số điện đầu kỳ trước khi nhập bàn giao.");
                return;
            }

            // The workflow view unmounts when the handover view opens, so flush
            // the debounced activation-reading update before changing views.
            if (activationSaveTimerRef.current) {
                clearTimeout(activationSaveTimerRef.current);
                activationSaveTimerRef.current = null;
            }

            try {
                setLoadingStep(ACTION.SAVE_ACTIVATION_READING);
                await updateLeaseContractActivationReading(contractId, {
                    currentValue,
                    readingDate: activationReadingDate || null,
                });
                await onContractUpdated?.();
            } catch (error) {
                toast.error(
                    error?.message || "Không lưu được chỉ số điện đầu kỳ.",
                );
                return;
            } finally {
                setLoadingStep(null);
            }
        }

        onRequestShowHandover?.();
    }

    function handleActivationPhotoChange(event) {
        setActivationPhotoFile(event.target.files?.[0] || null);
        setActivationPhotoFileId(null);
    }

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
        if (!contractId) return;
        const currentValue = parseNonNegativeNumberInput(activationReading);
        if (requiresActivationReading && currentValue == null) {
            toast.error("Vui lòng nhập chỉ số điện đầu kỳ trước khi tải hợp đồng.");
            return;
        }
        try {
            setLoadingStep(ACTION.DOWNLOAD_LEASE);
            await downloadLeaseContractDraftPdf(
                contractId,
                buildLeaseContractDocumentFilename(contractDetails),
                requiresActivationReading
                    ? {electricityValue: currentValue}
                    : undefined,
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
            toast.success("Đã tải biên bản bàn giao PDF để in và ký.");
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
                            Tải tài liệu lên và kích hoạt hợp đồng
                        </p>
                    </div>
                </div>
            </section>

            {requiresActivationReading && (
                <section className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/50 shadow-[0_5px_16px_rgba(16,24,40,0.04)] dark:border-blue-400/20 dark:bg-blue-400/[0.06]">
                    <PanelHeader
                        kicker="Chỉ số đầu kỳ"
                        title="Nhập số điện khi ký hợp đồng thuê"
                        description="Chỉ số này được lưu làm chỉ số bắt đầu hợp đồng; biên bản bàn giao chỉ quản lý thiết bị và hiện trạng phòng."
                    />
                    <div className="grid items-start gap-3 border-t border-blue-200 px-4 py-4 dark:border-blue-400/20 sm:grid-cols-3 sm:px-5">
                            <label className="grid gap-1.5">
                             <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                 <span>Chỉ số điện (kWh) *</span>
                                 {activationReadingLoading && (
                                     <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
                                         <Loader2 className="h-3 w-3 animate-spin"/>
                                         Đang tải số gần nhất
                                     </span>
                                 )}
                             </span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={activationReading}
                                onChange={(event) => setActivationReading(event.target.value)}
                                disabled={isBusy || isActivating}
                                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-600 disabled:opacity-60 dark:border-white/10 dark:bg-[#0f172a]"
                                placeholder="VD: 1234.5"
                            />
                            <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                Chỉ số điện cũ:{" "}
                                <span className="font-bold text-slate-700 dark:text-slate-200">
                                    {previousElectricityReading == null
                                        ? activationReadingLoading
                                            ? "Đang tải..."
                                            : "Chưa có dữ liệu"
                                        : `${previousElectricityReading} kWh`}
                                </span>
                            </p>
                        </label>
                        <label className="grid gap-1.5">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ngày ghi chỉ số *</span>
                            <DateInput
                                value={activationReadingDate}
                                onChange={(event) => setActivationReadingDate(event.target.value)}
                                disabled={isBusy || isActivating}
                                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-600 disabled:opacity-60 dark:border-white/10 dark:bg-[#0f172a]"
                            />
                        </label>
                        <div className="grid gap-1.5">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ảnh công tơ (không bắt buộc)</span>
                            <MeterPhotoUpload
                                file={activationPhotoFile}
                                disabled={isBusy || isActivating}
                                onChange={handleActivationPhotoChange}
                                onRemove={() => {
                                    setActivationPhotoFile(null);
                                    setActivationPhotoFileId(null);
                                }}
                            />
                        </div>
                    </div>
                </section>
            )}

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
                        disabled={isBusy || !contractId || !leaseDraftReady}
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
                                    ? "Biên bản bàn giao · Danh sách thiết bị và hiện trạng phòng"
                                    : "Biên bản bàn giao · Cần nhập danh sách thiết bị và hiện trạng phòng"
                            }
                            complete={handoverReady}
                            statusLabel={handoverReady ? "Đã đủ dữ liệu" : "Cần nhập dữ liệu"}
                        >
                            <button
                                type="button"
                                onClick={handleRequestShowHandover}
                                disabled={isBusy || handoverLoading}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-extrabold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white"
                            >
                                {handoverLoading || loadingStep === ACTION.SAVE_ACTIVATION_READING ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                ) : (
                                    <ClipboardEdit className="h-3.5 w-3.5"/>
                                )}
                                {loadingStep === ACTION.SAVE_ACTIVATION_READING
                                    ? "Đang lưu..."
                                    : handoverHasData
                                        ? "Xem bàn giao"
                                        : "Nhập bàn giao"}
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

                        {/*<div*/}
                        {/*    className="mx-4 mb-4 mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-4 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:mx-5">*/}
                        {/*    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0"/>*/}
                        {/*    Nút “Nhập bàn giao” chuyển sang màn con ngay trong popup hiện tại,*/}
                        {/*    không mở thêm popup lồng nhau.*/}
                        {/*</div>*/}
                    </>
                )}
            </section>

            <section
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_16px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#0d182c]">
                <PanelHeader
                    kicker="Lưu bản đã ký"
                    title="Tải lên các bản PDF đã ký"
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
                        Cần nhập thông tin bàn giao trước khi tải lên biên bản đã ký.
                    </div>
                )}
            </section>

            <section
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_16px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-[#0d182c]">
                <PanelHeader
                    kicker="Kiểm tra trước khi kích hoạt"
                    title="Đảm bảo đủ điều kiện kích hoạt"
                    description={
                        accountAlreadyExists
                            ? `Hoàn tất đủ ${readiness.totalCount} điều kiện trước khi kích hoạt hợp đồng.`
                            : `Hoàn tất đủ ${readiness.totalCount} điều kiện trước khi kích hoạt hợp đồng và cấp tài khoản.`
                    }
                />
                <div className="grid border-t border-slate-200 px-4 dark:border-white/10 sm:grid-cols-2 sm:px-1">
                    {readiness.requirements.map((item) => {
                        const descriptions = {
                            lease: "Tải lên đúng file PDF có đầy đủ chữ ký.",
                            "handover-data": "Danh sách thiết bị và hiện trạng phòng đã được chốt.",
                            "activation-reading": "Nhập chỉ số điện đầu kỳ trước khi kích hoạt.",
                            "handover-signed-file": "Tải lên biên bản bàn giao PDF có chữ ký.",
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
                        onClick={handleActivation}
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
                            : accountAlreadyExists
                                ? "Kích hoạt hợp đồng"
                                : "Kích hoạt hợp đồng và cấp tài khoản"}
                    </button>
                    <p className="mt-2 text-center text-[10.5px] leading-4 text-slate-500 dark:text-slate-400">
                        {readiness.ready
                            ? accountAlreadyExists
                                ? "Hồ sơ đã đủ điều kiện. Có thể kích hoạt hợp đồng."
                                : "Hồ sơ đã đủ điều kiện. Có thể kích hoạt hợp đồng và cấp tài khoản."
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
