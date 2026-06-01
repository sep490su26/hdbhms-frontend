"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Building2, Eye, EyeOff, Loader2, LockKeyhole, Phone} from "lucide-react";
import {AuthProvider, useAuth} from "@/app/dashboard/_contexts/AuthContext";
import {getCurrentUserProfile, loginWithPhonePassword} from "@/services/identityAccessService";

function LoginForm() {
    const router = useRouter();
    const {setUser, refreshUser} = useAuth();
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [forgotPassword, setForgotPassword] = useState(false); // toggle state

    useEffect(() => {
        const token = window.localStorage.getItem("token");
        if (token) {
            refreshUser(token)
                .then(() => router.replace("/dashboard"))
                .catch(() => window.localStorage.removeItem("token"));
        }
    }, [refreshUser, router]);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const loginData = await loginWithPhonePassword({phone, password});
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
            setUser({...profile, role: userRole || profile.role});
            router.push("/dashboard");
        } catch (submitError) {
            setError(submitError.message || "Số điện thoại hoặc mật khẩu không chính xác.");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Placeholder handler for forgot password submission
    async function handleForgotPassword(event) {
        event.preventDefault();
        setError("");
        if (!phone.trim()) {
            setError("Vui lòng nhập số điện thoại.");
            return;
        }
        setIsSubmitting(true);
        try {
            // Replace with your actual API call (e.g., sendPasswordResetSMS(phone))
            await new Promise((resolve) => setTimeout(resolve, 1500)); // simulate API
            alert("Hướng dẫn khôi phục mật khẩu đã được gửi đến số điện thoại của bạn.");
            setForgotPassword(false); // return to login
            setPhone(""); // clear phone
        } catch (err) {
            setError(err.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f9fb] px-4 py-10 text-[#091426] sm:px-6 lg:px-8">
            <section
                className="mx-auto grid min-h-[680px] max-w-6xl overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_20px_60px_rgba(9,20,38,0.12)] lg:grid-cols-[0.92fr_1.08fr]">
                {/* Left panel – unchanged */}
                <div className="flex flex-col justify-between bg-[#091426] p-8 text-white sm:p-10">
                    <Link href="/" className="inline-flex w-fit items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#091426]">
              <Building2 className="h-5 w-5"/>
            </span>
                        <span>
              <span className="block text-xl font-bold leading-7">Hai Dang</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8590a6]">
                Property management
              </span>
            </span>
                    </Link>

                    <div className="max-w-sm py-12">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#f6c915]">
                            Identity access
                        </p>
                        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                            {forgotPassword
                                ? "Khôi phục mật khẩu"
                                : "Đăng nhập hệ thống quản lý nhà trọ"}
                        </h1>
                        <p className="mt-4 text-sm leading-6 text-[#c5ccda]">
                            {forgotPassword
                                ? "Nhập số điện thoại đã đăng ký để nhận hướng dẫn đặt lại mật khẩu."
                                : "Sau khi xác thực, hệ thống tự tải hồ sơ người dùng để hiển thị tên và ảnh đại diện trên dashboard."}
                        </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-[#c5ccda]">
                        {forgotPassword
                            ? "Mã xác nhận sẽ được gửi qua SMS. Có hiệu lực trong 10 phút."
                            : "Phiên đăng nhập được bảo vệ bằng JWT và tự động nạp lại hồ sơ khi trình duyệt được làm mới."}
                    </div>
                </div>

                {/* Right panel – switches form based on state */}
                <div className="flex items-center justify-center p-6 sm:p-10">
                    {!forgotPassword ? (
                        /* ---------- LOGIN FORM ---------- */
                        <form onSubmit={handleSubmit} className="w-full max-w-md" noValidate>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                                    Welcome back
                                </p>
                                <h2 className="mt-2 text-2xl font-bold text-[#091426]">Đăng nhập</h2>
                            </div>

                            {error && (
                                <div
                                    className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6 grid gap-5">
                                <label className="grid gap-2 text-sm font-semibold text-[#172235]">
                                    Số điện thoại
                                    <span className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"/>
                    <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        placeholder="0901234567"
                        className="h-12 w-full rounded-lg border border-[#d8dee8] bg-white pl-10 pr-3 text-sm text-[#091426] outline-none transition placeholder:text-[#9aa3b2] focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/10"
                    />
                  </span>
                                </label>

                                <label className="grid gap-2 text-sm font-semibold text-[#172235]">
                                    Mật khẩu
                                    <span className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"/>
                    <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        placeholder="Nhập mật khẩu"
                        className="h-12 w-full rounded-lg border border-[#d8dee8] bg-white pl-10 pr-12 text-sm text-[#091426] outline-none transition placeholder:text-[#9aa3b2] focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/10"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#f2f4f6] hover:text-[#091426]"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                  </span>
                                </label>
                            </div>

                            <div className="mt-2 text-right">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotPassword(true);
                                        setError("");
                                        setPhone(""); // optionally clear fields
                                        setPassword("");
                                    }}
                                    className="text-sm font-medium text-[#6b7280] transition hover:text-[#091426]"
                                >
                                    Quên mật khẩu?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white transition hover:bg-[#172235] disabled:cursor-not-allowed disabled:bg-[#647089]"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin"/>}
                                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                            </button>
                        </form>
                    ) : (
                        /* ---------- FORGOT PASSWORD FORM ---------- */
                        <form onSubmit={handleForgotPassword} className="w-full max-w-md" noValidate>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                                    Password recovery
                                </p>
                                <h2 className="mt-2 text-2xl font-bold text-[#091426]">Quên mật khẩu</h2>
                            </div>

                            {error && (
                                <div
                                    className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                                    {error}
                                </div>
                            )}

                            <div className="mt-6 grid gap-5">
                                <label className="grid gap-2 text-sm font-semibold text-[#172235]">
                                    Số điện thoại đã đăng ký
                                    <span className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"/>
                    <input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        placeholder="0901234567"
                        className="h-12 w-full rounded-lg border border-[#d8dee8] bg-white pl-10 pr-3 text-sm text-[#091426] outline-none transition placeholder:text-[#9aa3b2] focus:border-[#091426] focus:ring-4 focus:ring-[#091426]/10"
                    />
                  </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white transition hover:bg-[#172235] disabled:cursor-not-allowed disabled:bg-[#647089]"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin"/>}
                                {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
                            </button>

                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotPassword(false);
                                        setError("");
                                        setPhone("");
                                    }}
                                    className="text-sm font-medium text-[#6b7280] transition hover:text-[#091426]"
                                >
                                    ← Quay lại đăng nhập
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
}

export default function LoginPage() {
    return (
        <AuthProvider>
            <LoginForm/>
        </AuthProvider>
    );
}
