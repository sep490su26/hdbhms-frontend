"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2, Phone, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice("");

    window.setTimeout(() => {
      setIsSubmitting(false);
      setNotice("Nếu số điện thoại tồn tại trong hệ thống, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.");
    }, 600);
  }

  return (
    <main className="min-h-screen bg-white text-[#0f172a]">
      <section className="grid min-h-screen lg:grid-cols-[minmax(360px,0.93fr)_minmax(420px,1.07fr)]">
        <aside className="flex min-h-[320px] flex-col bg-[#0b1220] px-8 py-10 text-white sm:px-10 lg:min-h-screen lg:px-12 lg:py-12">
          <Link href="/" className="inline-flex w-fit items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#0b1220]">
              <Building2 className="h-6 w-6" />
            </span>
            <span className="text-base font-bold">Nhà trọ Hải Đăng</span>
          </Link>

          <div className="mt-24 max-w-[520px] sm:mt-32 lg:mt-[220px]">
            <h1 className="max-w-[460px] text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
              Khôi phục quyền truy cập
            </h1>
            <p className="mt-6 text-base font-medium leading-7 text-[#cbd5e1]">
              Xác minh tài khoản nhanh chóng • Bảo mật thông tin • Quay lại vận hành
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
          <form onSubmit={handleSubmit} className="w-full max-w-[430px]" noValidate>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">
                Hỗ trợ tài khoản
              </p>
              <h2 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-[#111827]">
                Quên mật khẩu
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#64748b]">
                Nhập số điện thoại đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
              </p>
            </div>

            {notice && (
              <div className="mt-6 flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <label className="mt-9 grid gap-2 text-sm font-bold text-[#334155]">
              Số điện thoại
              <span className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="0901234567"
                  className="h-12 w-full rounded-md border border-[#d8dee8] bg-white pl-12 pr-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1220] focus:ring-4 focus:ring-[#0b1220]/10"
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0b1220] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(15,23,42,0.28)] transition hover:bg-[#172235] disabled:cursor-not-allowed disabled:bg-[#647089]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Đang gửi..." : "Gửi hướng dẫn"}
            </button>

            <Link
              href="/login"
              className="mx-auto mt-7 inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-[#64748b] transition hover:text-[#0b1220]"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại đăng nhập
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}
