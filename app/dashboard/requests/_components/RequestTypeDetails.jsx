import { MapPin, Calendar, DollarSign, ArrowRightLeft, FileText, Wallet, User, Gauge } from "lucide-react";
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
};

const enumLabel = (value, fallback = "Chưa xác định") => {
    if (value === undefined || value === null || value === "") return fallback;
    const text = String(value).trim();
    return ENUM_LABELS[text.toUpperCase()] || (text.includes("_") ? fallback : text);
};

const joinObjectValues = (value) => {
    if (!value || typeof value !== "object") return "";
    return Object.values(value).map((item) => String(item || "").trim()).filter(Boolean).join(", ");
};

const formatRoomLabel = (code, name, id) => {
    const codeText = String(code || "").trim();
    const nameText = String(name || "").trim();
    if (codeText && nameText) return `${codeText} - ${nameText}`;
    return codeText || nameText || (id ? `#${id}` : "");
};

const formatId = (prefix, value) => value ? `${prefix} #${value}` : "";

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

function formatDateTimeValue(value) {
    const date = toDate(value);
    if (!date) return value ? String(value) : "--";
    return date.toLocaleString("vi-VN", {
        timeZone: REQUEST_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
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

function RoomTransferEligibilitySummary({ transfer }) {
    if (!transfer) return null;
    const debt = transfer.debtSummary || {};
    const violation = transfer.violationSummary || {};

    return (
        <div className="rounded-xl bg-white p-4 border border-blue-100 dark:border-blue-400/20 dark:bg-[#0f172a]">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Điều kiện chuyển phòng</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        Tóm tắt nợ, vi phạm và lịch sử chuyển phòng tại thời điểm tạo yêu cầu.
                    </p>
                </div>
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

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Kiểm tra lúc</p>
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{formatDateTimeValue(transfer.eligibilityCheckedAt)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Tổng nợ</p>
                    <p className={debt.overLimit ? "mt-1 text-sm font-bold text-red-700 dark:text-red-300" : "mt-1 text-sm font-bold text-gray-900 dark:text-white"}>
                        {formatVnd(debt.totalDebtAmount)}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                        Thuê {formatVnd(debt.rentDebtAmount)} · Tiện ích {formatVnd(debt.utilityDebtAmount)}
                    </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Vi phạm</p>
                    <p className={(violation.totalCount || 0) > 0 ? "mt-1 text-sm font-bold text-amber-700 dark:text-amber-300" : "mt-1 text-sm font-bold text-gray-900 dark:text-white"}>
                        {violation.totalCount ?? 0} ghi nhận
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                        {Array.isArray(violation.latestDescriptions) && violation.latestDescriptions.length > 0
                            ? violation.latestDescriptions.slice(0, 2).join(" · ")
                            : "Không có vi phạm đang mở"}
                    </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Số lần chuyển năm nay</p>
                    <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{transfer.transferCountThisYear ?? 0}</p>
                </div>
            </div>
        </div>
    );
}

function parseDateValue(value) {
    return toDate(value);
}

function buildRenewalTermChecks(payload) {
    const startDateValue = firstValue(payload.startDate, payload.start_date);
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
            label: "Thời hạn sau gia hạn",
            valid: Boolean(endDate && (!startDate || endDate > startDate)),
            detail: endDate ? `Kết thúc ${formatDateValue(newEndDate)}` : "Thiếu ngày kết thúc sau gia hạn",
        },
        {
            label: "Giá thuê",
            valid: Number.isFinite(rent) && rent > 0,
            detail: Number.isFinite(rent) ? formatVnd(rent) : "Chưa có giá thuê",
        },
        {
            label: "Chu kỳ thanh toán",
            valid: cycle === 1 || cycle === 3,
            detail: Number.isFinite(cycle) ? `${cycle} tháng` : "Chưa có chu kỳ",
        },
        {
            label: "Tiền cọc",
            valid: Number.isFinite(deposit) && deposit >= 0,
            detail: Number.isFinite(deposit) ? formatVnd(deposit) : "Chưa có tiền cọc",
        },
    ];
}

function RenewalEligibilitySummary({ payload }) {
    const checks = buildRenewalTermChecks(payload);
    const blockedReason = firstValue(
        payload.canRenewBlockedReason,
        payload.can_renew_blocked_reason,
        payload.renewalBlockedReason,
        payload.renewal_blocked_reason,
        payload.blockedReason,
        payload.blocked_reason
    );
    const explicitCanRenew = firstValue(payload.canRenew, payload.can_renew, payload.canRenewAtCreation, payload.can_renew_at_creation);
    const hasInvalidTerm = checks.some((check) => !check.valid);
    const isBlocked = explicitCanRenew === false || Boolean(blockedReason) || hasInvalidTerm;

    return (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-400/20 dark:bg-indigo-500/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">Điều kiện gia hạn</p>
                    <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                        Kiểm tra terms trong yêu cầu; blocker phòng sẽ hiển thị nếu backend trả về.
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className={isBlocked
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"}
                >
                    {isBlocked ? "Cần kiểm tra" : "Hợp lệ theo payload"}
                </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {checks.map((check) => (
                    <div key={check.label} className="rounded-lg border border-white/70 bg-white p-3 dark:border-white/10 dark:bg-[#0f172a]">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{check.label}</p>
                        <p className={check.valid ? "mt-1 text-sm font-bold text-slate-900 dark:text-white" : "mt-1 text-sm font-bold text-amber-700 dark:text-amber-300"}>
                            {check.detail}
                        </p>
                    </div>
                ))}
            </div>

            {blockedReason && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-400/30 dark:bg-amber-500/10">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Lý do cần xử lý</p>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{blockedReason}</p>
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

    const transferringTenantNames = joinObjectValues(transfer?.transferringTenantNames);
    const holderCandidateNames = joinObjectValues(transfer?.sourceHolderCandidateNames);
    const currentRoom = firstValue(transfer?.oldRoomName, payload?.currentRoom, payload?.current_room, payload?.fromRoom, payload?.from_room);
    const currentRoomCode = firstValue(transfer?.oldRoomCode, payload?.currentRoomCode, payload?.current_room_code, payload?.fromRoomCode, payload?.from_room_code);
    const targetRoom = firstValue(transfer?.targetRoomName, payload?.targetRoom, payload?.target_room, payload?.desiredRoom, payload?.desired_room, payload?.toRoom, payload?.to_room);
    const targetRoomCode = firstValue(transfer?.targetRoomCode, payload?.targetRoomCode, payload?.target_room_code, payload?.toRoomCode, payload?.to_room_code);
    const currentRoomLabel = formatRoomLabel(currentRoomCode, currentRoom, transfer?.oldRoomId);
    const targetRoomLabel = formatRoomLabel(targetRoomCode, targetRoom, transfer?.targetRoomId);
    const transferDate = firstValue(transfer?.expectedTransferDate, transfer?.requestedTransferDate, payload?.transferDate, payload?.transfer_date, payload?.requestedDate, payload?.requested_date);
    const rawTransferType = firstValue(transfer?.targetTransferType, payload?.targetTransferType, payload?.target_transfer_type, payload?.transferType, payload?.transfer_type);
    const transferType = rawTransferType === "OTHER_CONTRACT" ? "Vào hợp đồng hiện có" : formatTransferType(rawTransferType);
    const rawSettlementType = firstValue(transfer?.priceDifferenceSettlementType, transfer?.positiveDifferenceSettlementType, payload?.positiveDifferenceSettlementType, payload?.positive_difference_settlement_type, payload?.settlementType, payload?.settlement_type);
    const settlementType = formatPaymentBranch(rawSettlementType) || formatSettlementType(rawSettlementType);
    const paymentBranch = formatPaymentBranch(firstValue(transfer?.paymentBranch, rawSettlementType));
    const priceDifference = firstValue(transfer?.priceDifferenceAmount, payload?.priceDifferenceAmount, payload?.price_difference_amount, transfer?.priceDifferenceToPay, payload?.priceDifferenceToPay, payload?.price_difference_to_pay, payload?.additionalPaymentAmount, payload?.additional_payment_amount);
    const currentHolder = firstValue(transferringTenantNames, payload?.currentHolderName, payload?.current_holder_name, payload?.currentTenantName, payload?.current_tenant_name);
    const targetHolder = firstValue(holderCandidateNames, payload?.targetHolderName, payload?.target_holder_name, payload?.targetTenantName, payload?.target_tenant_name);
    const note = firstValue(payload?.note, payload?.transferNote, payload?.transfer_note, payload?.additionalNote, payload?.additional_note);
    const reason = firstValue(transfer?.reason, payload?.reason, payload?.transferReason, payload?.transfer_reason);
    const contractTarget = firstValue(
        formatId("Hợp đồng mới", transfer?.newContractId),
        formatId("Hợp đồng đích", transfer?.targetContractId),
    );
    const invoiceText = [
        formatId("Chênh lệch", transfer?.transferDifferenceInvoiceId),
        formatId("Hóa đơn điện phòng cũ", transfer?.oldRoomFinalInvoiceId),
    ].filter(Boolean).join(" · ");
    const handoverText = [
        transfer?.transferOutHandoverRequired ? "Bàn giao phòng cũ" : "",
        transfer?.transferInHandoverRequired ? "Nhận phòng mới" : "",
        transfer?.roomHandoverRequired ? "Bàn giao phòng" : "",
    ].filter(Boolean).join(" · ");
    const reservedSlotsText = transfer?.reservedSlots ? String(transfer.reservedSlots) + " chỗ" : "";
    const reservationExpiresAtText = transfer?.reservationExpiresAt ? formatDateTimeValue(transfer.reservationExpiresAt) : "";

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoField label="Hợp đồng cũ" value={transfer?.oldContractCode || formatId("Hợp đồng", transfer?.oldContractId)} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Phòng cũ" value={currentRoomLabel} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Phòng muốn chuyển" value={targetRoomLabel} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Hợp đồng sau chuyển" value={contractTarget} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Tháng chuyển dự kiến" value={formatDateValue(transferDate)} icon={<Calendar className="w-4 h-4" />} />
                <InfoField label="Hình thức chuyển" value={transferType} icon={<ArrowRightLeft className="w-4 h-4" />} />
                <InfoField label="Người chuyển" value={currentHolder} icon={<User className="w-4 h-4" />} />
                <InfoField label="Holder phòng cũ được đề cử" value={targetHolder} icon={<User className="w-4 h-4" />} />
                <InfoField label="Xử lý chênh lệch" value={settlementType} icon={<Wallet className="w-4 h-4" />} />
                <InfoField label="Nhánh thanh toán" value={paymentBranch} icon={<Wallet className="w-4 h-4" />} />
                {(priceDifference != null && priceDifference !== "") && (
                    <InfoField label="Số tiền chênh lệch" value={formatMoney(priceDifference)} icon={<DollarSign className="w-4 h-4" />} />
                )}
                <InfoField label="Hóa đơn liên quan" value={invoiceText} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Số chỗ giữ ở phòng đích" value={reservedSlotsText} icon={<User className="w-4 h-4" />} />
                <InfoField label="Hết hạn giữ chỗ" value={reservationExpiresAtText} icon={<Calendar className="w-4 h-4" />} />
                <InfoField label="Bàn giao cần xử lý" value={handoverText} icon={<ArrowRightLeft className="w-4 h-4" />} />
            </div>

            {reason && (
                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
                    <p className="mb-1 text-sm font-semibold text-blue-700 dark:text-blue-300">Lý do chuyển</p>
                    <p className="whitespace-pre-wrap text-sm text-blue-600 dark:text-blue-200">{reason}</p>
                </div>
            )}

            {note && (
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                    <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Chi tiết bổ sung</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{note}</p>
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
            <InfoField label="Ngày dự kiến trả" value={formatDateValue(payload.moveOutDate || payload.move_out_date || payload.expectedDate || payload.expected_date)} icon={<Calendar className="w-4 h-4" />} />
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
    const renewalTermMonths = payload.renewalTermMonths || payload.renewal_term_months || payload.termMonths || payload.term_months;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <InfoField label="Phòng" value={payload.room || payload.roomCode || payload.room_code} icon={<MapPin className="w-4 h-4" />} />
                {renewalTermMonths && (
                    <InfoField label="Thời hạn gia hạn" value={`${renewalTermMonths} tháng`} icon={<Calendar className="w-4 h-4" />} />
                )}
                <InfoField label="Ngày kết thúc sau gia hạn" value={formatDateValue(payload.newEndDate || payload.new_end_date || payload.endDate || payload.end_date)} icon={<Calendar className="w-4 h-4" />} />
                {(payload.newRent || payload.new_rent || payload.monthlyRent || payload.monthly_rent) && (
                    <InfoField label="Giá thuê mới" value={formatMoney(payload.newRent || payload.new_rent || payload.monthlyRent || payload.monthly_rent)} icon={<DollarSign className="w-4 h-4" />} />
                )}
            </div>

            <RenewalEligibilitySummary payload={payload} />
        </div>
    );
}

export function TerminationRequestDetail({ payload }) {
    if (!payload) return null;
    const effectiveDate = payload.liquidationDate
        || payload.liquidation_date
        || payload.terminationDate
        || payload.termination_date
        || payload.effectiveDate
        || payload.effective_date;
    const reason = payload.reason || payload.terminationReason || payload.termination_reason;

    return (
        <div className="grid grid-cols-2 gap-4">
            <InfoField label="Phòng" value={payload.room || payload.roomCode || payload.room_code} icon={<MapPin className="w-4 h-4" />} />
            {effectiveDate && (
                <InfoField label="Ngày thanh lý" value={formatDateValue(effectiveDate)} icon={<Calendar className="w-4 h-4" />} />
            )}
            {reason && (
                <div className="col-span-2 rounded-xl bg-red-50 p-4 dark:bg-red-500/10">
                    <p className="text-sm font-semibold text-red-700 mb-1 dark:text-red-300">Lý do thanh lý</p>
                    <p className="text-sm text-red-600 whitespace-pre-wrap dark:text-red-200">{reason}</p>
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
                <InfoField label="Mã khoản chi" value={firstValue(payload.expenseCode, payload.expense_code)} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Phòng" value={firstValue(payload.roomCode, payload.room_code)} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Hợp đồng" value={firstValue(payload.contractCode, payload.contract_code)} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Ngày thanh lý" value={formatDateValue(firstValue(payload.liquidationDate, payload.liquidation_date))} icon={<Calendar className="w-4 h-4" />} />
            </div>
            {isLiquidationRefund && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Quy trình hoàn cọc</p>
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                        Sau khi chủ trọ duyệt, yêu cầu chuyển sang khách thuê để xác nhận đã nhận tiền. Không cần thao tác ghi nhận đã thanh toán từ chủ trọ hoặc quản lý.
                    </p>
                </div>
            )}
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
