"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  approveMaintenanceTicket,
  completeMaintenanceTicket,
  fetchMaintenanceTicket,
  fetchMaintenanceTickets,
  updateMaintenanceProgress,
} from "@/services/maintenanceService";

const money = new Intl.NumberFormat("vi-VN");

const statusMeta = {
  PENDING_ACCEPTANCE: ["Chờ tiếp nhận", "bg-amber-50 text-amber-700 ring-amber-200"],
  ACCEPTED: ["Đã tiếp nhận", "bg-blue-50 text-blue-700 ring-blue-200"],
  IN_PROGRESS: ["Đang xử lý", "bg-indigo-50 text-indigo-700 ring-indigo-200"],
  WAITING_CONFIRMATION: ["Chờ khách xác nhận", "bg-violet-50 text-violet-700 ring-violet-200"],
  COMPLETED: ["Hoàn tất", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  REJECTED: ["Từ chối", "bg-rose-50 text-rose-700 ring-rose-200"],
  CANCELLED: ["Đã hủy", "bg-slate-100 text-slate-600 ring-slate-200"],
};

const priorityLabel = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

const scopeOptions = [
  ["TENANT_ROOM", "Sự cố phòng thuê"],
  ["COMMON_AREA", "Khu vực chung"],
  ["PROPERTY_OPERATION", "Vận hành cơ sở"],
];

const rootCauseOptions = [
  ["NATURAL_WEAR", "Hao mòn tự nhiên"],
  ["TENANT_FAULT", "Lỗi do khách"],
  ["OWNER_FAULT", "Lỗi kỹ thuật/chủ trọ"],
  ["OTHER", "Khác"],
];

const paidByOptions = [
  ["LANDLORD", "Chủ trọ"],
  ["TENANT", "Khách thuê"],
  ["MANAGER", "Quản lý"],
  ["OTHER", "Khác"],
];

function formatMoney(value) {
  return `${money.format(Number(value) || 0)} đ`;
}

function formatDateTime(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function labelFromOptions(options, value) {
  return options.find(([key]) => key === value)?.[1] || value || "Chưa chọn";
}

function StatusBadge({ value }) {
  const [label, className] = statusMeta[value] || ["Không rõ", "bg-slate-100 text-slate-700 ring-slate-200"];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>
      {label}
    </span>
  );
}

function PageHeader({ onRefresh, loading }) {
  return (
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#315f9c]">Quản lý vận hành</p>
        <h1 className="mt-2 text-2xl font-bold text-[#191c1e]">Báo cáo sự cố & Bảo trì</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">
          Theo dõi phiếu sự cố tenant gửi từ mobile, phân loại nguyên nhân và ghi nhận người chịu chi phí.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Làm mới
      </button>
    </section>
  );
}

function KpiCard({ icon: Icon, label, value, subtext, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <article className="flex min-h-[104px] items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[#191c1e]">{value}</p>
        {subtext && <p className="mt-1 truncate text-xs text-[#6b7280]">{subtext}</p>}
      </div>
    </article>
  );
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}>
      {children}
    </section>
  );
}

function MaintenanceDetail({ ticket, form, setForm, onAccept, onSaveProgress, onComplete, busy, error }) {
  if (!ticket) {
    return (
      <Card className="flex min-h-[420px] items-center justify-center p-6 text-sm font-bold text-[#505f76]">
        Chọn một phiếu để xem chi tiết.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[#e2e8f0] p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">Chi tiết phiếu</p>
          <StatusBadge value={ticket.status} />
        </div>
        <h2 className="mt-2 text-2xl font-bold text-[#091426]">{ticket.ticketCode}</h2>
        <p className="mt-2 text-sm leading-6 text-[#45474c]">
          Phòng {ticket.roomCode || "chưa rõ"} · Tạo lúc {formatDateTime(ticket.createdAt)}
        </p>
      </div>

      <div className="grid gap-5 p-6">
        <div className="grid gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#45474c]">Mô tả sự cố</p>
          <p className="rounded-lg bg-[#f7f9fb] p-4 text-sm leading-6 text-[#45474c]">
            {ticket.description || "Chưa có mô tả"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[#45474c]">Phân loại</span>
            <select
              value={form.ticketScope}
              onChange={(event) => setForm((current) => ({ ...current, ticketScope: event.target.value }))}
              className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]"
            >
              {scopeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[#45474c]">Nguyên nhân</span>
            <select
              value={form.rootCause}
              onChange={(event) => setForm((current) => ({ ...current, rootCause: event.target.value }))}
              className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]"
            >
              {rootCauseOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-[#45474c]">Người sửa</span>
          <input
            value={form.workerName}
            onChange={(event) => setForm((current) => ({ ...current, workerName: event.target.value }))}
            placeholder="Nhập tên thợ hoặc nhân sự xử lý"
            className="h-10 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-[#45474c]">Hạng mục sửa chữa</span>
          <textarea
            value={form.repairItems}
            onChange={(event) => setForm((current) => ({ ...current, repairItems: event.target.value }))}
            placeholder="Ví dụ: thay bóng đèn, kiểm tra công tắc..."
            className="min-h-24 rounded-lg border border-[#c5c6cd] p-3 text-sm text-[#091426]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[#45474c]">Chi phí sửa/thay</span>
            <input
              type="number"
              min="0"
              value={form.costAmount}
              onChange={(event) => setForm((current) => ({ ...current, costAmount: event.target.value }))}
              className="h-10 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[#45474c]">Người chịu phí</span>
            <select
              value={form.paidBy}
              onChange={(event) => setForm((current) => ({ ...current, paidBy: event.target.value }))}
              className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]"
            >
              {paidByOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-[#45474c]">Mô tả chi phí</span>
          <input
            value={form.costDescription}
            onChange={(event) => setForm((current) => ({ ...current, costDescription: event.target.value }))}
            placeholder="Ví dụ: bóng LED + công thay"
            className="h-10 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]"
          />
        </label>

        <div className="rounded-lg bg-[#f7f9fb] p-4 text-sm leading-6 text-[#45474c]">
          <b>Kết luận hiện tại:</b> {labelFromOptions(scopeOptions, form.ticketScope)} ·{" "}
          {labelFromOptions(rootCauseOptions, form.rootCause)} · Chi phí do{" "}
          {labelFromOptions(paidByOptions, form.paidBy).toLowerCase()} chịu.
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p>}

        <div className="grid grid-cols-1 gap-3 border-t border-[#e2e8f0] pt-5 sm:grid-cols-3">
          <button
            type="button"
            onClick={onAccept}
            disabled={busy || ticket.status !== "PENDING_ACCEPTANCE"}
            className="h-11 rounded-lg border border-[#c5c6cd] text-sm font-bold text-[#091426] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tiếp nhận
          </button>
          <button
            type="button"
            onClick={onSaveProgress}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#c5c6cd] text-sm font-bold text-[#091426] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Lưu xử lý
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={busy}
            className="h-11 rounded-lg bg-[#091426] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hoàn tất sửa
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [statusView, setStatusView] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const selectedTicketIdRef = useRef(null);
  const [form, setForm] = useState({
    ticketScope: "TENANT_ROOM",
    rootCause: "NATURAL_WEAR",
    workerName: "",
    repairItems: "",
    costAmount: "",
    costDescription: "",
    paidBy: "LANDLORD",
  });

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0] || null,
    [selectedTicketId, tickets],
  );

  const visibleTickets = useMemo(() => {
    if (statusView === "open") {
      return tickets.filter((ticket) => !["COMPLETED", "REJECTED", "CANCELLED"].includes(ticket.status));
    }
    return tickets;
  }, [statusView, tickets]);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ["PENDING_ACCEPTANCE", "ACCEPTED", "IN_PROGRESS"].includes(ticket.status)).length;
    const done = tickets.filter((ticket) => ticket.status === "COMPLETED").length;
    const landlordCost = tickets
      .filter((ticket) => ticket.paidBy === "LANDLORD")
      .reduce((sum, ticket) => sum + (Number(ticket.costAmount) || 0), 0);
    return { open, done, landlordCost };
  }, [tickets]);

  const syncForm = useCallback((ticket) => {
    if (!ticket) return;
    setForm({
      ticketScope: ticket.ticketScope || "TENANT_ROOM",
      rootCause: ticket.rootCause || "NATURAL_WEAR",
      workerName: ticket.workerName || "",
      repairItems: ticket.repairItems || "",
      costAmount: ticket.costAmount ? String(ticket.costAmount) : "",
      costDescription: ticket.costDescription || "",
      paidBy: ticket.paidBy || "LANDLORD",
    });
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMaintenanceTickets({ size: 100 });
      setTickets(data.tickets);
      const first = data.tickets[0] || null;
      const currentSelected = selectedTicketIdRef.current;
      const nextSelected = currentSelected && data.tickets.some((ticket) => ticket.id === currentSelected)
        ? currentSelected
        : first?.id ?? null;
      selectedTicketIdRef.current = nextSelected;
      setSelectedTicketId(nextSelected);
      syncForm(data.tickets.find((ticket) => ticket.id === nextSelected) || first);
    } catch (err) {
      setError(err.message || "Không tải được danh sách phiếu sự cố.");
      setTickets([]);
      selectedTicketIdRef.current = null;
      setSelectedTicketId(null);
    } finally {
      setLoading(false);
    }
  }, [syncForm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTickets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTickets]);

  const applyUpdatedTicket = (updated) => {
    setTickets((current) => current.map((ticket) => (ticket.id === updated.id ? { ...ticket, ...updated } : ticket)));
    selectedTicketIdRef.current = updated.id;
    setSelectedTicketId(updated.id);
    syncForm(updated);
  };

  const selectTicket = async (ticketId) => {
    selectedTicketIdRef.current = ticketId;
    setSelectedTicketId(ticketId);
    const fallback = tickets.find((ticket) => ticket.id === ticketId);
    syncForm(fallback);
    try {
      const detail = await fetchMaintenanceTicket(ticketId);
      applyUpdatedTicket(detail);
    } catch {
      // List data is enough for the dashboard; detail fetch failure should not block selection.
    }
  };

  const withAction = async (action) => {
    if (!selectedTicket) return;
    setBusy(true);
    setActionError("");
    try {
      const updated = await action(selectedTicket.id);
      applyUpdatedTicket(updated);
    } catch (err) {
      setActionError(err.message || "Không xử lý được phiếu sự cố.");
    } finally {
      setBusy(false);
    }
  };

  const actionPayload = () => ({
    ticketScope: form.ticketScope,
    rootCause: form.rootCause,
    workerName: form.workerName.trim(),
    repairItems: form.repairItems.trim(),
    costType: "OTHER",
    costDescription: form.costDescription.trim(),
    amount: Number(form.costAmount) || 0,
    paidBy: form.paidBy,
  });

  return (
    <>
      <PageHeader onRefresh={loadTickets} loading={loading} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ClipboardCheck} label="Tổng phiếu" value={tickets.length} subtext="Dữ liệu từ backend" />
        <KpiCard icon={AlertTriangle} label="Đang mở" value={stats.open} subtext="Cần tiếp nhận/xử lý" tone="rose" />
        <KpiCard icon={CheckCircle2} label="Đã hoàn tất" value={stats.done} subtext="Tenant đã xác nhận" tone="emerald" />
        <KpiCard icon={Banknote} label="Chủ trọ chịu" value={formatMoney(stats.landlordCost)} tone="amber" />
      </section>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
            <div>
              <h2 className="font-bold text-[#091426]">Danh sách phiếu sự cố</h2>
              <p className="mt-1 text-xs text-[#6b7280]">Phiếu tenant tạo trên mobile sẽ hiển thị tại đây.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatusView("all")}
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusView === "all" ? "bg-[#091426] text-white" : "border border-[#e2e8f0] text-[#505f76]"}`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setStatusView("open")}
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusView === "open" ? "bg-[#091426] text-white" : "border border-[#e2e8f0] text-[#505f76]"}`}
              >
                Đang mở
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
                <tr>
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Phòng</th>
                  <th className="px-6 py-4">Loại</th>
                  <th className="px-6 py-4">Ưu tiên</th>
                  <th className="px-6 py-4">Nguyên nhân</th>
                  <th className="px-6 py-4">Chịu phí</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-6 py-10 text-center text-sm font-bold text-[#505f76]" colSpan={8}>
                      Đang tải phiếu sự cố...
                    </td>
                  </tr>
                )}
                {!loading && visibleTickets.length === 0 && (
                  <tr>
                    <td className="px-6 py-10 text-center text-sm font-bold text-[#505f76]" colSpan={8}>
                      Chưa có phiếu sự cố phù hợp.
                    </td>
                  </tr>
                )}
                {!loading &&
                  visibleTickets.map((ticket) => (
                    <tr key={ticket.id} className={`border-t border-[#e2e8f0] ${ticket.id === selectedTicket?.id ? "bg-[#f7f9fb]" : ""}`}>
                      <td className="px-6 py-4 text-sm font-bold text-[#091426]">{ticket.ticketCode}</td>
                      <td className="px-6 py-4 text-sm">{ticket.roomCode || "Chưa rõ"}</td>
                      <td className="px-6 py-4 text-sm">{labelFromOptions(scopeOptions, ticket.ticketScope)}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#505f76]">
                          {priorityLabel[ticket.priority] || ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{labelFromOptions(rootCauseOptions, ticket.rootCause)}</td>
                      <td className="px-6 py-4 text-sm">{labelFromOptions(paidByOptions, ticket.paidBy)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge value={ticket.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => selectTicket(ticket.id)}
                          aria-label={`Xem ${ticket.ticketCode}`}
                          className="rounded-md p-2 text-[#505f76] hover:bg-white hover:text-[#091426]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        <MaintenanceDetail
          ticket={selectedTicket}
          form={form}
          setForm={setForm}
          busy={busy}
          error={actionError}
          onAccept={() => withAction((id) => approveMaintenanceTicket(id))}
          onSaveProgress={() => withAction((id) => updateMaintenanceProgress(id, actionPayload()))}
          onComplete={() => withAction((id) => completeMaintenanceTicket(id, actionPayload()))}
        />
      </section>
    </>
  );
}
