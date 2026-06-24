"use client";

import { useState, useEffect } from "react";
import { fetchChangeRequests, fetchChangeRequestStats, approveChangeRequest, rejectChangeRequest } from "@/services/changeRequestsService";
import { Loader2, Eye, X, CheckCircle2, XCircle, Clock, ArrowRightLeft, LogOut, FileText, Wrench, MessageSquareWarning, Key, Search, ChevronRight, FileCheck2, CalendarCheck, CalendarRange, AlertCircle } from "lucide-react";
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
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    TransferRequestDetail,
    MoveoutRequestDetail,
    RenewalRequestDetail,
    TerminationRequestDetail,
    MaintenanceRequestDetail,
    ComplaintRequestDetail,
    AccessRequestDetail,
} from "./_components/RequestTypeDetails";

const translateType = (type) => {
    const map = {
        TRANSFER: "Chuyển phòng",
        MOVEOUT: "Trả phòng",
        RENEWAL: "Gia hạn HĐ",
        TERMINATION: "Thanh lý HĐ",
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

const TYPE_CONFIG = {
    TRANSFER: { color: "bg-blue-50", icon: <ArrowRightLeft className="w-5 h-5 text-blue-500" />, accent: "blue" },
    MOVEOUT: { color: "bg-green-50", icon: <LogOut className="w-5 h-5 text-green-500" />, accent: "green" },
    RENEWAL: { color: "bg-indigo-50", icon: <FileText className="w-5 h-5 text-indigo-500" />, accent: "indigo" },
    TERMINATION: { color: "bg-red-50", icon: <XCircle className="w-5 h-5 text-red-500" />, accent: "red" },
    MAINTENANCE: { color: "bg-cyan-50", icon: <Wrench className="w-5 h-5 text-cyan-500" />, accent: "cyan" },
    COMPLAINT: { color: "bg-yellow-50", icon: <MessageSquareWarning className="w-5 h-5 text-yellow-500" />, accent: "yellow" },
    ACCESS: { color: "bg-gray-50", icon: <Key className="w-5 h-5 text-gray-500" />, accent: "gray" },
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
};

function RequestDetailContent({ req }) {
    const mappedType = mapRequestType(req.requestType);
    const payload = req.requestPayload ? (() => { try { return JSON.parse(req.requestPayload); } catch { return null; } })() : null;
    const TypeDetailComponent = TYPE_DETAIL_COMPONENTS[mappedType];

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
                        <Badge variant="outline" className={`bg-white capitalize ${req.status === 'PENDING' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : req.status === 'APPROVED' ? 'text-green-600 bg-green-50 border-green-200' : req.status === 'REJECTED' ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-600 bg-gray-50'}`}>
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
            {TypeDetailComponent && payload && <TypeDetailComponent payload={payload} />}

            {/* Resolution info */}
            {req.status !== "PENDING" && (
                <div className={`rounded-xl p-4 ${req.status === "APPROVED" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                        {req.status === "APPROVED" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <p className={`text-sm font-semibold ${req.status === "APPROVED" ? "text-green-700" : "text-red-700"}`}>
                            {req.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"}
                        </p>
                    </div>
                    {req.resolutionNote && (
                        <p className={`text-sm whitespace-pre-wrap ${req.status === "APPROVED" ? "text-green-600" : "text-red-600"}`}>
                            {req.resolutionNote}
                        </p>
                    )}
                    {req.resolvedAt && (
                        <p className={`text-xs mt-2 ${req.status === "APPROVED" ? "text-green-500" : "text-red-500"}`}>
                            {new Date(req.resolvedAt).toLocaleString('vi-VN')}
                        </p>
                    )}
                </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                <span>Tạo: {req.createdAt ? new Date(req.createdAt).toLocaleString('vi-VN') : "--"}</span>
            </div>

            {!payload && req.requestType && (
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

    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ breakdown: [], pendingCount: 0, approvedCount: 0, rejectedCount: 0, totalCount: 0 });
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [actionLoading, setActionLoading] = useState(null);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectNote, setRejectNote] = useState("");
    const [detailModal, setDetailModal] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const apiStatus = statusFilter === "All" ? undefined : statusFilter;
            const [dataRes, statsRes] = await Promise.all([
                fetchChangeRequests({ page: page - 1, size: 8, type: typeFilter === "All Types" ? undefined : typeFilter, status: apiStatus, search }),
                fetchChangeRequestStats()
            ]);
            setData(dataRes.requests || []);
            setTotal(dataRes.total || 0);
            setTotalPages(dataRes.totalPages || 1);

            if (statsRes) {
                const colors = { TRANSFER: "#3B82F6", MOVEOUT: "#22C55E", TERMINATION: "#FACC15", MAINTENANCE: "#A855F7", COMPLAINT: "#F472B6", ACCESS: "#9CA3AF", RENEWAL: "#6366F1" };
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
    };

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

    useEffect(() => {
        const t = setTimeout(loadData, 300);
        return () => clearTimeout(t);
    }, [search, typeFilter, statusFilter, page]);

    return (
        <div className="font-sans">
            <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">Trung tâm phê duyệt</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">Quản lý và phê duyệt tất cả các yêu cầu từ khách thuê và khách vãng lai.</p>
                </div>
            </section>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                {/* LEFT: main content */}
                <div className="flex-1 min-w-0 space-y-5">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            { label: "Đang chờ duyệt", value: stats.pendingCount, sub: "Yêu cầu chờ xử lý", iconBg: "bg-blue-50", icon: <Clock className="w-6 h-6 lg:w-7 lg:h-7 text-blue-500" /> },
                            { label: "Đã duyệt hôm nay", value: stats.approvedCount, sub: "Yêu cầu đã duyệt", iconBg: "bg-green-50", icon: <CalendarCheck className="w-6 h-6 lg:w-7 lg:h-7 text-green-500" /> },
                            { label: "Đã từ chối hôm nay", value: stats.rejectedCount, sub: "Yêu cầu bị từ chối", iconBg: "bg-red-50", icon: <XCircle className="w-6 h-6 lg:w-7 lg:h-7 text-red-500" /> },
                            { label: "Tổng tháng này", value: stats.totalCount, sub: "Tổng yêu cầu", iconBg: "bg-purple-50", icon: <CalendarRange className="w-6 h-6 lg:w-7 lg:h-7 text-purple-500" /> },
                        ].map((card) => (
                            <div key={card.label} className="bg-white border border-gray-200 rounded-2xl p-4 lg:p-5 flex items-start gap-3 lg:gap-4">
                                <div className={`w-10 h-10 lg:w-12 lg:h-12 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0`}>{card.icon}</div>
                                <div>
                                    <p className="text-[11px] lg:text-xs text-gray-400 font-medium mb-0.5 lg:mb-1">{card.label}</p>
                                    <p className="text-2xl lg:text-3xl font-bold text-gray-900">{card.value}</p>
                                    <p className="text-[11px] lg:text-xs text-gray-400 mt-0.5 hidden sm:block">{card.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
    
                    {/* Search and Filters */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                className="pl-11 rounded-xl bg-white"
                                placeholder="Tìm kiếm theo mã yêu cầu, tiêu đề..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white text-gray-700 font-medium h-10"
                                value={typeFilter}
                                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                            >
                                <option value="All Types">Tất cả loại</option>
                                {Object.keys(TYPE_CONFIG).map(t => <option key={t} value={t}>{translateType(t)}</option>)}
                            </select>
                            <select
                                className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white text-gray-700 font-medium h-10"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option>Pending</option>
                                <option>Approved</option>
                                <option>Rejected</option>
                                <option>All</option>
                            </select>
                            <Button
                                variant="outline"
                                className="rounded-xl bg-white text-gray-500 hover:text-gray-700 h-10 px-4 shrink-0"
                                onClick={() => { setTypeFilter("All Types"); setStatusFilter("Pending"); setSearch(""); }}
                            >
                                Reset
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                        <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 h-12 whitespace-nowrap">Mã yêu cầu</TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 h-12 whitespace-nowrap">Loại</TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 h-12 whitespace-nowrap">Tiêu đề</TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 h-12 whitespace-nowrap">Ngày tạo</TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 h-12 whitespace-nowrap">Trạng thái</TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 h-12 text-right whitespace-nowrap">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                            Đang tải dữ liệu...
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                            Không tìm thấy yêu cầu nào.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((req) => {
                                        const tc = TYPE_CONFIG[req.requestType] || TYPE_CONFIG.ACCESS;
                                        return (
                                            <TableRow key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                                <TableCell className="px-5 py-4">
                                                    <p className="font-mono text-sm font-semibold text-gray-900">{req.requestCode || `#${req.id}`}</p>
                                                </TableCell>
                                                <TableCell className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-8 h-8 ${tc.color} rounded-lg flex items-center justify-center shrink-0`}>
                                                            {tc.icon}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">{translateType(req.requestType)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-5 py-4">
                                                    <p className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{req.title || "--"}</p>
                                                </TableCell>
                                                <TableCell className="px-5 py-4 text-gray-600 text-sm">
                                                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString('vi-VN') : "--"}
                                                </TableCell>
                                                <TableCell className="px-5 py-4">
                                                    <Badge variant="outline" className={`bg-white border-gray-200 capitalize ${req.status === 'PENDING' ? 'text-yellow-600 bg-yellow-50' : req.status === 'APPROVED' ? 'text-green-600 bg-green-50' : req.status === 'REJECTED' ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50'}`}>
                                                        {translateStatus(req.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => setDetailModal(req)} className="rounded-lg h-8 px-3 text-gray-600 hover:text-gray-900">
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
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                        <p className="text-sm text-gray-500">Showing {total === 0 ? 0 : Math.min(1 + (page - 1) * 8, total)} to {Math.min(page * 8, total)} of {total} requests</p>
                        <Pagination className="mx-0 w-auto">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }}
                                        className={page === 1 ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                                    <PaginationItem key={p}>
                                        <PaginationLink
                                            href="#"
                                            isActive={p === page}
                                            onClick={(e) => { e.preventDefault(); setPage(p); }}
                                        >
                                            {p}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                {totalPages > 5 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }}
                                        className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>

                {/* RIGHT: Breakdown sidebar */}
                <div className="w-full xl:w-72 xl:shrink-0">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                        <p className="text-sm font-semibold text-gray-800 mb-4">Phân loại yêu cầu</p>
                        <div className="flex justify-center mb-5 h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.breakdown.length > 0 ? stats.breakdown : [{ type: "OTHER", count: 1, color: "#D1D5DB" }]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={2}
                                        dataKey="count"
                                        stroke="none"
                                    >
                                        {(stats.breakdown.length > 0 ? stats.breakdown : [{ type: "OTHER", count: 1, color: "#D1D5DB" }]).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                            {stats.breakdown.map((item) => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                                        <span className="text-xs text-gray-600">{item.label}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail modal */}
            {detailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-3 backdrop-blur-sm" onClick={() => setDetailModal(null)}>
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between z-10">
                            <h3 className="text-lg font-bold text-gray-900">Chi tiết yêu cầu</h3>
                            <Button variant="ghost" size="sm" onClick={() => setDetailModal(null)} className="rounded-lg">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="p-6">
                            <RequestDetailContent req={detailModal} />
                        </div>
                        {detailModal.status === 'PENDING' && (
                            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => { setRejectModal(detailModal); setRejectNote(""); setDetailModal(null); }} className="rounded-lg text-red-600 border-red-200 hover:bg-red-50">
                                    Từ chối
                                </Button>
                                <Button onClick={() => { handleApprove(detailModal.id); setDetailModal(null); }} disabled={actionLoading?.startsWith('approve')} className="rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-60">
                                    {actionLoading === `approve-${detailModal.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : "Duyệt yêu cầu"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
