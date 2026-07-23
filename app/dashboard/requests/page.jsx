"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchChangeRequests, fetchChangeRequestStats, approveChangeRequest, rejectChangeRequest } from "@/services/changeRequestsService";
import { confirmTransferContract, getRoomTransferByCode, getRoomTransferById, signTransferContract } from "@/services/roomTransferService";
import { downloadLeaseContractDraftPdf, fetchManagementLeaseContractDetails, uploadSignedLeaseContractFile } from "@/services/leaseContractsService";
import { Loader2, Eye, X, CheckCircle2, XCircle, Clock, ArrowRightLeft, LogOut, FileText, Wrench, MessageSquareWarning, Key, Search, FileCheck2, CalendarCheck, CalendarRange, AlertCircle, Plus, Info, Hourglass, Download, Upload, RotateCcw, SlidersHorizontal, Copy, CalendarDays, MoreVertical, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import {
    TransferRequestDetail,
    MoveoutRequestDetail,
    RenewalRequestDetail,
    TerminationRequestDetail,
    MaintenanceRequestDetail,
    ComplaintRequestDetail,
    MeterReadingCorrectionRequestDetail,
    AccessRequestDetail,
} from "./_components/RequestTypeDetails";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import TransferExecutionModal from "../_components/TransferExecutionModal";

const translateType = (type) => {
    const map = {
        ROOM_TRANSFER: "Chuyển phòng",
        MOVE_OUT: "Trả phòng",
        PERMISSION_ACCESS: "Quyền truy cập",
        TENANT_PROFILE_ACCESS: "Xem hồ sơ khách thuê",
        METER_READING_CORRECTION: "Điều chỉnh chỉ số",
        INVOICE_ADJUSTMENT: "Điều chỉnh hóa đơn",
        RENT_PRICE_ADJUSTMENT: "Điều chỉnh giá thuê",
        DEPOSIT_REFUND_REQUEST: "Hoàn cọc",
        TRANSFER: "Chuyển phòng",
        MOVEOUT: "Trả phòng",
        RENEWAL: "Gia hạn HĐ",
        TERMINATION: "Thanh lý HĐ",
        CONTRACT_LIQUIDATION: "Thanh lý HĐ",
        MAINTENANCE: "Bảo trì",
        COMPLAINT: "Khiếu nại",
        ACCESS: "Yêu cầu thẻ"
    };
    return map[type] || type;
};

// Map backend request type to frontend type key
const mapRequestType = (type) => {
    const map = {
        ROOM_TRANSFER: "TRANSFER",
        MOVE_OUT: "MOVEOUT",
        CONTRACT_RENEWAL: "RENEWAL",
        CONTRACT_TERMINATION: "TERMINATION",
        CONTRACT_LIQUIDATION: "TERMINATION",
        PERMISSION_ACCESS: "PERMISSION_ACCESS",
        TENANT_PROFILE_ACCESS: "TENANT_PROFILE_ACCESS",
        METER_READING_CORRECTION: "METER_READING_CORRECTION",
        INVOICE_ADJUSTMENT: "INVOICE_ADJUSTMENT",
        RENT_PRICE_ADJUSTMENT: "RENT_PRICE_ADJUSTMENT",
        DEPOSIT_REFUND_REQUEST: "DEPOSIT_REFUND_REQUEST",
        MAINTENANCE: "MAINTENANCE",
        COMPLAINT: "COMPLAINT",
        ACCESS_REQUEST: "ACCESS",
    };
    return map[type] || type;
};

const translateStatus = (status) => {
    const map = {
        PENDING: "Đang chờ",
        APPROVED: "Đã duyệt",
        REJECTED: "Đã từ chối",
        PROCESSING: "Đang xử lý",
        COMPLETED: "Hoàn thành"
    };
    return map[status] || status;
};

const statusBadgeClass = (status) => {
    if (status === "PENDING") return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (status === "APPROVED" || status === "COMPLETED") return "text-green-600 bg-green-50 border-green-200";
    if (status === "PROCESSING") return "text-blue-600 bg-blue-50 border-blue-200";
    if (status === "REJECTED" || status === "CANCELLED") return "text-red-600 bg-red-50 border-red-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
};

const TYPE_CONFIG = {
    TRANSFER: { color: "bg-violet-50", icon: <ArrowRightLeft className="w-5 h-5 text-violet-500" />, accent: "violet" },
    MOVEOUT: { color: "bg-green-50", icon: <LogOut className="w-5 h-5 text-green-500" />, accent: "green" },
    RENEWAL: { color: "bg-indigo-50", icon: <FileText className="w-5 h-5 text-indigo-500" />, accent: "indigo" },
    TERMINATION: { color: "bg-red-50", icon: <XCircle className="w-5 h-5 text-red-500" />, accent: "red" },
    CONTRACT_LIQUIDATION: { color: "bg-red-50", icon: <XCircle className="w-5 h-5 text-red-500" />, accent: "red" },
    MAINTENANCE: { color: "bg-emerald-50", icon: <Wrench className="w-5 h-5 text-emerald-500" />, accent: "emerald" },
    COMPLAINT: { color: "bg-blue-50", icon: <MessageSquareWarning className="w-5 h-5 text-blue-500" />, accent: "blue" },
    ACCESS: { color: "bg-orange-50", icon: <Key className="w-5 h-5 text-orange-500" />, accent: "orange" },
    PERMISSION_ACCESS: { color: "bg-gray-50", icon: <Key className="w-5 h-5 text-gray-500" />, accent: "gray" },
    TENANT_PROFILE_ACCESS: { color: "bg-gray-50", icon: <Key className="w-5 h-5 text-gray-500" />, accent: "gray" },
    METER_READING_CORRECTION: { color: "bg-cyan-50", icon: <Wrench className="w-5 h-5 text-cyan-500" />, accent: "cyan" },
    INVOICE_ADJUSTMENT: { color: "bg-indigo-50", icon: <FileText className="w-5 h-5 text-indigo-500" />, accent: "indigo" },
    RENT_PRICE_ADJUSTMENT: { color: "bg-indigo-50", icon: <FileText className="w-5 h-5 text-indigo-500" />, accent: "indigo" },
    DEPOSIT_REFUND_REQUEST: { color: "bg-green-50", icon: <FileCheck2 className="w-5 h-5 text-green-500" />, accent: "green" },
};

const translateTransferStatus = (status) => {
    const map = {
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
    return map[status] || status || "--";
};

const getTransferStatusTone = (status) => {
    switch (status) {
        case "WAITING_PAYMENT":
            return "border-amber-200 bg-amber-50 text-amber-700";
        case "WAITING_CONTRACT_CONFIRMATION":
            return "border-blue-200 bg-blue-50 text-blue-700";
        case "WAITING_SIGNING":
        case "WAITING_CONTRACT_SIGNING":
            return "border-violet-200 bg-violet-50 text-violet-700";
        case "WAITING_TRANSFER_DATE":
            return "border-cyan-200 bg-cyan-50 text-cyan-700";
        case "READY_FOR_HANDOVER":
        case "WAITING_EXECUTION":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";
        case "EXECUTED":
            return "border-green-200 bg-green-50 text-green-700";
        default:
            return "border-gray-200 bg-gray-50 text-gray-700";
    }
};

const requiresFullMoveIn = (transfer) =>
    transfer?.targetTransferType === "NEW_CONTRACT";

const isTransferSigningStatus = (status) =>
    status === "WAITING_SIGNING" || status === "WAITING_CONTRACT_SIGNING";

const getTransferTimingNote = (transfer) => {
    if (!transfer) return "";
    const moveOutNote = "Chỉ thực hiện full move-out khi sau chuyển phòng cũ trở thành phòng trống. Nếu phòng cũ vẫn còn người ở thì chỉ xử lý phần occupant rời đi, không làm room-level move-out đầy đủ.";
    const moveInNote = requiresFullMoveIn(transfer)
        ? "Chốt phòng cũ chỉ ghi nhận người rời phòng và tạo hóa đơn điện/nước nếu phát sinh; sau khi hóa đơn này đã thanh toán, manager mới nhập check-in phòng mới và hoàn tất chuyển phòng."
        : "Ca này không cần full move-in kiểu nhận phòng trống vì tenant đi vào hợp đồng/phòng đang có người.";
    return `${moveOutNote} ${moveInNote}`;
};

const getTransferActionMeta = (transfer) => {
    if (!transfer) {
        return {
            primaryAction: null,
            helperText: "Chưa tải được chi tiết transfer từ backend. Màn này vẫn hiển thị thông tin cơ bản từ yêu cầu để tránh chặn quản lý.",
        };
    }

    switch (transfer.status) {
        case "WAITING_PAYMENT":
            return {
                primaryAction: null,
                helperText: "Đang chờ khách thuê thanh toán khoản bắt buộc trước khi quản lý xác nhận hợp đồng.",
            };
        case "WAITING_CONTRACT_CONFIRMATION":
            return {
                primaryAction: "confirm-contract",
                helperText: "Đã đủ điều kiện thương mại/pháp lý. Quản lý cần xác nhận hợp đồng trước khi đi tới pha vận hành.",
            };
        case "WAITING_SIGNING":
        case "WAITING_CONTRACT_SIGNING":
            return {
                primaryAction: null,
                helperText: "Đang chờ khách thuê ký hợp đồng. Chưa nên thực hiện move-out/move-in.",
            };
        case "WAITING_TRANSFER_DATE":
            return {
                primaryAction: "execute-transfer",
                helperText: "Hồ sơ đã sẵn sàng. Manager có thể bấm Chốt phòng cũ khi tenant và quản lý có mặt.",
            };
        case "READY_FOR_HANDOVER":
            return {
                primaryAction: "execute-transfer",
                helperText: "Hồ sơ đã sẵn sàng. Manager bấm Chốt phòng cũ để ghi nhận người rời phòng và chỉ số điện/nước.",
            };
        case "WAITING_EXECUTION":
            return {
                primaryAction: "complete-transfer",
                helperText: "Phiên chuyển phòng đang diễn ra. Nếu có hóa đơn điện/nước chốt chuyển phòng thì cần thanh toán trước, sau đó nhập check-in phòng mới và bấm Complete Transfer.",
            };
        case "EXECUTED":
            return {
                primaryAction: null,
                helperText: "Yêu cầu chuyển phòng đã hoàn tất trên hệ thống.",
            };
        default:
            return {
                primaryAction: null,
                helperText: "Yêu cầu chưa tới bước vận hành cho quản lý.",
            };
    }
};

/* Type-specific detail renderer */
const TYPE_DETAIL_COMPONENTS = {
    TRANSFER: TransferRequestDetail,
    MOVEOUT: MoveoutRequestDetail,
    RENEWAL: RenewalRequestDetail,
    TERMINATION: TerminationRequestDetail,
    MAINTENANCE: MaintenanceRequestDetail,
    COMPLAINT: ComplaintRequestDetail,
    ACCESS: AccessRequestDetail,
    METER_READING_CORRECTION: MeterReadingCorrectionRequestDetail,
};

function parseRequestPayload(rawPayload) {
    if (!rawPayload) return null;
    if (typeof rawPayload === "object") return rawPayload;
    try {
        return JSON.parse(rawPayload);
    } catch {
        return null;
    }
}

function buildTransferFallback(req) {
    const payload = parseRequestPayload(req?.requestPayload);
    if (req?.requestType !== "ROOM_TRANSFER") {
        return null;
    }

    return {
        id: req?.targetId ?? null,
        requestCode: payload?.transferRequestCode || payload?.transfer_code || payload?.requestCode || null,
        oldRoomName: payload?.currentRoom || payload?.current_room || payload?.fromRoom || payload?.from_room || null,
        oldRoomCode: payload?.currentRoomCode || payload?.current_room_code || null,
        targetRoomName: payload?.targetRoom || payload?.target_room || payload?.desiredRoom || payload?.desired_room || payload?.toRoom || payload?.to_room || null,
        targetRoomCode: payload?.targetRoomCode || payload?.target_room_code || null,
        requestedTransferDate: payload?.expectedTransferDate || payload?.expected_transfer_date || payload?.transferDate || payload?.transfer_date || payload?.requestedDate || payload?.requested_date || null,
        expectedTransferDate: payload?.expectedTransferDate || payload?.expected_transfer_date || payload?.transferDate || payload?.transfer_date || payload?.requestedDate || payload?.requested_date || null,
        reason: payload?.reason || payload?.transferReason || payload?.transfer_reason || req?.description || null,
        targetTransferType: payload?.targetTransferType || payload?.target_transfer_type || null,
        status: null,
        positiveDifferenceSettlementType: null,
        priceDifferenceToPay: null,
        transferDifferenceInvoiceId: null,
        oldRoomFinalInvoiceId: null,
    };
}

function buildRequiredSigningDocuments(transfer) {
    if (!transfer) return [];
    const documents = [];
    if (transfer.newContractId) {
        documents.push({
            id: transfer.newContractId,
            kind: "target",
            label: transfer.targetTransferType === "OTHER_CONTRACT"
                ? "Thoa thuan chuyen vao phong dich"
                : "Hop dong phong dich",
        });
    }
    if (transfer.replacementOldContractId) {
        documents.push({
            id: transfer.replacementOldContractId,
            kind: "source-replacement",
            label: "Hop dong tai ky phong cu",
        });
    }
    return documents;
}

function getTransferSigningDocuments(transfer) {
    if (Array.isArray(transfer?.signingDocuments)) {
        return transfer.signingDocuments;
    }
    return buildRequiredSigningDocuments(transfer);
}

function allTransferSigningDocumentsUploaded(transfer) {
    const documents = getTransferSigningDocuments(transfer);
    return documents.length > 0 && documents.every((document) => Boolean(document.contractFileId));
}

function allowsTransferAction(transfer, action) {
    return Array.isArray(transfer?.allowedActions) && transfer.allowedActions.includes(action);
}

async function hydrateTransferSigningDocuments(transfer) {
    if (!transfer) return transfer;
    const documents = buildRequiredSigningDocuments(transfer);
    if (documents.length === 0) {
        return { ...transfer, signingDocuments: [] };
    }

    const signingDocuments = await Promise.all(
        documents.map(async (document) => {
            try {
                const details = await fetchManagementLeaseContractDetails(document.id);
                const contractFile = details?.contractFile || null;
                return {
                    ...document,
                    contractCode: details?.contractCode || null,
                    contractStatus: details?.status || null,
                    contractFileId: details?.contractFileId ?? contractFile?.id ?? null,
                    contractFileName: details?.contractFileName ?? contractFile?.fileName ?? null,
                    contractFileUploadedAt: details?.contractFileUploadedAt ?? contractFile?.uploadedAt ?? null,
                };
            } catch (error) {
                console.warn("Unable to load transfer contract signing metadata.", error);
                return { ...document, loadError: true };
            }
        }),
    );

    return { ...transfer, signingDocuments };
}

function RequestDetailContent({ req, detailTransfer }) {
    const mappedType = mapRequestType(req.requestType);
    const payload = parseRequestPayload(req.requestPayload);
    const TypeDetailComponent = TYPE_DETAIL_COMPONENTS[mappedType];
    const resolvedTone = statusBadgeClass(req.status);
    const isPositiveStatus = req.status === "APPROVED" || req.status === "COMPLETED";
    const isProcessingStatus = req.status === "PROCESSING";

    return (
        <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${TYPE_CONFIG[mappedType]?.color || "bg-gray-50"}`}>
                    {TYPE_CONFIG[mappedType]?.icon || <FileCheck2 className="w-6 h-6 text-gray-500" />}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{req.title || translateType(mappedType)}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 font-mono">{req.requestCode || `#${req.id}`}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className={`capitalize ${resolvedTone}`}>
                            {translateStatus(req.status)}
                        </Badge>
                        <Badge variant="outline" className="bg-white text-gray-600 border-gray-200">
                            {translateType(mappedType)}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Description */}
            {req.description && (
                <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Mô tả</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{req.description}</p>
                </div>
            )}

            {/* Type-specific detail component */}
            {TypeDetailComponent && payload && (
                <TypeDetailComponent
                    payload={payload}
                    transfer={mappedType === "TRANSFER" ? detailTransfer : null}
                    request={req}
                />
            )}

            {/* Resolution info */}
            {req.status !== "PENDING" && (
                <div className={`rounded-xl p-4 border ${resolvedTone}`}>
                    <div className="flex items-center gap-2 mb-2">
                        {isProcessingStatus ? (
                            <Hourglass className="w-4 h-4 text-blue-600" />
                        ) : isPositiveStatus ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <p className="text-sm font-semibold">
                            {translateStatus(req.status)}
                        </p>
                    </div>
                    {req.resolutionNote && (
                        <p className="text-sm whitespace-pre-wrap">
                            {req.resolutionNote}
                        </p>
                    )}
                    {req.resolvedAt && (
                        <p className="text-xs mt-2">
                            {new Date(req.resolvedAt).toLocaleString('vi-VN')}
                        </p>
                    )}
                </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                <span>Tạo: {req.createdAt ? new Date(req.createdAt).toLocaleString('vi-VN') : "--"}</span>
            </div>

            {!payload && req.requestType && req.requestType !== "ROOM_TRANSFER" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-gray-600">
                        <p className="font-semibold mb-1">Không có chi tiết bổ sung</p>
                        <p>Yêu cầu này không có thông tin chi tiết bổ sung.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ApprovalCenter() {
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ breakdown: [], pendingCount: 0, approvedCount: 0, rejectedCount: 0, totalCount: 0 });
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [actionLoading, setActionLoading] = useState(null);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
    const [detailModal, setDetailModal] = useState(null);
    const [detailTransfer, setDetailTransfer] = useState(null);
    const [executeModal, setExecuteModal] = useState(null);
    const [selectedTransferContractId, setSelectedTransferContractId] = useState(null);
    const signedTransferContractInputRef = useRef(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const apiStatus = statusFilter === "All" ? undefined : statusFilter;
            const [dataRes, statsRes] = await Promise.all([
                fetchChangeRequests({ page: page - 1, size, type: typeFilter === "All Types" ? undefined : typeFilter, status: apiStatus, search }),
                fetchChangeRequestStats()
            ]);
            setData(sortByNewest(dataRes.requests, ["createdAt", "created_at"]));
            setTotal(dataRes.total || 0);
            setTotalPages(dataRes.totalPages || 1);

            if (statsRes) {
                const colors = {
                    ROOM_TRANSFER: "#3B82F6",
                    MOVE_OUT: "#22C55E",
                    PERMISSION_ACCESS: "#9CA3AF",
                    TENANT_PROFILE_ACCESS: "#9CA3AF",
                    METER_READING_CORRECTION: "#06B6D4",
                    INVOICE_ADJUSTMENT: "#6366F1",
                    RENT_PRICE_ADJUSTMENT: "#6366F1",
                    DEPOSIT_REFUND_REQUEST: "#22C55E",
                    TRANSFER: "#3B82F6",
                    MOVEOUT: "#22C55E",
                    TERMINATION: "#FACC15",
                    MAINTENANCE: "#A855F7",
                    COMPLAINT: "#F472B6",
                    ACCESS: "#9CA3AF",
                    RENEWAL: "#6366F1",
                };
                const breakdown = (statsRes.breakdown || []).map(b => ({
                    ...b,
                    label: translateType(b.type),
                    color: colors[b.type] || "#D1D5DB"
                }));
                setStats({
                    pendingCount: statsRes.pendingCount || 0,
                    approvedCount: statsRes.approvedCount || 0,
                    rejectedCount: statsRes.rejectedCount || 0,
                    totalCount: statsRes.totalCount || 0,
                    breakdown
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, search, size, statusFilter, typeFilter]);

    const handleApprove = async (id) => {
        setActionLoading(`approve-${id}`);
        try {
            await approveChangeRequest(id);
            await loadData();
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        setActionLoading(`reject-${rejectModal.id}`);
        try {
            await rejectChangeRequest(rejectModal.id, rejectNote || "Không có lý do");
            setRejectModal(null);
            setRejectNote("");
            await loadData();
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(null);
        }
    };

    const loadTransferDetail = useCallback(async (req) => {
        if (req?.requestType !== "ROOM_TRANSFER") {
            return null;
        }

        const fallbackTransfer = buildTransferFallback(req);

        try {
            if (req?.targetId) {
                const transfer = await getRoomTransferById(req.targetId);
                return await hydrateTransferSigningDocuments(transfer);
            }

            const requestCode =
                fallbackTransfer?.requestCode?.trim()
                || req?.requestCode?.trim();

            if (requestCode) {
                const transfer = await getRoomTransferByCode(requestCode);
                return await hydrateTransferSigningDocuments(transfer);
            }
        } catch (e) {
            console.warn("Unable to load room transfer detail from API, fallback to request payload.", e);
        }

        return await hydrateTransferSigningDocuments(fallbackTransfer);
    }, []);

    const openDetailModal = async (req) => {
        setDetailModal(req);
        setDetailTransfer(null);
        if (req?.requestType !== "ROOM_TRANSFER") return;

        setActionLoading(`load-transfer-${req.id}`);
        try {
            const transfer = await loadTransferDetail(req);
            setDetailTransfer(transfer);
        } catch (e) {
            console.error(e);
            setDetailTransfer(buildTransferFallback(req));
        } finally {
            setActionLoading(null);
        }
    };

    const closeDetailModal = () => {
        setDetailModal(null);
        setDetailTransfer(null);
    };

    const openExecuteModal = (req, preloadedTransfer = null) => {
        setExecuteModal({request: req, transfer: preloadedTransfer});
    };

    const closeExecuteModal = () => {
        setExecuteModal(null);
    };

    const handleConfirmTransferContract = async () => {
        if (!detailModal || !detailTransfer) return;
        setActionLoading(`confirm-contract-${detailModal.id}`);
        try {
            await confirmTransferContract(detailTransfer.id);
            const refreshedTransfer = await loadTransferDetail(detailModal);
            setDetailTransfer(refreshedTransfer);
            await loadData();
        } catch (e) {
            console.error(e);
            window.alert(e?.message || "Không thể xác nhận hợp đồng chuyển phòng.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSignTransferContract = async () => {
        if (!detailModal || !detailTransfer) return;
        if (!isTransferSigningStatus(detailTransfer.status)) {
            window.alert("Hợp đồng chuyển phòng đã qua bước xác nhận ký.");
            return;
        }
        setActionLoading(`sign-transfer-contract-${detailModal.id}`);
        try {
            await signTransferContract(detailTransfer.id);
            const refreshedTransfer = await loadTransferDetail(detailModal);
            setDetailTransfer(refreshedTransfer);
            await loadData();
        } catch (e) {
            console.error(e);
            window.alert(e?.message || "Không thể xác nhận đã ký hợp đồng chuyển phòng.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDownloadTransferContractDraft = async (contractId) => {
        if (!contractId) {
            window.alert("Chua co hop dong de tai.");
            return;
        }
        setActionLoading(`download-transfer-contract-${contractId}`);
        try {
            await downloadLeaseContractDraftPdf(contractId);
        } catch (e) {
            console.error(e);
            window.alert(e?.message || "Khong the tai hop dong chuyen phong.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleUploadSignedTransferContract = async (event) => {
        const file = event.target.files?.[0];
        const contractId = selectedTransferContractId;
        if (!file || !detailModal || !detailTransfer || !contractId) return;
        setActionLoading(`upload-transfer-contract-${contractId}`);
        try {
            await uploadSignedLeaseContractFile(
                { leaseContractId: contractId },
                file
            );
            const refreshedTransfer = await loadTransferDetail(detailModal);
            setDetailTransfer(refreshedTransfer);
            await loadData();
        } catch (e) {
            console.error(e);
            window.alert(e?.message || "Khong the upload hop dong da ky.");
        } finally {
            event.target.value = "";
            setSelectedTransferContractId(null);
            setActionLoading(null);
        }
    };

    useEffect(() => {
        const t = setTimeout(loadData, 300);
        return () => clearTimeout(t);
    }, [loadData]);

    const overdueItems = data
        .filter((req) => req.status === "PENDING" || req.status === "REJECTED")
        .slice(0, 3);

    const processingVisibleCount = data.filter((req) => req.status === "PROCESSING").length;
    const openVisibleCount = data.filter((req) => req.status === "PENDING" || req.status === "PROCESSING").length;

    const statCards = [
        { label: "Chờ xử lý", value: stats.pendingCount, sub: "Yêu cầu cần xử lý", iconBg: "bg-amber-50", iconColor: "text-amber-500", icon: Clock },
        { label: "Cần ưu tiên", value: overdueItems.length, sub: "Mục quá hạn trong danh sách hiện tại", iconBg: "bg-red-50", iconColor: "text-red-500", icon: AlertCircle },
        { label: "Đang xử lý", value: processingVisibleCount, sub: "Yêu cầu đang ở trạng thái xử lý", iconBg: "bg-blue-50", iconColor: "text-blue-500", icon: Hourglass },
        { label: "Đang mở", value: openVisibleCount, sub: "Pending + Processing trong danh sách", iconBg: "bg-violet-50", iconColor: "text-violet-500", icon: FileText },
    ];

    const OPEN_REQUEST_STATUSES = new Set([
        "PENDING",
        "PROCESSING",
        "IN_PROGRESS",
        "WAITING_HOLDER",
        "WAITING_PAYMENT",
        "WAITING_MANAGER_APPROVAL",
        "WAITING_TARGET_HOLDER_APPROVAL",
        "WAITING_TENANT_CONFIRMATION",
        "WAITING_CONTRACT_CONFIRMATION",
        "WAITING_SIGNING",
        "WAITING_CONTRACT_SIGNING",
        "WAITING_TRANSFER_DATE",
        "READY_FOR_HANDOVER",
        "WAITING_EXECUTION",
    ]);

    const activeRequestBreakdown = Object.values(
        data.reduce((acc, req) => {
            if (!OPEN_REQUEST_STATUSES.has(req.status)) {
                return acc;
            }

            const key = req.requestType || "OTHER";
            if (!acc[key]) {
                acc[key] = {
                    type: key,
                    label: translateType(key),
                    count: 0,
                    color: (TYPE_CONFIG[key]?.accent === "violet" && "#8B5CF6")
                        || (TYPE_CONFIG[key]?.accent === "green" && "#22C55E")
                        || (TYPE_CONFIG[key]?.accent === "indigo" && "#6366F1")
                        || (TYPE_CONFIG[key]?.accent === "red" && "#EF4444")
                        || (TYPE_CONFIG[key]?.accent === "emerald" && "#10B981")
                        || (TYPE_CONFIG[key]?.accent === "blue" && "#3B82F6")
                        || (TYPE_CONFIG[key]?.accent === "orange" && "#F97316")
                        || "#94A3B8",
                };
            }

            acc[key].count += 1;
            return acc;
        }, {})
    );

    return (
        <div className="bg-[#f8fafc] font-sans">
            <div className="mx-auto w-full max-w-[1600px] space-y-6">
                <DashboardPageHeader
                    title={
                        <span className="flex items-center gap-2">
                            Quản lý yêu cầu
                        </span>
                    }
                    description="Quản lý và phê duyệt tất cả các yêu cầu từ khách thuê."
                    actions={
                        <Button className="h-11 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800">
                            <Plus className="mr-2 h-4 w-4" />
                            Tạo yêu cầu mới
                        </Button>
                    }
                />
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_240px] 2xl:items-start">
                {/* LEFT: main content */}
                <div className="min-w-0 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {statCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                                            <Icon className={`h-4 w-4 ${card.iconColor}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium leading-5 text-slate-500">{card.label}</p>
                                            <p className="mt-1 text-2xl font-bold leading-none text-slate-900">{card.value}</p>
                                            <p className="mt-1 text-xs leading-4 text-slate-400">{card.sub}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="relative min-w-0">
                            <p className="mb-2 text-sm font-medium text-slate-500">Tìm kiếm</p>
                            <Search className="absolute left-4 top-[calc(50%+14px)] h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="h-12 rounded-2xl border-slate-200 bg-background pl-11 text-sm"
                                placeholder="Tìm theo mã yêu cầu, tiêu đề, người tạo..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
                            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="min-w-0">
                                    <p className="mb-2 text-sm font-medium text-slate-500">Loại yêu cầu</p>
                                    <select
                                        className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-100"
                                        value={typeFilter}
                                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                                    >
                                        <option value="All Types">Tất cả loại</option>
                                        {Object.keys(TYPE_CONFIG).map((t) => <option key={t} value={t}>{translateType(t)}</option>)}
                                    </select>
                                </div>

                                <div className="min-w-0">
                                    <p className="mb-2 text-sm font-medium text-slate-500">Trạng thái</p>
                                    <select
                                        className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-100"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="Pending">Đang chờ</option>
                                        <option value="Approved">Đã duyệt</option>
                                        <option value="Rejected">Đã từ chối</option>
                                        <option value="All">Tất cả</option>
                                    </select>
                                </div>

                                <div className="min-w-0">
                                    <p className="mb-2 text-sm font-medium text-slate-500">Thời gian tạo</p>
                                    <button className="flex h-12 w-full items-center rounded-2xl border border-slate-200 bg-background px-4 text-left text-sm text-slate-400 hover:bg-muted">
                                        <CalendarDays className="mr-3 h-4 w-4 shrink-0" />
                                        <span className="truncate">Chọn khoảng thời gian</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap 2xl:justify-end">
                                <Button
                                    variant="outline"
                                    className="h-10 justify-center rounded-2xl border-slate-200 bg-background px-4 text-slate-700 hover:bg-muted sm:min-w-[140px]"
                                    onClick={() => { setTypeFilter("All Types"); setStatusFilter("Pending"); setSearch(""); }}
                                >
                                    <RotateCcw className="mr-2 h-4 w-4 shrink-0" />
                                    Đặt lại
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="hidden min-[1536px]:block">
                            <Table className="w-full">
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                        <TableHead className="h-12 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Mã yêu cầu</TableHead>
                                        <TableHead className="h-12 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Loại yêu cầu</TableHead>
                                        <TableHead className="h-12 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Tiêu đề</TableHead>
                                        <TableHead className="hidden min-[1700px]:table-cell h-12 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Người tạo</TableHead>
                                        <TableHead className="h-12 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Ngày tạo</TableHead>
                                        <TableHead className="h-12 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Trạng thái</TableHead>
                                        <TableHead className="hidden min-[1650px]:table-cell h-12 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Hạn xử lý</TableHead>
                                        <TableHead className="h-12 px-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center text-slate-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                            Đang tải dữ liệu...
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center text-slate-500">
                                            Không tìm thấy yêu cầu nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((req) => {
                                        const tc = TYPE_CONFIG[mapRequestType(req.requestType)] || TYPE_CONFIG.ACCESS;
                                        return (
                                            <TableRow key={req.id} className="border-slate-100 transition-colors hover:bg-slate-50/60">
                                                <TableCell className="px-3 py-3 align-top">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <p className="break-all font-mono text-xs font-semibold text-slate-900">{req.requestCode || `#${req.id}`}</p>
                                                            <Copy className="h-4 w-4 text-slate-300" />
                                                        </div>
                                                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-xs text-slate-500">
                                                            Ưu tiên: Thường
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-3 py-3 align-top">
                                                    <div className="flex items-start gap-2">
                                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tc.color}`}>
                                                            {tc.icon}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">{translateType(req.requestType)}</p>
                                                            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{req.requestType}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="min-w-0 px-3 py-3 align-top">
                                                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{req.title || "--"}</p>
                                                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{req.description || "Không có mô tả bổ sung"}</p>
                                                </TableCell>
                                                <TableCell className="hidden min-[1700px]:table-cell px-3 py-3 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                                            {(req.requestCode || "R").slice(-1)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">Người tạo</p>
                                                            <p className="mt-1 text-sm text-slate-500">ID #{req.requesterId || "--"}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-3 py-3 align-top text-sm text-slate-700">
                                                    <p>{req.createdAt ? new Date(req.createdAt).toLocaleDateString("vi-VN") : "--"}</p>
                                                    <p className="mt-2 text-slate-400">{req.createdAt ? new Date(req.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--"}</p>
                                                </TableCell>
                                                <TableCell className="px-3 py-3 align-top">
                                                    <Badge variant="outline" className={`rounded-full capitalize ${statusBadgeClass(req.status)}`}>
                                                        {translateStatus(req.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden min-[1650px]:table-cell px-3 py-3 align-top text-sm">
                                                    <p className={`${req.status === "REJECTED" ? "text-red-500" : "text-slate-900"}`}>
                                                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString("vi-VN") : "--"}
                                                    </p>
                                                    <p className={`mt-2 ${req.status === "PENDING" ? "text-orange-500" : req.status === "REJECTED" ? "text-red-500" : "text-slate-400"}`}>
                                                        {req.status === "PENDING" ? "Còn 1 ngày" : req.status === "REJECTED" ? "Quá hạn" : "Đúng hạn"}
                                                    </p>
                                                </TableCell>
                                                <TableCell className="px-3 py-3 align-top">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button size="icon" variant="outline" onClick={() => openDetailModal(req)} className="h-8 w-8 rounded-xl border-slate-200 text-slate-500">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-xl border-slate-200 text-slate-500">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                        </div>

                        <div className="divide-y divide-slate-100 min-[1536px]:hidden">
                            {loading ? (
                                <div className="py-10 text-center text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                    Đang tải dữ liệu...
                                </div>
                            ) : data.length === 0 ? (
                                <div className="py-10 text-center text-gray-500">
                                    Không tìm thấy yêu cầu nào.
                                </div>
                            ) : (
                                data.map((req) => {
                                    const tc = TYPE_CONFIG[mapRequestType(req.requestType)] || TYPE_CONFIG.ACCESS;
                                    return (
                                        <div key={req.id} className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-mono text-sm font-semibold text-gray-900 break-all">{req.requestCode || `#${req.id}`}</p>
                                                    <p className="mt-1 text-sm font-medium text-gray-900">{req.title || "--"}</p>
                                                </div>
                                                <div className={`w-9 h-9 ${tc.color} rounded-lg flex items-center justify-center shrink-0`}>
                                                    {tc.icon}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className={`capitalize ${statusBadgeClass(req.status)}`}>
                                                    {translateStatus(req.status)}
                                                </Badge>
                                                <Badge variant="outline" className="bg-white text-gray-600 border-gray-200">
                                                    {translateType(req.requestType)}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString('vi-VN') : "--"}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="outline" onClick={() => openDetailModal(req)} className="rounded-lg h-8 px-3 text-gray-600 hover:text-gray-900">
                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                    Xem
                                                </Button>
                                                {req.status === 'PENDING' && (
                                                    <>
                                                        <Button size="sm" onClick={() => handleApprove(req.id)} disabled={actionLoading?.startsWith('approve') || actionLoading?.startsWith('reject')} className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-8 px-3 disabled:opacity-60">
                                                            {actionLoading === `approve-${req.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Duyệt"}
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setRejectModal(req); setRejectNote(""); }} disabled={actionLoading?.startsWith('approve') || actionLoading?.startsWith('reject')} className="rounded-lg h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-60">
                                                            Từ chối
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <DashboardPagination
                        page={page}
                        size={size}
                        totalElements={total}
                        totalPages={totalPages}
                        itemLabel="yêu cầu"
                        className="rounded-b-3xl"
                        onPageChange={setPage}
                        onSizeChange={(nextSize) => {
                            setSize(nextSize);
                            setPage(1);
                        }}
                    />
                </div>

                <div className="min-w-0 space-y-5">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm 2xl:sticky 2xl:top-6">
                        <p className="mb-1 text-xl font-semibold text-slate-900">Phân bố yêu cầu đang mở</p>
                        <p className="mb-3 text-sm text-slate-500">Theo danh sách đang hiển thị và chỉ tính các request còn cần xử lý.</p>
                        <div className="mb-4 flex justify-center h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={activeRequestBreakdown.length > 0 ? activeRequestBreakdown : [{ type: "OTHER", count: 1, color: "#D1D5DB" }]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={2}
                                        dataKey="count"
                                        stroke="none"
                                    >
                                        {(activeRequestBreakdown.length > 0 ? activeRequestBreakdown : [{ type: "OTHER", count: 1, color: "#D1D5DB" }]).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                            {activeRequestBreakdown.map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }}></span>
                                        <span className="truncate text-slate-600">{item.label}</span>
                                    </div>
                                    <span className="shrink-0 text-slate-400">{item.count} ({openVisibleCount ? ((item.count / openVisibleCount) * 100).toFixed(1) : "0"}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xl font-semibold text-slate-900">Yêu cầu quá hạn</p>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-sm font-semibold text-red-500">
                                {overdueItems.length}
                            </div>
                        </div>
                        <div className="space-y-4">
                            {overdueItems.length === 0 ? (
                                <p className="text-sm text-slate-400">Hiện chưa có yêu cầu quá hạn.</p>
                            ) : overdueItems.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3">
                                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${(TYPE_CONFIG[item.requestType] || TYPE_CONFIG.ACCESS).color}`}>
                                        {(TYPE_CONFIG[item.requestType] || TYPE_CONFIG.ACCESS).icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-mono text-sm font-semibold text-slate-900">{item.requestCode || `#${item.id}`}</p>
                                        <p className="mt-1 text-sm text-slate-500">{translateType(item.requestType)}</p>
                                    </div>
                                    <p className="shrink-0 text-sm font-medium text-red-500">Quá hạn</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            </div>

            {/* Detail modal */}
            {detailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-2 sm:p-3 backdrop-blur-sm" onClick={closeDetailModal}>
                    <div className="w-full max-w-4xl max-h-[96vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between z-10">
                            <h3 className="text-lg font-bold text-gray-900">Chi tiết yêu cầu</h3>
                            <Button variant="ghost" size="sm" onClick={closeDetailModal} className="rounded-lg">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-6 space-y-6">
                            <RequestDetailContent req={detailModal} detailTransfer={detailTransfer} />

                            {detailModal.requestType === "ROOM_TRANSFER" && (
                                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-bold text-blue-900">Luồng chuyển phòng vận hành</h4>
                                            <p className="mt-1 text-sm text-blue-700">
                                                Màn quản lý này bám theo trạng thái transfer thực tế, không chỉ trạng thái duyệt yêu cầu.
                                            </p>
                                        </div>
                                        {detailTransfer && (
                                            <Badge variant="outline" className={`${getTransferStatusTone(detailTransfer.status)} border`}>
                                                {translateTransferStatus(detailTransfer.status)}
                                            </Badge>
                                        )}
                                    </div>

                                    {actionLoading === `load-transfer-${detailModal.id}` && (
                                        <div className="flex items-center gap-2 text-sm text-blue-700">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Đang tải chi tiết chuyển phòng...
                                        </div>
                                    )}

                                    {detailTransfer && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="rounded-xl bg-white p-4 border border-blue-100">
                                                    <p className="text-xs font-semibold text-gray-500 mb-1">Phòng cũ</p>
                                                    <p className="text-sm font-semibold text-gray-900">{detailTransfer.oldRoomName || detailTransfer.oldRoomCode || "--"}</p>
                                                    <p className="mt-2 text-xs text-gray-600">
                                                        Chỉ làm full move-out nếu sau chuyển phòng này phòng cũ trở thành phòng trống.
                                                    </p>
                                                </div>
                                                <div className="rounded-xl bg-white p-4 border border-blue-100">
                                                    <p className="text-xs font-semibold text-gray-500 mb-1">Phòng đích</p>
                                                    <p className="text-sm font-semibold text-gray-900">{detailTransfer.targetRoomName || detailTransfer.targetRoomCode || "--"}</p>
                                                    <p className="mt-2 text-xs text-gray-600">
                                                        {requiresFullMoveIn(detailTransfer)
                                                            ? "Move-in chỉ áp dụng khi phòng đích là phòng trống hoặc sắp trống."
                                                            : "Ca này chủ yếu là thêm người vào hợp đồng/phòng đích đang có người."}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-xl bg-white p-4 border border-blue-100">
                                                <p className="text-sm font-semibold text-gray-900 mb-2">Lưu ý thời điểm</p>
                                                <p className="text-sm text-gray-700">{getTransferTimingNote(detailTransfer)}</p>
                                            </div>

                                            <div className="rounded-xl bg-white p-4 border border-blue-100">
                                                <p className="text-sm font-semibold text-gray-900 mb-2">Bước hiện tại cho quản lý</p>
                                                <p className="text-sm text-gray-700">{getTransferActionMeta(detailTransfer).helperText}</p>
                                            </div>

                                            {detailTransfer.oldRoomFinalInvoiceId && (
                                                <div className="rounded-xl bg-white p-4 border border-blue-100">
                                                    <p className="text-sm font-semibold text-gray-900 mb-2">Hóa đơn điện/nước chốt khi chuyển phòng</p>
                                                    <p className="text-sm font-semibold text-gray-900">#{detailTransfer.oldRoomFinalInvoiceId}</p>
                                                </div>
                                            )}

                                            {isTransferSigningStatus(detailTransfer.status) && getTransferSigningDocuments(detailTransfer).length > 0 && (
                                                <div className="rounded-xl bg-white p-4 border border-blue-100">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold text-gray-900">Tài liệu cần ký</p>
                                                        <Badge
                                                            variant="outline"
                                                            className={allTransferSigningDocumentsUploaded(detailTransfer)
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                : "border-amber-200 bg-amber-50 text-amber-700"}
                                                        >
                                                            {allTransferSigningDocumentsUploaded(detailTransfer)
                                                                ? "Đã upload đủ"
                                                                : "Còn thiếu bản ký"}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {getTransferSigningDocuments(detailTransfer).map((document) => (
                                                            <div key={document.kind} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-gray-900">{document.label}</p>
                                                                        <p className="mt-1 text-xs text-gray-500">{document.contractCode || `#${document.id}`}</p>
                                                                    </div>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={document.contractFileId
                                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                            : "border-gray-200 bg-white text-gray-600"}
                                                                    >
                                                                        {document.contractFileId ? "Đã upload" : "Chưa upload"}
                                                                    </Badge>
                                                                </div>
                                                                <p className="mt-2 truncate text-xs text-gray-600">
                                                                    {document.contractFileName || "Chưa có file bản ký"}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {Array.isArray(detailTransfer.blockingReasons) && detailTransfer.blockingReasons.length > 0 && (
                                                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                                            {detailTransfer.blockingReasons.join(" ")}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {detailTransfer.status === "WAITING_TRANSFER_DATE" && (
                                                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                                                    <p className="text-sm font-semibold text-cyan-800 mb-1">Sẵn sàng bắt đầu phiên chuyển phòng</p>
                                                    <p className="text-sm text-cyan-700">
                                                        Ngày chuyển chỉ là ngày dự kiến. Manager có thể bắt đầu phiên chuyển phòng khi tenant và quản lý đã có mặt thực tế.
                                                    </p>
                                                </div>
                                            )}

                                            {detailTransfer.status === "READY_FOR_HANDOVER" && detailTransfer.sourceRoomWillBeEmptyAfterTransfer === false && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                    <p className="text-sm font-semibold text-amber-800 mb-1">Phòng cũ còn người ở lại</p>
                                                    <p className="text-sm text-amber-700">
                                                        Nhập điện nước phòng cũ để tạo hóa đơn utility transfer. Sau khi hóa đơn này thanh toán, chỉ số đó là baseline mới cho phòng cũ.
                                                    </p>
                                                </div>
                                            )}

                                            {!detailTransfer.status && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                    <p className="text-sm font-semibold text-amber-800 mb-1">Chế độ dữ liệu dự phòng</p>
                                                    <p className="text-sm text-amber-700">
                                                        API chi tiết transfer hiện chưa truy cập được từ màn này. Hệ thống đang hiển thị dữ liệu cơ bản từ payload yêu cầu, nên chưa thể xác định chính xác trạng thái vận hành để mở các nút hành động tiếp theo.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {(detailModal.status === 'PENDING' || (detailModal.requestType === 'ROOM_TRANSFER' && detailTransfer)) && (
                            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 flex flex-wrap items-center justify-end gap-3">
                                {detailModal.status === 'PENDING' && (
                                    <>
                                        <Button variant="outline" onClick={() => { setRejectModal(detailModal); setRejectNote(""); closeDetailModal(); }} className="rounded-lg text-red-600 border-red-200 hover:bg-red-50">
                                            Từ chối
                                        </Button>
                                        <Button onClick={() => { handleApprove(detailModal.id); closeDetailModal(); }} disabled={actionLoading?.startsWith('approve')} className="rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">
                                            {actionLoading === `approve-${detailModal.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Duyệt yêu cầu"}
                                        </Button>
                                    </>
                                )}
                                {detailModal.requestType === 'ROOM_TRANSFER' && detailTransfer?.status === 'WAITING_CONTRACT_CONFIRMATION' && (
                                    <Button
                                        onClick={handleConfirmTransferContract}
                                        disabled={Boolean(actionLoading)}
                                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                                    >
                                        {actionLoading === `confirm-contract-${detailModal.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận hợp đồng"}
                                    </Button>
                                )}
                                {detailModal.requestType === 'ROOM_TRANSFER' && isTransferSigningStatus(detailTransfer?.status) && getTransferSigningDocuments(detailTransfer).length > 0 && (
                                    <>
                                        {getTransferSigningDocuments(detailTransfer).map((document) => (
                                            <div key={document.kind} className="flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-xs font-semibold text-gray-700">{document.label}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={document.contractFileId
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                : "border-gray-200 bg-white text-gray-600"}
                                                        >
                                                            {document.contractFileId ? "Đã upload" : "Chưa upload"}
                                                        </Badge>
                                                    </div>
                                                    {document.contractFileName && (
                                                        <p className="mt-1 max-w-[220px] truncate text-[11px] text-gray-500">
                                                            {document.contractFileName}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleDownloadTransferContractDraft(document.id)}
                                                    disabled={Boolean(actionLoading)}
                                                    className="rounded-lg"
                                                >
                                                    {actionLoading === `download-transfer-contract-${document.id}`
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <Download className="w-4 h-4" />}
                                                    Tải
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setSelectedTransferContractId(document.id);
                                                        signedTransferContractInputRef.current?.click();
                                                    }}
                                                    disabled={Boolean(actionLoading)}
                                                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                                                >
                                                    {actionLoading === `upload-transfer-contract-${document.id}`
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <Upload className="w-4 h-4" />}
                                                    {document.contractFileId ? "Upload lại" : "Upload"}
                                                </Button>
                                            </div>
                                        ))}
                                        <input
                                            ref={signedTransferContractInputRef}
                                            type="file"
                                            accept="application/pdf,image/*"
                                            className="hidden"
                                            onChange={handleUploadSignedTransferContract}
                                        />
                                        {isTransferSigningStatus(detailTransfer.status) &&
                                            allowsTransferAction(detailTransfer, "SIGN_TRANSFER_CONTRACT") && (
                                            <Button
                                                onClick={handleSignTransferContract}
                                                disabled={Boolean(actionLoading)}
                                                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                                            >
                                                {actionLoading === `sign-transfer-contract-${detailModal.id}`
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <CheckCircle2 className="w-4 h-4" />}
                                                Xác nhận đã ký đủ
                                            </Button>
                                        )}
                                    </>
                                )}
                                {detailModal.requestType === 'ROOM_TRANSFER'
                                    && detailTransfer
                                    && ['WAITING_TRANSFER_DATE', 'READY_FOR_HANDOVER', 'WAITING_EXECUTION'].includes(detailTransfer.status)
                                    && (detailTransfer.status !== 'WAITING_EXECUTION' || allowsTransferAction(detailTransfer, "COMPLETE_TRANSFER")) && (
                                    <Button
                                        onClick={() => openExecuteModal(detailModal, detailTransfer)}
                                        disabled={Boolean(actionLoading)}
                                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                                    >
                                        {detailTransfer?.status === "WAITING_EXECUTION"
                                            ? "Hoàn tất chuyển phòng"
                                            : "Chốt phòng cũ"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <TransferExecutionModal
                open={Boolean(executeModal)}
                transferRequestId={executeModal?.transfer?.id}
                transfer={executeModal?.transfer}
                request={executeModal?.request}
                onClose={closeExecuteModal}
                onCompleted={async (refreshedTransfer) => {
                    if (refreshedTransfer) {
                        setDetailTransfer(refreshedTransfer);
                    } else if (detailModal) {
                        setDetailTransfer(await loadTransferDetail(detailModal));
                    }
                    await loadData();
                }}
            />
            {/* Reject modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-3 backdrop-blur-sm" onClick={() => setRejectModal(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="border-b border-gray-200 px-6 py-4">
                            <h3 className="text-lg font-bold text-gray-900">Từ chối yêu cầu</h3>
                            <p className="text-sm text-gray-500 mt-1">{rejectModal.title || rejectModal.requestCode}</p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lý do từ chối</label>
                            <textarea
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={4}
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Nhập lý do từ chối..."
                            />
                        </div>
                        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setRejectModal(null)} className="rounded-lg">
                                Hủy
                            </Button>
                            <Button onClick={handleReject} disabled={actionLoading?.startsWith('reject')} className="rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60">
                                {actionLoading === `reject-${rejectModal.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận từ chối"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
  );
}
