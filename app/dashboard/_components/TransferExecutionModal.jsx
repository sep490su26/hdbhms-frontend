"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {CheckCircle2, CircleDollarSign, Loader2, X} from "lucide-react";
import {toast} from "sonner";

import ContractHandoverSection from "@/app/dashboard/contract-template/ContractHandoverSection";
import {fetchContractHandover} from "@/services/contractHandoverService";
import {
    completeTransfer,
    executeTransfer,
    getRoomTransferByCode,
    getRoomTransferById,
} from "@/services/roomTransferService";

const EXECUTION_STATUSES = new Set(["WAITING_TRANSFER_DATE", "READY_FOR_HANDOVER", "WAITING_EXECUTION"]);
const CONFIRMED_STATUSES = new Set(["CONFIRMED", "CONFIRMED_BY_TENANT"]);

const TRANSFER_STATUS_LABELS = {
    REQUESTED: "Mới tạo",
    MANAGER_APPROVED: "Quản lý đã duyệt",
    WAITING_MANAGER_APPROVAL: "Chờ quản lý duyệt",
    WAITING_TARGET_HOLDER_APPROVAL: "Chờ chủ phòng đích duyệt",
    WAITING_TENANT_CONFIRMATION: "Chờ khách xác nhận",
    WAITING_PAYMENT: "Chờ thanh toán",
    WAITING_CONTRACT_CONFIRMATION: "Chờ quản lý xác nhận hợp đồng",
    WAITING_SIGNING: "Chờ quản lý upload bản ký",
    WAITING_CONTRACT_SIGNING: "Chờ quản lý upload bản ký",
    WAITING_TRANSFER_DATE: "Sẵn sàng chuyển phòng",
    READY_FOR_HANDOVER: "Sẵn sàng chuyển phòng",
    WAITING_EXECUTION: "Đang trong phiên chuyển phòng",
    EXECUTED: "Đã chuyển phòng",
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

function getStatusLabel(status) {
    return TRANSFER_STATUS_LABELS[status] || status || "Chưa rõ";
}

function getTransferOutScopeTitle(transfer) {
    return requiresFullMoveOut(transfer) ? "Checkout toàn bộ phòng cũ" : "Chốt rời phòng cũ";
}

function getTransferOutScopeDescription(transfer) {
    return requiresFullMoveOut(transfer)
        ? "Lưu bàn giao phòng cũ bằng luồng bàn giao hợp đồng, sau đó chốt để hệ thống tạo hóa đơn điện nước cuối kỳ."
        : "Phòng cũ vẫn còn người ở, chỉ chốt chỉ số điện/nước cho người chuyển đi; không cập nhật tài sản phòng.";
}

function isConfirmedHandover(handover) {
    return CONFIRMED_STATUSES.has(handover?.status);
}

async function loadConfirmedHandover(contractId, handoverType) {
    if (!contractId) return false;
    const handover = await fetchContractHandover(contractId, handoverType).catch(() => null);
    return isConfirmedHandover(handover);
}

export function isTransferExecutionStatus(status) {
    return EXECUTION_STATUSES.has(status);
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
                    throw new Error("Yêu cầu chưa tới bước vận hành chuyển phòng.");
                }

                const phase = transfer.status === "WAITING_EXECUTION" ? "COMPLETE_TRANSFER" : "MOVE_OUT";
                const targetContractId = transfer.newContractId || transfer.targetContractId || null;
                const [transferOutReady, transferInReady] = await Promise.all([
                    phase === "MOVE_OUT"
                        ? loadConfirmedHandover(transfer.oldContractId, "TRANSFER_OUT")
                        : Promise.resolve(false),
                    phase === "COMPLETE_TRANSFER" && requiresFullMoveIn(transfer)
                        ? loadConfirmedHandover(targetContractId, "TRANSFER_IN")
                        : Promise.resolve(false),
                ]);
                if (cancelled) return;
                setExecution({transfer, phase, transferOutReady, transferInReady});
            } catch (error) {
                console.error(error);
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
            if (!execution.transferOutReady) {
                const saveTransferOut = transferOutActionRef.current?.save;
                if (!saveTransferOut) {
                    toast.error("Form bàn giao phòng cũ chưa sẵn sàng.");
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
                await refreshAfterAction(compensationAmount > 0
                    ? "Đã chốt phòng cũ và tạo hóa đơn bồi thường."
                    : "Đã chốt phòng cũ."
                );
            } catch (error) {
                console.error(error);
                toast.error(error?.message || "Không thể chốt phòng cũ.");
                setSubmitting(false);
            }
            return;
        }

        if (requiresFullMoveIn(currentTransfer) && !execution.transferInReady) {
            const saveTransferIn = transferInActionRef.current?.save;
            if (!saveTransferIn) {
                toast.error("Form bàn giao phòng mới chưa sẵn sàng.");
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
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-[#091426]/70 p-2 backdrop-blur-sm sm:p-3"
            onClick={() => !disabled && onClose?.()}
        >
            <section
                className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                            {isMoveOutPhase ? "Chốt phòng cũ" : "Hoàn tất chuyển phòng"}
                        </p>
                        <h3 className="mt-1 text-lg font-extrabold text-gray-950">
                            {loading
                                ? "Đang tải yêu cầu chuyển phòng"
                                : isMoveOutPhase
                                    ? getTransferOutScopeTitle(transfer)
                                    : "Hoàn tất chuyển phòng"}
                        </h3>
                        {isMoveOutPhase && (
                            <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-gray-600">
                                {getTransferOutScopeDescription(transfer)}
                            </p>
                        )}
                        <p className="mt-1 text-sm font-semibold text-gray-500">
                            {transfer?.requestCode || requestCode || `#${transfer?.id || effectiveRequestId || ""}`}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={disabled}
                        aria-label="Đóng"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-60"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </header>

                {loading ? (
                    <div className="flex min-h-64 items-center justify-center gap-3 px-5 py-10 text-sm font-semibold text-gray-600">
                        <Loader2 className="h-5 w-5 animate-spin"/>
                        Đang tải dữ liệu chuyển phòng...
                    </div>
                ) : (
                    <>
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
                                    <p className="mb-1 text-xs font-semibold text-gray-500">Trạng thái</p>
                                    <p className="text-sm font-extrabold text-gray-950">{getStatusLabel(transfer?.status)}</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4">
                                    <p className="mb-1 text-xs font-semibold text-gray-500">Phạm vi chốt</p>
                                    <p className="text-sm font-extrabold text-gray-950">
                                        {requiresFullMoveOut(transfer) ? "Toàn bộ phòng" : "Người rời phòng"}
                                    </p>
                                </div>
                            </div>

                            {isMoveOutPhase ? (
                                <div className="space-y-4">
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
                                                Hóa đơn điện/nước chốt phòng cũ: #{transfer.oldRoomFinalInvoiceId}. Hóa đơn này cần được thanh toán trước khi hoàn tất chuyển phòng.
                                            </p>
                                        ) : (
                                            <p className="mt-1 text-xs font-semibold text-blue-700">
                                                Không có hóa đơn điện/nước phát sinh cho phòng cũ hoặc hóa đơn đã được xử lý.
                                            </p>
                                        )}
                                    </div>

                                    {requiresFullMoveIn(transfer) ? (
                                        <ContractHandoverSection
                                            contractId={targetContractId}
                                            roomId={transfer?.targetRoomId}
                                            roomCode={transfer?.targetRoomName || transfer?.targetRoomCode}
                                            readonly={submitting}
                                            actionRef={transferInActionRef}
                                            handoverType="TRANSFER_IN"
                                            title="Check-in phòng mới"
                                            description="Lưu bàn giao phòng mới bằng luồng bàn giao hợp đồng trước khi hoàn tất chuyển phòng."
                                            showAssets
                                            hideSaveButton
                                            confirmOnSave={false}
                                            onLoaded={handleTransferInLoaded}
                                            onSaved={handleTransferInSaved}
                                        />
                                    ) : (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                                            Ca này không cần check-in phòng mới dạng hợp đồng mới. Bấm hoàn tất để chuyển trạng thái theo backend.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <footer className="flex flex-col-reverse gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end">
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
                                {isMoveOutPhase ? "Chốt phòng cũ" : "Hoàn tất chuyển phòng"}
                            </button>
                        </footer>
                    </>
                )}
            </section>
        </div>
    );
}
