"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {CheckCircle2, CircleDollarSign, Loader2, X} from "lucide-react";
import {toast} from "sonner";

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import ContractHandoverSection from "@/app/dashboard/contract-management/ContractHandoverSection";
import {fetchContractHandover} from "@/services/contractHandoverService";
import {
    completeTransfer,
    executeTransfer,
    getRoomTransferByCode,
    getRoomTransferById,
} from "@/services/roomTransferService";

const EXECUTION_STATUSES = new Set(["WAITING_TRANSFER_DATE", "READY_FOR_HANDOVER", "WAITING_EXECUTION"]);
const TERMINAL_STATUSES = new Set(["EXECUTED", "COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"]);
const CONFIRMED_STATUSES = new Set(["CONFIRMED", "CONFIRMED_BY_TENANT"]);

const TRANSFER_STATUS_LABELS = {
    REQUESTED: "Mới tạo",
    MANAGER_APPROVED: "Quản lý đã duyệt",
    WAITING_MANAGER_APPROVAL: "Chờ quản lý duyệt",
    WAITING_HOLDER_RESPONSE: "Chờ người đại diện phòng phản hồi",
    WAITING_TARGET_HOLDER_APPROVAL: "Đang xử lý chuyển phòng",
    WAITING_PAYMENT: "Chờ thanh toán",
    WAITING_CONTRACT_CONFIRMATION: "Chờ quản lý xác nhận hợp đồng",
    WAITING_NEW_CONTRACT: "Chờ tạo hợp đồng mới",
    WAITING_SIGNING: "Chờ xác nhận đủ bộ hợp đồng đã ký",
    WAITING_CONTRACT_SIGNING: "Chờ xác nhận đủ bộ hợp đồng đã ký",
    WAITING_TRANSFER_DATE: "Chờ đến ngày chuyển phòng",
    READY_FOR_HANDOVER: "Sẵn sàng bàn giao phòng cũ",
    WAITING_EXECUTION: "Đã bàn giao phòng cũ, chờ hoàn tất",
    EXECUTED: "Đã hoàn tất chuyển phòng",
    COMPLETED: "Đã hoàn tất chuyển phòng",
    CANCELLED: "Đã hủy",
    REJECTED: "Đã từ chối",
    EXPIRED: "Đã hết hạn",
};

function requiresFullMoveOut(transfer) {
    return transfer?.sourceRoomWillBeEmptyAfterTransfer === true;
}

function requiresFullMoveIn(transfer) {
    return transfer?.targetTransferType === "NEW_CONTRACT";
}

function getStatusLabel(status, transfer = null) {
    if (status === "READY_FOR_HANDOVER" && transfer?.sourceRoomWillBeEmptyAfterTransfer === false) {
        return "Sẵn sàng xác nhận người chuyển đi";
    }
    if (status === "WAITING_EXECUTION" && transfer?.sourceRoomWillBeEmptyAfterTransfer === false) {
        return "Chờ hoàn tất chuyển phòng";
    }
    return TRANSFER_STATUS_LABELS[status] || "Trạng thái chuyển phòng chưa xác định";
}

const LEASE_STATUS_LABELS = {
    DRAFT: "Bản nháp",
    CONFIRMED: "Đã xác nhận",
    SIGNED: "Đã ký",
    PENDING_SIGNATURE: "Chờ ký",
    ACTIVE: "Đang hiệu lực",
    EXPIRING_SOON: "Sắp hết hạn",
    TERMINATION_PENDING: "Chờ thanh lý",
    LIQUIDATED: "Đã thanh lý",
    TRANSFERRED: "Đã chuyển đi",
    EXPIRED: "Đã hết hạn",
    AUTO_TERMINATED: "Đã tự kết thúc",
    CANCELLED: "Đã hủy",
};

function getLeaseStatusLabel(status) {
    return LEASE_STATUS_LABELS[status] || "Chưa xác định";
}

function getTransferOutScopeTitle(transfer) {
    return requiresFullMoveOut(transfer) ? "Bàn giao toàn bộ phòng cũ" : "Bàn giao người rời phòng";
}

function getTransferOutScopeDescription(transfer) {
    return requiresFullMoveOut(transfer)
        ? "Ghi nhận hiện trạng, tài sản và chỉ số điện phòng cũ để hệ thống lập hóa đơn cuối kỳ nếu cần."
        : "Phòng cũ vẫn còn người ở; chỉ ghi nhận chỉ số điện của người chuyển đi và không cập nhật tài sản phòng.";
}

function isConfirmedHandover(handover) {
    return CONFIRMED_STATUSES.has(handover?.status);
}

async function loadConfirmedHandover(contractId, handoverType) {
    if (!contractId) return false;
    const handover = await fetchContractHandover(contractId, handoverType).catch(() => null);
    return isConfirmedHandover(handover);
}

async function loadTransferInHandover(contractId) {
    if (!contractId) return {ready: false, type: null};
    const transferIn = await fetchContractHandover(contractId, "TRANSFER_IN").catch(() => null);
    if (isConfirmedHandover(transferIn)) {
        return {ready: true, type: "TRANSFER_IN"};
    }

    // The target-room handover is confirmed during contract activation.
    const moveIn = await fetchContractHandover(contractId, "MOVE_IN").catch(() => null);
    const moveInReady = isConfirmedHandover(moveIn);
    return {
        ready: moveInReady,
        type: moveInReady ? "MOVE_IN" : null,
    };
}

export function isTransferExecutionStatus(status) {
    return EXECUTION_STATUSES.has(status);
}

function getNonExecutionStatusMessage(status) {
    if (status === "WAITING_SIGNING" || status === "WAITING_CONTRACT_SIGNING") {
        return "Yêu cầu vẫn đang chờ xác nhận đủ bộ hợp đồng đã ký, chưa thể chốt chuyển phòng.";
    }
    if (status === "WAITING_CONTRACT_CONFIRMATION") {
        return "Yêu cầu vẫn đang ở bước chuẩn bị/xác nhận hợp đồng, chưa thể chốt chuyển phòng.";
    }
    if (status === "WAITING_EXECUTION") {
        return "";
    }
    if (TERMINAL_STATUSES.has(status)) {
        return "Yêu cầu chuyển phòng đã kết thúc.";
    }
    return `Yêu cầu chưa tới bước vận hành chuyển phòng (${getStatusLabel(status)}).`;
}

export default function TransferExecutionModal({
    open,
    transferRequestId,
    transfer: preloadedTransfer = null,
    request = null,
    contract = null,
    onClose,
    onCompleted,
}) {
    const effectiveRequestId = useMemo(
        () => transferRequestId ?? preloadedTransfer?.id ?? contract?.transferRequestId ?? null,
        [contract?.transferRequestId, preloadedTransfer?.id, transferRequestId],
    );
    const requestCode = request?.requestCode || contract?.transferRequestCode || preloadedTransfer?.requestCode || "";
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [execution, setExecution] = useState(null);
    const [oldRoomCompensationAmount, setOldRoomCompensationAmount] = useState("0");
    const [oldRoomCompensationNote, setOldRoomCompensationNote] = useState("");
    const transferOutActionRef = useRef(null);
    const transferInActionRef = useRef(null);
    const onCompletedRef = useRef(onCompleted);

    useEffect(() => {
        onCompletedRef.current = onCompleted;
    }, [onCompleted]);

    useEffect(() => {
        if (!open) {
            queueMicrotask(() => {
                setExecution(null);
                setSubmitting(false);
                setOldRoomCompensationAmount("0");
                setOldRoomCompensationNote("");
            });
            return;
        }

        let cancelled = false;
        async function loadTransfer() {
            setLoading(true);
            try {
                const transfer = effectiveRequestId
                    ? await getRoomTransferById(effectiveRequestId)
                    : requestCode
                        ? await getRoomTransferByCode(requestCode)
                        : preloadedTransfer;
                if (!transfer?.id) {
                    throw new Error("Không tải được chi tiết yêu cầu chuyển phòng.");
                }
                if (!isTransferExecutionStatus(transfer.status)) {
                    if (TERMINAL_STATUSES.has(transfer.status)) {
                        toast.info(getNonExecutionStatusMessage(transfer.status));
                        await onCompletedRef.current?.(transfer);
                    } else {
                        toast.warning(getNonExecutionStatusMessage(transfer.status));
                        await onCompletedRef.current?.(transfer);
                    }
                    onClose?.();
                    return;
                }

                const phase = transfer.status === "WAITING_EXECUTION" ? "COMPLETE_TRANSFER" : "MOVE_OUT";
                const targetContractId = transfer.newContractId || transfer.targetContractId || null;
                // Use the backend decision. Older responses can still infer
                // the scope from whether the source room becomes empty.
                const transferOutRequired = transfer.transferOutHandoverRequired == null
                    ? transfer.sourceRoomWillBeEmptyAfterTransfer === true
                    : transfer.transferOutHandoverRequired === true;
                const [transferOutReady, transferInState] = await Promise.all([
                    phase === "MOVE_OUT" && transferOutRequired
                        ? loadConfirmedHandover(transfer.oldContractId, "TRANSFER_OUT")
                        : Promise.resolve(!transferOutRequired),
                    phase === "COMPLETE_TRANSFER" && requiresFullMoveIn(transfer)
                        ? loadTransferInHandover(targetContractId)
                        : Promise.resolve({ready: false, type: null}),
                ]);
                if (cancelled) return;
                setExecution({
                    transfer,
                    phase,
                    transferOutRequired,
                    transferOutReady: transferOutRequired ? transferOutReady : true,
                    transferInReady: transferInState.ready,
                    transferInHandoverType: transferInState.type,
                });
            } catch (error) {
                toast.error(error?.message || "Không tải được chi tiết chuyển phòng.");
                onClose?.();
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadTransfer();
        return () => {
            cancelled = true;
        };
    }, [effectiveRequestId, onClose, open, preloadedTransfer, requestCode]);

    async function refreshAfterAction(message) {
        const refreshedTransfer = execution?.transfer?.id
            ? await getRoomTransferById(execution.transfer.id).catch(() => null)
            : null;
        toast.success(message);
        setSubmitting(false);
        await onCompleted?.(refreshedTransfer || execution?.transfer);
        onClose?.();
    }

    const markHandoverLoaded = useCallback((handoverType, handover) => {
        const ready = isConfirmedHandover(handover);
        setExecution((current) => {
            if (!current) return current;
            return {
                ...current,
                transferOutReady: handoverType === "TRANSFER_OUT" ? ready : current.transferOutReady,
                transferInReady: handoverType === "TRANSFER_IN" ? ready : current.transferInReady,
            };
        });
    }, []);

    const markHandoverSaved = useCallback((handoverType) => {
        setExecution((current) => {
            if (!current) return current;
            return {
                ...current,
                transferOutReady: handoverType === "TRANSFER_OUT" ? true : current.transferOutReady,
                transferInReady: handoverType === "TRANSFER_IN" ? true : current.transferInReady,
            };
        });
    }, []);

    const handleTransferOutLoaded = useCallback((handover) => {
        markHandoverLoaded("TRANSFER_OUT", handover);
    }, [markHandoverLoaded]);

    const handleTransferInLoaded = useCallback((handover) => {
        markHandoverLoaded("TRANSFER_IN", handover);
    }, [markHandoverLoaded]);

    const handleTransferOutSaved = useCallback(() => {
        markHandoverSaved("TRANSFER_OUT");
    }, [markHandoverSaved]);

    const handleTransferInSaved = useCallback(() => {
        markHandoverSaved("TRANSFER_IN");
    }, [markHandoverSaved]);

    async function handleSubmit() {
        if (!execution?.transfer || submitting) return;
        const currentTransfer = execution.transfer;

        if (execution.phase === "MOVE_OUT") {
            let compensationAmount = 0;
            if (requiresFullMoveOut(currentTransfer)) {
                const rawAmount = String(oldRoomCompensationAmount || "").trim();
                compensationAmount = rawAmount === "" ? 0 : Number(rawAmount);
                if (!Number.isFinite(compensationAmount) || compensationAmount < 0 || !Number.isInteger(compensationAmount)) {
                    toast.error("Khoản bồi thường phòng cũ phải là số tiền không âm.");
                    return;
                }
                if (oldRoomCompensationNote.trim().length > 1000) {
                    toast.error("Ghi chú bồi thường phòng cũ tối đa 1000 ký tự.");
                    return;
                }
            }
            if (execution.transferOutRequired && !execution.transferOutReady) {
                const saveTransferOut = transferOutActionRef.current?.save;
                if (!saveTransferOut) {
                    toast.error("Biểu mẫu bàn giao phòng cũ chưa sẵn sàng.");
                    return;
                }
                const saved = await saveTransferOut();
                if (!saved) return;
            }
            setSubmitting(true);
            try {
                await executeTransfer(currentTransfer.id, {
                    positiveDifferenceSettlementType: null,
                    oldRoomCompensationAmount: compensationAmount,
                    oldRoomCompensationNote: oldRoomCompensationNote.trim() || null,
                });
                await refreshAfterAction(!requiresFullMoveOut(currentTransfer)
                    ? "Đã xác nhận nhóm người chuyển đi."
                    : compensationAmount > 0
                        ? "Đã bàn giao phòng cũ và tạo hóa đơn bồi thường."
                        : "Đã ghi nhận bàn giao phòng cũ."
                );
            } catch (error) {
                console.error(error);
                toast.error(error?.message || (!requiresFullMoveOut(currentTransfer)
                    ? "Không thể tiếp tục chuyển phòng."
                    : "Không thể ghi nhận bàn giao phòng cũ."));
                setSubmitting(false);
            }
            return;
        }

        if (requiresFullMoveIn(currentTransfer) && !execution.transferInReady) {
            const saveTransferIn = transferInActionRef.current?.save;
            if (!saveTransferIn) {
                toast.error("Biểu mẫu bàn giao phòng mới chưa sẵn sàng.");
                return;
            }
            const saved = await saveTransferIn();
            if (!saved) return;
        }

        setSubmitting(true);
        try {
            await completeTransfer(currentTransfer.id, {positiveDifferenceSettlementType: null});
            await refreshAfterAction("Đã hoàn tất chuyển phòng.");
        } catch (error) {
            console.error(error);
            toast.error(error?.message || "Không thể hoàn tất chuyển phòng.");
            setSubmitting(false);
        }
    }

    if (!open) return null;

    const disabled = loading || submitting;
    const transfer = execution?.transfer || preloadedTransfer;
    const isMoveOutPhase = execution?.phase === "MOVE_OUT";
    const targetContractId = transfer?.newContractId || transfer?.targetContractId || null;
    const canSubmit = Boolean(execution?.transfer) && (
        isMoveOutPhase || !requiresFullMoveIn(transfer) || targetContractId
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen && !disabled) onClose?.();
            }}
        >
            <DialogContent
                showCloseButton={false}
                className="z-[70] flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl bg-white p-0 shadow-2xl sm:max-h-[94vh] sm:max-w-5xl"
                overlayClassName="z-[70] bg-[#091426]/70 backdrop-blur-sm"
                onEscapeKeyDown={(event) => {
                    if (disabled) event.preventDefault();
                }}
                onPointerDownOutside={(event) => {
                    if (disabled) event.preventDefault();
                }}
            >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                            {isMoveOutPhase
                                ? execution?.transferOutRequired
                                    ? "Bàn giao phòng cũ"
                                    : "Xác nhận người chuyển phòng"
                                : "Hoàn tất chuyển phòng"}
                        </p>
                        <DialogTitle className="mt-1 text-lg font-extrabold text-gray-950">
                            {loading
                                ? "Đang tải yêu cầu chuyển phòng"
                                : isMoveOutPhase
                                    ? execution?.transferOutRequired
                                        ? getTransferOutScopeTitle(transfer)
                                        : "Chuyển người sang phòng mới"
                                    : "Hoàn tất chuyển phòng"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Biểu mẫu bàn giao và hoàn tất chuyển phòng.
                        </DialogDescription>
                        {isMoveOutPhase && (
                            <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-gray-600">
                                {execution?.transferOutRequired
                                    ? getTransferOutScopeDescription(transfer)
                                    : "Phòng cũ vẫn còn người ở; không cần chốt phòng cũ hoặc nhập lại chỉ số phòng."}
                            </p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-gray-500">
                            {transfer?.requestCode || requestCode || `#${transfer?.id || effectiveRequestId || ""}`}
                        </p>
                    </div>
                    <DialogClose asChild>
                        <button
                            type="button"
                            disabled={disabled}
                            aria-label="Đóng"
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-60"
                        >
                            <X className="h-5 w-5"/>
                        </button>
                    </DialogClose>
                </header>

                {loading ? (
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="flex min-h-64 items-center justify-center gap-3 px-5 py-10 text-sm font-semibold text-gray-600">
                        <Loader2 className="h-5 w-5 animate-spin"/>
                        Đang tải dữ liệu chuyển phòng...
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            <div className="space-y-5 px-5 py-5">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                <div className="rounded-xl bg-gray-50 p-4">
                                    <p className="mb-1 text-xs font-semibold text-gray-500">Phòng cũ</p>
                                    <p className="text-sm font-extrabold text-gray-950">
                                        {transfer?.oldRoomName || transfer?.oldRoomCode || "--"}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4">
                                    <p className="mb-1 text-xs font-semibold text-gray-500">Phòng mới</p>
                                    <p className="text-sm font-extrabold text-gray-950">
                                        {transfer?.targetRoomName || transfer?.targetRoomCode || "--"}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4">
                                    <p className="mb-1 text-xs font-semibold text-gray-500">Tiến trình chuyển phòng</p>
                                    <p className="text-sm font-extrabold text-gray-950">{getStatusLabel(transfer?.status, transfer)}</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4">
                                    <p className="mb-1 text-xs font-semibold text-gray-500">Phạm vi chốt</p>
                                    <p className="text-sm font-extrabold text-gray-950">
                                        {requiresFullMoveOut(transfer) ? "Toàn bộ phòng" : "Người rời phòng"}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                                <span>Trạng thái hợp đồng cũ: {getLeaseStatusLabel(transfer?.oldContractStatus)}</span>
                                <span className="mx-2 text-slate-300">•</span>
                                <span>Hợp đồng mới: {getLeaseStatusLabel(transfer?.newContractStatus || transfer?.targetContractStatus)}</span>
                            </div>

                            {isMoveOutPhase ? (
                                <div className="space-y-4">
                                    {execution?.transferOutRequired ? (
                                        <ContractHandoverSection
                                        contractId={transfer?.oldContractId}
                                        roomId={transfer?.oldRoomId}
                                        roomCode={transfer?.oldRoomName || transfer?.oldRoomCode}
                                        readonly={submitting}
                                        actionRef={transferOutActionRef}
                                        handoverType="TRANSFER_OUT"
                                        title={getTransferOutScopeTitle(transfer)}
                                        description={getTransferOutScopeDescription(transfer)}
                                        showAssets={requiresFullMoveOut(transfer)}
                                        hideSaveButton
                                        confirmOnSave={false}
                                        onLoaded={handleTransferOutLoaded}
                                        onSaved={handleTransferOutSaved}
                                        />
                                    ) : (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                            <p className="text-sm font-extrabold text-emerald-900">
                                                {requiresFullMoveOut(transfer)
                                                    ? "Phòng cũ đã được xử lý trước đó."
                                                    : "Phòng cũ vẫn còn người ở; không cần chốt phòng cũ."}
                                            </p>
                                            <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
                                                {requiresFullMoveOut(transfer)
                                                    ? "Hệ thống đã đối chiếu trạng thái hợp đồng và dữ liệu chốt phòng; không cần nhập lại chỉ số điện cũ."
                                                    : "Hệ thống chỉ xử lý nhóm người chuyển đi và giữ nguyên dữ liệu vận hành của phòng cũ cho những người ở lại."}
                                            </p>
                                        </div>
                                    )}

                                    {requiresFullMoveOut(transfer) && (
                                        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"/>
                                                <div>
                                                    <h4 className="text-sm font-extrabold text-amber-950">
                                                        Bồi thường/phát sinh phòng cũ
                                                    </h4>
                                                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                                                        Nếu phòng cũ trống sau chuyển phòng, nhập khoản bồi thường nếu có. Hệ thống sẽ tạo hóa đơn tất toán riêng.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
                                                <label className="space-y-1.5">
                                                    <span className="text-xs font-bold text-amber-900">Số tiền bồi thường</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1000"
                                                        value={oldRoomCompensationAmount}
                                                        onChange={(event) => setOldRoomCompensationAmount(event.target.value)}
                                                        disabled={disabled}
                                                        className="h-11 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm font-extrabold text-gray-950 outline-none focus:border-amber-500 disabled:bg-amber-100 disabled:text-amber-600"
                                                    />
                                                </label>
                                                <label className="space-y-1.5">
                                                    <span className="text-xs font-bold text-amber-900">Ghi chú</span>
                                                    <textarea
                                                        rows={2}
                                                        value={oldRoomCompensationNote}
                                                        onChange={(event) => setOldRoomCompensationNote(event.target.value)}
                                                        disabled={disabled}
                                                        placeholder="Ví dụ: bồi thường khóa cửa hỏng, vệ sinh phòng..."
                                                        className="min-h-11 w-full resize-y rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-amber-500 disabled:bg-amber-100 disabled:text-amber-600"
                                                    />
                                                </label>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                        <p className="text-sm font-semibold text-blue-950">Phòng cũ đã được chốt.</p>
                                        {transfer?.oldRoomFinalInvoiceId ? (
                                            <p className="mt-1 text-xs font-semibold text-blue-700">
                                                Hóa đơn điện chốt phòng cũ: #{transfer.oldRoomFinalInvoiceId}. Hóa đơn này cần được thanh toán trước khi hoàn tất chuyển phòng.
                                            </p>
                                        ) : (
                                            <p className="mt-1 text-xs font-semibold text-blue-700">
                                                Không có hóa đơn điện phát sinh cho phòng cũ hoặc hóa đơn đã được xử lý.
                                            </p>
                                        )}
                                    </div>

                                    {requiresFullMoveIn(transfer) ? (
                                        execution?.transferInReady ? (
                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                                                Bàn giao phòng mới đã được xác nhận trong bước kích hoạt hợp đồng. Không cần nhập lại khi hoàn tất yêu cầu.
                                            </div>
                                        ) : (
                                            <ContractHandoverSection
                                            contractId={targetContractId}
                                            roomId={transfer?.targetRoomId}
                                            roomCode={transfer?.targetRoomName || transfer?.targetRoomCode}
                                            readonly={submitting}
                                            actionRef={transferInActionRef}
                                            handoverType="TRANSFER_IN"
                                            title="Nhận phòng mới"
                                            description="Lưu bàn giao phòng mới bằng luồng bàn giao hợp đồng trước khi hoàn tất chuyển phòng."
                                            showAssets
                                            hideSaveButton
                                            confirmOnSave={false}
                                            onLoaded={handleTransferInLoaded}
                                            onSaved={handleTransferInSaved}
                                            />
                                        )
                                    ) : (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                                            Trường hợp này không cần nhập thông tin nhận phòng mới. Bấm “Hoàn tất chuyển phòng” để cập nhật trạng thái.
                                        </div>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>

                        <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={disabled}
                                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-extrabold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={disabled || !canSubmit}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin"/>
                                ) : (
                                    <CheckCircle2 className="h-4 w-4"/>
                                )}
                                {isMoveOutPhase
                                    ? execution?.transferOutRequired
                                        ? "Bàn giao phòng cũ"
                                        : "Tiếp tục chuyển phòng"
                                    : "Hoàn tất chuyển phòng"}
                            </button>
                        </footer>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
