"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Home,
  Maximize2,
  PhoneCall,
  ShieldCheck,
  Users,
  Wifi,
  X,
} from "lucide-react";
import {
  CONTACT_PHONE_HREF,
  CONTACT_ZALO_HREF,
  LANDLORD_CONTACT_PHONE,
  fetchDepositRoomHoldStatus,
  fetchPublicRoomById,
  normalizeApiRoom,
  normalizeRoomImages,
  ROOM_PLACEHOLDER_IMAGE,
} from "../../../../services/roomsService";
import {
  combineAppointmentParts,
  publicCreateViewingCustomer,
} from "../../../../services/viewingCustomersService";
import {
  formatHoldCountdown,
  getActiveRoomHolds,
} from "../../../../lib/roomHoldStorage";
import { formatDate } from "../../../../lib/dateFormat";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { DateInput } from "@/components/DateInput";

const normalizeHoldStatus = (status) => {
  if (!status) return null;
  const remainingSeconds = Number(
    status.remainingSeconds ?? status.remaining_seconds ?? 0,
  );

  return {
    canBook: Boolean(status.canBook ?? status.can_book),
    roomStatus: status.roomStatus ?? status.room_status ?? "",
    holdStatus: status.holdStatus ?? status.hold_status ?? null,
    holdExpiresAt: status.holdExpiresAt ?? status.hold_expires_at ?? null,
    remainingMs: Number.isFinite(remainingSeconds)
      ? Math.max(0, remainingSeconds * 1000)
      : 0,
    message: status.message ?? "",
  };
};

const dateToLocalIso = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateToLocalIso(tomorrow);
};

const addDaysToDateString = (value, days) => {
  const text = String(value || "").slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";

  const [, rawYear, rawMonth, rawDay] = match;
  const date = new Date(Number(rawYear), Number(rawMonth) - 1, Number(rawDay));
  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + days);
  return dateToLocalIso(date);
};

const getLatestDateString = (...values) => {
  return values.filter(Boolean).sort().at(-1) || "";
};

const formatShortDate = (value) => {
  return formatDate(value, "");
};

const VIEWING_DATE_ERROR_MESSAGE = "Ngày chọn phải bắt đầu từ ngày mai trở đi.";
const REQUIRED_MESSAGES = {
  fullName: "Vui lòng nhập họ và tên.",
  phone: "Vui lòng nhập số điện thoại.",
  viewingDate: "Vui lòng chọn ngày xem phòng.",
  viewingTime: "Vui lòng chọn giờ xem phòng.",
};
const FULL_NAME_PATTERN = /^[\p{L}\s]+$/u;
const VIETNAM_PHONE_PATTERN = /^0\d{9}$/;

function DetailSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-900 shadow-2xs sm:p-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-5 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}

function RequiredLabel({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
      {children} <span className="text-rose-600">*</span>
    </label>
  );
}

function ZaloLogo({ className = "" }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="12" fill="#0068FF" />
      <path
        d="M8.8 25.2C8.8 15.3 17.4 8 28.1 8h.6C38.3 8.3 45 14.9 45 24.1c0 9.9-8.2 16.8-19.2 16.8-2.4 0-4.8-.3-7-1L9.9 43.2l3.1-7.8c-3-2.7-4.2-6.1-4.2-10.2Z"
        fill="#fff"
      />
      <path
        d="M14.6 30.7h8.9v-2.4h-5.2l5-6.4v-2.2h-8.1v2.4h4.7l-5.3 6.7v2Zm14.3.1c1.2 0 2.2-.4 2.9-1.2v1h2.6v-7.9h-2.6v1c-.7-.8-1.7-1.2-2.9-1.2-2.2 0-4 1.8-4 4.1s1.8 4.2 4 4.2Zm.6-2.3c-1.1 0-1.9-.8-1.9-1.9s.8-1.9 1.9-1.9 1.9.8 1.9 1.9-.8 1.9-1.9 1.9Zm6.5 2.1h2.7V19.3H36v11.3Z"
        fill="#0068FF"
      />
    </svg>
  );
}

function formatContactPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return value || "0914 339 682";
}

function ContactInfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-4 last:border-b-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-black text-[#243247]">{value}</p>
      </div>
    </div>
  );
}

function ContactCard() {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-900 shadow-2xs">
      <h2 className="text-xl font-black">Thông Tin Liên Hệ</h2>

      <div className="mt-5">
        <ContactInfoRow
          icon={PhoneCall}
          label="Số điện thoại quản lý"
          value={formatContactPhone(LANDLORD_CONTACT_PHONE)}
        />
        <ContactInfoRow icon={Clock3} label="Thời gian hỗ trợ" value="24/7" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href={CONTACT_PHONE_HREF}
          className="flex min-h-12 items-center justify-center rounded-[14px] bg-blue-600 px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25"
        >
          Gọi điện
        </a>
        <a
          href={CONTACT_ZALO_HREF}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-blue-600 bg-white px-3 py-3 text-sm font-extrabold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25"
        >
          <ZaloLogo className="h-5 w-5 shrink-0" />
          Chat Zalo
        </a>
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium leading-5 text-slate-500">
        Quản lý sẽ hỗ trợ tư vấn phòng, lịch xem phòng, đặt cọc và ký hợp đồng
        thuê.
      </p>
    </div>
  );
}

function viewingInputClass(error) {
  return `min-h-12 rounded-[14px] border bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    error
      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
  }`;
}

function withDetailDefaults(room) {
  return {
    ...room,
    buildingId: room.buildingId ?? "hai-dang-house",
    ownerName: room.ownerName ?? "Hải Đăng House",
    ownerNote:
      room.ownerNote ??
      "Chủ nhà hỗ trợ xem phòng và phản hồi yêu cầu đặt cọc trong giờ hành chính.",
    houseRules: room.houseRules ?? [
      "Giữ yên tĩnh sau 22:00.",
      "Không tự ý cải tạo kết cấu phòng.",
      "Thông báo trước khi nuôi thú cưng hoặc ở thêm người.",
    ],
    amenities: room.amenities?.length
      ? room.amenities
      : ["Wifi tốc độ cao", "Điều hòa", "Bình nóng lạnh", "Máy giặt"],
    buildingFacilities: room.buildingFacilities?.length
      ? room.buildingFacilities
      : ["An ninh 24/7", "Camera giám sát", "Bãi xe"],
  };
}

function BookingCard({ room }) {
  const [remainingMs, setRemainingMs] = useState(
    Math.max(0, room.holdRemainingMs ?? 0),
  );
  const hasActiveHold = room.status === "onHold" && remainingMs > 0;
  const effectiveStatus =
    room.status === "onHold" && !hasActiveHold ? "available" : room.status;
  const isAvailable = effectiveStatus === "available";
  const isSoonVacant = effectiveStatus === "soonVacant";
  const isBookable = isAvailable || isSoonVacant;
  const isOnHold = effectiveStatus === "onHold";
  const isDeposited = effectiveStatus === "deposited";
  const isOccupied = effectiveStatus === "occupied";
  const isDraft = effectiveStatus === "draft";
  const holdCountdownLabel = formatHoldCountdown(remainingMs);
  const isCountdownActive = room.status === "onHold" && remainingMs > 0;
  const roomLabel = room.roomCode || room.name || room.id;
  const vacantDateLabel = formatShortDate(room.expectedVacantDate);
  const tomorrowDate = getTomorrowDateString();
  const soonVacantViewingDate = isSoonVacant
    ? addDaysToDateString(room.expectedVacantDate, 1)
    : "";
  const minViewingDate = isSoonVacant
    ? getLatestDateString(tomorrowDate, soonVacantViewingDate)
    : tomorrowDate;
  const viewingDateErrorMessage =
    isSoonVacant && soonVacantViewingDate
      ? `Phòng sắp trống chỉ nhận lịch xem từ ${formatShortDate(minViewingDate)} trở đi.`
      : VIEWING_DATE_ERROR_MESSAGE;
  const [isViewingModalOpen, setIsViewingModalOpen] = useState(false);
  const [viewingForm, setViewingForm] = useState({
    fullName: "",
    phone: "",
    viewingDate: "",
    viewingTime: "",
  });
  const [viewingErrors, setViewingErrors] = useState({});
  const [viewingNotice, setViewingNotice] = useState({ type: "", message: "" });
  const [isSubmittingViewing, setIsSubmittingViewing] = useState(false);

  useEffect(() => {
    const nextRemainingMs = Math.max(0, room.holdRemainingMs ?? 0);
    const syncTimer = window.setTimeout(() => {
      setRemainingMs(nextRemainingMs);
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [room.holdRemainingMs]);

  useEffect(() => {
    if (!isCountdownActive) {
      return undefined;
    }

    const countdownTimer = window.setInterval(() => {
      setRemainingMs((currentRemainingMs) =>
        Math.max(0, currentRemainingMs - 1000),
      );
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, [isCountdownActive]);

  // Hàm helper lấy class màu sắc theo trạng thái
  const getStatusClass = () => {
    if (isAvailable) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (isSoonVacant) return "border-orange-200 bg-orange-50 text-orange-700";
    if (isOnHold) return "border-amber-200 bg-amber-50 text-amber-700";
    if (isDeposited) return "border-orange-200 bg-orange-50 text-orange-700";
    if (isDraft) return "border-slate-200 bg-slate-50 text-slate-600";
    return "border-slate-200 bg-slate-50 text-slate-600";
  };

  const validateViewingField = (name, value) => {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return REQUIRED_MESSAGES[name] || "";
    }

    if (name === "fullName" && !FULL_NAME_PATTERN.test(normalizedValue)) {
      return "Họ và tên chỉ được chứa chữ cái và khoảng trắng.";
    }

    if (name === "phone" && !VIETNAM_PHONE_PATTERN.test(normalizedValue)) {
      return "Số điện thoại phải là số Việt Nam gồm 10 chữ số và bắt đầu bằng 0.";
    }

    if (name === "viewingDate" && normalizedValue < minViewingDate) {
      return viewingDateErrorMessage;
    }

    return "";
  };

  const validateAndSetViewingField = (name, value) => {
    const message = validateViewingField(name, value);
    setViewingErrors((currentErrors) => ({
      ...currentErrors,
      [name]: message,
    }));
    return !message;
  };

  const handleViewingFormChange = (event) => {
    const { name, value } = event.target;
    setViewingForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    validateAndSetViewingField(name, value);
  };

  const handleViewingFieldBlur = (event) => {
    const { name, value } = event.target;
    validateAndSetViewingField(name, value);
  };

  const closeViewingModal = () => {
    setIsViewingModalOpen(false);
    setViewingErrors({});
    setViewingNotice({ type: "", message: "" });
  };

  const handleViewingSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {
      fullName: validateViewingField("fullName", viewingForm.fullName),
      phone: validateViewingField("phone", viewingForm.phone),
      viewingDate: validateViewingField("viewingDate", viewingForm.viewingDate),
      viewingTime: validateViewingField("viewingTime", viewingForm.viewingTime),
    };
    setViewingErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSubmittingViewing(true);
    setViewingNotice({ type: "", message: "" });
    try {
      const appointmentAt = combineAppointmentParts(
        viewingForm.viewingDate,
        viewingForm.viewingTime,
      );
      const propertyId = room.propertyId ?? room.buildingId;
      const apiRoomId = room.roomId;
      if (!propertyId || !apiRoomId) {
        setViewingNotice({
          type: "error",
          message:
            "Không xác định được cơ sở hoặc phòng. Vui lòng quay lại danh sách phòng và thử lại.",
        });
        return;
      }

      const payload = {
        fullName: viewingForm.fullName.trim(),
        phone: viewingForm.phone.trim(),
        propertyId,
        roomId: apiRoomId,
        appointmentAt,
        note: `Yêu cầu từ trang chi tiết phòng ${roomLabel}`,
      };

      await publicCreateViewingCustomer(payload);
      setViewingForm({
        fullName: "",
        phone: "",
        viewingDate: "",
        viewingTime: "",
      });
      setViewingNotice({
        type: "success",
        message: "Đã gửi lịch xem phòng. Chủ nhà sẽ liên hệ xác nhận sớm nhất.",
      });
    } catch (error) {
      setViewingNotice({
        type: "error",
        message:
          error.message || "Không thể gửi yêu cầu xem phòng. Vui lòng thử lại.",
      });
    } finally {
      setIsSubmittingViewing(false);
    }
  };

  return (
    <aside className="h-fit lg:sticky lg:top-28">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-slate-900 shadow-2xs sm:p-8">
        <div className="border-b border-slate-100 pb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Giá thuê
          </p>
          <div className="flex flex-col">
            <p className="text-3xl font-black text-[#006c49]">
              {room.priceLabel}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {/* Thanh trạng thái động */}
          <div
            className={`mb-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${getStatusClass()}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isAvailable ? "bg-emerald-500" : isSoonVacant ? "bg-orange-500" : isOnHold ? "bg-amber-500" : isDeposited ? "bg-orange-500" : "bg-slate-400"}`}
            />
            {isAvailable && "Còn trống - Sẵn sàng vào ở"}
            {isSoonVacant &&
              `Sắp trống${vacantDateLabel ? ` từ ${vacantDateLabel}` : ""} - có thể đặt cọc theo ngày bàn giao`}
            {isOnHold && "Đang giữ chỗ"}
            {isDraft && "Bản nháp - Chưa mở cho thuê"}
            {isOccupied && "Đã thuê - Không còn trống"}
            {isDeposited && "Đã đặt cọc - Không còn trống"}
          </div>

          <div className="grid gap-3">
            {isBookable ? (
              <Link
                href={`/rooms/deposit?roomCode=${encodeURIComponent(room.roomCode || room.id)}&propertyId=${encodeURIComponent(room.propertyId ?? room.buildingId ?? "")}`}
                className="flex min-h-14 items-center justify-center gap-2 rounded-[16px] bg-[#232946] px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-[#232946]/20 transition hover:bg-[#091426] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/25"
              >
                Gửi yêu cầu đặt cọc
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div
                className={`rounded-[16px] border px-4 py-4 text-center text-sm font-bold leading-relaxed ${
                  isOnHold
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : isDeposited
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {isOnHold
                  ? `Phòng đang được giữ chỗ, vui lòng chờ ${holdCountdownLabel}.`
                  : isDraft
                    ? "Phòng đang ở trạng thái bản nháp, chưa mở đặt cọc."
                    : isDeposited
                      ? "Phòng đã được đặt cọc, vui lòng chọn phòng khác."
                      : "Phòng đã được thuê, vui lòng chọn phòng khác."}
              </div>
            )}

            {!isOccupied && !isDraft && (
              <button
                type="button"
                onClick={() => setIsViewingModalOpen(true)}
                className="flex min-h-14 items-center justify-center rounded-[16px] border border-[#232946]/20 bg-white px-4 py-3 text-center text-sm font-bold text-[#232946] shadow-sm transition hover:border-[#232946]/40 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/20"
              >
                Đặt lịch xem phòng
              </button>
            )}

            <div className="hidden">
              <a
                href={CONTACT_PHONE_HREF}
                className="flex min-h-12 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-[#232946] transition hover:border-[#232946] hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/25"
              >
                Gọi điện
              </a>
              <a
                href={CONTACT_ZALO_HREF}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-blue-600 bg-blue-50 px-3 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25"
              >
                <ZaloLogo className="h-5 w-5 shrink-0" />
                Chat Zalo
              </a>
            </div>
          </div>
        </div>
      </div>

      <ContactCard />

      {isViewingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
          onClick={closeViewingModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="viewing-modal-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[24px] border border-slate-100 bg-white p-5 text-[#091426] shadow-2xl shadow-slate-950/20 sm:max-h-[calc(100vh-3rem)] sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                  Xem phòng
                </p>
                <h2
                  id="viewing-modal-title"
                  className="mt-2 text-2xl font-bold tracking-tight"
                >
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

            {viewingNotice.message && (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  viewingNotice.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {viewingNotice.message}
              </div>
            )}

            <form
              className="mt-7 grid gap-5"
              onSubmit={handleViewingSubmit}
              noValidate
            >
              <div className="grid gap-2">
                <RequiredLabel htmlFor="viewing-full-name">
                  Họ và tên
                </RequiredLabel>
                <input
                  id="viewing-full-name"
                  name="fullName"
                  type="text"
                  value={viewingForm.fullName}
                  onChange={handleViewingFormChange}
                  onBlur={handleViewingFieldBlur}
                  aria-invalid={viewingErrors.fullName ? "true" : "false"}
                  aria-describedby={
                    viewingErrors.fullName
                      ? "viewing-full-name-error"
                      : undefined
                  }
                  className={viewingInputClass(viewingErrors.fullName)}
                  placeholder="Nhập họ và tên"
                />
                {viewingErrors.fullName && (
                  <p
                    id="viewing-full-name-error"
                    className="text-xs font-medium text-rose-600"
                  >
                    {viewingErrors.fullName}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <RequiredLabel htmlFor="viewing-phone">
                  Số điện thoại
                </RequiredLabel>
                <input
                  id="viewing-phone"
                  name="phone"
                  type="tel"
                  value={viewingForm.phone}
                  onChange={handleViewingFormChange}
                  onBlur={handleViewingFieldBlur}
                  inputMode="numeric"
                  maxLength={10}
                  aria-invalid={viewingErrors.phone ? "true" : "false"}
                  aria-describedby={
                    viewingErrors.phone ? "viewing-phone-error" : undefined
                  }
                  className={viewingInputClass(viewingErrors.phone)}
                  placeholder="Nhập số điện thoại"
                />
                {viewingErrors.phone && (
                  <p
                    id="viewing-phone-error"
                    className="text-xs font-medium text-rose-600"
                  >
                    {viewingErrors.phone}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="viewing-room"
                  className="text-sm font-medium text-slate-700"
                >
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
                  <RequiredLabel htmlFor="viewing-date">
                    Ngày xem phòng
                  </RequiredLabel>
                  <DateInput
                    id="viewing-date"
                    name="viewingDate"
                    min={minViewingDate}
                    value={viewingForm.viewingDate}
                    onChange={handleViewingFormChange}
                    onBlur={handleViewingFieldBlur}
                    aria-invalid={viewingErrors.viewingDate ? "true" : "false"}
                    aria-describedby={
                      viewingErrors.viewingDate
                        ? "viewing-date-error"
                        : undefined
                    }
                    className={viewingInputClass(viewingErrors.viewingDate)}
                  />
                  {viewingErrors.viewingDate && (
                    <p
                      id="viewing-date-error"
                      className="text-xs font-medium text-rose-600"
                    >
                      {viewingErrors.viewingDate}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <RequiredLabel htmlFor="viewing-time">
                    Giờ xem phòng
                  </RequiredLabel>
                  <input
                    id="viewing-time"
                    name="viewingTime"
                    type="time"
                    value={viewingForm.viewingTime}
                    onChange={handleViewingFormChange}
                    onBlur={handleViewingFieldBlur}
                    aria-invalid={viewingErrors.viewingTime ? "true" : "false"}
                    aria-describedby={
                      viewingErrors.viewingTime
                        ? "viewing-time-error"
                        : undefined
                    }
                    className={viewingInputClass(viewingErrors.viewingTime)}
                  />
                  {viewingErrors.viewingTime && (
                    <p
                      id="viewing-time-error"
                      className="text-xs font-medium text-rose-600"
                    >
                      {viewingErrors.viewingTime}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="submit"
                  disabled={isSubmittingViewing}
                  className="flex min-h-12 items-center justify-center rounded-[14px] bg-[#232946] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#232946]/20 transition hover:bg-[#091426] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/25 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingViewing ? "Đang gửi..." : "Xác nhận"}
                </button>
                <button
                  type="button"
                  onClick={closeViewingModal}
                  disabled={isSubmittingViewing}
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

export function RoomDetailPageClient({ buildingId, roomId }) {
  const [room, setRoom] = useState(null);
  const [activeImage, setActiveImage] = useState("");
  const galleryImages = useMemo(() => normalizeRoomImages(room ?? {}), [room]);
  const displayActiveImage = galleryImages.includes(activeImage)
    ? activeImage
    : (galleryImages[0] ?? ROOM_PLACEHOLDER_IMAGE);
  const [roomHolds, setRoomHolds] = useState(() => getActiveRoomHolds());
  const [serverHoldStatus, setServerHoldStatus] = useState(null);
  const [nowMs, setNowMs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      try {
        setIsLoading(true);
        const apiRoom = await fetchPublicRoomById(roomId, {
          propertyId: buildingId,
        });
        const nextRoom = apiRoom ? normalizeApiRoom(apiRoom) : null;

        if (!isMounted) return;
        if (!nextRoom) throw new Error("Room not found");
        setRoom(nextRoom);

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
  }, [buildingId, roomId]);

  useEffect(() => {
    const refreshLocalHolds = () => {
      const nextTime = Date.now();
      setNowMs(nextTime);
      setRoomHolds(getActiveRoomHolds(nextTime));
    };

    const initialTimer = window.setTimeout(refreshLocalHolds, 0);
    const timer = window.setInterval(refreshLocalHolds, 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!room) return undefined;

    let isMounted = true;
    const roomIdentifier = room.roomId ?? room.roomCode ?? room.id;

    const refreshHoldStatus = async () => {
      try {
        const status = await fetchDepositRoomHoldStatus(roomIdentifier);
        if (isMounted) setServerHoldStatus(normalizeHoldStatus(status));
      } catch {
        if (isMounted) setServerHoldStatus(null);
      }
    };

    refreshHoldStatus();
    const pollingTimer = window.setInterval(refreshHoldStatus, 2000);
    return () => {
      isMounted = false;
      window.clearInterval(pollingTimer);
    };
  }, [room]);

  useEffect(() => {
    if (
      !serverHoldStatus ||
      serverHoldStatus.canBook ||
      serverHoldStatus.remainingMs <= 0
    ) {
      return undefined;
    }

    const countdownTimer = window.setInterval(() => {
      setServerHoldStatus((currentStatus) => {
        if (!currentStatus || currentStatus.canBook) return currentStatus;
        const nextRemainingMs = Math.max(0, currentStatus.remainingMs - 1000);
        return {
          ...currentStatus,
          canBook: nextRemainingMs <= 0 ? true : currentStatus.canBook,
          remainingMs: nextRemainingMs,
        };
      });
    }, 1000);

    return () => window.clearInterval(countdownTimer);
  }, [serverHoldStatus]);

  const displayRoom = useMemo(() => {
    if (!room) return null;
    const localHold = roomHolds[room.id];
    const serverRoomStatus = String(
      serverHoldStatus?.roomStatus || "",
    ).toUpperCase();
    const hasServerHold =
      serverHoldStatus &&
      !serverHoldStatus.canBook &&
      serverHoldStatus.remainingMs > 0;
    const isServerDraft = serverRoomStatus === "DRAFT";
    const isServerReserved = serverRoomStatus === "RESERVED";
    const isServerOccupied = serverRoomStatus === "OCCUPIED";
    const isServerVacant = serverRoomStatus === "VACANT";
    const isServerSoonVacant = serverRoomStatus === "SOON_VACANT";
    const isServerBookable =
      serverHoldStatus?.canBook === true &&
      (isServerVacant || isServerSoonVacant);
    const isExpiredHold =
      serverHoldStatus &&
      !serverHoldStatus.canBook &&
      serverHoldStatus.remainingMs <= 0;
    const localRemainingMs =
      localHold && nowMs ? Math.max(0, Number(localHold.expiresAt) - nowMs) : 0;
    const hasLocalHold = Boolean(localHold && localRemainingMs > 0);

    return {
      ...room,
      status: isServerDraft
        ? "draft"
        : isServerReserved || room.status === "deposited"
          ? "deposited"
          : isServerOccupied || room.status === "occupied"
            ? "occupied"
            : isServerBookable || (isExpiredHold && isServerVacant)
              ? isServerSoonVacant
                ? "soonVacant"
                : "available"
              : hasServerHold ||
                  (hasLocalHold &&
                    (room.status === "available" ||
                      room.status === "soonVacant"))
                ? "onHold"
                : isServerSoonVacant
                  ? "soonVacant"
                  : room.status,
      holdExpiresAt: serverHoldStatus?.holdExpiresAt ?? localHold?.expiresAt,
      holdRemainingMs: hasServerHold
        ? serverHoldStatus.remainingMs
        : localRemainingMs,
    };
  }, [nowMs, room, roomHolds, serverHoldStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 text-slate-900 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[7fr_3fr]">
          <div className="h-[460px] animate-pulse rounded-2xl border border-slate-200/80 bg-white shadow-2xs" />
          <div className="h-[520px] animate-pulse rounded-2xl border border-slate-200/80 bg-white shadow-2xs" />
        </div>
      </div>
    );
  }

  if (isError || !displayRoom) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 text-slate-900 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-800 shadow-2xs">
          Không thể tải thông tin phòng. Vui lòng quay lại danh sách phòng và
          thử lại.
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 text-slate-900 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
      <div className="mx-auto w-full max-w-[1440px]">
        <Link
          href="/rooms"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách phòng
        </Link>

        {/* Layout nội dung đồng bộ với trang danh sách phòng */}
        <div className="contents">
          {/* Chia layout 2 cột: 70% - 30% */}
          <div className="grid gap-8 lg:grid-cols-[7fr_3fr]">
            {/* Cột trái (70%) */}
            <div className="min-w-0 space-y-8">
              {/* Box Ảnh */}
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                <div className="relative aspect-[16/10] min-h-[280px] bg-slate-900">
                  <Image
                    src={displayActiveImage || ROOM_PLACEHOLDER_IMAGE}
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
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      Phòng {displayRoom.id}
                    </h1>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 bg-white p-4 sm:p-5">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(image)}
                      aria-label={`Xem ảnh phòng ${index + 1}`}
                      className={`relative aspect-[4/3] overflow-hidden rounded-xl border transition ${
                        displayActiveImage === image
                          ? "border-blue-500 ring-2 ring-blue-500/30"
                          : "border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Ảnh ${index + 1} phòng ${displayRoom.id}`}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </section>

              {/* 3 Khối Thông số */}
              <div className="grid gap-4 sm:grid-cols-3">
                <DashboardStatCard
                  icon={Maximize2}
                  label="Diện tích"
                  value={
                    displayRoom.area ? `${displayRoom.area}m²` : "Chưa cập nhật"
                  }
                  tone="blue"
                />
                <DashboardStatCard
                  icon={Users}
                  label="Tối đa"
                  value={
                    displayRoom.maxPeople
                      ? `${displayRoom.maxPeople} người`
                      : "Chưa cập nhật"
                  }
                  tone="blue"
                />
                <DashboardStatCard
                  icon={Building2}
                  label="Tầng"
                  value={
                    displayRoom.floorNumber
                      ? `T${displayRoom.floorNumber}`
                      : "Chưa cập nhật"
                  }
                  tone="blue"
                />
              </div>

              {/* Các thông tin chi tiết */}
              <div className="space-y-6">
                <DetailSection title="Mô tả không gian">
                  <p>{displayRoom.description}</p>
                </DetailSection>

                <DetailSection title="Thông tin chủ nhà">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[16px] border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Đơn vị quản lý
                      </p>
                      <p className="mt-1 font-bold text-[#091426]">
                        {displayRoom.ownerName}
                      </p>
                    </div>
                    <div className="rounded-[16px] border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Hỗ trợ
                      </p>
                      <p className="mt-1 font-bold text-[#091426]">
                        Xem phòng và đặt cọc
                      </p>
                    </div>
                  </div>
                  <p className="mt-5">{displayRoom.ownerNote}</p>
                </DetailSection>

                <DetailSection title="Nội quy phòng">
                  <div className="grid gap-3">
                    {displayRoom.houseRules.map((rule) => (
                      <div
                        key={rule}
                        className="flex items-start gap-3 rounded-[16px] border border-slate-100 bg-slate-50 px-5 py-4"
                      >
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                        <span className="text-slate-700">{rule}</span>
                      </div>
                    ))}
                  </div>
                </DetailSection>

                <DetailSection title="Tiện ích đi kèm">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {displayRoom.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex min-h-14 items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-500" />
                        {amenity}
                      </div>
                    ))}
                    {displayRoom.buildingFacilities.map((facility) => (
                      <div
                        key={facility}
                        className="flex min-h-14 items-center gap-3 rounded-[16px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
                      >
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
