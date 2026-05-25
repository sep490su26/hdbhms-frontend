"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  LayoutGrid,
  Map as MapIcon,
  Maximize2,
  Search,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchPublicRooms, floorPlans, floors, getRoomDetailHref, normalizeApiRoom } from "../../services/roomsService";

function guestStatusCopy(status) {
  const copy = {
    available: "Trống",
    occupied: "Đã thuê",
    deposited: "Đang đặt cọc",
  };

  return copy[status] || "Đã thuê";
}

function publicStatusClass(status) {
  if (status === "available") return "border-emerald-400/30 bg-emerald-400/15 text-emerald-100";
  if (status === "deposited") return "border-amber-300/40 bg-amber-300/20 text-amber-100";
  return "border-slate-400/20 bg-slate-900/50 text-slate-200";
}

function floorPlanStatusStyle(status) {
  if (status === "available")
    return {
      box: "border-2 border-emerald-400 bg-emerald-50/50 text-emerald-700",
      dot: "bg-emerald-400",
    };
  if (status === "deposited")
    return {
      box: "border-2 border-amber-500 bg-amber-500/35 text-amber-700",
      dot: "bg-amber-500",
    };
  return {
    box: "border-2 border-slate-300 bg-slate-100 text-slate-400",
    dot: "bg-slate-400",
  };
}

function FloorPlanRoomBox({ room, isSelected, onSelect }) {
  const canInteract = room.status !== "occupied";
  const { box, dot } = floorPlanStatusStyle(room.status);
  const priceShort = room.price ? `${(room.price / 1000000).toFixed(1)}M` : "—";

  return (
    <button
      type="button"
      onClick={() => {
        if (canInteract) onSelect(room);
      }}
      disabled={!canInteract}
      aria-label={`Phòng ${room.id}`}
      className={`relative flex w-full min-w-[92px] flex-col justify-between rounded-[14px] p-2.5 text-left transition-all ${box} ${
        canInteract ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-not-allowed"
      } ${isSelected ? "ring-[3px] ring-blue-500 ring-offset-1 ring-offset-white shadow-[0_2px_4px_-2px_rgba(219,234,254,1),0_4px_6px_-1px_rgba(219,234,254,1)]" : ""}`}
      style={{ height: 72 }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold leading-none">{room.id}</span>
        <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${dot}`} />
      </div>
      <div className="mt-auto flex flex-col gap-0.5">
        <span className="text-[10px] font-medium leading-tight opacity-60">{room.area}m²</span>
        <span className="text-[11px] font-semibold leading-tight">{priceShort}</span>
      </div>
    </button>
  );
}

function StairBox() {
  return (
    <div
      className="flex w-full min-w-[92px] items-center justify-center rounded-[14px] border-2 border-slate-300 bg-slate-100 text-center"
      style={{ height: 72 }}
    >
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">CẦU THANG</span>
    </div>
  );
}

function RoomListingCard({ room, isSelected, onSelect }) {
  return (
    <button
      type="button"
      disabled={room.status === "occupied"}
      onClick={() => {
        if (room.status !== "occupied") onSelect(room);
      }}
      className={`group w-full max-w-[350px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-left shadow-lg shadow-black/15 transition ${
        room.status === "occupied" ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-1 hover:border-white/20"
      } ${isSelected ? "ring-2 ring-white" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        <Image
          src={room.image}
          alt={`Ảnh phòng ${room.id}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 350px"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
        <span
          className={`absolute left-4 top-4 rounded-md border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest shadow-lg shadow-black/20 ${
            publicStatusClass(room.status)
          }`}
        >
          {guestStatusCopy(room.status)}
        </span>
      </div>

      <div className="bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{room.floor}</p>
            <h3 className="mt-1 text-xl font-bold text-white">{room.id}</h3>
          </div>
          <p className={`text-right text-sm font-extrabold sm:text-base ${room.status === "available" ? "text-emerald-400" : "text-amber-400"}`}>
            {room.priceLabel}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">{room.area}m²</span>
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">{room.feature}</span>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
          {room.status === "occupied" ? (
            "Không thể xem chi tiết"
          ) : (
            <>
              Xem chi tiết
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function RoomDetail({ room, onClose }) {
  const [activeImage, setActiveImage] = useState(room.images[0]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#1e2746]/95 shadow-2xl">
      <div className="relative h-56 shrink-0 overflow-hidden bg-slate-900">
        <Image
          src={activeImage}
          alt={`Ảnh phòng ${room.id}`}
          fill
          sizes="(max-width: 1024px) 100vw, 420px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết phòng"
          className="absolute right-4 top-4 rounded-full bg-black/40 p-2.5 text-white backdrop-blur transition hover:bg-black/60"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Phòng {room.id}</h2>
            <p className="mt-1 text-xs font-medium text-white/70">
              {room.floor} · {room.area}m² · {room.maxPeople} người
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-white">{room.priceLabel}</p>
            <p className="text-xs text-white/60">VND/tháng</p>
          </div>
        </div>
      </div>

      {/* Bọc class động theo từng trạng thái */}
      <div className={`border-b px-5 py-3 ${
        room.status === "available" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-100"
      }`}>
        <span className={`inline-flex items-center gap-2 text-sm font-bold ${
          room.status === "available" ? "text-emerald-700" : "text-slate-700"
        }`}>
          <span className={`h-2 w-2 rounded-full ${
            room.status === "available" ? "bg-emerald-500" : "bg-slate-400"
          }`} />
          {room.status === "available" ? "Còn trống - sẵn sàng vào ở" : "Đã thuê - không còn trống"}
        </span>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-white p-5 text-[#091426]">
        <div className="mb-5 grid grid-cols-4 gap-2">
          {room.images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActiveImage(image)}
              className={`relative aspect-[4/3] overflow-hidden rounded-xl border transition ${
                activeImage === image ? "border-[#091426] ring-2 ring-[#091426]/10" : "border-slate-200"
              }`}
              aria-label={`Xem ảnh phòng ${index + 1}`}
            >
              <Image src={image} alt={`Ảnh ${index + 1} phòng ${room.id}`} fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>

        <p className="text-sm leading-6 text-slate-500">{room.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-[14px] bg-slate-50 p-4 text-center">
            <Maximize2 className="mx-auto mb-2 h-5 w-5 text-blue-500" />
            <p className="font-bold">{room.area}m²</p>
            <p className="text-xs text-slate-400">Diện tích</p>
          </div>
          <div className="rounded-[14px] bg-slate-50 p-4 text-center">
            <Users className="mx-auto mb-2 h-5 w-5 text-blue-500" />
            <p className="font-bold">{room.maxPeople}</p>
            <p className="text-xs text-slate-400">Tối đa</p>
          </div>
          <div className="rounded-[14px] bg-slate-50 p-4 text-center">
            <Building2 className="mx-auto mb-2 h-5 w-5 text-blue-500" />
            <p className="font-bold">T{room.floorNumber}</p>
            <p className="text-xs text-slate-400">Tầng</p>
          </div>
        </div>

        <div className="mt-6 rounded-[14px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Chỉ số gần nhất</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs font-semibold text-slate-400">Điện cũ</p>
              <p className="mt-1 text-lg font-bold text-[#091426]">{room.lastMeterReading.electric} kWh</p>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs font-semibold text-slate-400">Nước cũ</p>
              <p className="mt-1 text-lg font-bold text-[#091426]">{room.lastMeterReading.water} m³</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Lần nhập gần nhất: {room.lastMeterReading.recordedAt}</p>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-700">Tiện ích trong phòng</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {room.amenities.map((amenity) => (
              <div key={amenity} className="flex items-center gap-2 rounded-[14px] bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                {amenity}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[14px] border border-blue-100 bg-blue-50 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800">Tiện ích tòa nhà</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {room.buildingFacilities.map((facility) => (
              <span key={facility} className="text-xs text-blue-700">
                {facility}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        <Link
          href={getRoomDetailHref(room)}
          className="flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-[14px] bg-[#232946] px-4 py-3 text-center text-sm font-bold leading-tight text-white shadow-[0_10px_24px_rgba(35,41,70,0.22)] transition hover:bg-[#091426] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/25 sm:gap-3 sm:px-5 sm:text-base"
        >
          <span>Xem chi tiết phòng</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    </div>
  );
}

export default function RoomsClient({ depositSuccess = false, requestedRoomId = "" }) {
  const [viewMode, setViewMode] = useState("Listing");
  const [activeFloorFilter, setActiveFloorFilter] = useState("Tất cả");
  const [activeFloorPlan, setActiveFloorPlan] = useState("Tầng 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(requestedRoomId || null);

  const [apiRooms, setApiRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  useEffect(() => {
    const loadPublicRooms = async () => {
      try {
        setIsLoading(true);
        const roomsData = await fetchPublicRooms();
        setApiRooms(roomsData);
        setIsSuccess(true);
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadPublicRooms();
  }, []);

  const visibleRooms = useMemo(() => {
    return apiRooms.map((apiRoom) => normalizeApiRoom(apiRoom));
  }, [apiRooms]);

  const floorsForPlan = floorPlans.map((plan) => plan.floor);

  const filteredRooms = useMemo(() => {
    return visibleRooms.filter((room) => {
      if (activeFloorFilter !== "Tất cả" && room.floor !== activeFloorFilter) return false;
      if (availableOnly && room.status !== "available") return false;
      if (searchQuery && !room.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [activeFloorFilter, availableOnly, searchQuery, visibleRooms]);

  const currentFloorRooms = useMemo(
    () => visibleRooms.filter((room) => room.floor === activeFloorPlan),
    [activeFloorPlan, visibleRooms],
  );
  const selectedRoom = useMemo(
    () => visibleRooms.find((room) => room.id === selectedRoomId) || null,
    [selectedRoomId, visibleRooms],
  );

  const openRoom = (room) => {
    if (room.status === "occupied") return;
    setSelectedRoomId(room.id);
  };

  const closePanel = () => {
    setSelectedRoomId(null);
  };

  return (
    <div className="min-h-screen bg-[#091426] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
      {isLoading && <div className="py-10 text-center">Đang tải danh sách phòng...</div>}
      {isError && <div className="py-10 text-center text-rose-400">Không thể tải dữ liệu. Vui lòng thử lại.</div>}
      {isSuccess && (
        <>
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <div className="mb-3 flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-slate-400">
                  <Home className="h-4 w-4" />
                  Hải Đăng House
                </div>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                  Xem phòng trống và chọn phòng đặt cọc
                </h1>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
                <div className="flex h-11 rounded-2xl border border-white/5 bg-[#1e2746] p-1">
                  {[
                    { key: "Listing", label: "Danh sách", icon: LayoutGrid },
                    { key: "Floor Plan", label: "Sơ đồ tầng", icon: MapIcon },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setViewMode(item.key);
                          closePanel();
                        }}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:flex-none ${
                          viewMode === item.key ? "bg-white text-[#1a223d]" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Tìm mã phòng..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#1e2746] pl-11 pr-4 text-sm font-medium text-white outline-none transition focus:border-white/30"
                  />
                </div>
              </div>
            </div>

            <div className="mb-8 flex flex-col gap-3 rounded-[1.5rem] border border-white/5 bg-[#1e2746]/50 p-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(viewMode === "Listing" ? floors : floorsForPlan).map((floor) => {
                  const isActive = viewMode === "Listing" ? activeFloorFilter === floor : activeFloorPlan === floor;
                  return (
                    <button
                      key={floor}
                      type="button"
                      onClick={() => {
                        viewMode === "Listing" ? setActiveFloorFilter(floor) : setActiveFloorPlan(floor);
                        closePanel();
                      }}
                      className={`h-10 shrink-0 rounded-2xl px-5 text-xs font-bold uppercase tracking-widest transition ${
                        isActive ? "bg-white text-[#1a223d]" : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {floor}
                    </button>
                  );
                })}
              </div>

              {viewMode === "Listing" && (
                <label className="flex h-11 shrink-0 cursor-pointer items-center gap-4 rounded-2xl px-4 transition hover:bg-white/5">
                  <span className="relative flex h-6 items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={availableOnly}
                      onChange={(event) => setAvailableOnly(event.target.checked)}
                    />
                    <span className={`h-6 w-12 rounded-full transition ${availableOnly ? "bg-emerald-500" : "bg-slate-700"}`} />
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${
                        availableOnly ? "translate-x-6" : ""
                      }`}
                    />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Chỉ hiện phòng trống</span>
                </label>
              )}
            </div>

            {depositSuccess && (
              <div className="mb-8 rounded-[1.25rem] border border-emerald-400/25 bg-emerald-400/10 px-5 py-4 text-sm font-semibold text-emerald-100">
                Yêu cầu đặt phòng {requestedRoomId || ""} đã được gửi thành công. Chủ trọ sẽ kiểm tra và phản hồi theo thông tin liên hệ đã cung cấp.
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
              <section className={selectedRoom ? "min-w-0" : "lg:col-span-2"}>
                {viewMode === "Listing" ? (
                  <div className="mx-auto w-full max-w-6xl">
                    {filteredRooms.length > 0 ? (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] justify-items-start gap-5">
                        {filteredRooms.map((room) => (
                          <RoomListingCard
                            key={room.id}
                            room={room}
                            isSelected={selectedRoom?.id === room.id}
                            onSelect={openRoom}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
                        <p className="text-sm font-semibold text-slate-300">Không có phòng phù hợp với bộ lọc hiện tại.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    {/* Floor header */}
                    <div className="mb-5 flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sơ đồ tầng</p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-800">{activeFloorPlan}</h2>
                      </div>
                    </div>

                    {/* Floor plan body — horizontal layout */}
                    <div className="mx-auto flex w-fit flex-1 flex-col items-center justify-center gap-3">
                      {/* Top row: rooms with suffix >= 03, sorted ascending */}
                      <div className="flex w-full flex-wrap justify-start gap-[5px]">
                        {currentFloorRooms
                          .filter((room) => {
                            const suffix = parseInt(room.id.slice(-2), 10);
                            return suffix >= 3;
                          })
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((room) => (
                            <div key={room.id} className="w-[102px]">
                              <FloorPlanRoomBox
                                room={room}
                                isSelected={selectedRoom?.id === room.id}
                                onSelect={openRoom}
                              />
                            </div>
                          ))}
                      </div>

                      {/* Corridor divider */}
                      <div className="flex w-full items-center gap-2 py-1.5">
                        <div className="h-px flex-1 bg-slate-300" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">CORRIDOR</span>
                        <div className="h-px flex-1 bg-slate-300" />
                      </div>

                      {/* Bottom row: room 01, room 02, stair box */}
                      <div className="flex w-full flex-wrap justify-start gap-[5px]">
                        {currentFloorRooms
                          .filter((room) => {
                            const suffix = parseInt(room.id.slice(-2), 10);
                            return suffix <= 2;
                          })
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((room) => (
                            <div key={room.id} className="w-[102px]">
                              <FloorPlanRoomBox
                                room={room}
                                isSelected={selectedRoom?.id === room.id}
                                onSelect={openRoom}
                              />
                            </div>
                          ))}
                        <div className="w-[102px]">
                          <StairBox />
                        </div>
                      </div>
                    </div>

                    {/* Legend at bottom */}
                    <div className="mt-6 flex shrink-0 flex-wrap items-center justify-center gap-6 pt-4">
                      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-slate-500">
                        <i className="inline-block h-3 w-3 rounded-sm bg-emerald-400" />TRỐNG
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-slate-500">
                        <i className="inline-block h-3 w-3 rounded-sm border border-slate-300 bg-slate-100" />ĐÃ THUÊ
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-slate-500">
                        <i className="inline-block h-3 w-3 rounded-sm bg-amber-500" />ĐANG ĐẶT CỌC
                      </span>
                    </div>
                  </div>
                )}
              </section>

              <AnimatePresence mode="wait">
                {selectedRoom && (
                  <motion.aside
                    key={selectedRoom.id}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{ duration: 0.2 }}
                    className="hidden h-[calc(100vh-8rem)] lg:sticky lg:top-28 lg:block"
                  >
                    <RoomDetail room={selectedRoom} onClose={closePanel} />
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {selectedRoom && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end bg-black/60 p-0 backdrop-blur-sm lg:hidden"
                onClick={closePanel}
              >
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  onClick={(event) => event.stopPropagation()}
                  className="max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem]"
                >
                  <RoomDetail room={selectedRoom} onClose={closePanel} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
