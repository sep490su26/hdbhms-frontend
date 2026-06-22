"use client";

import { useState, useEffect } from "react";
import { fetchChangeRequests, fetchChangeRequestStats } from "@/services/changeRequestsService";
import { Loader2 } from "lucide-react";
import {
    ArrowRightLeft,
    LogOut,
    FileText,
    Wrench,
    MessageSquareWarning,
    Key,
    Search,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    FileCheck2,
    CalendarCheck,
    XCircle,
    CalendarRange,
} from "lucide-react";
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

const translateStatus = (status) => {
    const map = {
        PENDING: "Pending",
        APPROVED: "Approved",
        REJECTED: "Rejected"
    };
    return map[status] || status;
};

const TYPE_CONFIG = {
    TRANSFER: { color: "bg-blue-50", icon: <ArrowRightLeft className="w-5 h-5 text-blue-500" /> },
    MOVEOUT: { color: "bg-green-50", icon: <LogOut className="w-5 h-5 text-green-500" /> },
    RENEWAL: { color: "bg-indigo-50", icon: <FileText className="w-5 h-5 text-indigo-500" /> },
    TERMINATION: { color: "bg-red-50", icon: <XCircle className="w-5 h-5 text-red-500" /> },
    MAINTENANCE: { color: "bg-cyan-50", icon: <Wrench className="w-5 h-5 text-cyan-500" /> },
    COMPLAINT: { color: "bg-yellow-50", icon: <MessageSquareWarning className="w-5 h-5 text-yellow-500" /> },
    ACCESS: { color: "bg-gray-50", icon: <Key className="w-5 h-5 text-gray-500" /> },
};

export default function ApprovalCenter() {
    const [typeFilter, setTypeFilter] = useState("All Types");
    const [statusFilter, setStatusFilter] = useState("Pending");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ breakdown: [], pendingCount: 0, approvedCount: 0, rejectedCount: 0, totalCount: 0 });
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dataRes, statsRes] = await Promise.all([
                fetchChangeRequests({ page: page - 1, size: 8, type: typeFilter === "All Types" ? "all" : typeFilter, status: statusFilter === "All" ? "all" : statusFilter, search }),
                fetchChangeRequestStats()
            ]);
            setData(dataRes.requests || []);
            setTotal(dataRes.total || 0);

            if (statsRes) {
                const colors = { TRANSFER: "#3B82F6", MOVEOUT: "#22C55E", TERMINATION: "#FACC15", MAINTENANCE: "#A855F7", COMPLAINT: "#F472B6", ACCESS: "#9CA3AF" };
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
            <div className="flex gap-5 items-start">
                {/* LEFT: main content */}
                <div className="flex-1 min-w-0 space-y-5">
                    {/* Stat cards */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: "Pending Approval", value: stats.pendingCount, sub: "Requests waiting for you", iconBg: "bg-blue-50", icon: <FileCheck2 className="w-7 h-7 text-blue-500" /> },
                            { label: "Approved Today", value: stats.approvedCount, sub: "Requests approved", iconBg: "bg-green-50", icon: <CalendarCheck className="w-7 h-7 text-green-500" /> },
                            { label: "Rejected Today", value: stats.rejectedCount, sub: "Requests rejected", iconBg: "bg-red-50", icon: <XCircle className="w-7 h-7 text-red-500" /> },
                            { label: "Total Month", value: stats.totalCount, sub: "Total requests", iconBg: "bg-purple-50", icon: <CalendarRange className="w-7 h-7 text-purple-500" /> },
                        ].map((card) => (
                            <div key={card.label} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start gap-4">
                                <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0`}>{card.icon}</div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium mb-1">{card.label}</p>
                                    <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Search and Filters */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                className="pl-11 rounded-xl bg-white"
                                placeholder="Search tenant, room, request code, contract code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white text-gray-700 font-medium h-10"
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        >
                            <option value="All Types">All Types</option>
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
                            className="rounded-xl bg-white text-gray-500 hover:text-gray-700 h-10 px-4"
                            onClick={() => { setTypeFilter("All Types"); setStatusFilter("Pending"); setSearch(""); }}
                        >
                            Reset
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                    {["Type", "Tenant", "Room", "Requested Date", "Submitted", "Status", "Action"].map((h) => (
                                        <TableHead key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 h-12">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                            Đang tải dữ liệu...
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                                            No requests found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((req) => {
                                        const tc = TYPE_CONFIG[req.requestType] || TYPE_CONFIG.ACCESS;
                                        return (
                                            <TableRow key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                                <TableCell className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 ${tc.color} rounded-xl flex items-center justify-center shrink-0`}>
                                                            {tc.icon}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-sm">{translateType(req.requestType)}</p>
                                                            <p className="text-xs text-gray-400">{req.requestCode}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-5 py-4">
                                                    <p className="font-medium text-gray-900">Guest #{req.requesterId || "--"}</p>
                                                    <p className="text-xs text-gray-400">---</p>
                                                </TableCell>
                                                <TableCell className="px-5 py-4 text-gray-600 font-medium">
                                                    --
                                                </TableCell>
                                                <TableCell className="px-5 py-4 text-gray-600">
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="px-5 py-4">
                                                    <p className="text-gray-700 font-medium">{new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    <p className="text-xs text-gray-400">Today</p>
                                                </TableCell>
                                                <TableCell className="px-5 py-4">
                                                    <Badge variant="outline" className={`bg-white border-gray-200 capitalize ${req.status === 'PENDING' ? 'text-yellow-600 bg-yellow-50' : req.status === 'APPROVED' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                                        {translateStatus(req.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 px-4">
                                                            Review
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

                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-gray-500">Showing {Math.min(1 + (page - 1) * 8, total)} to {Math.min(page * 8, total)} of {total} requests</p>
                        <Pagination className="mx-0 w-auto">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }}
                                        className={page === 1 ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>
                                {[1, 2, 3, 4, 5].map((p) => (
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
                                <PaginationItem>
                                    <PaginationEllipsis />
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setPage(page + 1); }}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>

                {/* RIGHT: Breakdown sidebar */}
                <div className="w-72 shrink-0">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                        <p className="text-sm font-semibold text-gray-800 mb-4">Request Type Breakdown</p>
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
                        <Button variant="link" className="mt-4 p-0 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center h-auto">
                            View all types
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}