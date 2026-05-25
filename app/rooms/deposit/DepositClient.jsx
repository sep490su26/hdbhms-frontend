"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { createRoomHold } from "../../../lib/roomHoldStorage";

const DATE_ERROR_MESSAGE = "Ngày chọn phải bắt đầu từ ngày mai trở đi.";

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

function Field({ label, name, placeholder, type = "text", className = "", required = true, min, error, onChange, onInvalid }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        min={min}
        onChange={onChange}
        onInvalid={onInvalid}
        aria-invalid={error ? "true" : "false"}
        className={`h-[58px] rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:ring-2 ${
          error
            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
            : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
        }`}
      />
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

function FileUploadZone({ id, name, label, helperText, preview, onChange }) {
  return (
    <label
      htmlFor={id}
      className="group flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#aeb1bb] bg-white px-4 py-5 text-center transition hover:border-[#091426] hover:bg-[#f5f3f4]"
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
      <span className="mt-4 text-sm font-bold text-[#091426]">{label}</span>
      <span className="mt-1 max-w-xs text-xs leading-5 text-[#6b7280]">{helperText}</span>
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

function DepositInfoForm({ room, onSubmit }) {
  const tomorrowDate = getTomorrowDateString();
  const [dateErrors, setDateErrors] = useState({});
  const [imagePreviews, setImagePreviews] = useState({
    citizenIdImage: "",
    portraitImage: "",
  });

  const validateFutureDate = (name, value) => {
    const hasError = Boolean(value) && value < tomorrowDate;
    setDateErrors((currentErrors) => ({
      ...currentErrors,
      [name]: hasError ? DATE_ERROR_MESSAGE : "",
    }));
    return !hasError;
  };

  const handleDateChange = (event) => {
    validateFutureDate(event.target.name, event.target.value);
  };

  const handleDateInvalid = (event) => {
    if (event.target.validity.rangeUnderflow) {
      setDateErrors((currentErrors) => ({
        ...currentErrors,
        [event.target.name]: DATE_ERROR_MESSAGE,
      }));
    }
  };

  const handleFileChange = (name) => (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setImagePreviews((currentPreviews) => ({
        ...currentPreviews,
        [name]: "",
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreviews((currentPreviews) => ({
        ...currentPreviews,
        [name]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const isContractDateValid = validateFutureDate("contractDate", data.contractDate);
    const isMoveInDateValid = validateFutureDate("moveInDate", data.moveInDate);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!isContractDateValid || !isMoveInDateValid) {
      return;
    }

    onSubmit(data);
  };

  return (
    <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-6 shadow-[0_4px_10px_rgba(9,20,38,0.04)] sm:p-8">
      <div>
        <h1 className="text-4xl font-bold tracking-[-0.02em] text-[#091426]">Thông tin đặt cọc</h1>
        <p className="mt-2 text-base leading-7 text-[#45474c]">
          Vui lòng hoàn thành các thông tin dưới đây để tiến hành giữ chỗ cho phòng {room.id}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-x-6 gap-y-6 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Họ và tên" name="fullName" placeholder="Phạm Thèng C" />
        <Field label="Ngày sinh" name="birthDate" type="date" placeholder="mm/dd/yyyy" />
        <Field label="Số điện thoại" name="phone" type="tel" placeholder="0901 234 567" />
        <Field label="Email (không bắt buộc)" name="email" type="email" placeholder="example@gmail.com" required={false} />
        <Field label="Số CCCD" name="citizenId" placeholder="Số căn cước công dân" />
        <Field
          label="Ngày hẹn ký hợp đồng"
          name="contractDate"
          type="date"
          placeholder="mm/dd/yyyy"
          min={tomorrowDate}
          error={dateErrors.contractDate}
          onChange={handleDateChange}
          onInvalid={handleDateInvalid}
        />
        <Field
          label="Ngày dự kiến vào ở"
          name="moveInDate"
          type="date"
          placeholder="mm/dd/yyyy"
          min={tomorrowDate}
          error={dateErrors.moveInDate}
          onChange={handleDateChange}
          onInvalid={handleDateInvalid}
        />

        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <FileUploadZone
            id="citizen-id-image"
            name="citizenIdImage"
            label="Ảnh Căn cước công dân (CCCD)"
            helperText="Tải lên mặt trước/sau hoặc một ảnh chụp chung rõ thông tin."
            preview={imagePreviews.citizenIdImage}
            onChange={handleFileChange("citizenIdImage")}
          />
          <FileUploadZone
            id="portrait-image"
            name="portraitImage"
            label="Ảnh chân dung"
            helperText="Tải lên ảnh chân dung rõ mặt của khách thuê."
            preview={imagePreviews.portraitImage}
            onChange={handleFileChange("portraitImage")}
          />
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
            className="mt-1 h-4 w-4 rounded border-[#c5c6cd] accent-[#091426]"
          />
          <span className="text-sm leading-6 text-[#45474c]">
            Tôi cam kết các thông tin trên là chính xác và đồng ý với các <strong className="text-[#091426]">điều khoản đặt cọc</strong> của Hải Đăng House.
          </span>
        </label>

        <button
          type="submit"
          className="flex h-[74px] items-center justify-center gap-4 rounded-xl bg-[#091426] text-base font-bold text-white shadow-[0_10px_18px_rgba(9,20,38,0.18)] transition hover:bg-[#16253a] sm:col-span-2"
        >
          Tiếp tục đặt cọc
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </section>
  );
}

function DepositPaymentStep({ room, customer }) {
  const identityDigits = String(customer.phone || customer.citizenId || "00000").replace(/\D/g, "").slice(-5).padStart(5, "0");
  const paymentCode = `HD-${room.id}-${identityDigits}`;

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
        </div>
      </div>

      <button
        type="button"
        className="mt-8 flex h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-[#091426] text-base font-bold text-white shadow-[0_10px_18px_rgba(9,20,38,0.18)] transition hover:bg-[#16253a]"
      >
        Tôi đã chuyển khoản đặt cọc
        <BadgeCheck className="h-5 w-5" />
      </button>
    </section>
  );
}

export function DepositClient({ room }) {
  const [customer, setCustomer] = useState({});
  const [step, setStep] = useState("info");

  const submitDepositRequest = (data) => {
    setCustomer(data);
    createRoomHold(room.id, {
      customerName: data.fullName,
      phone: data.phone,
      email: data.email,
      moveInDate: data.moveInDate,
      contractDate: data.contractDate,
    });
    setStep("deposit");
  };

  return (
    <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1120px]">
        <Link href="/rooms" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#45474c] transition hover:text-[#091426]">
          <ArrowLeft className="h-4 w-4" />
          Quay lại xem phòng
        </Link>

        <div className="grid gap-8 lg:grid-cols-[352px_1fr]">
          <RoomSummary room={room} />
          {step === "info" && <DepositInfoForm room={room} onSubmit={submitDepositRequest} />}
          {step === "deposit" && <DepositPaymentStep room={room} customer={customer} />}
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
