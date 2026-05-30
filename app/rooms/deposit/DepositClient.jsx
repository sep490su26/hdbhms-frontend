"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Home,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  Upload,
  Wifi,
} from "lucide-react";
import { ROOM_HOLD_DURATION_MS, clearRoomHold, createRoomHold, formatHoldCountdown } from "../../../lib/roomHoldStorage";
import {
  cancelDepositPayment,
  checkoutDeposit,
  confirmMockPayment,
  fetchDepositRoomHoldStatus,
} from "../../../services/roomsService";

const resolvePaymentExpiresAtMs = (paymentIntent) => {
  const expiresAt = paymentIntent?.expiresAt ?? paymentIntent?.expires_at;
  if (!expiresAt) return null;

  const parsed = new Date(expiresAt).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeHoldStatus = (status) => {
  if (!status) return null;

  const remainingSeconds = Number(status.remainingSeconds ?? status.remaining_seconds ?? 0);

  return {
    canBook: Boolean(status.canBook ?? status.can_book),
    roomStatus: status.roomStatus ?? status.room_status ?? "",
    holdStatus: status.holdStatus ?? status.hold_status ?? null,
    holdExpiresAt: status.holdExpiresAt ?? status.hold_expires_at ?? null,
    remainingSeconds: Number.isFinite(remainingSeconds) ? remainingSeconds : 0,
    message: status.message ?? "",
  };
};

const toBlockingStatus = (status) => {
  const normalizedStatus = normalizeHoldStatus(status);
  if (!normalizedStatus || normalizedStatus.canBook) return null;

  return {
    ...normalizedStatus,
    remainingMs: Math.max(0, normalizedStatus.remainingSeconds * 1000),
  };
};

const toBlockingStatusFromMessage = (message) => {
  const text = String(message || "");
  const match = text.match(/(\d+)\s*giây/i);
  if (!match) return null;

  const remainingSeconds = Number(match[1]);
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) return null;

  return {
    canBook: false,
    roomStatus: "ON_HOLD",
    holdStatus: "ACTIVE",
    remainingSeconds,
    remainingMs: remainingSeconds * 1000,
    message: text,
  };
};

const DATE_ERROR_MESSAGE = "Ngày chọn phải bắt đầu từ ngày mai trở đi.";

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

const REQUIRED_DEPOSIT_MESSAGES = {
  fullName: "Vui lòng nhập họ và tên.",
  birthDate: "Vui lòng chọn ngày sinh.",
  phone: "Vui lòng nhập số điện thoại.",
  citizenId: "Vui lòng nhập số CCCD.",
  idIssueDate: "Vui lòng chọn ngày cấp CCCD.",
  idIssuePlace: "Vui lòng nhập nơi cấp CCCD.",
  permanentAddress: "Vui lòng nhập địa chỉ thường trú.",
  contractDate: "Vui lòng chọn ngày hẹn ký hợp đồng.",
  moveInDate: "Vui lòng chọn ngày dự kiến vào ở.",
  citizenIdFront: "Vui lòng tải lên ảnh mặt trước CCCD.",
  citizenIdBack: "Vui lòng tải lên ảnh mặt sau CCCD.",
  portraitImage: "Vui lòng tải lên ảnh chân dung.",
  terms: "Vui lòng xác nhận cam kết thông tin.",
};

const FULL_NAME_PATTERN = /^[\p{L}\s]+$/u;
const VIETNAM_PHONE_PATTERN = /^0\d{9}$/;
const CITIZEN_ID_PATTERN = /^\d{12}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DepositFormErrorContext = createContext({
  errors: {},
  setError: () => {},
});

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const validateDepositValue = (name, value) => {
  const normalizedValue = String(value || "").trim();
  const tomorrowDate = getTomorrowDateString();
  const todayDate = getTodayDateString();

  if (name !== "email" && !normalizedValue) {
    return REQUIRED_DEPOSIT_MESSAGES[name] || "";
  }

  if (name === "fullName" && !FULL_NAME_PATTERN.test(normalizedValue)) {
    return "Họ và tên chỉ được chứa chữ cái và khoảng trắng.";
  }

  if (name === "phone" && !VIETNAM_PHONE_PATTERN.test(normalizedValue)) {
    return "Số điện thoại phải là số Việt Nam gồm 10 chữ số và bắt đầu bằng 0.";
  }

  if (name === "email" && normalizedValue && !EMAIL_PATTERN.test(normalizedValue)) {
    return "Email không đúng định dạng.";
  }

  if (name === "citizenId" && !CITIZEN_ID_PATTERN.test(normalizedValue)) {
    return "Số CCCD phải gồm 12 chữ số.";
  }

  if (name === "birthDate" && normalizedValue > todayDate) {
    return "Ngày sinh không được lớn hơn ngày hiện tại.";
  }

  if (name === "idIssueDate" && normalizedValue > todayDate) {
    return "Ngày cấp CCCD không được lớn hơn ngày hiện tại.";
  }

  if ((name === "contractDate" || name === "moveInDate") && normalizedValue < tomorrowDate) {
    return DATE_ERROR_MESSAGE;
  }

  return "";
};

function Field({ label, name, placeholder, type = "text", className = "", required = true, min, error, onChange, onBlur }) {
  const { errors: formErrors, setError } = useContext(DepositFormErrorContext);
  const [localError, setLocalError] = useState("");
  const displayError = error || formErrors[name] || localError;

  const handleChange = (event) => {
    const message = validateDepositValue(name, event.target.value);
    setLocalError(message);
    setError(name, message);
    onChange?.(event);
  };

  const handleBlur = (event) => {
    const message = validateDepositValue(name, event.target.value);
    setLocalError(message);
    setError(name, message);
    onBlur?.(event);
  };

  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        min={min}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={displayError ? "true" : "false"}
        className={`h-[58px] rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:ring-2 ${displayError
          ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
          : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
          }`}
      />
      {displayError && <span className="text-xs font-medium text-rose-600">{displayError}</span>}
    </label>
  );
}

function FileUploadZone({ id, name, label, helperText, preview, onChange, required = true, error }) {
  const { errors: formErrors } = useContext(DepositFormErrorContext);
  const displayError = error || formErrors[name];

  return (
    <label
      htmlFor={id}
      className={`group flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-white px-4 py-5 text-center transition hover:border-[#091426] hover:bg-[#f5f3f4] ${
        displayError ? "border-rose-500 bg-rose-50/40" : "border-[#aeb1bb]"
      }`}
    >
      <input id={id} name={name} type="file" accept="image/*" className="sr-only" onChange={onChange} />
      {preview ? (
        <div className="relative h-28 w-40 overflow-hidden rounded-lg border border-[#c5c6cd] bg-[#f5f3f4]">
          <Image src={preview} alt={label} fill sizes="160px" className="object-cover" unoptimized />
        </div>
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef2ff] text-[#232946] transition group-hover:bg-[#e0e7ff]">
          <Upload className="h-5 w-5" />
        </span>
      )}
      <span className="mt-4 text-sm font-bold text-[#091426]">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      <span className="mt-1 max-w-xs text-xs leading-5 text-[#6b7280]">{helperText}</span>
      {displayError && <span className="mt-2 text-xs font-medium text-rose-600">{displayError}</span>}
      {preview && <span className="mt-3 text-xs font-semibold text-[#006c49]">Đã chọn ảnh, bấm để thay đổi</span>}
    </label>
  );
}

function SummaryLine({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-4 text-sm text-[#1b1b1d]">
      <Icon className="h-5 w-5 text-[#006c49]" />
      <span>{children}</span>
    </div>
  );
}

function RoomSummary({ room }) {
  return (
    <aside className="overflow-hidden rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
      <div className="relative h-48 overflow-hidden">
        <Image src={room.image} alt={`Phòng ${room.id}`} fill sizes="352px" className="object-cover" priority />
        <div className="absolute right-4 top-4 rounded-full bg-[#006c49] px-4 py-1.5 text-xs font-bold tracking-wide text-white shadow">
          Còn trống
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-[#091426]">Phòng {room.id}</h2>
          <p className="whitespace-nowrap text-right">
            <span className="text-xl font-bold text-[#006c49]">{(room.price / 1000000).toFixed(1)}M</span>
            <span className="text-sm text-[#45474c]"> /tháng</span>
          </p>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#45474c]">{room.description}</p>

        <div className="mt-7 border-t border-[#c5c6cd] pt-6">
          <div className="grid gap-4">
            <SummaryLine icon={Ruler}>{room.area} m²</SummaryLine>
            <SummaryLine icon={Wifi}>Wifi tốc độ cao</SummaryLine>
            <SummaryLine icon={ShieldCheck}>An ninh 24/7, camera giám sát</SummaryLine>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-[#c5c6cd] bg-[#f5f3f4] p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-[#091426]">Lưu ý đặt cọc</h3>
          <p className="mt-2 text-sm italic leading-6 text-[#45474c]">
            Yêu cầu đặt cọc sẽ được xử lý trong vòng 24h làm việc. Quý khách vui lòng kiểm tra email sau khi gửi yêu cầu.
          </p>
        </div>
      </div>
    </aside>
  );
}

function DepositInfoForm({ room, onSubmit, isSubmitting, blockingStatus }) {
  const tomorrowDate = getTomorrowDateString();
  const [fieldErrors, setFieldErrors] = useState({});
  const [imagePreviews, setImagePreviews] = useState({
    citizenIdFront: "",
    citizenIdBack: "",
    portraitImage: "",
  });
  const [selectedFiles, setSelectedFiles] = useState({
    citizenIdFront: null,
    citizenIdBack: null,
    portraitImage: null,
  });

  const setFieldError = (name, message) => {
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: message,
    }));
  };

  const validateDepositField = (name, value) => {
    return validateDepositValue(name, value);
  };

  const validateAndSetDepositField = (name, value) => {
    const message = validateDepositField(name, value);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: message,
    }));
    return !message;
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    validateAndSetDepositField(name, value);
  };

  const handleFieldBlur = (event) => {
    const { name, value } = event.target;
    validateAndSetDepositField(name, value);
  };

  const handleFileChange = (name) => (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setImagePreviews((prev) => ({ ...prev, [name]: "" }));
      setSelectedFiles((prev) => ({ ...prev, [name]: null }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [name]: REQUIRED_DEPOSIT_MESSAGES[name] || "",
      }));
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [name]: file }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreviews((prev) => ({ ...prev, [name]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const requiredFields = [
      "fullName",
      "birthDate",
      "phone",
      "citizenId",
      "idIssueDate",
      "idIssuePlace",
      "permanentAddress",
      "contractDate",
      "moveInDate",
    ];
    const nextErrors = {};

    [...requiredFields, "email"].forEach((fieldName) => {
      const message = validateDepositField(fieldName, data[fieldName]);
      if (message) nextErrors[fieldName] = message;
    });

    ["citizenIdFront", "citizenIdBack", "portraitImage"].forEach((fieldName) => {
      if (!selectedFiles[fieldName]) {
        nextErrors[fieldName] = REQUIRED_DEPOSIT_MESSAGES[fieldName];
      }
    });

    if (!data.terms) {
      nextErrors.terms = REQUIRED_DEPOSIT_MESSAGES.terms;
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (blockingStatus && !blockingStatus.canBook) {
      return;
    }

    const formData = new FormData();
    const metadata = {
      room_id: room.roomId || "",
      full_name: String(data.fullName).trim(),
      dob: data.birthDate,
      phone: String(data.phone).trim(),
      email: String(data.email || "").trim(),
      id_number: String(data.citizenId).trim(),
      id_issue_date: data.idIssueDate,
      id_issue_place: String(data.idIssuePlace).trim(),
      permanent_address: String(data.permanentAddress).trim(),
      expected_lease_sign_date: data.contractDate,
      expected_move_in_date: data.moveInDate,
    };

    // Chuẩn bị payload chuẩn theo backend yêu cầu
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    if (selectedFiles.citizenIdFront) formData.append("id_front_file", selectedFiles.citizenIdFront);
    if (selectedFiles.citizenIdBack) formData.append("id_back_file", selectedFiles.citizenIdBack);
    if (selectedFiles.portraitImage) formData.append("portrait_file", selectedFiles.portraitImage);

    onSubmit(formData, metadata);
  };

  return (
    <DepositFormErrorContext.Provider value={{ errors: fieldErrors, setError: setFieldError }}>
      <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-6 shadow-[0_4px_10px_rgba(9,20,38,0.04)] sm:p-8">
      <div>
        <h1 className="text-4xl font-bold tracking-[-0.02em] text-[#091426]">Thông tin đặt cọc</h1>
        <p className="mt-2 text-base leading-7 text-[#45474c]">
          Vui lòng hoàn thành các thông tin dưới đây để tiến hành giữ chỗ cho phòng {room.id}.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-x-6 gap-y-6 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Họ và tên" name="fullName" placeholder="Phạm Thèng C" />
        <Field label="Ngày sinh" name="birthDate" type="date" placeholder="mm/dd/yyyy" />
        <Field label="Số điện thoại" name="phone" type="tel" placeholder="0901 234 567" />
        <Field label="Email (không bắt buộc)" name="email" type="email" placeholder="example@gmail.com" required={false} />
        <Field label="Số CCCD" name="citizenId" placeholder="Số căn cước công dân" />
        <Field label="Ngày cấp" name="idIssueDate" type="date" placeholder="mm/dd/yyyy" />
        <Field label="Nơi cấp" name="idIssuePlace" placeholder="Cục CS QLHC về TTXH" />
        <Field className="sm:col-span-2" label="Địa chỉ thường trú" name="permanentAddress" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP" />
        <Field
          label="Ngày hẹn ký hợp đồng"
          name="contractDate"
          type="date"
          placeholder="mm/dd/yyyy"
          min={tomorrowDate}
          error={fieldErrors.contractDate}
          onChange={handleFieldChange}
          onBlur={handleFieldBlur}
        />
        <Field
          label="Ngày dự kiến vào ở"
          name="moveInDate"
          type="date"
          placeholder="mm/dd/yyyy"
          min={tomorrowDate}
          error={fieldErrors.moveInDate}
          onChange={handleFieldChange}
          onBlur={handleFieldBlur}
        />

        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <FileUploadZone
            id="citizen-id-front"
            name="citizenIdFront"
            label="Mặt trước CCCD"
            helperText="Mặt hiển thị ảnh và thông tin cá nhân."
            preview={imagePreviews.citizenIdFront}
            onChange={handleFileChange("citizenIdFront")}
          />
          <FileUploadZone
            id="citizen-id-back"
            name="citizenIdBack"
            label="Mặt sau CCCD"
            helperText="Mặt hiển thị vân tay và đặc điểm nhận dạng."
            preview={imagePreviews.citizenIdBack}
            onChange={handleFileChange("citizenIdBack")}
          />
          <div className="sm:col-span-2">
            <FileUploadZone
              id="portrait-image"
              name="portraitImage"
              label="Ảnh chân dung"
              helperText="Tải lên ảnh chân dung rõ mặt của khách thuê."
              preview={imagePreviews.portraitImage}
              onChange={handleFileChange("portraitImage")}
            />
          </div>
        </div>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">Ghi chú thêm (không bắt buộc)</span>
          <textarea
            name="note"
            rows={4}
            placeholder="Yêu cầu về nội thất hoặc thời gian nhận phòng..."
            className="rounded-lg border border-[#c5c6cd] bg-white px-4 py-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10"
          />
        </label>

        <label className="flex items-start gap-3 py-2 sm:col-span-2">
          <input
            type="checkbox"
            name="terms"
            required
            aria-invalid={fieldErrors.terms ? "true" : "false"}
            onChange={(event) => {
              if (event.target.checked) {
                setFieldErrors((currentErrors) => ({
                  ...currentErrors,
                  terms: "",
                }));
              }
            }}
            className="mt-1 h-4 w-4 rounded border-[#c5c6cd] accent-[#091426]"
          />
          <span className="text-sm leading-6 text-[#45474c]">
            Tôi cam kết các thông tin trên là chính xác và đồng ý với các <strong className="text-[#091426]">điều khoản đặt cọc</strong> của Hải Đăng House.
          </span>
        </label>

        {Object.values(fieldErrors).some(Boolean) && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:col-span-2">
            Vui lòng kiểm tra lại các thông tin bắt buộc trước khi tiếp tục.
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || (blockingStatus && !blockingStatus.canBook)}
          className="flex h-[74px] items-center justify-center gap-4 rounded-xl bg-[#091426] text-base font-bold text-white shadow-[0_10px_18px_rgba(9,20,38,0.18)] transition hover:bg-[#16253a] disabled:opacity-75 sm:col-span-2"
        >
          {isSubmitting ? "Đang xử lý..." : blockingStatus && !blockingStatus.canBook ? (
            blockingStatus.remainingMs > 0
              ? `Phòng đang có người đặt cọc, vui lòng chờ ${formatHoldCountdown(blockingStatus.remainingMs)}`
              : "Phòng đã được đặt cọc, vui lòng chọn phòng khác"
          ) : (
            <>
              Tiếp tục đặt cọc
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
      </section>
    </DepositFormErrorContext.Provider>
  );
}

function DepositPaymentStep({ room, customer, paymentIntent }) {
  const router = useRouter();
  const identityDigits = String(customer.phone || customer.citizenId || "00000").replace(/\D/g, "").slice(-5).padStart(5, "0");
  const paymentCode = paymentIntent?.paymentContent || paymentIntent?.payment_content || `HD-${room.id}-${identityDigits}`;
  const paymentIntentId = paymentIntent?.id;
  const [expiresAtMs] = useState(() => resolvePaymentExpiresAtMs(paymentIntent) ?? Date.now() + ROOM_HOLD_DURATION_MS);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAtMs - Date.now()));
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const didHandleExpiryRef = useRef(false);

  useEffect(() => {
    if (isConfirmed) return undefined;

    const tick = () => {
      const nextRemainingMs = Math.max(0, expiresAtMs - Date.now());
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0 && !didHandleExpiryRef.current) {
        didHandleExpiryRef.current = true;
        clearRoomHold(room.id);
        alert("Phiên giữ chỗ đã hết hạn. Vui lòng chọn lại phòng.");
        router.replace("/rooms");
      }
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [expiresAtMs, isConfirmed, room.id, router]);

  const handleConfirmPayment = async () => {
    if (remainingMs <= 0) {
      alert("Phiên giữ chỗ đã hết hạn. Vui lòng chọn lại phòng.");
      router.replace("/rooms");
      return;
    }

    try {
      setIsConfirming(true);
      await confirmMockPayment(paymentIntentId);
      setIsConfirmed(true);
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelPayment = async () => {
    try {
      setIsCancelling(true);
      await cancelDepositPayment(paymentIntentId);
      clearRoomHold(room.id);
      alert("Đã hủy giữ chỗ. Phòng đã được mở lại cho người khác đặt cọc.");
      router.replace("/rooms");
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isConfirmed) {
    return (
      <section className="flex flex-col items-center justify-center rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-10 text-center shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ecfdf5]">
          <BadgeCheck className="h-8 w-8 text-[#006c49]" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-[#091426]">Xác nhận thành công!</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#45474c]">
          Yêu cầu đặt cọc phòng {room.id} đã được ghi nhận. Chủ nhà sẽ liên hệ xác nhận trong thời gian sớm nhất.
        </p>
        <Link
          href="/rooms"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-[#091426] px-8 text-sm font-bold text-white transition hover:bg-[#16253a]"
        >
          Quay lại xem phòng
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-6 shadow-[0_4px_10px_rgba(9,20,38,0.04)] sm:p-8">
      <div className="flex flex-col gap-4 border-b border-[#c5c6cd] pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#006c49]">Bước đặt cọc</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.02em] text-[#091426]">Đặt cọc giữ phòng</h1>
          <p className="mt-2 text-base leading-7 text-[#45474c]">
            {customer.fullName || "Khách thuê"} vui lòng chuyển khoản tiền cọc để giữ phòng {room.id}.
          </p>
        </div>
        <div className="rounded-xl bg-[#ecfdf5] px-5 py-4 text-right">
          <p className="text-sm text-[#007a55]">Số tiền cọc</p>
          <p className="text-2xl font-bold text-[#006c49]">{room.depositLabel} VND</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-[#c5c6cd] bg-white p-5">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-[#091426]" />
              <h2 className="text-lg font-bold text-[#091426]">Chuyển khoản ngân hàng</h2>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-[#45474c]">
              <p><strong className="text-[#091426]">Ngân hàng:</strong> Vietcombank</p>
              <p><strong className="text-[#091426]">Số tài khoản:</strong> 0123 456 789</p>
              <p><strong className="text-[#091426]">Chủ tài khoản:</strong> HAI DANG HOUSE</p>
              <p><strong className="text-[#091426]">Nội dung:</strong> {paymentCode}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#c5c6cd] bg-white p-5">
            <h2 className="text-lg font-bold text-[#091426]">Thông tin giữ chỗ</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#45474c] sm:grid-cols-2">
              <p><CalendarDays className="mr-2 inline h-4 w-4" /> Ký HĐ: {customer.contractDate || "Chưa chọn"}</p>
              <p><Home className="mr-2 inline h-4 w-4" /> Vào ở: {customer.moveInDate || "Chưa chọn"}</p>
              <p><Phone className="mr-2 inline h-4 w-4" /> {customer.phone || "Chưa có SĐT"}</p>
              <p><Mail className="mr-2 inline h-4 w-4" /> {customer.email || "Chưa có email"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#c5c6cd] bg-white p-5 text-center">
          <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-xl border border-dashed border-[#c5c6cd] bg-[#f5f3f4]">
            <div className="grid h-32 w-32 grid-cols-5 grid-rows-5 gap-1">
              {Array.from({ length: 25 }).map((_, index) => (
                <span key={index} className={`${index % 2 === 0 || index % 7 === 0 ? "bg-[#091426]" : "bg-white"} rounded-sm`} />
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#45474c]">Mã QR minh họa. Khi kết nối cổng thanh toán, hệ thống sẽ sinh QR theo mã {paymentCode}.</p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-700">Thời gian giữ chỗ còn lại</p>
            <p className="mt-1 text-2xl font-bold text-amber-800">{formatHoldCountdown(remainingMs)}</p>
            <p className="mt-1 text-xs leading-5 text-amber-700">Hết thời gian, hệ thống sẽ trả phòng về trạng thái trống.</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={isConfirming || isCancelling || remainingMs <= 0}
        onClick={handleConfirmPayment}
        className="mt-8 flex h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-[#091426] text-base font-bold text-white shadow-[0_10px_18px_rgba(9,20,38,0.18)] transition hover:bg-[#16253a] disabled:opacity-75"
      >
        {isConfirming ? "Đang xác nhận..." : (
          <>
            Tôi đã chuyển khoản đặt cọc
            <BadgeCheck className="h-5 w-5" />
          </>
        )}
      </button>
      <button
        type="button"
        disabled={isConfirming || isCancelling}
        onClick={handleCancelPayment}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-[#c5c6cd] bg-white text-sm font-bold text-[#091426] transition hover:bg-[#f5f3f4] disabled:opacity-75"
      >
        {isCancelling ? "Đang hủy giữ chỗ..." : "Hủy giữ chỗ"}
      </button>
    </section>
  );
}

export function DepositClient({ room }) {
  const router = useRouter();
  const [customer, setCustomer] = useState({});
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [step, setStep] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockingStatus, setBlockingStatus] = useState(null);
  const didRedirectReservedRef = useRef(false);
  const roomIdentifier = room?.roomId ?? room?.roomCode ?? room?.id;
  const isBlockedOnInfoStep = Boolean(step === "info" && blockingStatus && !blockingStatus.canBook);

  const applyRoomHoldStatus = useCallback((status) => {
    const nextBlockingStatus = toBlockingStatus(status);

    if (!nextBlockingStatus) {
      setBlockingStatus(null);
      return;
    }

    setBlockingStatus(nextBlockingStatus);
    if (nextBlockingStatus.roomStatus === "RESERVED" && !didRedirectReservedRef.current) {
      didRedirectReservedRef.current = true;
      alert(nextBlockingStatus.message || "Phòng đã được đặt cọc. Vui lòng chọn phòng khác.");
      router.replace("/rooms");
    }
  }, [router]);

  const refreshRoomHoldStatus = useCallback(async () => {
    if (!roomIdentifier) return null;
    const status = await fetchDepositRoomHoldStatus(roomIdentifier);
    applyRoomHoldStatus(status);
    return status;
  }, [applyRoomHoldStatus, roomIdentifier]);

  useEffect(() => {
    if (!isBlockedOnInfoStep) {
      return undefined;
    }

    const countdownTimer = window.setInterval(() => {
      setBlockingStatus((currentStatus) => {
        if (!currentStatus || currentStatus.canBook) return currentStatus;
        return {
          ...currentStatus,
          remainingMs: Math.max(0, currentStatus.remainingMs - 1000),
        };
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownTimer);
    };
  }, [isBlockedOnInfoStep]);

  useEffect(() => {
    if (step !== "info") {
      return undefined;
    }

    const initialPollTimer = window.setTimeout(() => {
      refreshRoomHoldStatus().catch(() => {});
    }, 0);
    const pollingTimer = window.setInterval(() => {
      refreshRoomHoldStatus().catch(() => {});
    }, 2000);

    return () => {
      window.clearTimeout(initialPollTimer);
      window.clearInterval(pollingTimer);
    };
  }, [refreshRoomHoldStatus, step]);

  const submitDepositRequest = async (formData, metadata) => {
    try {
      setIsSubmitting(true);
      setBlockingStatus(null);

      // Gọi API khởi tạo phiên đặt cọc
      const createdPaymentIntent = await checkoutDeposit(formData);

      // Lưu state cục bộ phục vụ các bước sau
      setCustomer(metadata);
      setPaymentIntent(createdPaymentIntent);
      const holdExpiresAt = resolvePaymentExpiresAtMs(createdPaymentIntent) ?? Date.now() + ROOM_HOLD_DURATION_MS;
      createRoomHold(room.id, {
        customerName: metadata.fullName,
        phone: metadata.phone,
        email: metadata.email,
        moveInDate: metadata.moveInDate,
        contractDate: metadata.contractDate,
        expiresAt: holdExpiresAt,
      });

      // Chuyển sang bước hiển thị thanh toán
      setStep("deposit");
    } catch (error) {
      if (error.status === 409) {
        const status = await refreshRoomHoldStatus().catch(() => null);
        const nextBlockingStatus = toBlockingStatus(status)
          ?? toBlockingStatusFromMessage(error.message)
          ?? toBlockingStatusFromMessage(error.payload?.message)
          ?? toBlockingStatusFromMessage(error.payload?.details);
        if (nextBlockingStatus) {
          setBlockingStatus(nextBlockingStatus);
          return;
        }
      }
      alert("Lỗi: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-[#c5c6cd] bg-white p-8 text-center shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
          <h1 className="text-2xl font-bold">Không tìm thấy phòng</h1>
          <p className="mt-3 text-sm leading-6 text-[#45474c]">
            Mã phòng trong đường dẫn không tồn tại trong dữ liệu backend hiện tại.
          </p>
          <Link href="/rooms" className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#091426] px-6 text-sm font-bold text-white transition hover:bg-[#16253a]">
            Quay lại /rooms
          </Link>
        </div>
      </div>
    );
  }

  if (room.status !== "available") {
    return (
      <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-white p-8 text-center shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
          <h1 className="text-2xl font-bold">Phòng này hiện không thể đặt cọc</h1>
          <p className="mt-3 text-sm leading-6 text-[#45474c]">
            Vui lòng chọn phòng đang ở trạng thái trống trong danh sách phòng.
          </p>
          <Link href="/rooms" className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#091426] px-6 text-sm font-bold text-white transition hover:bg-[#16253a]">
            Quay lại /rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1120px]">
        <Link href="/rooms" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#45474c] transition hover:text-[#091426]">
          <ArrowLeft className="h-4 w-4" />
          Quay lại xem phòng
        </Link>

        <div className="grid gap-8 lg:grid-cols-[352px_1fr]">
          <RoomSummary room={room} />
          {step === "info" && (
            <DepositInfoForm
              room={room}
              onSubmit={submitDepositRequest}
              isSubmitting={isSubmitting}
              blockingStatus={blockingStatus}
            />
          )}
          {step === "deposit" && <DepositPaymentStep room={room} customer={customer} paymentIntent={paymentIntent} />}
        </div>

        <div className="mt-16 grid gap-8 border-t border-[#c5c6cd] pt-10 text-sm text-[#45474c] md:grid-cols-3">
          <div>
            <h3 className="font-bold text-[#091426]">Khám phá</h3>
            <div className="mt-4 grid gap-3">
              <Link href="/rooms">Phòng trọ</Link>
              <Link href="/">Trang chủ</Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-[#091426]">Hỗ trợ</h3>
            <div className="mt-4 grid gap-3">
              <span>Câu hỏi</span>
              <span>Chính sách</span>
            </div>
          </div>
          <div className="md:text-right">
            <p className="flex items-center gap-2 md:justify-end">
              <MapPin className="h-4 w-4" />
              Hải Đăng Boarding House Management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
