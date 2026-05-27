"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Download,
  Edit3,
  Eye,
  Grid3X3,
  ListFilter,
  Map,
  UsersRound,
  X,
} from "lucide-react";
import { allRooms, tenants } from "@/services/dashboardService";
import { statusCopy } from "@/services/roomsService";
import { useDashboardLayout } from "../_contexts/DashboardLayoutContext";

const money = new Intl.NumberFormat("vi-VN");

const roomStatus = {
  occupied: ["Đang thuê", "bg-blue-50 text-blue-800"],
  available: ["Trống", "bg-emerald-50 text-emerald-700"],
  maintenance: ["Bảo trì", "bg-red-50 text-red-700"],
  soonVacant: ["Sắp trống", "bg-orange-50 text-orange-700"],
  onHolde: ["Đang giữ cọc", "bg-orange-50 text-orange-700"],
  deposited: ["Đã đặt cọc", "bg-amber-50 text-amber-700"],
  expired: ["Hết hạn", "bg-purple-50 text-purple-700"],
};

const FLOOR_STATUSES = [
  { key: "available", label: "Trống", dot: "bg-emerald-500" },
  { key: "occupied", label: "Đang thuê", dot: "bg-blue-500" },
  { key: "soonVacant", label: "Sắp trống", dot: "bg-orange-500" },
  { key: "deposited", label: "Đặt cọc", dot: "bg-amber-400" },
  { key: "maintenance", label: "Bảo trì", dot: "bg-red-500" },
  { key: "expired", label: "Hết hạn", dot: "bg-purple-500" },
];

const STATUS_DOT = {
  available: "bg-emerald-500",
  occupied: "bg-blue-500",
  soonVacant: "bg-orange-500",
  deposited: "bg-amber-400",
  maintenance: "bg-red-500",
  expired: "bg-purple-500",
};

const views = [
  { value: "floor-map", label: "Sơ đồ tầng", icon: Map },
  { value: "room-list", label: "Danh sách phòng", icon: Building2 },
];

function formatMoney(value) {
  return `${money.format(value)} đ`;
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
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white"
            >
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

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}>
      {children}
    </section>
  );
}

function FilterBar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      {children}
    </div>
  );
}

function SelectPill({ icon: Icon, children }) {
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#191c1e] hover:border-[#091426]"
    >
      {Icon && <Icon className="h-4 w-4 text-[#505f76]" />}
      {children}
    </button>
  );
}

function roomCellBg(room) {
  if (room.price >= 2200000) return "bg-[#1e3a5f]";
  if (room.price >= 2100000) return "bg-[#1a3352]";
  return "bg-[#16253a]";
}

function priceTierLabel(price) {
  const m = price / 1000000;
  return `${Number.isInteger(m) ? m : m.toFixed(1)} trđ/th`;
}

function RoomDetailPanel({ room, tenantList, onClose }) {
  const tenant = room ? tenantList.find((item) => item.roomId === room.id) : null;
  const [detailTab, setDetailTab] = useState("info");
  const [roomDetail, setRoomDetail] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    if (!room?.roomId) return;
    const fetchStaffDetail = async () => {
      try {
        setIsDetailLoading(true);
        const res = await fetch(`http://localhost:8080/api/v1/rooms/id/${room.roomId}`, {
          headers: { Authorization: "Bearer <STAFF_JWT>" },
        });
        const json = await res.json();
        if (json.code === 0) setRoomDetail(json.data);
      } finally {
        setIsDetailLoading(false);
      }
    };
    fetchStaffDetail();
  }, [room?.roomId]);

  if (!room) return null;

  const statusLabel = roomStatus[room.status]?.[0] ?? "Không rõ";
  const statusCls = roomStatus[room.status]?.[1] ?? "";

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-lg">
      <div className="flex items-start justify-between border-b border-[#e2e8f0] bg-[#091426] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">{room.id}</span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${statusCls}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8590a6]">
            Tầng {room.floorNumber} &middot; {room.area} m² &middot; {roomDetail?.publicNote ?? "Không có"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="rounded-md p-1 text-[#8590a6] hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-[#e2e8f0]">
        {[
          { id: "info", label: "Thông tin" },
          { id: "tenant", label: "Khách thuê" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setDetailTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-bold transition ${detailTab === tab.id
              ? "border-b-2 border-[#091426] text-[#091426]"
              : "text-[#505f76] hover:text-[#091426]"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {detailTab === "info" && (
          <div className="space-y-4">
            {isDetailLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-4 rounded bg-slate-200" />
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-[#e2e8f0] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#45474c]">Giá thuê</p>
                  <p className="mt-1 text-2xl font-bold text-[#091426]">
                    {formatMoney(roomDetail?.listedPrice ?? room.price)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Diện tích", value: `${roomDetail?.areaM2 ?? room.area} m²` },
                    { label: "Sức chứa", value: `${roomDetail?.maxOccupants ?? 3} người` },
                    { label: "Đặc điểm", value: roomDetail?.publicNote ?? "Không có" },
                    { label: "Trạng thái xóa", value: roomDetail?.deletedAt ? "Đã xóa mềm" : "Hoạt động" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-[#f7f9fb] p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#6b7280]">{label}</p>
                      <p className={`mt-0.5 text-sm font-bold ${roomDetail?.deletedAt && label === "Trạng thái xóa" ? "text-rose-600 line-through" : "text-[#191c1e]"}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-amber-800">Ghi chú nội bộ (Staff Only)</p>
                  <p className="mt-0.5 text-sm text-amber-900">{roomDetail?.internalNote ?? "Không có ghi chú"}</p>
                </div>

                <div className="mt-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#45474c]">Mã phòng (Cập nhật)</label>
                  <input
                    type="text"
                    value={roomDetail?.roomCode ?? room.id}
                    readOnly
                    disabled
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] px-3 py-2 text-sm font-bold text-[#6b7280]"
                    title="Mã phòng không thể thay đổi sau khi khởi tạo"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {detailTab === "tenant" && (
          <div className="space-y-4">
            {tenant ? (
              <>
                <div className="flex items-center gap-3 rounded-lg bg-[#f7f9fb] p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#091426] text-sm font-bold text-white">
                    {tenant.initials}
                  </span>
                  <div>
                    <p className="font-bold text-[#191c1e]">{tenant.name}</p>
                    <p className="text-xs text-[#6b7280]">Vào ở: {tenant.moveInDate}</p>
                  </div>
                </div>
                {[
                  { label: "SĐT", value: tenant.phone },
                  { label: "Email", value: tenant.email },
                  { label: "CCCD", value: tenant.citizenId },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3 rounded-lg bg-[#f7f9fb] px-4 py-3">
                    <p className="w-10 shrink-0 text-[10px] font-semibold uppercase text-[#6b7280]">{label}</p>
                    <p className="text-sm text-[#191c1e]">{value}</p>
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <UsersRound className="h-8 w-8 text-[#c8d0dc]" />
                <p className="text-sm font-medium text-[#6b7280]">Chưa có khách thuê</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-[#e2e8f0] p-4">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#e2e8f0] py-2 text-xs font-bold text-[#505f76] hover:border-[#091426] hover:text-[#091426]"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Chỉnh sửa
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#091426] py-2 text-xs font-bold text-white hover:bg-[#16253a]"
        >
          <Eye className="h-3.5 w-3.5" />
          Xem đầy đủ
        </button>
      </div>
    </aside>
  );
}

function RoomCell({ room, isSelected, onClick, isLarge }) {
  const dot = STATUS_DOT[room.status] ?? "bg-slate-400";
  const bg = roomCellBg(room);

  return (
    <button
      type="button"
      onClick={() => onClick(room)}
      aria-label={`Phòng ${room.id}`}
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border text-left transition-all ${isLarge ? "min-h-[110px] p-4" : "min-h-[76px] p-3"
        } ${bg} ${isSelected
          ? "scale-[1.03] border-emerald-400 shadow-lg ring-2 ring-emerald-400/40"
          : "border-white/10 hover:border-white/30 hover:shadow-md"
        }`}
    >
      <span className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${dot} ring-2 ring-[#091426]`} />
      <span className={`font-bold text-white ${isLarge ? "text-base" : "text-sm"}`}>{room.id}</span>
      <div className="mt-2">
        <p className="text-[10px] font-semibold text-white/60">{priceTierLabel(room.price)}</p>
        {isLarge && <p className="text-[10px] text-white/40">{room.area} m²</p>}
      </div>
    </button>
  );
}

function FloorMapPage({ tenantList = [] }) {
  const [apiRooms, setApiRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [activeFloor, setActiveFloor] = useState(2);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const fetchStaffRooms = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("http://localhost:8080/api/v1/rooms?size=100", {
          headers: {
            Authorization: "Bearer <STAFF_JWT>",
            "Content-Type": "application/json",
          },
        });
        const json = await res.json();
        if (json.code === 0) {
          setApiRooms(json.data?.content ?? []);
          setIsSuccess(true);
        } else {
          setIsError(true);
        }
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaffRooms();
  }, []);

  const floorRoomsData = useMemo(() => {
    return apiRooms.map((apiRoom) => {
      const statusLower = apiRoom.currentStatus?.toLowerCase() ?? "";
      let mappedStatus = "occupied";
      if (statusLower === "vacant") mappedStatus = "available";
      else if (statusLower === "soon_vacant") mappedStatus = "soonVacant";
      else if (statusLower === "reserved") mappedStatus = "deposited";
      else if (statusLower === "maintenance") mappedStatus = "maintenance";

      return {
        id: apiRoom.roomCode ?? "",
        roomId: apiRoom.id ?? null,
        status: mappedStatus,
        price: apiRoom.listedPrice ?? 0,
        area: apiRoom.areaM2 ?? 0,
        floorNumber: parseInt(apiRoom.floorName?.replace(/\D/g, "") || "1", 10),
        position: (apiRoom.positionX ?? 0) < 50 ? "left" : "right",
      };
    });
  }, [apiRooms]);

  const floorRooms = useMemo(
    () => floorRoomsData.filter((room) => room.floorNumber === activeFloor),
    [activeFloor, floorRoomsData],
  );
  const leftRooms = useMemo(() => floorRooms.filter((room) => room.position === "left"), [floorRooms]);
  const rightRooms = useMemo(() => floorRooms.filter((room) => room.position === "right"), [floorRooms]);

  const stats = useMemo(
    () => ({
      total: floorRoomsData.length,
      occupied: floorRoomsData.filter((room) => room.status === "occupied").length,
      available: floorRoomsData.filter((room) => room.status === "available").length,
      maintenance: floorRoomsData.filter((room) => room.status === "maintenance").length,
    }),
    [floorRoomsData],
  );

  function handleRoomClick(room) {
    setSelectedRoom((prev) => (prev?.id === room.id ? null : room));
  }
  /*<PageHeader
          title="Sơ đồ tầng"
          description="Xem nhanh trạng thái từng phòng theo tầng. Màu nền = mức giá, chấm tròn = trạng thái."
        /> */
  return (
    <>

      {isLoading && <div className="py-10 text-center font-bold text-[#505f76]">Đang tải sơ đồ tầng...</div>}
      {isError && (
        <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          Không thể tải dữ liệu sơ đồ tầng. Vui lòng thử lại.
        </div>
      )}
      {isSuccess && (
        <div className="mt-6 space-y-6">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Tổng phòng", value: stats.total, bg: "bg-blue-50", text: "text-blue-700" },
              { label: "Đang thuê", value: stats.occupied, bg: "bg-slate-100", text: "text-slate-700" },
              { label: "Phòng trống", value: stats.available, bg: "bg-emerald-50", text: "text-emerald-700" },
              { label: "Bảo trì", value: stats.maintenance, bg: "bg-rose-50", text: "text-rose-700" },
            ].map(({ label, value, bg, text }) => (
              <article key={label} className={`flex flex-col rounded-xl border border-[#e2e8f0] ${bg} px-5 py-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${text}`}>{label}</p>
                <p className={`mt-1 text-3xl font-bold ${text}`}>{value}</p>
              </article>
            ))}
          </section>

          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] bg-[#f7f9fb] px-5 py-3">
              <div className="flex gap-2 overflow-x-auto">
                {[1, 2, 3, 4, 5].map((floor) => (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => {
                      setActiveFloor(floor);
                      setSelectedRoom(null);
                    }}
                    className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${activeFloor === floor
                      ? "bg-white text-[#091426] shadow-sm ring-1 ring-[#e2e8f0]"
                      : "text-[#505f76] hover:text-[#091426]"
                      }`}
                  >
                    Tầng {floor}
                  </button>
                ))}
              </div>
              <div className="hidden items-center gap-4 xl:flex">
                {FLOOR_STATUSES.map(({ key, label, dot }) => (
                  <span key={key} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#45474c]">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 border-b border-[#e2e8f0] bg-[#091426]/[0.03] px-5 py-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">Màu ô:</span>
              {[
                { bg: "bg-[#1e3a5f]", label: "2.200.000 đ" },
                { bg: "bg-[#1a3352]", label: "2.100.000 đ" },
                { bg: "bg-[#16253a]", label: "2.000.000 đ" },
              ].map(({ bg, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#45474c]">
                  <span className={`h-3 w-5 rounded ${bg}`} />
                  {label}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-0 xl:flex-row">
              <div className="flex-1 p-5">
                <div className="mx-auto grid max-w-[920px] grid-cols-1 gap-5 lg:grid-cols-[214px_1fr]">
                  <div className="grid content-start gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">Phòng lớn</p>
                    {leftRooms.map((room) => (
                      <RoomCell
                        key={room.id}
                        room={room}
                        isSelected={selectedRoom?.id === room.id}
                        onClick={handleRoomClick}
                        isLarge
                      />
                    ))}
                    <div className="flex min-h-[62px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-4">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Cầu thang</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b7280]">Phòng tiêu chuẩn</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {rightRooms.map((room) => (
                        <RoomCell
                          key={room.id}
                          room={room}
                          isSelected={selectedRoom?.id === room.id}
                          onClick={handleRoomClick}
                          isLarge={false}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 xl:hidden">
                  {FLOOR_STATUSES.map(({ key, label, dot }) => (
                    <span key={key} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#45474c]">
                      <span className={`h-2 w-2 rounded-full ${dot}`} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {selectedRoom && (
                <>
                  <div
                    className="fixed inset-0 z-30 bg-[#091426]/60 backdrop-blur-sm xl:hidden"
                    onClick={() => setSelectedRoom(null)}
                  />
                  <div className="fixed inset-y-0 right-0 z-40 flex w-[340px] max-w-[90vw] flex-col bg-[#f7f9fb] p-3 shadow-2xl xl:static xl:z-0 xl:w-auto xl:shrink-0 xl:border-l xl:border-[#e2e8f0] xl:bg-transparent xl:p-3 xl:shadow-none">
                    <RoomDetailPanel
                      room={selectedRoom}
                      tenantList={tenantList}
                      onClose={() => setSelectedRoom(null)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RoomsListPage({ query }) {
  const [exportPrompt, setExportPrompt] = useState(false);
  const filteredRooms = allRooms.filter((room) => {
    const normalizedQuery = query.trim().toLowerCase();
    return !normalizedQuery || room.id.toLowerCase().includes(normalizedQuery) || room.floor.toLowerCase().includes(normalizedQuery);
  });

  const exportRooms = () => {
    const rows = ["Ma phong,Tang,Dien tich,Gia niem yet,Trang thai"];
    filteredRooms.forEach((room) => {
      rows.push([room.id, room.floor, `${room.area} m2`, room.listedPrice, statusCopy(room.status)].join(","));
    });
    downloadTextFile("danh-sach-phong.csv", rows.join("\n"));
  };
  /*<PageHeader
          title="Quản lý phòng"
          description={`Manage ${allRooms.length} rooms across 5 floors`}
          actionLabel="Tạo phòng mới"
          actionIcon={Building2}
        />*/
  return (
    <>

      <FilterBar>
        <SelectPill icon={Map}>Tất cả các tầng</SelectPill>
        <SelectPill icon={ListFilter}>Tất cả trạng thái</SelectPill>
        <button
          type="button"
          onClick={() => setExportPrompt(true)}
          aria-label="Xuất danh sách phòng"
          className="ml-auto rounded-lg border border-[#e2e8f0] p-2 text-[#505f76] hover:border-[#091426]"
        >
          <Download className="h-4 w-4" />
        </button>
        <button type="button" className="rounded-lg border border-[#e2e8f0] p-2 text-[#505f76] hover:border-[#091426]">
          <Grid3X3 className="h-4 w-4" />
        </button>
      </FilterBar>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-[#f2f4f6]">
              <tr className="text-xs font-bold uppercase tracking-[0.08em] text-[#505f76]">
                <th className="px-6 py-4">Mã phòng</th>
                <th className="px-6 py-4">Đặc điểm</th>
                <th className="px-6 py-4">Tầng</th>
                <th className="px-6 py-4">Diện tích</th>
                <th className="px-6 py-4">Giá niêm yết</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.slice(0, 10).map((room) => (
                <tr key={room.id} className="border-t border-[#e2e8f0]">
                  <td className="px-6 py-4 text-sm font-bold text-[#091426]">{room.id}</td>
                  <td className="px-6 py-4">
                    <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-[#3c475a]">
                      {room.feature}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#45474c]">{room.floor}</td>
                  <td className="px-6 py-4 text-sm text-[#45474c]">{room.area} m²</td>
                  <td className="px-6 py-4 text-sm font-semibold text-[#091426]">{formatMoney(room.listedPrice)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge value={room.status} map={roomStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <IconButton label={`Xem ${room.id}`} icon={Eye} />
                      <IconButton label={`Sửa ${room.id}`} icon={Edit3} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-[#e2e8f0] px-6 py-4 text-sm text-[#505f76]">
          <span>Showing 1 to {Math.min(filteredRooms.length, 10)} of {allRooms.length} entries</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((page) => (
              <span key={page} className={`rounded px-3 py-1 ${page === 1 ? "bg-[#d8e3fb] text-[#111c2d]" : "border border-[#e2e8f0]"}`}>
                {page}
              </span>
            ))}
          </div>
        </div>
      </Card>
      {exportPrompt && (
        <ExportConfirm
          title="Xuất danh sách phòng"
          filename="danh-sach-phong.csv"
          description="Xuất danh sách phòng theo bộ lọc hiện tại, gồm mã phòng, tầng, diện tích, giá niêm yết và trạng thái."
          onClose={() => setExportPrompt(false)}
          onConfirm={() => {
            exportRooms();
            setExportPrompt(false);
          }}
        />
      )}
    </>
  );
}

export function RoomsManagementContent({ initialView = "floor-map", query = "" }) {
  const [view, setView] = useState(initialView);

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#191c1e]">Quản lý Phòng & Tầng</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">
            Theo dõi mặt bằng từng tầng và danh sách phòng trong cùng một khu vực quản trị.
          </p>
        </div>
        <div className="inline-flex w-full rounded-lg border border-[#e2e8f0] bg-white p-1 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:w-auto">
          {views.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setView(item.value)}
                className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition sm:flex-none ${isActive
                  ? "bg-[#091426] text-white shadow-sm"
                  : "text-[#505f76] hover:bg-[#f2f4f6] hover:text-[#091426]"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "floor-map" ? <FloorMapPage tenantList={tenants} /> : <RoomsListPage query={query} />}
    </section>
  );
}

export default function RoomsPage() {
  const { query } = useDashboardLayout();

  return <RoomsManagementContent query={query} />;
}
