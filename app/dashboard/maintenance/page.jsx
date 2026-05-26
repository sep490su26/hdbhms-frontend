"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Check,
  ChevronRight,
  ClipboardCheck,
  CloudUpload,
  Wrench,
  X,
} from "lucide-react";
import { maintenanceTickets } from "@/services/dashboardService";

const money = new Intl.NumberFormat("vi-VN");

const ticketStatus = {
  pending: ["Chờ xử lý", "bg-red-50 text-red-700"],
  inProgress: ["Đang làm", "bg-amber-50 text-amber-700"],
  scheduled: ["Đã lên lịch", "bg-blue-50 text-blue-700"],
  done: ["Hoàn tất", "bg-emerald-50 text-emerald-700"],
};

function formatMoney(value) {
  return `${money.format(value)} đ`;
}

async function uploadFiles(files) {
  return {
    fileResponses: files.map((file) => {
      const url = URL.createObjectURL(file);

      return {
        originalFileName: file.name,
        downloadUrl: url,
        url,
        size: file.size,
        contentType: file.type,
      };
    }),
  };
}

function Modal({ title, children, onClose, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <h2 className="text-lg font-bold text-[#091426]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-2 text-[#505f76] hover:bg-[#f2f4f6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-6 custom-scrollbar">{children}</div>
        {footer && <div className="border-t border-[#e2e8f0] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ value, map }) {
  const [label, className] = map[value] || ["Không rõ", "bg-slate-100 text-slate-700"];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>
      {label}
    </span>
  );
}

function IconButton({ label, icon: Icon, onClick, tone = "neutral" }) {
  const tones = {
    neutral: "text-[#505f76] hover:bg-[#f2f4f6] hover:text-[#091426]",
    good: "text-emerald-600 hover:bg-emerald-50",
    warn: "text-blue-600 hover:bg-blue-50",
    bad: "text-rose-600 hover:bg-rose-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-md p-2 transition ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PageHeader({ title, description, actionLabel, actionIcon: ActionIcon = Check, onAction }) {
  return (
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">{description}</p>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a]"
        >
          <ActionIcon className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
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
        <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#191c1e]">{value}</p>
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

function SectionTitle({ children }) {
  return <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#45474c]">{children}</h3>;
}

function MaintenanceDetail({ ticket, onStatusChange }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[#e2e8f0] p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">Incident Detail</p>
          <StatusBadge value={ticket.status} map={ticketStatus} />
        </div>
        <h2 className="mt-2 text-2xl font-bold text-[#091426]">#{ticket.id}</h2>
        <p className="mt-2 text-sm leading-6 text-[#45474c]">Reported on {ticket.reportedAt} by {ticket.tenant}</p>
      </div>
      <div className="grid gap-6 p-6">
        <SectionTitle>Issue description</SectionTitle>
        <p className="rounded-lg bg-[#f7f9fb] p-4 text-sm leading-6 text-[#45474c]">{ticket.description}</p>
        <SectionTitle>Maintenance action</SectionTitle>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-[#45474c]">Technician Name</span>
          <input
            value={ticket.assignee}
            readOnly
            className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-[#45474c]">Actual Repair Cost (VND)</span>
          <input
            value={money.format(ticket.estimatedCost)}
            readOnly
            className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]"
          />
        </label>
        {ticket.attachments?.length > 0 && (
          <div className="grid gap-2">
            <SectionTitle>Attachments</SectionTitle>
            {ticket.attachments.map((file) => (
              <a
                key={file.url || file.originalFileName}
                href={file.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-bold text-[#091426] hover:bg-[#f7f9fb]"
              >
                {file.originalFileName}
              </a>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 border-t border-[#e2e8f0] pt-5">
          <button
            type="button"
            onClick={() => onStatusChange("inProgress")}
            className="h-11 rounded-lg border border-[#c5c6cd] text-sm font-bold text-[#091426]"
          >
            Tiếp nhận
          </button>
          <button
            type="button"
            onClick={() => onStatusChange("done")}
            className="h-11 rounded-lg bg-[#091426] text-sm font-bold text-white"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState(maintenanceTickets);
  const [selectedTicketId, setSelectedTicketId] = useState(maintenanceTickets[0]?.id ?? null);
  const [statusView, setStatusView] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [ticketDraft, setTicketDraft] = useState({
    type: "Phòng",
    roomId: "P203",
    description: "Mô tả hiện tượng, thời điểm xảy ra và mức độ ảnh hưởng.",
    attachments: [],
    uploadStatus: "idle",
    uploadError: "",
  });
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || tickets[0];
  const visibleTickets = statusView === "all" ? tickets : tickets.filter((ticket) => ticket.status !== "done");
  const pending = tickets.filter((ticket) => ticket.status === "pending").length;
  const done = tickets.filter((ticket) => ticket.status === "done").length;

  const uploadTicketAttachments = async (files) => {
    const selectedFiles = Array.from(files || []).slice(0, 3);
    if (selectedFiles.length === 0) return;
    setTicketDraft((current) => ({ ...current, uploadStatus: "uploading", uploadError: "" }));
    try {
      const result = await uploadFiles(selectedFiles);
      setTicketDraft((current) => ({
        ...current,
        attachments: result.fileResponses || [],
        uploadStatus: "success",
      }));
    } catch (error) {
      setTicketDraft((current) => ({
        ...current,
        uploadStatus: "error",
        uploadError: error.message || "Không thể tải file lên.",
      }));
    }
  };

  const createTicket = () => {
    const nextTicket = {
      id: `DM-${9000 + tickets.length + 1}`,
      roomId: ticketDraft.roomId,
      issue: "Sự cố mới từ quản lý",
      tenant: `Khách ${ticketDraft.roomId}`,
      category: ticketDraft.type,
      priority: "Cao",
      status: "pending",
      reportedAt: "19/05/2026 09:00",
      assignee: "Chờ tiếp nhận",
      estimatedCost: 0,
      description: ticketDraft.description,
      attachments: ticketDraft.attachments,
    };
    setTickets((current) => [nextTicket, ...current]);
    setSelectedTicketId(nextTicket.id);
    setShowCreate(false);
    setTicketDraft({
      type: "Phòng",
      roomId: "P203",
      description: "Mô tả hiện tượng, thời điểm xảy ra và mức độ ảnh hưởng.",
      attachments: [],
      uploadStatus: "idle",
      uploadError: "",
    });
  };

  const updateTicketStatus = (nextStatus) => {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? {
              ...ticket,
              status: nextStatus,
              assignee: nextStatus === "inProgress" && ticket.assignee === "Chờ tiếp nhận" ? "Nguyễn Văn Hùng" : ticket.assignee,
            }
          : ticket,
      ),
    );
  };

  return (
    <>
      <PageHeader
        title="Báo cáo sự cố & Bảo trì"
        description="Theo dõi phiếu sự cố, chi phí sửa chữa và tiến độ xử lý."
        actionLabel="Tạo phiếu bảo trì"
        actionIcon={Wrench}
        onAction={() => setShowCreate(true)}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ClipboardCheck} label="Tổng phiếu" value={tickets.length} subtext="Trong tháng này" />
        <KpiCard icon={AlertTriangle} label="Đang chờ" value={pending} subtext="Cần phân công" tone="rose" />
        <KpiCard icon={Wrench} label="Đã hoàn tất" value={done} subtext="Đã ghi chi phí" tone="emerald" />
        <KpiCard
          icon={Banknote}
          label="Chi phí dự kiến"
          value={formatMoney(tickets.reduce((sum, item) => sum + item.estimatedCost, 0))}
          tone="amber"
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
            <h2 className="font-bold text-[#091426]">Maintenance List</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatusView("all")}
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusView === "all" ? "bg-[#091426] text-white" : "border border-[#e2e8f0] text-[#505f76]"}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusView("open")}
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusView === "open" ? "bg-[#091426] text-white" : "border border-[#e2e8f0] text-[#505f76]"}`}
              >
                Open
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
                <tr>
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Phòng</th>
                  <th className="px-6 py-4">Ưu tiên</th>
                  <th className="px-6 py-4">Người xử lý</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-[#e2e8f0]">
                    <td className="px-6 py-4 text-sm font-bold text-[#091426]">{ticket.id}</td>
                    <td className="px-6 py-4 text-sm">{ticket.roomId}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-[#505f76]">
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{ticket.assignee}</td>
                    <td className="px-6 py-4">
                      <StatusBadge value={ticket.status} map={ticketStatus} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <IconButton label={`Xem ${ticket.id}`} icon={ChevronRight} onClick={() => setSelectedTicketId(ticket.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <MaintenanceDetail ticket={selectedTicket} onStatusChange={updateTicketStatus} />
      </section>
      {showCreate && (
        <Modal
          title="Tạo phiếu sự cố"
          onClose={() => setShowCreate(false)}
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={createTicket}
                className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white"
              >
                Xác nhận gửi
              </button>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#45474c]">Loại sự cố</span>
                <select
                  value={ticketDraft.type}
                  onChange={(event) => setTicketDraft((current) => ({ ...current, type: event.target.value }))}
                  className="h-10 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm text-[#091426]"
                >
                  <option>Phòng</option>
                  <option>Tài sản chung</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#45474c]">Phòng / khu vực</span>
                <input
                  value={ticketDraft.roomId}
                  onChange={(event) => setTicketDraft((current) => ({ ...current, roomId: event.target.value }))}
                  className="h-10 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]"
                />
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-[#45474c]">Mô tả vấn đề</span>
              <textarea
                value={ticketDraft.description}
                onChange={(event) => setTicketDraft((current) => ({ ...current, description: event.target.value }))}
                className="min-h-28 rounded-lg border border-[#c5c6cd] p-3 text-sm text-[#091426]"
              />
            </label>
            <div className="rounded-xl border border-dashed border-[#c5c6cd] bg-[#f7f9fb] p-5">
              <div className="flex items-center gap-3">
                <CloudUpload className="h-5 w-5 text-[#505f76]" />
                <div>
                  <p className="text-sm font-bold text-[#091426]">Đính kèm ảnh/video tối đa 3 ảnh</p>
                  <p className="text-xs text-[#6b7280]">Sau khi gửi, hệ thống tạo mã ticket và thông báo cho các bên.</p>
                </div>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(event) => uploadTicketAttachments(event.target.files)}
                className="mt-4 block w-full text-sm text-[#45474c] file:mr-4 file:rounded-lg file:border-0 file:bg-[#091426] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
              />
              {ticketDraft.uploadStatus === "uploading" && <p className="mt-3 text-xs font-bold text-blue-700">Đang tải file lên backend...</p>}
              {ticketDraft.uploadError && <p className="mt-3 text-xs font-bold text-rose-700">{ticketDraft.uploadError}</p>}
              {ticketDraft.attachments.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {ticketDraft.attachments.map((file) => (
                    <a
                      key={file.url || file.originalFileName}
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#091426] hover:underline"
                    >
                      {file.originalFileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
