import { MapPin, Calendar, DollarSign, ArrowRightLeft, FileText, Wallet, User } from "lucide-react";
import { InfoField, formatMoney } from "./RequestDetailFields";

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

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

export function TransferRequestDetail({ payload }) {
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
        <div className="grid grid-cols-2 gap-4">
            <InfoField label="Phòng" value={payload.room || payload.roomCode || payload.room_code} icon={<MapPin className="w-4 h-4" />} />
            <InfoField label="Thời hạn mới" value={payload.newEndDate || payload.new_end_date || payload.endDate || payload.end_date} icon={<Calendar className="w-4 h-4" />} />
            {(payload.newRent || payload.new_rent || payload.monthlyRent || payload.monthly_rent) && (
                <InfoField label="Giá thuê mới" value={formatMoney(payload.newRent || payload.new_rent || payload.monthlyRent || payload.monthly_rent)} icon={<DollarSign className="w-4 h-4" />} />
            )}
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
