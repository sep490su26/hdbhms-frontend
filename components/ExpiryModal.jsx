"use client";

import { ArrowRight, Clock3, Home } from "lucide-react";

export default function ExpiryModal({
  open,
  redirectSeconds = 10,
  onChooseRooms,
  onHome,
  title = "Phiên giữ chỗ đã hết hạn",
  message = "Phòng đã được mở khóa cho khách khác. Vui lòng chọn lại phòng để tạo giao dịch mới.",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-[#091426]/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expired-session-title"
    >
      <div className="w-full max-w-[480px] rounded-xl border border-[#e4e7ec] bg-white p-6 text-[#091426] shadow-[0_24px_80px_rgba(9,20,38,0.28)] sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock3 className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 id="expired-session-title" className="text-xl font-bold leading-7">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#45474c]">
              {message}
            </p>
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              Tự động chuyển trang sau {Math.max(0, redirectSeconds)}s...
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onChooseRooms}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#091426] px-4 text-sm font-bold text-white transition hover:bg-[#16253a]"
          >
            Chọn phòng khác
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onHome}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#c5c6cd] bg-white px-4 text-sm font-bold text-[#091426] transition hover:bg-[#f5f3f4]"
          >
            <Home className="h-4 w-4" />
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
