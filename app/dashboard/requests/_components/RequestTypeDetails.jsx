import { ArrowRight, ArrowRightLeft, Calendar, CheckCircle2, Clock3, DollarSign, ExternalLink, FileText, Gauge, MapPin, User, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toDate } from "@/lib/dateFormat";
import { InfoField, formatMoney } from "./RequestDetailFields";

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
const REQUEST_TIME_ZONE = "Asia/Ho_Chi_Minh";

const ENUM_LABELS = {
    AIR_CONDITIONER: "Máy lạnh",
    CARD: "Thẻ ra vào",
    CLEANING: "Vệ sinh",
    DOOR_LOCK: "Khóa cửa",
    ELECTRICITY: "Điện",
    FURNITURE: "Nội thất",
    HIGH: "Cao",
    INTERNET: "Internet",
    LOW: "Thấp",
    MAINTENANCE_COMPENSATION: "Bồi thường chi phí bảo trì",
    MEDIUM: "Trung bình",
    NORMAL: "Bình thường",
    PAINTING: "Sơn sửa",
    RULE_VIOLATION: "Vi phạm nội quy",
    RESET_WIFI_PASSWORD: "Tự ý reset mật khẩu modem/wifi",
    WATER: "Nước",
    VIOLATION_FINE: "Phạt vi phạm nội quy",
    APPROVED: "Đã duyệt",
    COMPLETED: "Đã hoàn tất",
    PENDING: "Đang chờ xử lý",
    PROCESSING: "Đang xử lý",
    REJECTED: "Đã từ chối",
    CONFIRMED: "Đã xác nhận",
    DISPUTED: "Chưa thống nhất",
    NOT_REQUIRED: "Không áp dụng",
    TENANT_CONFIRMED: "Khách đã xác nhận",
    WAITING: "Đang chờ xử lý",
    WAITING_APPROVAL: "Chờ duyệt",
    WAITING_CONFIRMATION: "Chờ xác nhận",
};

const enumLabel = (value, fallback = "Chưa xác định") => {
    if (value === undefined || value === null || value === "") return fallback;
    const text = String(value).trim();
    const normalized = text.toUpperCase();
    return ENUM_LABELS[normalized] || (text.includes("_") || text === normalized ? fallback : text);
};

const joinObjectValues = (value) => {
    if (!value || typeof value !== "object") return "";
    return Object.values(value).map((item) => String(item || "").trim()).filter(Boolean).join(", ");
};

const formatRoomLabel = (code, name) => {
    const codeText = String(code || "").trim();
    const nameText = String(name || "").trim();
    if (codeText && nameText) return `${codeText} - ${nameText}`;
    return codeText || nameText;
};

const formatPaymentBranch = (value) => {
    const map = {
        PAY_NOW: "Thanh toán ngay",
        TENANT_PAY_MORE: "Thanh toán ngay",
        ADD_TO_NEXT_INVOICE: "Cộng vào hóa đơn kỳ sau",
        CREDIT_NEXT_CONTRACT: "Giữ/cấn sang hợp đồng mới",
        NO_DIFFERENCE: "Không có chênh lệch",
        UNSELECTED_POSITIVE_DIFFERENCE: "Chưa chọn phương thức",
        UNSELECTED_NEGATIVE_DIFFERENCE: "Chưa chọn phương thức",
    };
    return map[String(value || "").trim().toUpperCase()] || enumLabel(value, "Chưa chọn phương thức");
};

function formatVnd(value) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

function formatDateValue(value) {
    const date = toDate(value);
    if (!date) return value ? String(value) : "";
    return date.toLocaleDateString("vi-VN", {
        timeZone: REQUEST_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatEligibilityResult(value) {
    if (value === true) return "Đủ điều kiện";
    if (value === false) return "Không đủ điều kiện";
    return "Chưa có dữ liệu";
}

const RENEWAL_BLOCKED_REASON_LABELS = {
    ROOM_ALREADY_RESERVED_BY_NEW_TENANT: "Phòng đang được giữ chỗ cho khách khác.",
    ROOM_RESERVED_BY_OTHER_TENANT: "Phòng đã có khách khác đặt cọc hoặc giữ chỗ.",
    ROOM_ALREADY_RESERVED: "Phòng đã có người đặt cọc hoặc giữ chỗ.",
};

function formatRenewalBlockedReason(value) {
    if (!value) return "";
    const text = String(value).trim();
    const normalized = text.toUpperCase();
    return RENEWAL_BLOCKED_REASON_LABELS[normalized]
        || (text.includes("_") || text === normalized ? "Có điều kiện gia hạn chưa đáp ứng." : text);
}

function RoomTransferEligibilitySummary({ transfer }) {
    if (!transfer) return null;
    const debt = transfer.debtSummary || {};
    const violation = transfer.violationSummary || {};
    const debtAmount = Number(debt.totalDebtAmount || 0);
    const violationCount = Number(violation.totalCount || 0);
    const transferCount = Number(transfer.transferCountThisYear || 0);
    const hasHighlights = debtAmount > 0 || debt.overLimit || violationCount > 0 || transferCount > 0;

    return (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-400/20 dark:bg-blue-500/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Điều kiện chuyển phòng</p>
                <Badge
                    variant="outline"
                    className={transfer.eligibleAtCreation === false
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
                        : transfer.eligibleAtCreation === true
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"}
                >
                    {formatEligibilityResult(transfer.eligibleAtCreation)}
                </Badge>
            </div>

            {hasHighlights ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    {(debtAmount > 0 || debt.overLimit) && (
                        <span className="rounded-full bg-white px-3 py-1.5 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                            Công nợ: <span className={debt.overLimit ? "text-red-600 dark:text-red-300" : "text-slate-900 dark:text-white"}>{formatVnd(debtAmount)}</span>
                        </span>
                    )}
                    {violationCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                            Vi phạm: {violationCount}
                        </span>
                    )}
                    {transferCount > 0 && (
                        <span className="rounded-full bg-white px-3 py-1.5 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                            Đã chuyển phòng năm nay: {transferCount} lần
                        </span>
                    )}
                </div>
            ) : (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Không có vấn đề cần lưu ý.</p>
            )}
        </div>
    );
}

function parseDateValue(value) {
    return toDate(value);
}

function buildRenewalTermChecks(payload) {
    const startDateValue = firstValue(payload.newStartDate, payload.new_start_date, payload.startDate, payload.start_date);
    const newEndDate = firstValue(payload.newEndDate, payload.new_end_date, payload.endDate, payload.end_date);
    const monthlyRent = firstValue(payload.monthlyRent, payload.monthly_rent, payload.newRent, payload.new_rent);
    const paymentCycleMonths = firstValue(payload.paymentCycleMonths, payload.payment_cycle_months);
    const depositAmount = firstValue(payload.depositAmount, payload.deposit_amount);
    const startDate = parseDateValue(startDateValue);
    const endDate = parseDateValue(newEndDate);
    const rent = Number(monthlyRent);
    const cycle = Number(paymentCycleMonths);
    const deposit = Number(depositAmount);

    return [
        {
            label: "Thời gian gia hạn",
            valid: Boolean(startDate && endDate && endDate > startDate),
            detail: !startDate
                ? "Chưa có ngày bắt đầu mới"
                : !endDate
                    ? "Chưa có ngày kết thúc mới"
                    : endDate <= startDate
                        ? "Ngày kết thúc phải sau ngày bắt đầu"
                        : `${formatDateValue(startDateValue)} - ${formatDateValue(newEndDate)}`,
        },
        {
            label: "Giá thuê mới",
            valid: Number.isFinite(rent) && rent > 0,
            detail: !Number.isFinite(rent) ? "Chưa có giá thuê" : rent <= 0 ? "Giá thuê phải lớn hơn 0" : formatVnd(rent),
        },
        {
            label: "Chu kỳ thanh toán",
            valid: cycle === 1 || cycle === 3,
            detail: !Number.isFinite(cycle) ? "Chưa có chu kỳ thanh toán" : cycle === 1 || cycle === 3 ? `${cycle} tháng` : "Chỉ áp dụng chu kỳ 1 hoặc 3 tháng",
        },
        {
            label: "Tiền cọc",
            valid: Number.isFinite(deposit) && deposit >= 0,
            detail: !Number.isFinite(deposit) ? "Chưa có tiền cọc" : deposit < 0 ? "Tiền cọc không thể âm" : formatVnd(deposit),
        },
    ];
}

function RenewalEligibilitySummary({ payload }) {
    const checks = buildRenewalTermChecks(payload);
    const blockedReason = formatRenewalBlockedReason(firstValue(
        payload.canRenewBlockedReason,
        payload.can_renew_blocked_reason,
        payload.renewalBlockedReason,
        payload.renewal_blocked_reason,
        payload.blockedReason,
        payload.blocked_reason
    ));
    const explicitCanRenew = firstValue(payload.canRenew, payload.can_renew, payload.canRenewAtCreation, payload.can_renew_at_creation);
    const hasInvalidTerm = checks.some((check) => !check.valid);
    const isBlocked = explicitCanRenew === false || Boolean(blockedReason) || hasInvalidTerm;
    const reviewMessage = blockedReason || checks.filter((check) => !check.valid).map((check) => `${check.label}: ${check.detail}`).join("; ");

    return (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-400/20 dark:bg-indigo-500/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">Điều kiện gia hạn</p>
                <Badge
                    variant="outline"
                    className={isBlocked
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"}
                >
                    {isBlocked ? "Cần xem lại thông tin" : "Thông tin hợp lệ"}
                </Badge>
            </div>

            {isBlocked && reviewMessage && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-400/30 dark:bg-amber-500/10">
                    <p className="text-xs text-amber-700 dark:text-amber-300">{reviewMessage}</p>
                </div>
            )}
        </div>
    );
}

const formatTransferType = (value) => {
    if (!value) return null;
    const map = {
        NEW_CONTRACT: "Hợp đồng mới",
        JOIN_EXISTING_CONTRACT: "Vào hợp đồng hiện có",
        TAKE_OVER_CONTRACT: "Tiếp nhận hợp đồng",
    };
    return map[value] || enumLabel(value);
};

const formatSettlementType = (value) => {
    if (!value) return null;
    const map = {
        TENANT_PAY_MORE: "Khách thanh toán thêm ngay",
        ADD_TO_NEXT_INVOICE: "Cộng vào hóa đơn kỳ tới",
    };
    return map[value] || enumLabel(value);
};

export function TransferRequestDetail({ payload, transfer }) {
    if (!payload && !transfer) return null;

    const holderCandidateNames = joinObjectValues(transfer?.sourceHolderCandidateNames);
    const currentRoom = firstValue(transfer?.oldRoomName, payload?.currentRoom, payload?.current_room, payload?.fromRoom, payload?.from_room);
    const currentRoomCode = firstValue(transfer?.oldRoomCode, payload?.currentRoomCode, payload?.current_room_code, payload?.fromRoomCode, payload?.from_room_code);
    const targetRoom = firstValue(transfer?.targetRoomName, payload?.targetRoom, payload?.target_room, payload?.desiredRoom, payload?.desired_room, payload?.toRoom, payload?.to_room);
    const targetRoomCode = firstValue(transfer?.targetRoomCode, payload?.targetRoomCode, payload?.target_room_code, payload?.toRoomCode, payload?.to_room_code);
    const currentRoomLabel = formatRoomLabel(currentRoomCode, currentRoom);
    const targetRoomLabel = formatRoomLabel(targetRoomCode, targetRoom);
    const transferDate = firstValue(transfer?.expectedTransferDate, transfer?.requestedTransferDate, payload?.transferDate, payload?.transfer_date, payload?.requestedDate, payload?.requested_date);
    const rawTransferType = firstValue(transfer?.targetTransferType, payload?.targetTransferType, payload?.target_transfer_type, payload?.transferType, payload?.transfer_type);
    const transferType = rawTransferType === "OTHER_CONTRACT" ? "Vào hợp đồng hiện có" : formatTransferType(rawTransferType);
    const rawSettlementType = firstValue(transfer?.priceDifferenceSettlementType, transfer?.positiveDifferenceSettlementType, payload?.positiveDifferenceSettlementType, payload?.positive_difference_settlement_type, payload?.settlementType, payload?.settlement_type);
    const paymentPlan = formatPaymentBranch(firstValue(transfer?.paymentBranch, rawSettlementType)) || formatSettlementType(rawSettlementType);
    const priceDifference = firstValue(transfer?.priceDifferenceAmount, payload?.priceDifferenceAmount, payload?.price_difference_amount, transfer?.priceDifferenceToPay, payload?.priceDifferenceToPay, payload?.price_difference_to_pay, payload?.additionalPaymentAmount, payload?.additional_payment_amount);
    const hasPriceDifference = priceDifference != null && priceDifference !== "" && Number(priceDifference) !== 0;
    const targetHolder = firstValue(holderCandidateNames, payload?.targetHolderName, payload?.target_holder_name, payload?.targetTenantName, payload?.target_tenant_name);
    const note = firstValue(payload?.note, payload?.transferNote, payload?.transfer_note, payload?.additionalNote, payload?.additional_note);
    const reason = firstValue(transfer?.reason, payload?.reason, payload?.transferReason, payload?.transfer_reason);
    const handoverText = [
        transfer?.transferOutHandoverRequired ? "Bàn giao phòng cũ" : "",
        transfer?.transferInHandoverRequired ? "Nhận phòng mới" : "",
        transfer?.roomHandoverRequired ? "Bàn giao phòng" : "",
    ].filter(Boolean).join(" · ");

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoField label="Hợp đồng cũ" value={transfer?.oldContractCode} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Ngày chuyển dự kiến" value={formatDateValue(transferDate)} icon={<Calendar className="w-4 h-4" />} />                
                <InfoField label="Phòng muốn chuyển" value={targetRoomLabel} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Phòng cũ" value={currentRoomLabel} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Hình thức chuyển" value={transferType} icon={<ArrowRightLeft className="w-4 h-4" />} />
                {rawTransferType === "OTHER_CONTRACT" && targetHolder && (
                    <InfoField label="Người đại diện phòng đích" value={targetHolder} icon={<User className="w-4 h-4" />} />
                )}
                {hasPriceDifference && (
                    <>
                        <InfoField label="Chênh lệch cần xử lý" value={formatMoney(priceDifference)} icon={<DollarSign className="w-4 h-4" />} />
                        <InfoField label="Phương án xử lý chênh lệch" value={paymentPlan} icon={<Wallet className="w-4 h-4" />} />
                    </>
                )}
                {handoverText && <InfoField label="Bàn giao cần thực hiện" value={handoverText} icon={<ArrowRightLeft className="w-4 h-4" />} />}
            </div>

            {(reason || note) && (
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                    <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Ghi chú yêu cầu</p>
                    {reason && <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{reason}</p>}
                    {note && note !== reason && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{note}</p>}
                </div>
            )}

            <RoomTransferEligibilitySummary transfer={transfer} />
        </div>
    );
}

export function MoveoutRequestDetail({ payload }) {
    if (!payload) return null;

    return (
        <div className="grid grid-cols-2 gap-4">
            <InfoField label="Phòng" value={payload.room || payload.roomCode || payload.room_code} icon={<MapPin className="w-4 h-4" />} />
            <InfoField label="Ngày dự kiến trả phòng" value={formatDateValue(payload.moveOutDate || payload.move_out_date || payload.expectedDate || payload.expected_date)} icon={<Calendar className="w-4 h-4" />} />
            {(payload.reason || payload.moveOutReason || payload.move_out_reason) && (
                <div className="col-span-2 rounded-xl bg-green-50 p-4 dark:bg-green-500/10">
                    <p className="text-sm font-semibold text-green-700 mb-1 dark:text-green-300">Lý do trả phòng</p>
                    <p className="text-sm text-green-600 whitespace-pre-wrap dark:text-green-200">{payload.reason || payload.moveOutReason || payload.move_out_reason}</p>
                </div>
            )}
        </div>
    );
}

export function RenewalRequestDetail({ payload }) {
    if (!payload) return null;
    const paymentCycleMonths = firstValue(payload.paymentCycleMonths, payload.payment_cycle_months);
    const depositAmount = firstValue(payload.depositAmount, payload.deposit_amount);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <InfoField label="Phòng" value={payload.room || payload.roomCode || payload.room_code} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Ngày bắt đầu mới" value={formatDateValue(payload.newStartDate || payload.new_start_date || payload.startDate || payload.start_date)} icon={<Calendar className="w-4 h-4" />} />
                <InfoField label="Ngày kết thúc sau gia hạn" value={formatDateValue(payload.newEndDate || payload.new_end_date || payload.endDate || payload.end_date)} icon={<Calendar className="w-4 h-4" />} />
                {(payload.newRent || payload.new_rent || payload.monthlyRent || payload.monthly_rent) && (
                    <InfoField label="Giá thuê mới" value={formatMoney(payload.newRent || payload.new_rent || payload.monthlyRent || payload.monthly_rent)} icon={<DollarSign className="w-4 h-4" />} />
                )}
                {paymentCycleMonths && <InfoField label="Chu kỳ thanh toán" value={`${paymentCycleMonths} tháng`} icon={<Calendar className="w-4 h-4" />} />}
                {depositAmount != null && <InfoField label="Tiền cọc" value={formatMoney(depositAmount)} icon={<DollarSign className="w-4 h-4" />} />}
            </div>

            <RenewalEligibilitySummary payload={payload} />
        </div>
    );
}

const LIQUIDATION_STAGE_LABELS = {
    WAITING_HANDOVER: "Chờ bàn giao trả phòng",
    WAITING_PAYMENT: "Chờ thanh toán công nợ cuối kỳ",
    WAITING_DEPOSIT_REFUND: "Chờ hoàn cọc",
    WAITING_DEPOSIT_FORFEITURE_CONFIRMATION: "Chờ xác nhận mất cọc",
    READY_TO_COMPLETE: "Sẵn sàng hoàn tất thanh lý",
    // Kept as a compatibility label for old request payloads; it is no longer a required step.
    WAITING_SIGNED_DOCUMENT: "Sẵn sàng hoàn tất thanh lý",
    WAITING_REPLACEMENT_CONTRACT: "Chờ hợp đồng thay thế",
    CONFIRMED: "Đã hoàn tất thanh lý",
};

const LIQUIDATION_STATUS_LABELS = {
    NOT_REQUIRED: "Không áp dụng",
    PENDING: "Đang chờ xử lý",
    APPROVED_WAITING_TENANT_CONFIRMATION: "Đã duyệt, chờ khách xác nhận đã nhận tiền",
    RECORDED_BY_MANAGER: "Đã ghi nhận, chờ khách xác nhận đã nhận tiền",
    TENANT_CONFIRMED: "Khách đã xác nhận",
    AUTOMATICALLY_FORFEITED: "Đã tự động mất cọc",
    PENDING_TENANT_CONFIRMATION: "Chờ khách xác nhận chấp nhận mất cọc",
    DISPUTED: "Khách chưa chấp nhận",
};

function parseObjectValue(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function isChecked(value) {
    return value === true || value === 1 || value === "true";
}

function liquidationStatusLabel(value) {
    return LIQUIDATION_STATUS_LABELS[value] || (value ? enumLabel(value) : "Chưa cập nhật");
}

function LiquidationTracking({ payload }) {
    const checklist = parseObjectValue(payload?.liquidationChecklist);
    const stage = firstValue(payload?.liquidationStage, payload?.liquidation_stage);
    const refundStatus = firstValue(payload?.depositRefundStatus, payload?.deposit_refund_status);
    const forfeitureStatus = firstValue(payload?.depositForfeitureStatus, payload?.deposit_forfeiture_status);
    const hasForfeitureFlow = Boolean(
        forfeitureStatus && forfeitureStatus !== "NOT_REQUIRED",
    );
    const depositStatus = hasForfeitureFlow ? forfeitureStatus : refundStatus;
    const depositDone = hasForfeitureFlow
        ? forfeitureStatus === "NOT_REQUIRED" || forfeitureStatus === "TENANT_CONFIRMED" || forfeitureStatus === "AUTOMATICALLY_FORFEITED" || isChecked(checklist.depositForfeitureConfirmed)
        : refundStatus === "NOT_REQUIRED" || refundStatus === "TENANT_CONFIRMED" || isChecked(checklist.depositRefundConfirmed);
    const replacementRequired =
        stage === "WAITING_REPLACEMENT_CONTRACT" ||
        Object.prototype.hasOwnProperty.call(checklist, "replacementContractSigned");

    const items = [
        {
            label: "Bàn giao trả phòng",
            done: isChecked(checklist.handoverConfirmed),
            detail: isChecked(checklist.handoverConfirmed) ? "Đã xác nhận" : "Chưa hoàn tất bàn giao",
        },
        {
            label: "Hóa đơn cuối kỳ",
            done: isChecked(checklist.finalInvoicePaid),
            detail: isChecked(checklist.finalInvoicePaid) ? "Đã thanh toán" : "Chưa thanh toán đủ",
        },
        {
            label: hasForfeitureFlow ? "Xác nhận mất cọc" : "Hoàn cọc",
            done: depositDone,
            detail: liquidationStatusLabel(depositStatus),
        },
    ];

    if (replacementRequired) {
        items.push({
            label: "Hợp đồng thay thế",
            done: isChecked(checklist.replacementContractSigned),
            detail: isChecked(checklist.replacementContractSigned) ? "Đã ký" : "Chưa ký",
        });
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Tiến độ thanh lý hợp đồng</p>
                </div>
                <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300"
                >
                    {LIQUIDATION_STAGE_LABELS[stage] || (stage ? enumLabel(stage) : "Chờ duyệt yêu cầu")}
                </Badge>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                {items.map((item) => (
                    <div key={item.label} className="flex items-start gap-3 rounded-lg border border-white/80 bg-white p-3 dark:border-white/10 dark:bg-[#0f172a]">
                        {item.done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TerminationRequestDetail({ payload, request, onOpenContract }) {
    if (!payload) return null;
    const effectiveDate = payload.liquidationDate
        || payload.liquidation_date
        || payload.terminationDate
        || payload.termination_date
        || payload.effectiveDate
        || payload.effective_date;
    const reason = payload.reason || payload.terminationReason || payload.termination_reason;
    const contractId = firstValue(
        request?.targetId,
        payload.contractId,
        payload.contract_id,
        payload.leaseContractId,
        payload.lease_contract_id,
    );
    const contractCode = firstValue(
        payload.contractCode,
        payload.contract_code,
        payload.leaseContractCode,
        payload.lease_contract_code,
    );
    const room = firstValue(payload.room, payload.roomCode, payload.room_code);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoField label="Phòng" value={room} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Hợp đồng cần xử lý" value={contractCode} icon={<FileText className="w-4 h-4" />} />
                {effectiveDate && (
                    <InfoField label="Ngày dự kiến thanh lý" value={formatDateValue(effectiveDate)} icon={<Calendar className="w-4 h-4" />} />
                )}
            </div>

            {contractId && onOpenContract && (
                <button
                    type="button"
                    onClick={() => onOpenContract(contractId)}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                >
                    <ExternalLink className="h-4 w-4" />
                    Xem hợp đồng
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}

            <LiquidationTracking payload={payload} />

            {reason && (
                <div className="rounded-xl bg-red-50 p-4 dark:bg-red-500/10">
                    <p className="mb-1 text-sm font-semibold text-red-700 dark:text-red-300">Lý do thanh lý</p>
                    <p className="whitespace-pre-wrap text-sm text-red-600 dark:text-red-200">{reason}</p>
                </div>
            )}
        </div>
    );
}

export function ExpenseApprovalRequestDetail({ payload }) {
    if (!payload) return null;
    const amount = firstValue(payload.amount, payload.depositRefundAmount, payload.deposit_refund_amount);
    const isLiquidationRefund = firstValue(payload.sourceRequestType, payload.source_request_type) === "CONTRACT_LIQUIDATION";

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <InfoField label="Loại khoản chi" value={isLiquidationRefund ? "Hoàn cọc thanh lý hợp đồng" : "Chi phí vận hành"} icon={<Wallet className="w-4 h-4" />} />
                <InfoField label="Số tiền" value={amount == null ? null : formatMoney(amount)} icon={<DollarSign className="w-4 h-4" />} />
                <InfoField label="Phòng" value={firstValue(payload.roomCode, payload.room_code)} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Hợp đồng" value={firstValue(payload.contractCode, payload.contract_code)} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Ngày dự kiến thanh lý" value={formatDateValue(firstValue(payload.liquidationDate, payload.liquidation_date))} icon={<Calendar className="w-4 h-4" />} />
            </div>
        </div>
    );
}

export function MaintenanceRequestDetail({ payload }) {
    if (!payload) return null;

    return (
        <div className="grid grid-cols-2 gap-4">
            <InfoField label="Vị trí" value={payload.location || payload.room || payload.roomCode || payload.room_code} icon={<MapPin className="w-4 h-4" />} />
            {(payload.priority || payload.maintenancePriority || payload.maintenance_priority) && (
                            <InfoField label="Độ ưu tiên" value={enumLabel(payload.priority || payload.maintenancePriority || payload.maintenance_priority)} />
            )}
            {(payload.maintenanceType || payload.maintenance_type || payload.category) && (
                <InfoField label="Loại bảo trì" value={enumLabel(payload.maintenanceType || payload.maintenance_type || payload.category)} />
            )}
        </div>
    );
}

export function ComplaintRequestDetail({ payload }) {
    if (!payload) return null;

    return (
        <div className="space-y-4">
            {(payload.category || payload.complaintType || payload.complaint_type) && (
                <InfoField label="Loại khiếu nại" value={enumLabel(payload.category || payload.complaintType || payload.complaint_type)} />
            )}
            {(payload.priority || payload.complaintPriority || payload.complaint_priority) && (
                <InfoField label="Độ ưu tiên" value={enumLabel(payload.priority || payload.complaintPriority || payload.complaint_priority)} />
            )}
        </div>
    );
}

export function MeterReadingCorrectionRequestDetail({ payload }) {
    if (!payload) return null;

    const lineType = firstValue(payload.lineType, payload.line_type, payload.meterType, payload.meter_type);
    const utilityLabel = lineType === "ELECTRICITY"
        ? "Điện"
        : lineType === "WATER"
            ? "Nước"
            : enumLabel(lineType);
    const previousValue = firstValue(payload.previousValue, payload.previous_value);
    const currentValue = firstValue(payload.currentValue, payload.current_value);
    const reportedValue = firstValue(payload.reportedCurrentValue, payload.reported_current_value);
    const usageAmount = firstValue(payload.usageAmount, payload.usage_amount);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <InfoField label="Mã hóa đơn" value={firstValue(payload.invoiceCode, payload.invoice_code)} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Phòng" value={firstValue(payload.roomCode, payload.room_code)} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Kỳ hóa đơn" value={firstValue(payload.billingPeriod, payload.billing_period)} icon={<Calendar className="w-4 h-4" />} />
                <InfoField label="Loại chỉ số" value={utilityLabel} icon={<Gauge className="w-4 h-4" />} />
                <InfoField label="Chỉ số cũ" value={previousValue == null ? null : String(previousValue)} />
                <InfoField label="Chỉ số quản lý nhập" value={currentValue == null ? null : String(currentValue)} />
                <InfoField label="Chỉ số khách báo" value={reportedValue == null ? null : String(reportedValue)} />
                <InfoField label="Sản lượng tính tiền" value={usageAmount == null ? null : String(usageAmount)} />
                <InfoField label="Đơn giá" value={payload.unitPrice == null ? null : formatMoney(payload.unitPrice)} icon={<DollarSign className="w-4 h-4" />} />
                <InfoField label="Thành tiền dòng này" value={payload.lineAmount == null ? null : formatMoney(payload.lineAmount)} icon={<DollarSign className="w-4 h-4" />} />
            </div>

            {(payload.description || payload.reason) && (
                <div className="rounded-xl bg-cyan-50 p-4 dark:bg-cyan-500/10">
                    <p className="mb-1 text-sm font-semibold text-cyan-700 dark:text-cyan-300">Nội dung khách gửi</p>
                    <p className="whitespace-pre-wrap text-sm text-cyan-700 dark:text-cyan-200">{payload.description || payload.reason}</p>
                </div>
            )}
        </div>
    );
}

export function AccessRequestDetail({ payload }) {
    if (!payload) return null;

    return (
        <div className="grid grid-cols-2 gap-4">
            <InfoField label="Loại thẻ" value={enumLabel(payload.accessType || payload.access_type || payload.cardType || payload.card_type)} />
            {(payload.quantity || payload.cardQuantity || payload.card_quantity) && (
                <InfoField label="Số lượng" value={payload.quantity || payload.cardQuantity || payload.card_quantity} />
            )}
            {(payload.reason || payload.accessReason || payload.access_reason) && (
                <div className="col-span-2 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
                    <p className="text-sm font-semibold text-gray-700 mb-1 dark:text-slate-200">Lý do</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap dark:text-slate-300">{payload.reason || payload.accessReason || payload.access_reason}</p>
                </div>
            )}
        </div>
    );
}
