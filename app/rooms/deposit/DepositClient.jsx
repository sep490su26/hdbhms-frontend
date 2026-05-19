"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Ruler,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { createRoomHold } from "../../../lib/roomHoldStorage";

function Field({ label, name, placeholder, type = "text", className = "", required = true }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="h-[58px] rounded-lg border border-[#c5c6cd] bg-white px-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10"
      />
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
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
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
        <Field className="sm:col-span-2" label="Họ và tên" name="fullName" placeholder="Nguyễn Văn A" />
        <Field label="Ngày sinh" name="birthDate" type="date" placeholder="mm/dd/yyyy" />
        <Field label="Số CCCD" name="citizenId" placeholder="Số căn cước công dân" />
        <Field label="Ngày cấp CCCD" name="dateOfCreate" type="date" placeholder="mm/dd/yyyy" />
        <Field label="Nơi cấp" name="placeOfCreateCitizenId" placeholder="Nhập nơi cấp CCCD" />
        <Field label="Số điện thoại" name="phone" type="tel" placeholder="0901 234 567" />
        <Field label="Email" name="email" type="email" placeholder="example@gmail.com" />
        <Field label="Ngày hẹn ký hợp đồng" name="contractDate" type="date" placeholder="mm/dd/yyyy" />
        <Field label="Ngày dự kiến vào ở" name="moveInDate" type="date" placeholder="mm/dd/yyyy" />

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
          Gửi yêu cầu đặt cọc
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </section>
  );
}

function SuccessDialog({ room, customer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="deposit-success-title">
      <div className="w-full max-w-lg rounded-2xl border border-[#d7eee4] bg-white p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ecfdf5] text-[#006c49]">
          <Check className="h-8 w-8" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.08em] text-[#006c49]">Gửi yêu cầu thành công</p>
        <h2 id="deposit-success-title" className="mt-2 text-3xl font-bold tracking-[-0.02em] text-[#091426]">
          Đơn xét duyệt đặt cọc đã được gửi
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#45474c]">
          Yêu cầu đặt cọc phòng {room.id} của {customer.fullName || "khách thuê"} đã được ghi nhận. Hệ thống đang chuyển bạn về trang xem phòng.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[#006c49]">
          <span className="h-3 w-3 animate-pulse rounded-full bg-[#006c49]" />
          Đang chuyển hướng...
        </div>
      </div>
    </div>
  );
}

export function DepositClient({ room }) {
  const router = useRouter();
  const [customer, setCustomer] = useState({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const submitDepositRequest = (data) => {
    setCustomer(data);
    createRoomHold(room.id, {
      customerName: data.fullName,
      phone: data.phone,
      email: data.email,
      moveInDate: data.moveInDate,
      contractDate: data.contractDate,
    });
    setShowSuccessDialog(true);

    window.setTimeout(() => {
      router.push(`/rooms?depositSuccess=1&roomId=${room.id}`);
    }, 1800);
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
          <DepositInfoForm room={room} onSubmit={submitDepositRequest} />
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
      {showSuccessDialog && <SuccessDialog room={room} customer={customer} />}
    </div>
  );
}
