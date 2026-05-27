"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  Maximize2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Users,
  Wifi,
  X,
} from "lucide-react";
import {
  CONTACT_PHONE_HREF,
  CONTACT_ZALO_HREF,
  fetchPublicRoomById,
  findRoomById,
  normalizeApiRoom,
} from "../../../../services/roomsService";
import {
  combineAppointmentParts,
  publicCreateViewingCustomer,
} from "../../../../services/viewingCustomersService";
import { getActiveRoomHolds } from "../../../../lib/roomHoldStorage";

const DATE_ERROR_MESSAGE = "Ngày chọn phải bắt đầu từ ngày mai trở đi.";

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-5 text-center transition hover:border-blue-100 hover:bg-blue-50/50">
      <Icon className="mx-auto mb-3 h-6 w-6 text-blue-500" />
      <p className="text-lg font-bold text-[#091426]">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="rounded-[20px] border border-slate-100 bg-white p-6 text-[#091426] sm:p-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-5 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function withDetailDefaults(room) {
  return {
    ...room,
    buildingId: room.buildingId ?? "hai-dang-house",
    ownerName: room.ownerName ?? "Hải Đăng House",
    ownerNote: room.ownerNote ?? "Chủ nhà hỗ trợ xem phòng và phản hồi yêu cầu đặt cọc trong giờ hành chính.",
    houseRules: room.houseRules ?? [
      "Giữ yên tĩnh sau 22:00.",
      "Không tự ý cải tạo kết cấu phòng.",
      "Thông báo trước khi nuôi thú cưng hoặc ở thêm người.",
    ],
    amenities: room.amenities?.length ? room.amenities : ["Wifi tốc độ cao", "Điều hòa", "Bình nóng lạnh", "Máy giặt"],
    buildingFacilities: room.buildingFacilities?.length ? room.buildingFacilities : ["An ninh 24/7", "Camera giám sát", "Bãi xe"],
  };
}

function BookingCard({ room }) {
  const isAvailable = room.status === "available";
  const isDeposited = room.status === "deposited";
  const isOccupied = room.status === "occupied";
  const roomLabel = room.roomCode || room.name || room.id;
  const tomorrowDate = getTomorrowDateString();
  const [isViewingModalOpen, setIsViewingModalOpen] = useState(false);
  const [viewingForm, setViewingForm] = useState({
    fullName: "",
    phone: "",
    viewingDate: "",
    viewingTime: "",
  });
  const [viewingErrors, setViewingErrors] = useState({});

  // Hàm helper lấy class màu sắc theo trạng thái
  const getStatusClass = () => {
    if (isAvailable) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (isDeposited) return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-50 text-slate-600";
  };

  const handleViewingFormChange = (event) => {
    const { name, value } = event.target;
    setViewingForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (name === "viewingDate") {
      validateViewingDate(value);
    }
  };

  const closeViewingModal = () => {
    setIsViewingModalOpen(false);
  };

  const validateViewingDate = (value) => {
    const hasError = Boolean(value) && value < tomorrowDate;
    setViewingErrors((currentErrors) => ({
      ...currentErrors,
      viewingDate: hasError ? DATE_ERROR_MESSAGE : "",
    }));
    return !hasError;
  };

  const handleViewingDateInvalid = (event) => {
    if (event.target.validity.rangeUnderflow) {
      setViewingErrors((currentErrors) => ({
        ...currentErrors,
        viewingDate: DATE_ERROR_MESSAGE,
      }));
    }
  };

  const handleViewingSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const isViewingDateValid = validateViewingDate(viewingForm.viewingDate);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!isViewingDateValid) {
      return;
    }

    try {
      const appointmentAt = combineAppointmentParts(viewingForm.viewingDate, viewingForm.viewingTime);
      console.log("Current room object:", room);
      const payload = {
        fullName: viewingForm.fullName,
        phone: viewingForm.phone,
        propertyId: room.buildingId, // Numeric ID or code map
        roomId: room.roomId,         // Numeric ID
        appointmentAt,
        note: `Yêu cầu từ trang chi tiết phòng ${roomLabel}`,
      };
      console.log("Submitting payload:", payload);

      await publicCreateViewingCustomer(payload);
      alert("Yêu cầu xem phòng của bạn đã được gửi thành công! Chúng tôi sẽ liên hệ lại sớm nhất.");
      closeViewingModal();
    } catch (error) {
      alert("Có lỗi xảy ra: " + (error.message || "Không thể gửi yêu cầu."));
    }
  };

  return (
    <aside className="h-fit lg:sticky lg:top-28">
      <div className="rounded-[24px] border border-slate-100 bg-white p-6 text-[#091426] shadow-xl shadow-slate-100/50 ring-1 ring-slate-100/80 sm:p-8">
        <div className="border-b border-slate-100 pb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Giá thuê</p>
          <div className="flex flex-col">
  <p className="text-3xl font-black text-[#006c49]">
    {room.priceLabel}
  </p>

  <span className="text-sm font-semibold text-slate-500">
    VND/tháng
  </span>
</div>
        </div>

        <div className="mt-6">
          {/* Thanh trạng thái động */}
          <div className={`mb-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${getStatusClass()}`}>
            <span className={`h-2 w-2 rounded-full ${isAvailable ? "bg-emerald-500" : isDeposited ? "bg-amber-500" : "bg-slate-400"}`} />
            {isAvailable && "Còn trống - Sẵn sàng vào ở"}
            {isDeposited && "Đang giữ chỗ - Tạm khóa 15 phút"}
            {isOccupied && "Đã thuê - Không còn trống"}
          </div>

          <div className="grid gap-3">
            {isAvailable ? (
              <Link
                href={`/rooms/deposit?roomId=${room.id}`}
                className="flex min-h-14 items-center justify-center gap-2 rounded-[16px] bg-[#232946] px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-[#232946]/20 transition hover:bg-[#091426] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/25"
              >
                Gửi yêu cầu đặt cọc
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className={`rounded-[16px] border px-4 py-4 text-center text-sm font-bold leading-relaxed ${
                isDeposited ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-500"
              }`}>
                {isDeposited ? "Phòng đang được giữ chỗ, chưa thể gửi thêm yêu cầu đặt cọc." : "Phòng đã được thuê, vui lòng chọn phòng khác."}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsViewingModalOpen(true)}
              className="flex min-h-14 items-center justify-center rounded-[16px] border border-[#232946]/20 bg-white px-4 py-3 text-center text-sm font-bold text-[#232946] shadow-sm transition hover:border-[#232946]/40 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/20"
            >
              Đặt lịch xem phòng
            </button>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <a
                href={CONTACT_PHONE_HREF}
                className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-[#232946] transition hover:border-[#232946] hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/25"
              >
                <Phone className="h-4 w-4 shrink-0" />
                Gọi điện
              </a>
              <a
                href={CONTACT_ZALO_HREF}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-blue-600 bg-blue-50 px-3 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                Chat Zalo
              </a>
            </div>
          </div>
        </div>
      </div>

      {isViewingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm"
          onClick={closeViewingModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="viewing-modal-title"
            className="max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-[24px] border border-slate-100 bg-white p-6 text-[#091426] shadow-2xl shadow-slate-950/20 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Xem phòng</p>
                <h2 id="viewing-modal-title" className="mt-2 text-2xl font-bold tracking-tight">
                  Điền thông tin khách đến xem phòng
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Chủ nhà sẽ liên hệ xác nhận lịch hẹn theo thông tin bạn gửi.
                </p>
              </div>
              <button
                type="button"
                onClick={closeViewingModal}
                aria-label="Đóng pop-up đặt lịch xem phòng"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-7 grid gap-5" onSubmit={handleViewingSubmit}>
              <div className="grid gap-2">
                <label htmlFor="viewing-full-name" className="text-sm font-medium text-slate-700">
                  Họ và tên
                </label>
                <input
                  id="viewing-full-name"
                  name="fullName"
                  type="text"
                  required
                  value={viewingForm.fullName}
                  onChange={handleViewingFormChange}
                  className="min-h-12 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập họ và tên"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="viewing-phone" className="text-sm font-medium text-slate-700">
                  Số điện thoại
                </label>
                <input
                  id="viewing-phone"
                  name="phone"
                  type="tel"
                  required
                  value={viewingForm.phone}
                  onChange={handleViewingFormChange}
                  className="min-h-12 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập số điện thoại"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="viewing-room" className="text-sm font-medium text-slate-700">
                  Số phòng
                </label>
                <input
                  id="viewing-room"
                  type="text"
                  disabled
                  value={roomLabel}
                  className="min-h-12 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="viewing-date" className="text-sm font-medium text-slate-700">
                    Ngày xem phòng
                  </label>
                  <input
                    id="viewing-date"
                    name="viewingDate"
                    type="date"
                    required
                    min={tomorrowDate}
                    value={viewingForm.viewingDate}
                    onChange={handleViewingFormChange}
                    onInvalid={handleViewingDateInvalid}
                    aria-invalid={viewingErrors.viewingDate ? "true" : "false"}
                    className={`min-h-12 rounded-[14px] border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 ${
                      viewingErrors.viewingDate
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />
                  {viewingErrors.viewingDate && (
                    <p className="text-xs font-medium text-rose-600">{viewingErrors.viewingDate}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="viewing-time" className="text-sm font-medium text-slate-700">
                    Giờ xem phòng
                  </label>
                  <input
                    id="viewing-time"
                    name="viewingTime"
                    type="time"
                    required
                    value={viewingForm.viewingTime}
                    onChange={handleViewingFormChange}
                    className="min-h-12 rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="submit"
                  className="flex min-h-12 items-center justify-center rounded-[14px] bg-[#232946] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#232946]/20 transition hover:bg-[#091426] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/25"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={closeViewingModal}
                  className="flex min-h-12 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}

export function RoomDetailPageClient({ roomId }) {
  const [room, setRoom] = useState(null);
  const [activeImage, setActiveImage] = useState("");
  const [roomHolds, setRoomHolds] = useState(() => getActiveRoomHolds());
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      try {
        setIsLoading(true);
        const apiRoom = await fetchPublicRoomById(roomId);
        const fallbackRoom = findRoomById(roomId);
        const currentRoomHolds = getActiveRoomHolds();
        const nextRoom = apiRoom ? normalizeApiRoom(apiRoom, currentRoomHolds) : fallbackRoom.id === roomId ? withDetailDefaults(fallbackRoom) : null;

        if (!isMounted) return;
        if (!nextRoom) throw new Error("Room not found");
        setRoom(nextRoom);
        setActiveImage(nextRoom.images?.[0] ?? nextRoom.image);
        setIsError(false);
      } catch {
        if (isMounted) setIsError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRoomHolds(getActiveRoomHolds());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const displayRoom = useMemo(() => {
    if (!room) return null;

    return {
      ...room,
      status: roomHolds[room.id] && room.status === "available" ? "deposited" : room.status,
      holdExpiresAt: roomHolds[room.id]?.expiresAt,
    };
  }, [room, roomHolds]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#091426] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[7fr_3fr]">
          <div className="h-[460px] animate-pulse rounded-[2rem] bg-white/10" />
          <div className="h-[520px] animate-pulse rounded-[20px] bg-white/10" />
        </div>
      </div>
    );
  }

  if (isError || !displayRoom) {
    return (
      <div className="min-h-screen bg-[#091426] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-rose-300/20 bg-rose-400/10 p-6 text-center text-rose-100">
          Không thể tải thông tin phòng. Vui lòng quay lại danh sách phòng và thử lại.
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#091426] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/rooms" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách phòng
        </Link>

        {/* Khối nền trắng bao bọc toàn bộ nội dung */}
        <div className="rounded-[32px] bg-white p-4 shadow-2xl shadow-black/20 sm:p-6 lg:p-8">
          
          {/* Chia layout 2 cột: 70% - 30% */}
          <div className="grid gap-8 lg:grid-cols-[7fr_3fr]">
            
            {/* Cột trái (70%) */}
            <div className="min-w-0 space-y-8">
              
              {/* Box Ảnh */}
              <section className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
                <div className="relative aspect-[16/10] min-h-[280px] bg-slate-900">
                  <Image
                    src={activeImage || displayRoom.image}
                    alt={`Ảnh thực tế phòng ${displayRoom.id}`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 720px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80">
                      <Home className="h-4 w-4" />
                      Hải Đăng House
                    </p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Phòng {displayRoom.id}</h1>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 bg-white p-4 sm:p-5">
                  {displayRoom.images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(image)}
                      aria-label={`Xem ảnh phòng ${index + 1}`}
                      className={`relative aspect-[4/3] overflow-hidden rounded-xl border transition ${
                        activeImage === image ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300"
                      }`}
                    >
                      <Image src={image} alt={`Ảnh ${index + 1} phòng ${displayRoom.id}`} fill sizes="160px" className="object-cover" />
                    </button>
                  ))}
                </div>
              </section>

              {/* 3 Khối Thông số */}
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard icon={Maximize2} label="Diện tích" value={`${displayRoom.area}m²`} />
                <MetricCard icon={Users} label="Tối đa" value={`${displayRoom.maxPeople} người`} />
                <MetricCard icon={Building2} label="Tầng" value={`T${displayRoom.floorNumber}`} />
              </div>

              {/* Các thông tin chi tiết */}
              <div className="space-y-6">
                <DetailSection title="Mô tả không gian">
                  <p>{displayRoom.description}</p>
                </DetailSection>

                <DetailSection title="Thông tin chủ nhà">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[16px] border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Đơn vị quản lý</p>
                      <p className="mt-1 font-bold text-[#091426]">{displayRoom.ownerName}</p>
                    </div>
                    <div className="rounded-[16px] border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Hỗ trợ</p>
                      <p className="mt-1 font-bold text-[#091426]">Xem phòng và đặt cọc</p>
                    </div>
                  </div>
                  <p className="mt-5">{displayRoom.ownerNote}</p>
                </DetailSection>

                <DetailSection title="Nội quy phòng">
                  <div className="grid gap-3">
                    {displayRoom.houseRules.map((rule) => (
                      <div key={rule} className="flex items-start gap-3 rounded-[16px] border border-slate-100 bg-slate-50 px-5 py-4">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                        <span className="text-slate-700">{rule}</span>
                      </div>
                    ))}
                  </div>
                </DetailSection>

                <DetailSection title="Tiện ích đi kèm">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {displayRoom.amenities.map((amenity) => (
                      <div key={amenity} className="flex min-h-14 items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-500" />
                        {amenity}
                      </div>
                    ))}
                    {displayRoom.buildingFacilities.map((facility) => (
                      <div key={facility} className="flex min-h-14 items-center gap-3 rounded-[16px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                        <Wifi className="h-5 w-5 shrink-0 text-blue-500" />
                        {facility}
                      </div>
                    ))}
                  </div>
                </DetailSection>
              </div>
            </div>

            {/* Cột phải (30%) */}
            <BookingCard room={displayRoom} />
          </div>
        </div>
      </div>
    </main>
  );
}
