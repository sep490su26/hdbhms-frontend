"use client";

import { useState } from "react";
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

const REQUESTS = [
    { id: "TR-2026-001", type: "Transfer Request", typeKey: "transfer", tenant: "Nguyen Van A", phone: "0901 234 567", room: "A101 → B203", requestedDate: "20/06/2026", submittedAgo: "2 hours ago", submittedAt: "18/06/2026 10:30", status: "Pending" },
    { id: "MO-2026-005", type: "Move Out Request", typeKey: "moveout", tenant: "Tran Thi B", phone: "0912 345 678", room: "A205", requestedDate: "30/06/2026", submittedAgo: "1 day ago", submittedAt: "17/06/2026 16:45", status: "Pending" },
    { id: "CR-2026-003", type: "Contract Renewal", typeKey: "renewal", tenant: "Le Van C", phone: "0933 556 789", room: "B105", requestedDate: "15/07/2026", submittedAgo: "2 days ago", submittedAt: "16/06/2026 09:20", status: "Pending" },
    { id: "CT-2026-002", type: "Contract Termination", typeKey: "termination", tenant: "Pham Thi D", phone: "0988 776 655", room: "C302", requestedDate: "10/07/2026", submittedAgo: "2 days ago", submittedAt: "16/06/2026 11:15", status: "Pending" },
    { id: "MA-2026-011", type: "Maintenance Request", typeKey: "maintenance", tenant: "Hoang Van E", phone: "0911 223 344", room: "A301", requestedDate: "—", submittedAgo: "3 days ago", submittedAt: "15/06/2026 14:05", status: "Pending" },
    { id: "CP-2026-007", type: "Complaint", typeKey: "complaint", tenant: "Vu Thi F", phone: "0944 889 900", room: "B201", requestedDate: "—", submittedAgo: "3 days ago", submittedAt: "15/06/2026 10:40", status: "Pending" },
    { id: "AC-2026-004", type: "Access Card Request", typeKey: "access", tenant: "Ngo Van G", phone: "0977 665 544", room: "A101", requestedDate: "—", submittedAgo: "4 days ago", submittedAt: "14/06/2026 09:10", status: "Pending" },
];

const TYPE_CONFIG = {
    transfer: { color: "bg-blue-50", icon: <ArrowRightLeft className="w-5 h-5 text-blue-500" /> },
    moveout: { color: "bg-orange-50", icon: <LogOut className="w-5 h-5 text-orange-500" /> },
    renewal: { color: "bg-indigo-50", icon: <FileText className="w-5 h-5 text-indigo-500" /> },
    termination: { color: "bg-red-50", icon: <XCircle className="w-5 h-5 text-red-500" /> },
    maintenance: { color: "bg-cyan-50", icon: <Wrench className="w-5 h-5 text-cyan-500" /> },
    complaint: { color: "bg-yellow-50", icon: <MessageSquareWarning className="w-5 h-5 text-yellow-500" /> },
    access: { color: "bg-green-50", icon: <Key className="w-5 h-5 text-green-600" /> },
};

const BREAKDOWN = [
    { label: "Transfer Request", count: 4, color: "bg-blue-500" },
    { label: "Move Out Request", count: 3, color: "bg-green-500" },
    { label: "Contract Termination", count: 5, color: "bg-yellow-400" },
    { label: "Maintenance Request", count: 2, color: "bg-purple-500" },
    { label: "Complaint", count: 1, color: "bg-pink-400" },
    { label: "Others", count: 2, color: "bg-gray-300" },
];

const DONUT_SEGMENTS = [
    { name: "Transfer", value: 23, color: "#3B82F6" },
    { name: "Move Out", value: 18, color: "#22C55E" },
    { name: "Termination", value: 29, color: "#FACC15" },
    { name: "Maintenance", value: 12, color: "#A855F7" },
    { name: "Complaint", value: 6, color: "#F472B6" },
    { name: "Others", value: 12, color: "#D1D5DB" },
];

export default function ApprovalCenter() {
    const [typeFilter, setTypeFilter] = useState("All Types");
    const [statusFilter, setStatusFilter] = useState("Pending");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const filtered = REQUESTS.filter((r) => {
        const matchSearch = r.tenant.toLowerCase().includes(search.toLowerCase()) ||
            r.id.toLowerCase().includes(search.toLowerCase()) ||
            r.room.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === "All Types" || r.type === typeFilter;
        return matchSearch && matchType;
    });

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
                            { label: "Pending Approval", value: 12, sub: "Requests waiting for you", iconBg: "bg-blue-50", icon: <FileCheck2 className="w-7 h-7 text-blue-500" /> },
                            { label: "Approved Today", value: 35, sub: "Requests approved", iconBg: "bg-green-50", icon: <CalendarCheck className="w-7 h-7 text-green-500" /> },
                            { label: "Rejected Today", value: 3, sub: "Requests rejected", iconBg: "bg-red-50", icon: <XCircle className="w-7 h-7 text-red-500" /> },
                            { label: "This Month", value: 50, sub: "Total requests", iconBg: "bg-purple-50", icon: <CalendarRange className="w-7 h-7 text-purple-500" /> },
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
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option>All Types</option>
                            {Object.keys(REQUESTS.reduce((acc, r) => { acc[r.type] = true; return acc; }, {})).map(t => <option key={t}>{t}</option>)}
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
                                {filtered.map((req) => {
                                    const tc = TYPE_CONFIG[req.typeKey];
                                    return (
                                        <TableRow key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 ${tc.color} rounded-xl flex items-center justify-center shrink-0`}>
                                                        {tc.icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 text-sm">{req.type}</p>
                                                        <p className="text-xs text-gray-400">{req.id}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <p className="font-medium text-gray-900">{req.tenant}</p>
                                                <p className="text-xs text-gray-400">{req.phone}</p>
                                            </TableCell>
                                            <TableCell className="px-5 py-4 text-gray-600 font-medium">
                                                {req.room}
                                            </TableCell>
                                            <TableCell className="px-5 py-4 text-gray-600">
                                                {req.requestedDate}
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <p className="text-gray-700 font-medium">{req.submittedAgo}</p>
                                                <p className="text-xs text-gray-400">{req.submittedAt}</p>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                                                    {req.status}
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
                                })}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                                            No requests found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-gray-500">Showing {filtered.length > 0 ? 1 : 0} to {filtered.length} of 87 requests</p>
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
                                        data={DONUT_SEGMENTS}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {DONUT_SEGMENTS.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-3">
                            {BREAKDOWN.map((item) => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`}></span>
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