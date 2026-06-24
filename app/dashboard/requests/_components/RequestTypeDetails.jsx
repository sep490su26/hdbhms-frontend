import { MapPin, Calendar, DollarSign } from "lucide-react";
import { InfoField, formatMoney } from "./RequestDetailFields";

export function TransferRequestDetail({ payload }) {
    if (!payload) return null;

    return (
        <div className="grid grid-cols-2 gap-4">
            <InfoField label="Phòng hiện tại" value={payload.currentRoom || payload.current_room || payload.fromRoom || payload.from_room} icon={<MapPin className="w-4 h-4" />} />
            <InfoField label="Phòng muốn chuyển" value={payload.targetRoom || payload.target_room || payload.desiredRoom || payload.desired_room || payload.toRoom || payload.to_room} icon={<MapPin className="w-4 h-4" />} />
            {(payload.transferDate || payload.transfer_date || payload.requestedDate || payload.requested_date) && (
                <InfoField label="Ngày dự kiến" value={payload.transferDate || payload.transfer_date || payload.requestedDate || payload.requested_date} icon={<Calendar className="w-4 h-4" />} />
            )}
            {(payload.reason || payload.transferReason || payload.transfer_reason) && (
                <div className="col-span-2 rounded-xl bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-700 mb-1">Lý do chuyển</p>
                    <p className="text-sm text-blue-600 whitespace-pre-wrap">{payload.reason || payload.transferReason || payload.transfer_reason}</p>
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
