"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Phone,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/app/dashboard/_contexts/AuthContext";
import {
  clearAuthSession,
  getCurrentUserProfile,
  loginWithPhonePassword,
} from "@/services/identityAccessService";

function LoginForm() {
  const router = useRouter();
  const { setUser, refreshUser } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("token");

    if (token) {
      refreshUser(token)
        .then(() => router.replace("/dashboard"))
        .catch(() => clearAuthSession());
    }
  }, [refreshUser, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const loginData = await loginWithPhonePassword({ phone, password });
      const accessToken = loginData?.token;
      const userRole = loginData?.role;

      if (!accessToken) {
        throw new Error("Phản hồi đăng nhập không có token.");
      }

      window.localStorage.setItem("token", accessToken);
      if (userRole) {
        window.localStorage.setItem("userRole", userRole);
      }

      const profile = await getCurrentUserProfile();
      setUser({ ...profile, role: userRole || profile.role });
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError.message || "Số điện thoại hoặc mật khẩu không chính xác.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#0f172a]">
      <section className="grid min-h-screen lg:grid-cols-[minmax(360px,0.93fr)_minmax(420px,1.07fr)]">
        <aside className="flex min-h-[360px] flex-col bg-[#0b1220] px-8 py-10 text-white sm:px-10 lg:min-h-screen lg:px-12 lg:py-12">
          <Link href="/" className="inline-flex w-fit items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#0b1220]">
              <Building2 className="h-6 w-6" />
            </span>
            <span className="text-base font-bold">Nhà trọ Hải Đăng</span>
          </Link>

          <div className="mt-24 max-w-[520px] sm:mt-32 lg:mt-[220px]">
            <h1 className="max-w-[460px] text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
              Hệ thống quản lý nhà trọ
            </h1>
            <p className="mt-6 text-base font-medium leading-7 text-[#cbd5e1]">
              Quản lý thông minh • Vận hành hiệu quả • Theo dõi mọi lúc
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
          <form onSubmit={handleSubmit} className="w-full max-w-[430px]" noValidate>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">
                Chào mừng trở lại
              </p>
              <h2 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-[#111827]">
                Đăng nhập
              </h2>
            </div>

            {error && (
              <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-9 grid gap-5">
              <label className="grid gap-2 text-sm font-bold text-[#334155]">
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

              <label className="grid gap-2 text-sm font-bold text-[#334155]">
                Mật khẩu
                <span className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="Nhập mật khẩu"
                    className="h-12 w-full rounded-md border border-[#d8dee8] bg-white pl-12 pr-12 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1220] focus:ring-4 focus:ring-[#0b1220]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0b1220]"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-[#334155]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#d8dee8] accent-[#0b1220]"
                />
                Ghi nhớ mật khẩu
              </label>
              <Link href="/forgot-password" className="text-sm font-bold text-[#0b1220] hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0b1220] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(15,23,42,0.28)] transition hover:bg-[#172235] disabled:cursor-not-allowed disabled:bg-[#647089]"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            <Link
              href="/"
              className="mx-auto mt-7 inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-[#64748b] transition hover:text-[#0b1220]"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại trang chủ
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
