"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Eye,
  FileCheck2,
  ListFilter,
  RotateCcw,
  UserRoundCog,
  X,
} from "lucide-react";
import { allRooms, depositContracts, tenants } from "@/services/dashboardService";
import {
  ROOM_HOLD_DURATION_MS,
  formatHoldCountdown,
  getActiveRoomHolds,
  getHoldRemainingMs,
} from "@/lib/roomHoldStorage";
import { useDashboardLayout } from "../_contexts/DashboardLayoutContext";

const money = new Intl.NumberFormat("vi-VN");

const depositStatus = {
  pending: ["Chờ duyệt", "bg-amber-50 text-amber-700 ring-amber-100"],
  approved: ["Đã nhận phòng", "bg-emerald-50 text-emerald-700 ring-emerald-100"],
  cancelled: ["Đã hủy", "bg-rose-50 text-rose-700 ring-rose-100"],
  overdue: ["Quá hạn", "bg-slate-100 text-slate-600 ring-slate-200"],
  refunded: ["Đã hoàn cọc", "bg-blue-50 text-blue-700 ring-blue-100"],
  forfeited: ["Mất cọc", "bg-red-50 text-red-700 ring-red-100"],
};

const initialAccountApprovals = [
  {
    id: "APP-2401",
    name: "Đặng Minh Khang",
    phone: "0977001122",
    email: "khang.dang@example.com",
    roomId: "P203",
    requestedAt: "19/05/2026 08:15",
    status: "pending",
  },
];

function formatMoney(value) {
  return `${money.format(value)} đ`;
}

function parseVNDate(value) {
  if (!value) return null;
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function parseVNDateTime(value) {
  if (!value) return 0;
  const [datePart, timePart = "00:00"] = value.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime();
}

function downloadTextFile(filename, content, type = "text/csv;charset=utf-8") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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

function ExportConfirm({ title, filename, description, onClose, onConfirm }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6b7280]">
            File sẽ được tải về máy: <span className="font-bold text-[#091426]">{filename}</span>
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]">
              Hủy
            </button>
            <button type="button" onClick={onConfirm} className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white">
              Xuất file
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-[#45474c]">{description}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {["CSV", "Dữ liệu đang lọc", "Tải về máy"].map((item) => (
            <div key={item} className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4 text-sm font-bold text-[#091426]">
              {item}
            </div>
          ))}
        </div>
      </div>
    </Modal>
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

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#091426]">{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#45474c]">{children}</h3>;
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[#45474c]">{label}</span>
      <span className="font-bold text-[#091426]">{value}</span>
    </div>
  );
}

function DepositTable({
  deposits,
  statusFilter,
  onStatusFilter,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onAction,
  selectedDeposit,
  onSelectDeposit,
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[#e2e8f0] bg-[#f7f9fb] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-[#45474c]">
          <ListFilter className="h-4 w-4" />
          Lọc:
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "Tất cả"],
            ["pending", "Chờ duyệt"],
            ["approved", "Đã nhận phòng"],
            ["overdue", "Quá hạn"],
            ["refunded", "Đã hoàn"],
            ["forfeited", "Mất cọc"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onStatusFilter(value)}
              className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm transition ${
                statusFilter === value
                  ? "border-[#091426] bg-[#091426] text-white"
                  : "border-[#c5c6cd] bg-white text-[#191c1e] hover:border-[#091426]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#e2e8f0] bg-white px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">Khoảng thời gian nhận cọc</span>
        <label className="grid gap-1 text-xs font-semibold text-[#45474c]">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="h-9 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#45474c]">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            className="h-9 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426]"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => {
              onDateFromChange("");
              onDateToChange("");
            }}
            className="mt-5 h-9 rounded-lg border border-[#c5c6cd] px-3 text-sm font-bold text-[#091426]"
          >
            Xóa lọc
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e2e8f0] text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">
              <th className="px-6 py-3">Mã phòng</th>
              <th className="px-6 py-3">Tên khách hàng</th>
              <th className="px-6 py-3 text-right">Số tiền cọc</th>
              <th className="px-6 py-3">Ngày nhận</th>
              <th className="px-6 py-3">Trạng thái</th>
              <th className="px-6 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-[#6b7280]">
                  Không có hợp đồng cọc phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              deposits.map((deposit) => (
                <tr key={deposit.id} className={`border-b border-[#e2e8f0] last:border-0 ${selectedDeposit?.id === deposit.id ? "bg-blue-50/45" : "bg-white"}`}>
                  <td className="px-6 py-4 text-sm font-bold text-[#091426]">{deposit.roomId}</td>
                  <td className="px-6 py-4">
                    <button type="button" onClick={() => onSelectDeposit(deposit)} className="text-left">
                      <span className="block text-sm font-semibold text-[#191c1e]">{deposit.tenantName}</span>
                      <span className="block text-xs text-[#45474c]">{deposit.phone}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-[#191c1e]">{formatMoney(deposit.amount)}</td>
                  <td className="px-6 py-4 text-sm text-[#191c1e]">{deposit.paidAt}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={deposit.status} map={depositStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <IconButton label={`Xem ${deposit.id}`} icon={Eye} onClick={() => onSelectDeposit(deposit)} />
                      <IconButton label={`Duyệt ${deposit.id}`} icon={Check} onClick={() => onAction(deposit.id, "approved")} tone="good" />
                      <IconButton label={`Hoàn cọc ${deposit.id}`} icon={RotateCcw} onClick={() => onAction(deposit.id, "refunded")} tone="warn" />
                      <IconButton label={`Mất cọc ${deposit.id}`} icon={X} onClick={() => onAction(deposit.id, "forfeited")} tone="bad" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DepositDetail({ deposit }) {
  if (!deposit) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <FileCheck2 className="h-8 w-8 text-[#c8d0dc]" />
          <p className="text-sm font-semibold text-[#6b7280]">Chưa chọn hợp đồng cọc để xem chi tiết.</p>
        </div>
      </Card>
    );
  }

  const room = allRooms.find((item) => item.id === deposit.roomId);
  const tenant = tenants.find((item) => item.roomId === deposit.roomId);
  const handoverItems = ["Giường", "Tủ quần áo", "Máy lạnh", "Bàn học", "Khóa cửa"];

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-[#191c1e]">
        <UserRoundCog className="h-5 w-5 text-[#091426]" />
        Hồ sơ đang xử lý
      </h2>
      <div className="mt-5 grid gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">{deposit.id}</p>
          <h3 className="mt-1 text-xl font-bold text-[#091426]">{deposit.tenantName}</h3>
          <p className="mt-1 text-sm text-[#45474c]">{deposit.phone}</p>
        </div>
        <div className="grid gap-3 rounded-lg bg-[#f7f9fb] p-4 text-sm">
          <Row label="Phòng" value={deposit.roomId} />
          <Row label="Tiền cọc" value={formatMoney(deposit.amount)} />
          <Row label="Hẹn nhận phòng" value={deposit.moveInDate} />
          <Row label="Giá thuê" value={room ? formatMoney(room.price) : "N/A"} />
        </div>
        {["approved", "pending"].includes(deposit.status) && (
          <div className="grid gap-4 rounded-lg border border-[#e2e8f0] p-4">
            <SectionTitle>Chi tiết nhận phòng / đặt phòng</SectionTitle>
            <div className="grid gap-3 text-sm">
              <Row label="Bên cho thuê" value="Hải Đăng Boarding House" />
              <Row label="Bên thuê" value={tenant?.name || deposit.tenantName} />
              <Row label="Ngày bắt đầu" value={deposit.moveInDate} />
              <Row label="Ngày kết thúc" value="20/10/2024" />
              <Row label="Chu kỳ thanh toán" value="Hàng tháng" />
              <Row label="Điện ban đầu" value="128 kWh" />
              <Row label="Nước ban đầu" value="34 m3" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">Bảng bàn giao thiết bị</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {handoverItems.map((item) => (
                  <span key={item} className="rounded-full bg-[#f2f4f6] px-3 py-1 text-xs font-bold text-[#505f76]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-amber-700">Ghi chú kế toán</p>
          <p className="mt-2 text-sm leading-6 text-amber-800">{deposit.accountantNote}</p>
        </div>
        <Link href={`/rooms/deposit?roomId=${deposit.roomId}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a]">
          Mở luồng đặt cọc khách
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function DepositExportBar({ deposits }) {
  const [exportPrompt, setExportPrompt] = useState(false);
  const exportDeposits = () => {
    const rows = ["Ma coc,Phong,Khach hang,So dien thoai,So tien,Ngay nhan,Trang thai"];
    deposits.forEach((deposit) => {
      const [statusLabel] = depositStatus[deposit.status] || ["Không rõ"];
      rows.push([deposit.id, deposit.roomId, deposit.tenantName, deposit.phone, deposit.amount, deposit.paidAt, statusLabel].join(","));
    });
    downloadTextFile("danh-sach-coc.csv", rows.join("\n"));
  };

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setExportPrompt(true)}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426] hover:border-[#091426]"
        >
          Xuất danh sách cọc
        </button>
      </div>
      {exportPrompt && (
        <ExportConfirm
          title="Xuất danh sách hợp đồng cọc"
          filename="danh-sach-coc.csv"
          description="Xuất toàn bộ hợp đồng cọc đang lọc ra file CSV, gồm mã cọc, phòng, khách hàng, số tiền và trạng thái."
          onClose={() => setExportPrompt(false)}
          onConfirm={() => {
            exportDeposits();
            setExportPrompt(false);
          }}
        />
      )}
    </>
  );
}

function RejectAccountModal({ approval, onClose, onReject }) {
  const [reason, setReason] = useState("Thông tin đặt cọc chưa khớp với phòng đăng ký.");

  return (
    <Modal
      title={`Từ chối tài khoản ${approval.name}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]">
            Hủy
          </button>
          <button type="button" onClick={() => onReject(reason)} className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white">
            Gửi lý do từ chối
          </button>
        </div>
      }
    >
      <label className="grid gap-2">
        <span className="text-sm font-bold text-[#45474c]">Lý do gửi cho khách</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-28 rounded-lg border border-[#c5c6cd] p-3 text-sm text-[#091426]"
        />
      </label>
    </Modal>
  );
}

export default function DepositsPage() {
  const { query } = useDashboardLayout();
  const [statusFilter, setStatusFilter] = useState("all");
  const [depositDateFrom, setDepositDateFrom] = useState("");
  const [depositDateTo, setDepositDateTo] = useState("");
  const [deposits, setDeposits] = useState(depositContracts);
  const [selectedDepositId, setSelectedDepositId] = useState(depositContracts[0]?.id ?? null);
  const [approvals, setApprovals] = useState(initialAccountApprovals);
  const [rejecting, setRejecting] = useState(null);
  const [notice, setNotice] = useState("");
  const [roomHolds, setRoomHolds] = useState(() => getActiveRoomHolds());
  const [holdClock, setHoldClock] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHoldClock(Date.now());
      setRoomHolds(getActiveRoomHolds());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const filteredDeposits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return deposits.filter((deposit) => {
      const matchStatus = statusFilter === "all" || deposit.status === statusFilter;
      const paidAt = parseVNDate(deposit.paidAt);
      const from = depositDateFrom ? new Date(`${depositDateFrom}T00:00:00`) : null;
      const to = depositDateTo ? new Date(`${depositDateTo}T23:59:59`) : null;
      const matchDate = (!from || (paidAt && paidAt >= from)) && (!to || (paidAt && paidAt <= to));
      const matchQuery =
        !normalizedQuery ||
        deposit.roomId.toLowerCase().includes(normalizedQuery) ||
        deposit.tenantName.toLowerCase().includes(normalizedQuery) ||
        deposit.phone.includes(normalizedQuery) ||
        deposit.id.toLowerCase().includes(normalizedQuery);

      return matchStatus && matchDate && matchQuery;
    });
  }, [depositDateFrom, depositDateTo, deposits, query, statusFilter]);

  const selectedDeposit =
    (selectedDepositId ? deposits.find((deposit) => deposit.id === selectedDepositId) : null) ??
    deposits[0] ??
    null;

  const effectiveSelectedDeposit =
    selectedDeposit && filteredDeposits.find((deposit) => deposit.id === selectedDeposit.id) || null;

  const holdApprovals = useMemo(() => {
    return Object.values(roomHolds).map((hold) => ({
      id: hold.id,
      name: hold.customerName || "Khách vãng lai",
      phone: hold.phone || "Chưa cung cấp",
      email: hold.email || "Chưa cung cấp",
      roomId: hold.roomId,
      requestedAt: new Date(hold.createdAt).toLocaleString("vi-VN"),
      status: "pending",
      holdExpiresAt: hold.expiresAt,
    }));
  }, [roomHolds]);

  const approvalRows = useMemo(() => {
    const holdRoomIds = new Set(holdApprovals.map((approval) => approval.roomId));
    return [
      ...holdApprovals,
      ...approvals
        .filter((approval) => !holdRoomIds.has(approval.roomId))
        .map((approval) => ({
          ...approval,
          holdExpiresAt: parseVNDateTime(approval.requestedAt) + ROOM_HOLD_DURATION_MS,
        })),
    ];
  }, [approvals, holdApprovals]);

  const handleDepositAction = (depositId, nextStatus) => {
    setDeposits((current) =>
      current.map((deposit) =>
        deposit.id === depositId
          ? {
              ...deposit,
              status: nextStatus,
              accountantNote:
                nextStatus === "approved"
                  ? "Đã duyệt cọc và chuyển sang lịch nhận phòng."
                  : nextStatus === "refunded"
                    ? "Đã đánh dấu hoàn cọc, chờ đối soát ngân hàng."
                    : nextStatus === "forfeited"
                      ? "Đã ghi nhận mất cọc do quá hạn hoặc hủy lịch."
                      : deposit.accountantNote,
            }
          : deposit,
      ),
    );
    setSelectedDepositId(depositId);
  };

  const approveAccount = (approvalId) => {
    setApprovals((current) =>
      current.map((item) => (item.id === approvalId ? { ...item, status: "approved" } : item)),
    );
    const account = approvalRows.find((item) => item.id === approvalId);
    setNotice(`Đã kích hoạt tài khoản ${account?.name || ""} và gửi thông báo cho khách.`);
  };

  const rejectAccount = (reason) => {
    if (!rejecting) return;

    setApprovals((current) =>
      current.map((item) =>
        item?.id === rejecting.id
          ? { ...item, status: "rejected", rejectReason: reason }
          : item,
      ),
    );
    setNotice(`Đã từ chối tài khoản ${rejecting.name}. Lý do đã được gửi cho khách.`);
    setRejecting(null);
  };

  return (
    <>
      <PageHeader
        title="Danh sách Hợp đồng Cọc"
        description="Quản lý và theo dõi trạng thái các khoản tiền cọc phòng."
        actionLabel="Tạo hợp đồng mới"
        actionIcon={FileCheck2}
      />
      <DepositExportBar deposits={filteredDeposits} />
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] bg-[#f7f9fb] px-6 py-4">
          <div>
            <h2 className="font-bold text-[#091426]">Yêu cầu đặt cọc cần duyệt</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Sau khi đọc thông tin xét duyệt đặt cọc, quản lý kiểm tra thông tin rồi đồng ý hoặc từ chối kèm lý do.
            </p>
          </div>
          <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
            {approvalRows.filter((item) => item.status === "pending").length}
          </span>
        </div>
        <div className="grid gap-3 p-4">
          {approvalRows.map((approval) => {
            const countdownClock = holdClock || Math.max(0, Number(approval.holdExpiresAt) - ROOM_HOLD_DURATION_MS);
            const remainingMs = getHoldRemainingMs({ expiresAt: approval.holdExpiresAt }, countdownClock);

            return (
              <div key={approval.id} className="grid gap-4 rounded-lg border border-[#e2e8f0] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="grid gap-3">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <InfoBlock label="Họ tên" value={approval.name} />
                    <InfoBlock label="SĐT" value={approval.phone} />
                    <InfoBlock label="Email" value={approval.email} />
                    <InfoBlock label="Phòng đăng ký" value={approval.roomId} />
                  </div>
                  <p className={`text-sm font-bold ${remainingMs > 0 ? "text-amber-700" : "text-rose-700"}`}>
                    {remainingMs > 0
                      ? `Thời gian giữ phòng còn lại: ${formatHoldCountdown(remainingMs)}`
                      : "Thời gian giữ phòng đã hết hạn"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    value={approval.status === "pending" ? "pending" : approval.status === "approved" ? "approved" : "cancelled"}
                    map={depositStatus}
                  />
                  {approval.status === "pending" && (
                    <>
                      <IconButton label={`Duyệt ${approval.name}`} icon={Check} onClick={() => approveAccount(approval.id)} tone="good" />
                      <IconButton label={`Từ chối ${approval.name}`} icon={X} onClick={() => setRejecting(approval)} tone="bad" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {notice && <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div>}
        </div>
      </Card>
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={FileCheck2} label="Tổng hợp đồng" value={depositContracts.length} />
        <KpiCard
          icon={CalendarClock}
          label="Sắp hết hạn nhận phòng"
          value={depositContracts.filter((item) => item.status === "overdue").length}
          tone="amber"
        />
        <KpiCard
          icon={X}
          label="Đã hủy / mất cọc"
          value={depositContracts.filter((item) => ["cancelled", "forfeited"].includes(item.status)).length}
          tone="rose"
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <DepositTable
          deposits={filteredDeposits}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          dateFrom={depositDateFrom}
          dateTo={depositDateTo}
          onDateFromChange={setDepositDateFrom}
          onDateToChange={setDepositDateTo}
          onAction={handleDepositAction}
          selectedDeposit={effectiveSelectedDeposit}
          onSelectDeposit={(deposit) => deposit && setSelectedDepositId(deposit.id)}
        />
        <DepositDetail deposit={effectiveSelectedDeposit} />
      </section>
      {rejecting && (
        <RejectAccountModal approval={rejecting} onClose={() => setRejecting(null)} onReject={rejectAccount} />
      )}
    </>
  );
}
