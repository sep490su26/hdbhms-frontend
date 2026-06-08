"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, RefreshCw, Wrench } from "lucide-react";
import {
  approveMaintenanceTicket,
  declineMaintenanceTicket,
  fetchMaintenanceTickets,
} from "@/services/maintenanceService";

const STATUS_LABELS = {
  PENDING_ACCEPTANCE: "Chờ tiếp nhận",
  ACCEPTED: "Đã tiếp nhận",
  IN_PROGRESS: "Đang xử lý",
  WAITING_CONFIRMATION: "Chờ xác nhận",
  COMPLETED: "Hoàn tất",
  REJECTED: "Từ chối",
};

const PRIORITY_LABELS = {
  HIGH: "Cao",
  MEDIUM: "Trung bình",
  LOW: "Thấp",
  URGENT: "Khẩn cấp",
};

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString("vi-VN");
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <article className="flex min-h-[94px] items-center gap-4 rounded-md border border-[#d6dce7] bg-white px-6 py-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#dfeaff] text-[#18345f]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-bold text-[#495365]">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
    </article>
  );
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchMaintenanceTickets({ page: 0, size: 100 });
      setTickets(result.tickets);
    } catch (loadError) {
      setTickets([]);
      setError(loadError?.message || "Không tải được danh sách bảo trì.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchMaintenanceTickets({ page: 0, size: 100 })
      .then((result) => {
        if (active) setTickets(result.tickets);
      })
      .catch((loadError) => {
        if (!active) return;
        setTickets([]);
        setError(loadError?.message || "Không tải được danh sách bảo trì.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(
    () => ({
      total: tickets.length,
      pending: tickets.filter((ticket) => ticket.status === "PENDING_ACCEPTANCE").length,
      processing: tickets.filter((ticket) => ["ACCEPTED", "IN_PROGRESS", "WAITING_CONFIRMATION"].includes(ticket.status)).length,
      done: tickets.filter((ticket) => ticket.status === "COMPLETED").length,
    }),
    [tickets],
  );

  async function acceptTicket(ticketId) {
    setActionId(ticketId);
    setError("");
    try {
      await approveMaintenanceTicket(ticketId);
      await loadTickets();
    } catch (actionError) {
      setError(actionError?.message || "Không thể tiếp nhận phiếu bảo trì.");
    } finally {
      setActionId(null);
    }
  }

  async function rejectTicket(ticketId) {
    const reason = window.prompt("Nhập lý do từ chối phiếu bảo trì:");
    if (!reason?.trim()) return;

    setActionId(ticketId);
    setError("");
    try {
      await declineMaintenanceTicket(ticketId, reason.trim());
      await loadTickets();
    } catch (actionError) {
      setError(actionError?.message || "Không thể từ chối phiếu bảo trì.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="grid gap-5 text-[#0f1d33]">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">Danh sách bảo trì</h1>
          <p className="mt-2 text-sm text-[#697386]">Dữ liệu phiếu sự cố từ hệ thống.</p>
        </div>
        <button
          type="button"
          onClick={loadTickets}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#cbd3df] bg-white px-4 text-sm font-bold disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </section>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Wrench} label="Tổng ticket" value={loading ? "..." : metrics.total} />
        <MetricCard icon={Clock3} label="Chờ tiếp nhận" value={loading ? "..." : metrics.pending} />
        <MetricCard icon={Wrench} label="Đang xử lý" value={loading ? "..." : metrics.processing} />
        <MetricCard icon={CheckCircle2} label="Hoàn tất" value={loading ? "..." : metrics.done} />
      </section>

      <section className="overflow-hidden rounded-md border border-[#bfc9d8] bg-white">
        <div className="dashboard-table">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#dfeaff] text-xs font-bold uppercase text-[#3e4b60]">
              <tr>
                <th className="px-5 py-4">Mã ticket</th>
                <th className="px-5 py-4">Sự cố</th>
                <th className="px-5 py-4">Phòng</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4">Mức độ</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d7deea]">
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-5 py-4 font-bold">{ticket.ticketCode}</td>
                  <td className="px-5 py-4">{ticket.title}</td>
                  <td className="px-5 py-4">{ticket.roomCode || ticket.roomName || "--"}</td>
                  <td className="px-5 py-4">{formatDate(ticket.createdAt)}</td>
                  <td className="px-5 py-4">{PRIORITY_LABELS[ticket.priority] || ticket.priority}</td>
                  <td className="px-5 py-4">{STATUS_LABELS[ticket.status] || ticket.status}</td>
                  <td className="px-5 py-4">
                    {ticket.status === "PENDING_ACCEPTANCE" ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => acceptTicket(ticket.id)}
                          disabled={actionId === ticket.id}
                          className="h-9 rounded bg-[#3156b6] px-3 text-xs font-bold text-white disabled:opacity-60"
                        >
                          Tiếp nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectTicket(ticket.id)}
                          disabled={actionId === ticket.id}
                          className="h-9 rounded border border-red-300 px-3 text-xs font-bold text-red-700 disabled:opacity-60"
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="block text-right text-[#94a3b8]">--</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && tickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#697386]">
                    Chưa có phiếu bảo trì.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
