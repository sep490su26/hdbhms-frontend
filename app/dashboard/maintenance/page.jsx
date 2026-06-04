"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CircleGauge,
  CircleHelp,
  Droplets,
  EllipsisVertical,
  Filter,
  Hammer,
  History,
  Info,
  Printer,
  PlusCircle,
  RotateCcw,
  Star,
  Upload,
  Video,
  Wrench,
  X,
} from "lucide-react";

const statuses = ["Tất cả", "Chờ tiếp nhận", "Đang xử lý", "Hoàn tất", "Từ chối"];
const rooms = ["Tất cả", "P.102", "P.305", "Hành lang tầng 2", "Khu để xe"];
const priorities = ["Tất cả", "Cao", "Trung bình", "Thấp"];

const initialTickets = [
  {
    id: "T-1001",
    type: "Điện nước",
    icon: Droplets,
    position: "P.102",
    createdAt: "22/05/2024",
    priority: "Cao",
    status: "Chờ tiếp nhận",
    creator: "",
  },
  {
    id: "T-1004",
    type: "Khác",
    icon: CircleHelp,
    position: "Khu để xe",
    createdAt: "22/05/2024",
    priority: "Cao",
    status: "Chờ tiếp nhận",
    creator: "",
  },
  {
    id: "T-1002",
    type: "Thiết bị",
    icon: Hammer,
    position: "Hành lang tầng 2",
    createdAt: "21/05/2024",
    priority: "Trung bình",
    status: "Đang xử lý",
    creator: "Nguyễn Văn A",
    creatorInitials: "NV",
  },
  {
    id: "T-1003",
    type: "Nội thất",
    icon: BriefcaseBusiness,
    position: "P.305",
    createdAt: "20/05/2024",
    priority: "Thấp",
    status: "Hoàn tất",
    creator: "Trần Thị B",
    creatorInitials: "TT",
  },
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="relative block">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-[170px] appearance-none rounded-[4px] border border-[#cbd3df] bg-[#f4f7fb] px-3 pr-9 text-xs font-medium text-[#172235] outline-none transition focus:border-[#0f1d33] focus:ring-2 focus:ring-[#0f1d33]/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {label}: {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#697386]" />
    </label>
  );
}

function MetricCard({ icon: Icon, label, value, tone }) {
  const styles = {
    blue: {
      icon: "bg-[#dfeaff] text-[#18345f]",
      value: "text-[#0f1d33]",
      border: "border-[#d6dce7]",
    },
    orange: {
      icon: "bg-[#ffd9b6] text-[#1f2937]",
      value: "text-[#0f1d33]",
      border: "border-[#f4a35d] shadow-[0_8px_18px_rgba(244,163,93,0.12)]",
    },
    indigo: {
      icon: "bg-[#dfe3ff] text-[#173da8]",
      value: "text-[#173da8]",
      border: "border-[#d6dce7]",
    },
    green: {
      icon: "bg-[#d9f8e7] text-[#138444]",
      value: "text-[#138444]",
      border: "border-[#d6dce7]",
    },
  }[tone];

  return (
    <article className={`flex min-h-[94px] items-center gap-4 rounded-[6px] border bg-white px-6 py-4 ${styles.border}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] ${styles.icon}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-bold text-[#495365]">{label}</p>
        <p className={`mt-1 text-2xl font-bold leading-none ${styles.value}`}>{value}</p>
      </div>
    </article>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    Cao: "bg-[#ffd9d9] text-[#e11111]",
    "Trung bình": "bg-[#ffead5] text-[#e45800]",
    Thấp: "bg-[#dcecff] text-[#7690bd]",
  };

  return (
    <span className={`inline-flex rounded-[2px] px-2 py-1 text-[11px] font-medium ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === "Chờ tiếp nhận") {
    return (
      <span className="inline-flex min-w-[82px] justify-center rounded-[8px] border border-[#fee682] bg-[#fff6bf] px-3 py-2 text-center text-xs font-medium leading-tight text-[#815b00]">
        Chờ<br />tiếp nhận
      </span>
    );
  }

  if (status === "Đang xử lý") {
    return (
      <span className="inline-flex min-w-[82px] justify-center rounded-[8px] bg-[#2563eb] px-3 py-2 text-center text-xs font-medium leading-tight text-white">
        Đang<br />xử lý
      </span>
    );
  }

  if (status === "Từ chối") {
    return (
      <span className="inline-flex min-w-[82px] items-center justify-center rounded-[8px] bg-[#ffd9d9] px-3 py-2 text-xs font-medium text-[#c5161d]">
        Từ chối
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[82px] items-center justify-center gap-1 rounded-[8px] bg-[#d9f8e7] px-3 py-2 text-xs font-medium text-[#138444]">
      <Check className="h-3 w-3" />
      Hoàn tất
    </span>
  );
}

function TicketActions({ ticket, onAccept, onReject }) {
  if (ticket.status === "Chờ tiếp nhận") {
    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAccept(ticket.id);
          }}
          className="h-9 rounded-[2px] bg-[#3156b6] px-3 text-xs font-bold text-white transition hover:bg-[#24489f]"
        >
          Tiếp nhận
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReject(ticket);
          }}
          className="h-9 rounded-[2px] border border-[#ff4d4f] bg-white px-3 text-xs font-bold text-[#ff1f1f] transition hover:bg-red-50"
        >
          Từ chối
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Thao tác ${ticket.id}`}
      onClick={(event) => event.stopPropagation()}
      className="flex h-9 w-9 items-center justify-center rounded-[4px] text-[#0f1d33] transition hover:bg-[#eef3fb]"
    >
      <EllipsisVertical className="h-5 w-5" />
    </button>
  );
}

function RejectTicketModal({ ticket, reason, onReasonChange, onClose, onConfirm }) {
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-[1px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-ticket-title"
        className="w-full max-w-[520px] overflow-hidden rounded-xl border border-[#cbd3df] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.35)]"
      >
        <header className="flex items-center justify-between border-b border-[#d7deea] bg-[#f7f9fe] px-6 py-5">
          <h2 id="reject-ticket-title" className="text-2xl font-bold tracking-[-0.02em] text-[#0f1d33]">
            Xác nhận từ chối ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#3e4654] transition hover:bg-[#e8edf6]"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="px-6 py-6">
          <label className="grid gap-3">
            <span className="text-sm font-bold text-[#4b5563]">Lý do từ chối</span>
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Nhập lý do từ chối xử lý sự cố này..."
              className="min-h-[128px] resize-none rounded-md border border-[#bfc7d5] bg-[#eef3fb] px-4 py-3 text-base leading-7 text-[#0f1d33] outline-none placeholder:text-[#7b8495] focus:border-[#0f1d33] focus:ring-2 focus:ring-[#0f1d33]/10"
            />
          </label>

          <p className="mt-5 text-base leading-7 text-[#4b5563]">
            Lưu ý: Hành động này sẽ thông báo cho khách thuê và chuyển ticket sang trạng thái Đã từ chối.
          </p>
        </div>

        <footer className="flex justify-end gap-3 bg-[#eef3fb] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 min-w-[78px] rounded-md border border-[#bfc7d5] bg-[#f7f9fe] px-5 text-sm font-bold text-[#4b5563] transition hover:bg-white"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 rounded-md bg-[#c5161d] px-5 text-sm font-bold text-white transition hover:bg-[#a90f15]"
          >
            Xác nhận từ chối
          </button>
        </footer>
      </section>
    </div>
  );
}

function CompactStatusBadge({ status }) {
  const className =
    status === "Đang xử lý"
      ? "bg-[#ffe6c9] text-[#9a5a00]"
      : status === "Hoàn tất"
        ? "bg-[#d9f8e7] text-[#138444]"
        : status === "Từ chối"
          ? "bg-[#ffd9d9] text-[#c5161d]"
          : "bg-[#fff6bf] text-[#815b00]";

  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${className}`}>{status}</span>;
}

function DetailCard({ title, icon: Icon, children, action }) {
  return (
    <section className="rounded-[6px] border border-[#cbd3df] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-[#0f1d33]">
          <Icon className="h-5 w-5 text-[#3156b6]" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BeforeRepairMedia() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div
        className="relative min-h-[168px] overflow-hidden rounded-[4px] bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80')" }}
      />
      <div
        className="relative min-h-[168px] overflow-hidden rounded-[4px] bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80')" }}
      >
        <div className="absolute bottom-0 left-0 right-0 bg-[#0f1d33]/75 px-3 py-2 text-center text-xs font-medium text-[#bfc7d5]">
          Tủ điện
        </div>
      </div>
      <div className="flex min-h-[168px] flex-col items-center justify-center rounded-[4px] border border-dashed border-[#aeb8c8] bg-[#f7f9fe] text-center">
        <Video className="h-8 w-8 text-[#697386]" />
        <p className="mt-3 max-w-[150px] break-all text-xs font-medium text-[#172235]">Video_Minh_Chung.mp4</p>
      </div>
    </div>
  );
}

function MaintenanceTicketDetail({ ticket, onBack }) {
  const isDone = ticket.status === "Hoàn tất";

  return (
    <div className="grid gap-5 text-[#0f1d33]">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-[#495365] transition hover:text-[#0f1d33]"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#0f1d33]">Ticket {ticket.id}</h1>
            <CompactStatusBadge status={ticket.status} />
          </div>
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#495365]">
            <CalendarDays className="h-4 w-4" />
            Ngày tạo: 24/10/2023 - 09:15 AM
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[3px] border border-[#7b8495] bg-white px-4 text-xs font-bold text-[#0f1d33] transition hover:bg-[#eef3fb]"
          >
            <RotateCcw className="h-4 w-4" />
            Cập nhật tiến độ
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[3px] bg-black px-4 text-xs font-bold text-white transition hover:bg-[#172235]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Đánh dấu hoàn tất
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid gap-5">
          <DetailCard title="Chi tiết sự cố" icon={Info}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-[#eef3fb] px-4 py-3">
                <p className="text-[10px] font-bold uppercase text-[#697386]">Loại sự cố</p>
                <p className="mt-1 text-sm font-bold text-[#0f1d33]">{ticket.type}</p>
              </div>
              <div className="bg-[#eef3fb] px-4 py-3">
                <p className="text-[10px] font-bold uppercase text-[#697386]">Vị trí/Phòng</p>
                <p className="mt-1 text-sm font-bold text-[#0f1d33]">
                  {ticket.position === "Hành lang tầng 2" ? "P.102 (Tầng 1)" : ticket.position}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase text-[#697386]">Mô tả</p>
              <p className="mt-2 rounded-[4px] border border-[#d7deea] bg-[#f7f9fe] px-4 py-3 text-sm leading-6 text-[#172235]">
                Đèn nhấp nháy liên tục ở khu vực phòng khách. Người thuê báo cáo tình trạng này xảy ra thường xuyên hơn khi bật điều hòa. Có thể do lỏng kết nối trong tủ điện hoặc hỏng chấn lưu LED.
              </p>
            </div>
          </DetailCard>

          <DetailCard
            title="Trước khi sửa"
            icon={Camera}
            action={<span className="rounded-[2px] bg-[#dfeaff] px-2 py-1 text-[10px] font-bold text-[#3156b6]">3 tệp</span>}
          >
            <BeforeRepairMedia />
          </DetailCard>

          <DetailCard title="Sau khi sửa" icon={CheckCircle2}>
            <div className="flex min-h-[170px] flex-col items-center justify-center rounded-[4px] border border-dashed border-[#bfc7d5] bg-[#f7f9fe] text-center">
              <Upload className="h-10 w-10 text-[#b5bdca]" />
              <p className="mt-3 text-sm text-[#7b8495]">
                {isDone ? "Ảnh sau sửa chữa đã được cập nhật." : "Chưa có ảnh sau khi sửa chữa"}
              </p>
              {!isDone && (
                <button type="button" className="mt-3 text-xs font-bold text-[#3156b6]">
                  Tải ảnh hoàn tất
                </button>
              )}
            </div>
          </DetailCard>

          <DetailCard title="Chi tiết thực hiện" icon={Wrench}>
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#697386]">Thợ sửa</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfeaff] text-xs font-bold text-[#3156b6]">
                      NV
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#0f1d33]">Nguyễn Văn A</p>
                      <p className="text-xs text-[#697386]">Thợ điện bậc cao</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#697386]">Hạng mục thay thế</p>
                  <div className="mt-2 grid gap-2 text-sm text-[#172235]">
                    <div className="flex justify-between border-b border-[#eef3fb] pb-2">
                      <span>Chấn lưu LED 12W</span>
                      <span>1 x 120k</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dây đồng (m)</span>
                      <span>2 x 15k</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-[6px] border border-[#b9c7ff] bg-[#e8edff] px-5 py-4">
                <p className="text-[10px] font-bold uppercase text-[#3156b6]">Tổng chi phí thực tế</p>
                <p className="mt-3 text-3xl font-bold text-[#3156b6]">150.000 <span className="text-base">VND</span></p>
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Đánh giá của khách" icon={Star}>
            <div className="rounded-[4px] bg-[#eef3fb] px-5 py-5 text-center">
              <div className="flex justify-center gap-1 text-[#b5bdca]">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Star key={item} className="h-5 w-5" />
                ))}
              </div>
              <p className="mt-4 text-sm italic text-[#697386]">
                &ldquo;Khách thuê chưa gửi đánh giá. Yêu cầu đánh giá sẽ được gửi sau khi hoàn tất.&rdquo;
              </p>
            </div>
          </DetailCard>
        </div>

        <aside className="h-fit rounded-[6px] bg-[#0f1d33] p-5 text-white shadow-[0_10px_30px_rgba(15,29,51,0.18)]">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold">
            <History className="h-5 w-5" />
            Tiến độ xử lý
          </h2>
          <div className="mt-6 grid gap-6 border-l border-[#31506f] pl-5">
            <div className="relative opacity-45">
              <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-[#7990aa]" />
              <p className="text-sm font-bold">Đã hoàn thành</p>
              <p className="mt-1 text-xs text-[#8fa2ba]">Đang chờ giải quyết...</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[34px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#dfe3ff] text-[#3156b6]">
                <Wrench className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold">Đang xử lý</p>
              <p className="text-sm">24/10, 10:45 AM</p>
              <p className="mt-1 text-xs text-[#8fa2ba]">Thợ: Nguyễn Văn A</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-[#7990aa]" />
              <p className="text-sm font-bold">Đã tiếp nhận</p>
              <p className="text-sm">24/10, 09:40 AM</p>
              <p className="mt-1 text-xs text-[#8fa2ba]">Bởi Quản lý tòa nhà</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-[#7990aa]" />
              <p className="text-sm font-bold">Ngày tạo</p>
              <p className="text-sm">24/10, 09:15 AM</p>
              <p className="mt-1 text-xs text-[#8fa2ba]">Khách thuê: Trần Thị B</p>
            </div>
          </div>
          <div className="mt-7 border-t border-[#263d5c] pt-5">
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[3px] bg-[#263d5c] text-sm font-bold text-white transition hover:bg-[#31506f]"
            >
              <Printer className="h-4 w-4" />
              In phiếu sửa chữa
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default function MaintenancePage() {
  const [tickets, setTickets] = useState(initialTickets);
  const [status, setStatus] = useState("Tất cả");
  const [room, setRoom] = useState("Tất cả");
  const [priority, setPriority] = useState("Tất cả");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = status === "Tất cả" || ticket.status === status;
      const matchesRoom = room === "Tất cả" || normalize(ticket.position) === normalize(room);
      const matchesPriority = priority === "Tất cả" || ticket.priority === priority;
      return matchesStatus && matchesRoom && matchesPriority;
    });
  }, [priority, room, status, tickets]);

  const metrics = useMemo(
    () => ({
      total: 156,
      pending: tickets.filter((ticket) => ticket.status === "Chờ tiếp nhận").length + 6,
      processing: tickets.filter((ticket) => ticket.status === "Đang xử lý").length + 11,
      done: 136,
    }),
    [tickets],
  );

  const acceptTicket = (ticketId) => {
    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: "Đang xử lý",
              creator: "Nguyễn Văn A",
              creatorInitials: "NV",
            }
          : ticket,
      ),
    );
  };

  const openRejectModal = (ticket) => {
    setRejectTarget(ticket);
    setRejectReason("");
  };

  const closeRejectModal = () => {
    setRejectTarget(null);
    setRejectReason("");
  };

  const confirmRejectTicket = () => {
    if (!rejectTarget) return;

    setTickets((currentTickets) =>
      currentTickets.map((ticket) =>
        ticket.id === rejectTarget.id
          ? {
              ...ticket,
              status: "Từ chối",
              rejectReason: rejectReason.trim(),
            }
          : ticket,
      ),
    );
    closeRejectModal();
  };

  if (selectedTicket) {
    const latestTicket = tickets.find((ticket) => ticket.id === selectedTicket.id) || selectedTicket;

    return <MaintenanceTicketDetail ticket={latestTicket} onBack={() => setSelectedTicket(null)} />;
  }

  return (
    <div className="grid gap-5 text-[#0f1d33]">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#0f1d33]">Danh sách bảo trì</h1>
          <p className="mt-6 text-sm text-[#697386]">Tổng cộng 24 yêu cầu cần xử lý hôm nay</p>
        </div>
        <button
          type="button"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[4px] bg-black px-5 text-xs font-bold text-white shadow-[0_8px_16px_rgba(0,0,0,0.18)] transition hover:bg-[#172235]"
        >
          <PlusCircle className="h-4 w-4" />
          Tạo ticket mới
        </button>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Tổng ticket" value={metrics.total} tone="blue" />
        <MetricCard icon={CircleGauge} label="Chờ tiếp nhận" value={String(metrics.pending).padStart(2, "0")} tone="orange" />
        <MetricCard icon={BriefcaseBusiness} label="Đang xử lý" value={String(metrics.processing).padStart(2, "0")} tone="indigo" />
        <MetricCard icon={CheckCircle2} label="Hoàn tất" value={metrics.done} tone="green" />
      </section>

      <section className="rounded-[6px] border border-[#cbd3df] bg-white px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-[#495365]">
              <Filter className="h-4 w-4" />
              Bộ lọc:
            </span>
            <SelectFilter label="Trạng thái" value={status} options={statuses} onChange={setStatus} />
            <SelectFilter label="Phòng" value={room} options={rooms} onChange={setRoom} />
            <SelectFilter label="Mức độ" value={priority} options={priorities} onChange={setPriority} />
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#cbd3df] bg-[#eef3fb] px-4 text-xs font-medium text-[#172235]"
          >
            <CalendarDays className="h-4 w-4" />
            Tháng 05, 2024
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[6px] border border-[#bfc9d8] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#dfeaff] text-[11px] font-bold uppercase tracking-[0.05em] text-[#3e4b60]">
              <tr>
                <th className="px-5 py-4">Mã ticket</th>
                <th className="px-5 py-4">Loại sự cố</th>
                <th className="px-5 py-4">Vị trí</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4">Mức độ</th>
                <th className="px-5 py-4 text-center">Trạng thái</th>
                <th className="px-5 py-4">Người tạo</th>
                <th className="px-5 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d7deea]">
              {filteredTickets.map((ticket) => {
                const Icon = ticket.icon;
                const isPending = ticket.status === "Chờ tiếp nhận";

                return (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`cursor-pointer bg-white align-middle transition hover:bg-[#f7f9fe] ${isPending ? "border-l-2 border-l-[#ffd21f]" : ""}`}
                  >
                    <td className="px-5 py-5 text-xs font-bold text-black">{ticket.id}</td>
                    <td className="px-5 py-5">
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-[#0f1d33]">
                        <Icon className="h-4 w-4 text-[#3156b6]" />
                        <span className="max-w-[80px] leading-5">{ticket.type}</span>
                      </span>
                    </td>
                    <td className="px-5 py-5 text-xs font-medium leading-5 text-[#0f1d33]">
                      {ticket.position}
                    </td>
                    <td className="px-5 py-5 text-xs font-medium text-[#495365]">{ticket.createdAt}</td>
                    <td className="px-5 py-5">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-5 py-5 text-center">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-5 py-5">
                      {ticket.creator ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dfeaff] text-[10px] font-bold text-[#3156b6]">
                            {ticket.creatorInitials}
                          </span>
                          <span className="max-w-[96px] text-xs leading-5 text-[#495365]">{ticket.creator}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-[#7b8495]">--</span>
                      )}
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex justify-center">
                        <TicketActions ticket={ticket} onAccept={acceptTicket} onReject={openRejectModal} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm font-semibold text-[#697386]">
                    Không có ticket phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#d7deea] bg-[#eef3fb] px-5 py-4 text-xs font-medium text-[#0f1d33] sm:flex-row sm:items-center sm:justify-between">
          <span>Hiển thị 4 trên 156 ticket</span>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#cbd3df] text-[#495365] transition hover:bg-white">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" className="h-9 w-9 rounded-[4px] bg-black text-sm font-bold text-white">1</button>
            <button type="button" className="h-9 w-9 rounded-[4px] border border-[#cbd3df] text-sm font-medium text-[#495365] transition hover:bg-white">2</button>
            <button type="button" className="h-9 w-9 rounded-[4px] border border-[#cbd3df] text-sm font-medium text-[#495365] transition hover:bg-white">3</button>
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#cbd3df] text-[#495365] transition hover:bg-white">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <RejectTicketModal
        ticket={rejectTarget}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onClose={closeRejectModal}
        onConfirm={confirmRejectTicket}
      />
    </div>
  );
}
