import { MapPin, Calendar, DollarSign, ArrowRightLeft, FileText, Wallet, User, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InfoField, formatMoney } from "./RequestDetailFields";

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

function formatVnd(value) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

function formatDateTimeValue(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function parseJsonObject(value) {
    if (!value) return null;
    if (typeof value === "object") return value;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

function formatEligibilityResult(value) {
    if (value === true) return "Đủ điều kiện";
    if (value === false) return "Không đủ điều kiện";
    return "Chưa có dữ liệu";
}

function formatTransferActionLabel(action) {
    const labels = {
        NOMINATE_SOURCE_HOLDER: "Đề cử holder phòng cũ",
        ACCEPT_SOURCE_HOLDER_NOMINATION: "Xác nhận holder mới phòng cũ",
        CONFIRM_TENANT_TRANSFER: "Tenant xác nhận chuyển phòng",
        PAY_TRANSFER_DIFFERENCE: "Thanh toán chênh lệch",
        PAY_TRANSFER_OUT_UTILITY: "Thanh toán điện/nước phòng cũ",
        CONFIRM_TRANSFER_CONTRACT: "Quản lý xác nhận hợp đồng",
        SIGN_TRANSFER_CONTRACT: "Ký/upload hợp đồng",
        EXECUTE_TRANSFER: "Start/execute transfer",
        COMPLETE_TRANSFER: "Hoàn tất bàn giao",
    };
    return labels[action] || String(action || "").replaceAll("_", " ");
}

function formatSnapshotSummary(value) {
    const snapshot = parseJsonObject(value);
    if (!snapshot) return "";
    const items = [];
    for (const [key, raw] of Object.entries(snapshot)) {
        if (raw === null || raw === undefined || raw === "") continue;
        const label = key.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim();
        const valueText = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
        items.push(`${label}: ${valueText}`);
    }
    return items.slice(0, 4).join(" · ");
}

function RoomTransferEligibilitySummary({ transfer }) {
    if (!transfer) return null;
    const debt = transfer.debtSummary || {};
    const violation = transfer.violationSummary || {};
    const warnings = Array.isArray(transfer.eligibilityWarnings) ? transfer.eligibilityWarnings : [];
    const allowedActions = Array.isArray(transfer.allowedActions) ? transfer.allowedActions : [];
    const blockingReasons = Array.isArray(transfer.blockingReasons) ? transfer.blockingReasons : [];
    const snapshotSummary = formatSnapshotSummary(transfer.eligibilitySnapshot);
    const violationSnapshotSummary = formatSnapshotSummary(transfer.violationSnapshot);
    const historySnapshotSummary = formatSnapshotSummary(transfer.transferHistorySnapshot);

    return (
        <div className="rounded-xl bg-white p-4 border border-blue-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-gray-900">Điều kiện chuyển phòng</p>
                    <p className="mt-1 text-xs text-gray-500">
                        Snapshot lúc tạo yêu cầu và trạng thái kiểm tra hiện tại.
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className={transfer.eligibleAtCreation === false
                        ? "border-red-200 bg-red-50 text-red-700"
                        : transfer.eligibleAtCreation === true
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 bg-gray-50 text-gray-600"}
                >
                    {formatEligibilityResult(transfer.eligibleAtCreation)}
                </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">Kiểm tra lúc</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{formatDateTimeValue(transfer.eligibilityCheckedAt)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">Tổng nợ</p>
                    <p className={debt.overLimit ? "mt-1 text-sm font-bold text-red-700" : "mt-1 text-sm font-bold text-gray-900"}>
                        {formatVnd(debt.totalDebtAmount)}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                        Thuê {formatVnd(debt.rentDebtAmount)} · Điện/nước {formatVnd(debt.utilityDebtAmount)}
                    </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">Vi phạm</p>
                    <p className={(violation.totalCount || 0) > 0 ? "mt-1 text-sm font-bold text-amber-700" : "mt-1 text-sm font-bold text-gray-900"}>
                        {violation.totalCount ?? 0} ghi nhận
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                        {Array.isArray(violation.latestDescriptions) && violation.latestDescriptions.length > 0
                            ? violation.latestDescriptions.slice(0, 2).join(" · ")
                            : "Không có vi phạm đang mở"}
                    </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-gray-500">Số lần chuyển năm nay</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{transfer.transferCountThisYear ?? 0}</p>
                </div>
            </div>

            {(warnings.length > 0 || blockingReasons.length > 0) && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {warnings.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-xs font-bold text-amber-800">Cảnh báo eligibility</p>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-700">
                                {warnings.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                            </ul>
                        </div>
                    )}
                    {blockingReasons.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-xs font-bold text-red-800">Lý do đang chặn thao tác</p>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-red-700">
                                {blockingReasons.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {allowedActions.length > 0 && (
                <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500">Hành động backend đang cho phép</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {allowedActions.map((action) => (
                            <Badge key={action} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                {formatTransferActionLabel(action)}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {(snapshotSummary || violationSnapshotSummary || historySnapshotSummary) && (
                <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                    {snapshotSummary && <p><span className="font-bold text-gray-700">Snapshot:</span> {snapshotSummary}</p>}
                    {violationSnapshotSummary && <p><span className="font-bold text-gray-700">Vi phạm lúc tạo:</span> {violationSnapshotSummary}</p>}
                    {historySnapshotSummary && <p><span className="font-bold text-gray-700">Lịch sử chuyển:</span> {historySnapshotSummary}</p>}
                </div>
            )}
        </div>
    );
}

function parseDateValue(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function buildRenewalTermChecks(payload) {
    const newStartDate = firstValue(payload.newStartDate, payload.new_start_date);
    const newEndDate = firstValue(payload.newEndDate, payload.new_end_date, payload.endDate, payload.end_date);
    const monthlyRent = firstValue(payload.monthlyRent, payload.monthly_rent, payload.newRent, payload.new_rent);
    const paymentCycleMonths = firstValue(payload.paymentCycleMonths, payload.payment_cycle_months);
    const depositAmount = firstValue(payload.depositAmount, payload.deposit_amount);
    const startDate = parseDateValue(newStartDate);
    const endDate = parseDateValue(newEndDate);
    const rent = Number(monthlyRent);
    const cycle = Number(paymentCycleMonths);
    const deposit = Number(depositAmount);

    return [
        {
            label: "Thời hạn mới",
            valid: Boolean(startDate && endDate && endDate > startDate),
            detail: startDate && endDate ? `${newStartDate} → ${newEndDate}` : "Thiếu ngày bắt đầu/kết thúc",
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
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-indigo-950">Điều kiện gia hạn</p>
                    <p className="mt-1 text-xs text-indigo-700">
                        Kiểm tra terms trong yêu cầu; blocker phòng sẽ hiển thị nếu backend trả về.
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className={isBlocked
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"}
                >
                    {isBlocked ? "Cần kiểm tra" : "Hợp lệ theo payload"}
                </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {checks.map((check) => (
                    <div key={check.label} className="rounded-lg border border-white/70 bg-white p-3">
                        <p className="text-xs font-semibold text-slate-500">{check.label}</p>
                        <p className={check.valid ? "mt-1 text-sm font-bold text-slate-900" : "mt-1 text-sm font-bold text-amber-700"}>
                            {check.detail}
                        </p>
                    </div>
                ))}
            </div>

            {blockedReason && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-bold text-amber-800">Lý do cần xử lý</p>
                    <p className="mt-1 text-xs text-amber-700">{blockedReason}</p>
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
    return map[value] || value;
};

const formatSettlementType = (value) => {
    if (!value) return null;
    const map = {
        TENANT_PAY_MORE: "Khách thanh toán thêm ngay",
        ADD_TO_NEXT_INVOICE: "Cộng vào hóa đơn kỳ tới",
    };
    return map[value] || value;
};

export function TransferRequestDetail({ payload, transfer }) {
    if (!payload) return null;

    const currentRoom = firstValue(payload.currentRoom, payload.current_room, payload.fromRoom, payload.from_room);
    const currentRoomCode = firstValue(payload.currentRoomCode, payload.current_room_code, payload.fromRoomCode, payload.from_room_code);
    const targetRoom = firstValue(payload.targetRoom, payload.target_room, payload.desiredRoom, payload.desired_room, payload.toRoom, payload.to_room);
    const targetRoomCode = firstValue(payload.targetRoomCode, payload.target_room_code, payload.toRoomCode, payload.to_room_code);
    const transferDate = firstValue(payload.transferDate, payload.transfer_date, payload.requestedDate, payload.requested_date);
    const transferType = formatTransferType(firstValue(payload.targetTransferType, payload.target_transfer_type, payload.transferType, payload.transfer_type));
    const settlementType = formatSettlementType(firstValue(payload.positiveDifferenceSettlementType, payload.positive_difference_settlement_type, payload.settlementType, payload.settlement_type));
    const priceDifference = firstValue(payload.priceDifferenceToPay, payload.price_difference_to_pay, payload.additionalPaymentAmount, payload.additional_payment_amount);
    const currentHolder = firstValue(payload.currentHolderName, payload.current_holder_name, payload.currentTenantName, payload.current_tenant_name);
    const targetHolder = firstValue(payload.targetHolderName, payload.target_holder_name, payload.targetTenantName, payload.target_tenant_name);
    const note = firstValue(payload.note, payload.transferNote, payload.transfer_note, payload.additionalNote, payload.additional_note);
    const reason = firstValue(payload.reason, payload.transferReason, payload.transfer_reason);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <InfoField label="Phòng hiện tại" value={currentRoom} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Phòng muốn chuyển" value={targetRoom} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Mã phòng hiện tại" value={currentRoomCode} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Mã phòng đích" value={targetRoomCode} icon={<FileText className="w-4 h-4" />} />
                <InfoField label="Ngày dự kiến" value={transferDate} icon={<Calendar className="w-4 h-4" />} />
                <InfoField label="Hình thức chuyển" value={transferType} icon={<ArrowRightLeft className="w-4 h-4" />} />
                <InfoField label="Người đang giữ phòng" value={currentHolder} icon={<User className="w-4 h-4" />} />
                <InfoField label="Người nhận / phòng đích" value={targetHolder} icon={<User className="w-4 h-4" />} />
                <InfoField label="Xử lý chênh lệch" value={settlementType} icon={<Wallet className="w-4 h-4" />} />
                {(priceDifference != null && priceDifference !== "") && (
                    <InfoField label="Số tiền chênh lệch" value={formatMoney(priceDifference)} icon={<DollarSign className="w-4 h-4" />} />
                )}
            </div>

            {reason && (
                <div className="rounded-xl bg-blue-50 p-4">
                    <p className="mb-1 text-sm font-semibold text-blue-700">Lý do chuyển</p>
                    <p className="whitespace-pre-wrap text-sm text-blue-600">{reason}</p>
                </div>
            )}

            {note && (
                <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-1 text-sm font-semibold text-slate-700">Chi tiết bổ sung</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-600">{note}</p>
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
            <InfoField label="Ngày dự kiến trả" value={payload.moveOutDate || payload.move_out_date || payload.expectedDate || payload.expected_date} icon={<Calendar className="w-4 h-4" />} />
            {(payload.reason || payload.moveOutReason || payload.move_out_reason) && (
                <div className="col-span-2 rounded-xl bg-green-50 p-4">
                    <p className="text-sm font-semibold text-green-700 mb-1">Lý do trả phòng</p>
                    <p className="text-sm text-green-600 whitespace-pre-wrap">{payload.reason || payload.moveOutReason || payload.move_out_reason}</p>
                </div>
            )}
        </div>
    );
}

export function RenewalRequestDetail({ payload }) {
    if (!payload) return null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <InfoField label="Phòng" value={payload.room || payload.roomCode || payload.room_code} icon={<MapPin className="w-4 h-4" />} />
                <InfoField label="Thời hạn mới" value={payload.newEndDate || payload.new_end_date || payload.endDate || payload.end_date} icon={<Calendar className="w-4 h-4" />} />
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

    return (
        <div className="grid grid-cols-2 gap-4">
            <InfoField label="Phòng" value={payload.room || payload.roomCode || payload.room_code} icon={<MapPin className="w-4 h-4" />} />
            {(payload.terminationDate || payload.termination_date || payload.effectiveDate || payload.effective_date) && (
                <InfoField label="Ngày thanh lý" value={payload.terminationDate || payload.termination_date || payload.effectiveDate || payload.effective_date} icon={<Calendar className="w-4 h-4" />} />
            )}
            {(payload.reason || payload.terminationReason || payload.termination_reason) && (
                <div className="col-span-2 rounded-xl bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-700 mb-1">Lý do thanh lý</p>
                    <p className="text-sm text-red-600 whitespace-pre-wrap">{payload.reason || payload.terminationReason || payload.termination_reason}</p>
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
                <InfoField label="Độ ưu tiên" value={payload.priority || payload.maintenancePriority || payload.maintenance_priority} />
            )}
            {(payload.maintenanceType || payload.maintenance_type || payload.category) && (
                <InfoField label="Loại bảo trì" value={payload.maintenanceType || payload.maintenance_type || payload.category} />
            )}
        </div>
    );
}

export function ComplaintRequestDetail({ payload }) {
    if (!payload) return null;

    return (
        <div className="space-y-4">
            {(payload.category || payload.complaintType || payload.complaint_type) && (
                <InfoField label="Loại khiếu nại" value={payload.category || payload.complaintType || payload.complaint_type} />
            )}
            {(payload.priority || payload.complaintPriority || payload.complaint_priority) && (
                <InfoField label="Độ ưu tiên" value={payload.priority || payload.complaintPriority || payload.complaint_priority} />
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
            : lineType;
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
                <div className="rounded-xl bg-cyan-50 p-4">
                    <p className="mb-1 text-sm font-semibold text-cyan-700">Nội dung khách gửi</p>
                    <p className="whitespace-pre-wrap text-sm text-cyan-700">{payload.description || payload.reason}</p>
                </div>
            )}
        </div>
    );
}

export function AccessRequestDetail({ payload }) {
    if (!payload) return null;

    return (
        <div className="grid grid-cols-2 gap-4">
            <InfoField label="Loại thẻ" value={payload.accessType || payload.access_type || payload.cardType || payload.card_type} />
            {(payload.quantity || payload.cardQuantity || payload.card_quantity) && (
                <InfoField label="Số lượng" value={payload.quantity || payload.cardQuantity || payload.card_quantity} />
            )}
            {(payload.reason || payload.accessReason || payload.access_reason) && (
                <div className="col-span-2 rounded-xl bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Lý do</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{payload.reason || payload.accessReason || payload.access_reason}</p>
                </div>
            )}
        </div>
    );
}
