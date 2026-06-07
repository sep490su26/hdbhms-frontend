"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const RESEND_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/;

function getIdentifierType(value) {
  const normalizedValue = value.trim();

  if (EMAIL_PATTERN.test(normalizedValue)) return "email";

  const normalizedPhone = normalizedValue.replace(/[\s.-]/g, "");
  if (PHONE_PATTERN.test(normalizedPhone)) return "phone";

  return null;
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
}) {
  return (
    <label htmlFor={id} className="grid gap-2 text-sm font-bold text-[#334155]">
      {label}
      <span className="relative">
        <LockKeyhole
          aria-hidden="true"
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
        />
        <input
          id={id}
          value={value}
          onChange={onChange}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="h-12 w-full rounded-md border border-[#d8dee8] bg-white pl-12 pr-12 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1220] focus:ring-4 focus:ring-[#0b1220]/10"
          placeholder="Tối thiểu 8 ký tự"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#0b1220]"
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState("identifier");
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState(null);
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [step, secondsLeft]);

  function submitIdentifier(event) {
    event.preventDefault();
    const detectedType = getIdentifierType(identifier);

    if (!detectedType) {
      setError("Vui lòng nhập email hợp lệ hoặc số điện thoại Việt Nam hợp lệ.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    window.setTimeout(() => {
      setIdentifierType(detectedType);
      setSecondsLeft(RESEND_SECONDS);
      setStep("otp");
      setIsSubmitting(false);
    }, 450);
  }

  function submitOtp(event) {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      setError("Mã xác thực phải gồm đúng 6 chữ số.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    window.setTimeout(() => {
      setStep("password");
      setIsSubmitting(false);
    }, 450);
  }

  function submitNewPassword(event) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    window.setTimeout(() => {
      router.push("/login");
    }, 500);
  }

  function goBackToIdentifier() {
    setStep("identifier");
    setOtp("");
    setError("");
    setSecondsLeft(RESEND_SECONDS);
  }

  function resendOtp() {
    if (secondsLeft > 0) return;
    setOtp("");
    setError("");
    setSecondsLeft(RESEND_SECONDS);
  }

  const isEmail = identifierType === "email";
  const destinationLabel = isEmail ? "Email" : "SMS";
  const formattedTimer = `00:${String(secondsLeft).padStart(2, "0")}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f7] p-4 text-[#0f172a] sm:p-6 lg:p-8">
      <section className="grid w-full max-w-[1080px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] lg:grid-cols-[minmax(340px,0.92fr)_minmax(420px,1.08fr)]">
        <aside className="flex min-h-[300px] flex-col bg-[#0b1220] px-8 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[680px] lg:px-12 lg:py-12">
          <Link href="/" className="inline-flex w-fit items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#0b1220]">
              <Building2 className="h-6 w-6" />
            </span>
            <span className="text-base font-bold">Nhà trọ Hải Đăng</span>
          </Link>

          <div className="my-auto max-w-[480px] py-14 lg:py-20">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              {step === "password" ? (
                <KeyRound className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>
            <h1 className="max-w-[460px] text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl">
              Khôi phục quyền truy cập
            </h1>
            <p className="mt-6 text-base font-medium leading-7 text-[#cbd5e1]">
              Xác minh an toàn, đặt lại mật khẩu và tiếp tục quản lý tài khoản của bạn.
            </p>
          </div>
        </aside>

        <div className="flex min-h-[620px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-[680px] lg:px-14">
          <div className="w-full max-w-[430px]">
            <div
              key={step}
              className="animate-[fade-in_240ms_ease-out]"
            >
              {step === "identifier" && (
                <form onSubmit={submitIdentifier} noValidate>
                  <p className="text-xs font-bold uppercase text-[#64748b]">
                    Hỗ trợ tài khoản
                  </p>
                  <h2 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-[#111827]">
                    Quên mật khẩu
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-[#64748b]">
                    Nhập email hoặc số điện thoại đã đăng ký để nhận mã xác thực.
                  </p>

                  <label
                    htmlFor="identifier"
                    className="mt-9 grid gap-2 text-sm font-bold text-[#334155]"
                  >
                    Email hoặc Số điện thoại
                    <span className="relative">
                     
                      <input
                        id="identifier"
                        value={identifier}
                        onChange={(event) => {
                          setIdentifier(event.target.value);
                          setError("");
                        }}
                        type="text"
                        inputMode="email"
                        autoComplete="username"
                        required
                        placeholder="email@example.com hoặc 0901234567"
                        className="h-12 w-full rounded-md border border-[#d8dee8] bg-white pl-4 pr-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1220] focus:ring-4 focus:ring-[#0b1220]/10"
                      />
                    </span>
                  </label>

                  <ErrorMessage message={error} />
                  <SubmitButton loading={isSubmitting} loadingText="Đang gửi...">
                    Gửi mã xác thực
                  </SubmitButton>

                  <Link
                    href="/login"
                    className="mx-auto mt-7 inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-[#64748b] transition hover:text-[#0b1220]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại đăng nhập
                  </Link>
                </form>
              )}

              {step === "otp" && (
                <form onSubmit={submitOtp} noValidate>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Bước 2 / 3
                  </p>
                  <h2 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-[#111827]">
                    Nhập mã xác thực
                  </h2>
                  <div className="mt-5 flex gap-3 rounded-lg border border-[#dbe3ee] bg-[#f8fafc] px-4 py-3">
                    {isEmail ? (
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#0b1220]" />
                    ) : (
                      <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#0b1220]" />
                    )}
                    <p className="text-sm leading-6 text-[#475569]">
                      Mã gồm 6 chữ số đã được gửi qua <strong>{destinationLabel}</strong> tới{" "}
                      <strong className="break-all text-[#0f172a]">{identifier.trim()}</strong>.
                    </p>
                  </div>

                  <label
                    htmlFor="otp"
                    className="mt-7 grid gap-2 text-sm font-bold text-[#334155]"
                  >
                    Mã xác thực
                    <input
                      id="otp"
                      value={otp}
                      onChange={(event) => {
                        setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                        setError("");
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      placeholder="000000"
                      className="h-14 w-full rounded-md border border-[#d8dee8] bg-white px-4 text-center text-xl font-bold tracking-[0.55em] text-[#0f172a] outline-none transition placeholder:text-[#cbd5e1] focus:border-[#0b1220] focus:ring-4 focus:ring-[#0b1220]/10"
                    />
                  </label>

                  <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-[#64748b]">
                      {secondsLeft > 0 ? `Gửi lại sau ${formattedTimer}` : "Bạn chưa nhận được mã?"}
                    </span>
                    <button
                      type="button"
                      onClick={resendOtp}
                      disabled={secondsLeft > 0}
                      className="inline-flex items-center gap-1.5 font-bold text-[#0b1220] disabled:cursor-not-allowed disabled:text-[#a8b1bf]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Gửi lại mã
                    </button>
                  </div>

                  <ErrorMessage message={error} />
                  <SubmitButton loading={isSubmitting} loadingText="Đang xác thực...">
                    Xác thực mã
                  </SubmitButton>

                  <button
                    type="button"
                    onClick={goBackToIdentifier}
                    className="mx-auto mt-7 inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-[#64748b] transition hover:text-[#0b1220]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Thay đổi email hoặc số điện thoại
                  </button>
                </form>
              )}

              {step === "password" && (
                <form onSubmit={submitNewPassword} noValidate>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Bước 3 / 3
                  </p>
                  <h2 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-[#111827]">
                    Tạo mật khẩu mới
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-[#64748b]">
                    Chọn mật khẩu mới có ít nhất 8 ký tự để bảo vệ tài khoản.
                  </p>

                  <div className="mt-9 grid gap-5">
                    <PasswordInput
                      id="new-password"
                      label="Mật khẩu mới"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        setError("");
                      }}
                      visible={showNewPassword}
                      onToggle={() => setShowNewPassword((current) => !current)}
                      autoComplete="new-password"
                    />
                    <PasswordInput
                      id="confirm-password"
                      label="Xác nhận mật khẩu mới"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setError("");
                      }}
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((current) => !current)}
                      autoComplete="new-password"
                    />
                  </div>

                  <ErrorMessage message={error} />
                  <SubmitButton loading={isSubmitting} loadingText="Đang cập nhật...">
                    Xác nhận thay đổi
                  </SubmitButton>

                  <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Mã xác thực đã được xác nhận
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      aria-live="polite"
      className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
    >
      {message}
    </p>
  );
}

function SubmitButton({ children, loading, loadingText }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#0b1220] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(15,23,42,0.28)] transition hover:bg-[#172235] disabled:cursor-not-allowed disabled:bg-[#647089]"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </button>
  );
}
