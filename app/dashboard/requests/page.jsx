"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchChangeRequests,
  fetchChangeRequestStats,
} from "@/services/changeRequestsService";
import { Loader2 } from "lucide-react";
import {
  ArrowRightLeft,
  LogOut,
  FileText,
  Wrench,
  MessageSquareWarning,
  Key,
  Search,
  ChevronRight,
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
import { formatDate as formatDisplayDate } from "@/lib/dateFormat";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";

const translateType = (type) => {
  const map = {
    TRANSFER: "Chuyển phòng",
    MOVEOUT: "Trả phòng",
    RENEWAL: "Gia hạn HĐ",
    TERMINATION: "Thanh lý HĐ",
    MAINTENANCE: "Bảo trì",
    COMPLAINT: "Khiếu nại",
    ACCESS: "Yêu cầu thẻ",
  };
  return map[type] || type;
};

const translateStatus = (status) => {
  const map = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return map[status] || status;
};

const TYPE_CONFIG = {
  TRANSFER: {
    color: "bg-blue-50 dark:bg-blue-500/10",
    icon: <ArrowRightLeft className="w-5 h-5 text-blue-500 dark:text-blue-300" />,
  },
  MOVEOUT: {
    color: "bg-green-50 dark:bg-green-500/10",
    icon: <LogOut className="w-5 h-5 text-green-500 dark:text-green-300" />,
  },
  RENEWAL: {
    color: "bg-indigo-50 dark:bg-blue-500/10",
    icon: <FileText className="w-5 h-5 text-indigo-500 dark:text-blue-300" />,
  },
  TERMINATION: {
    color: "bg-red-50 dark:bg-rose-500/10",
    icon: <XCircle className="w-5 h-5 text-red-500 dark:text-rose-300" />,
  },
  MAINTENANCE: {
    color: "bg-cyan-50 dark:bg-blue-500/10",
    icon: <Wrench className="w-5 h-5 text-cyan-500 dark:text-blue-300" />,
  },
  COMPLAINT: {
    color: "bg-yellow-50 dark:bg-yellow-500/10",
    icon: <MessageSquareWarning className="w-5 h-5 text-yellow-500 dark:text-yellow-300" />,
  },
  ACCESS: {
    color: "bg-gray-50 dark:bg-[#020817]",
    icon: <Key className="w-5 h-5 text-slate-500 dark:text-slate-400" />,
  },
};

export default function ApprovalCenter() {
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    breakdown: [],
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dataRes, statsRes] = await Promise.all([
        fetchChangeRequests({
          page: page - 1,
          size,
          type: typeFilter === "All Types" ? "all" : typeFilter,
          status: statusFilter === "All" ? "all" : statusFilter,
          search,
        }),
        fetchChangeRequestStats(),
      ]);
      setData(dataRes.requests || []);
      setTotal(dataRes.total || 0);

      if (statsRes) {
        const colors = {
          TRANSFER: "#3B82F6",
          MOVEOUT: "#22C55E",
          TERMINATION: "#FACC15",
          MAINTENANCE: "#A855F7",
          COMPLAINT: "#F472B6",
          ACCESS: "#9CA3AF",
        };
        const breakdown = (statsRes.breakdown || []).map((b) => ({
          ...b,
          label: translateType(b.type),
          color: colors[b.type] || "#D1D5DB",
        }));
        setStats({
          pendingCount: statsRes.pendingCount || 0,
          approvedCount: statsRes.approvedCount || 0,
          rejectedCount: statsRes.rejectedCount || 0,
          totalCount: statsRes.totalCount || 0,
          breakdown,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, size, statusFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [loadData]);

  const totalPages = Math.ceil(total / size);

  return (
    <div className="w-full min-w-0 flex flex-col gap-6 font-sans">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">
            Quản lý yêu cầu
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Quản lý và phê duyệt tất cả các yêu cầu từ khách thuê và khách vãng
            lai.
          </p>
        </div>
      </section>
      <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        {/* LEFT: main content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Stat cards */}
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Pending Approval",
                value: stats.pendingCount,
                sub: "Requests waiting for you",
                iconBg: "bg-blue-50 dark:bg-blue-500/10",
                icon: <FileCheck2 className="w-7 h-7 text-blue-500 dark:text-blue-300" />,
              },
              {
                label: "Approved Today",
                value: stats.approvedCount,
                sub: "Requests approved",
                iconBg: "bg-green-50 dark:bg-green-500/10",
                icon: <CalendarCheck className="w-7 h-7 text-green-500 dark:text-green-300" />,
              },
              {
                label: "Rejected Today",
                value: stats.rejectedCount,
                sub: "Requests rejected",
                iconBg: "bg-red-50 dark:bg-rose-500/10",
                icon: <XCircle className="w-7 h-7 text-red-500 dark:text-rose-300" />,
              },
              {
                label: "Total Month",
                value: stats.totalCount,
                sub: "Total requests",
                iconBg: "bg-purple-50 dark:bg-blue-500/10",
                icon: <CalendarRange className="w-7 h-7 text-purple-500 dark:text-blue-300" />,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-start gap-4"
              >
                <div
                  className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0`}
                >
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search and Filters */}
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
              <Input
                className="w-full pl-11 rounded-xl bg-white dark:bg-[#0f172a]"
                placeholder="Search tenant, room, request code, contract code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="All Types">All Types</option>
              {Object.keys(TYPE_CONFIG).map((t) => (
                <option key={t} value={t}>
                  {translateType(t)}
                </option>
              ))}
            </select>
            <select
              className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>All</option>
            </select>
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl bg-white dark:bg-[#0f172a] px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              onClick={() => {
                setTypeFilter("All Types");
                setStatusFilter("Pending");
                setSearch("");
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                  {[
                    "Type",
                    "Tenant",
                    "Room",
                    "Requested Date",
                    "Submitted",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-5 h-12"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-slate-500 dark:text-slate-400"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 dark:text-blue-300 mb-2" />
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-slate-500 dark:text-slate-400"
                    >
                      No requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((req) => {
                    const tc =
                      TYPE_CONFIG[req.requestType] || TYPE_CONFIG.ACCESS;
                    return (
                      <TableRow
                        key={req.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 ${tc.color} rounded-xl flex items-center justify-center shrink-0`}
                            >
                              {tc.icon}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                {translateType(req.requestType)}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {req.requestCode}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <p className="font-medium text-slate-900 dark:text-white">
                            Guest #{req.requesterId || "--"}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">---</p>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-slate-600 dark:text-slate-300 font-medium">
                          --
                        </TableCell>
                        <TableCell className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          {formatDisplayDate(req.createdAt)}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <p className="text-slate-700 dark:text-slate-200 font-medium">
                            {new Date(req.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">Today</p>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <Badge
                            variant="outline"
                            className={`bg-white dark:bg-[#0f172a] border-gray-200 dark:border-white/10 capitalize ${req.status === "PENDING" ? "text-yellow-600 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-500/10" : req.status === "APPROVED" ? "text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-500/10" : "text-red-600 dark:text-rose-300 bg-red-50 dark:bg-rose-500/10"}`}
                          >
                            {translateStatus(req.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 px-4"
                            >
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

          <DashboardPagination
            page={page}
            size={size}
            totalElements={total}
            totalPages={totalPages}
            itemLabel="yêu cầu"
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
            className="mt-4 rounded-2xl border border-gray-200 dark:border-white/10"
          />
        </div>

        {/* RIGHT: Breakdown sidebar */}
        <div className="w-72 shrink-0">
          <div className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Request Type Breakdown
            </p>
            <div className="flex justify-center mb-5 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      stats.breakdown.length > 0
                        ? stats.breakdown
                        : [{ type: "OTHER", count: 1, color: "#D1D5DB" }]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="count"
                    stroke="none"
                  >
                    {(stats.breakdown.length > 0
                      ? stats.breakdown
                      : [{ type: "OTHER", count: 1, color: "#D1D5DB" }]
                    ).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {stats.breakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="link"
              className="mt-4 p-0 text-sm text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center h-auto"
            >
              View all types
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
