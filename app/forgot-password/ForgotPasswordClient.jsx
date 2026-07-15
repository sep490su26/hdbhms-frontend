"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/services/identityAccessService";

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

function isValidPassword(value) {
  return value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value);
}

function getResetMessage(error, fallback) {
  const raw = [
    error?.message,
    error?.details,
    error?.payload?.message,
    error?.payload?.details,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (raw.includes("account not found")) {
    return "Không tìm thấy tài khoản với thông tin đã nhập.";
  }
  if (raw.includes("not allowed yet")) {
    return "Tài khoản đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau.";
  }
  if (raw.includes("expired") || raw.includes("not found")) {
    return "Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";
  }
  if (raw.includes("password must be")) {
    return "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số.";
  }
  return error?.message || fallback;
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
          placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
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

export default function ForgotPasswordClient({ initialResetToken = "" }) {
  const router = useRouter();
  const [step, setStep] = useState(initialResetToken ? "password" : "identifier");
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState(null);
  const [token, setToken] = useState(initialResetToken);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(
    initialResetToken ? "Mã đặt lại mật khẩu đã được điền từ email." : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (step !== "password" || secondsLeft <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [step, secondsLeft]);

  async function submitIdentifier(event) {
    event.preventDefault();
    const normalizedIdentifier = identifier.trim();
    const detectedType = getIdentifierType(normalizedIdentifier);

    if (!detectedType) {
      setError("Vui lòng nhập email hợp lệ hoặc số điện thoại Việt Nam hợp lệ.");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await requestPasswordReset({ email: normalizedIdentifier });
      setIdentifier(normalizedIdentifier);
      setIdentifierType(detectedType);
      setToken("");
      setNewPassword("");
      setConfirmPassword("");
      setSecondsLeft(RESEND_SECONDS);
      setSuccess(
        detectedType === "email"
          ? "Mã đặt lại mật khẩu đã được gửi đến email của bạn."
          : "Mã đặt lại mật khẩu đã được gửi đến email gắn với số điện thoại này.",
      );
      setStep("password");
    } catch (submitError) {
      setError(getResetMessage(submitError, "Không thể gửi mã đặt lại mật khẩu."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    if (secondsLeft > 0 || !identifier.trim()) return;

    setError("");
    setSuccess("");
    setIsResending(true);

    try {
      await requestPasswordReset({ email: identifier.trim() });
      setSecondsLeft(RESEND_SECONDS);
      setSuccess("Mã đặt lại mật khẩu mới đã được gửi.");
    } catch (submitError) {
      setError(getResetMessage(submitError, "Không thể gửi lại mã đặt lại mật khẩu."));
    } finally {
      setIsResending(false);
    }
  }

  async function submitNewPassword(event) {
    event.preventDefault();
    const normalizedToken = token.trim();

    if (!/^\d{6}$/.test(normalizedToken)) {
      setError("Mã đặt lại mật khẩu phải gồm đúng 6 chữ số.");
      return;
    }

    if (!isValidPassword(newPassword)) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ và số.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await resetPasswordWithToken({
        token: normalizedToken,
        newPassword,
      });
      setSuccess("Đặt lại mật khẩu thành công. Đang chuyển về đăng nhập...");
      window.setTimeout(() => {
        router.push("/login");
      }, 700);
    } catch (submitError) {
      setError(getResetMessage(submitError, "Không thể đặt lại mật khẩu."));
      setIsSubmitting(false);
    }
  }

  function goBackToIdentifier() {
    setStep("identifier");
    setToken("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setSecondsLeft(0);
  }

  const isEmail = identifierType === "email";
  const destinationLabel = isEmail ? "email" : "email của tài khoản";
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
              Nhận mã đặt lại mật khẩu qua email và tạo mật khẩu mới cho tài khoản web.
            </p>
          </div>
        </aside>

        <div className="flex min-h-[620px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-[680px] lg:px-14">
          <div className="w-full max-w-[430px]">
            <div key={step} className="animate-[fade-in_240ms_ease-out]">
              {step === "identifier" && (
                <form onSubmit={submitIdentifier} noValidate>
                  <p className="text-xs font-bold uppercase text-[#64748b]">
                    Hỗ trợ tài khoản
                  </p>
                  <h2 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-[#111827]">
                    Quên mật khẩu
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-[#64748b]">
                    Nhập email hoặc số điện thoại đã đăng ký để nhận mã đặt lại mật khẩu.
                  </p>

                  <label
                    htmlFor="identifier"
                    className="mt-9 grid gap-2 text-sm font-bold text-[#334155]"
                  >
                    Email hoặc số điện thoại
                    <span className="relative">
                      <input
                        id="identifier"
                        value={identifier}
                        onChange={(event) => {
                          setIdentifier(event.target.value);
                          setError("");
                          setSuccess("");
                        }}
                        type="text"
                        inputMode="email"
                        autoComplete="username"
                        required
                        placeholder="email@example.com hoặc 0901234567"
                        className="h-12 w-full rounded-md border border-[#d8dee8] bg-white px-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0b1220] focus:ring-4 focus:ring-[#0b1220]/10"
                      />
                    </span>
                  </label>

                  <Feedback message={error} tone="error" />
                  <SubmitButton loading={isSubmitting} loadingText="Đang gửi...">
                    Gửi mã đặt lại
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

              {step === "password" && (
                <form onSubmit={submitNewPassword} noValidate>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Đặt lại mật khẩu
                  </p>
                  <h2 className="mt-2 text-4xl font-bold tracking-[-0.035em] text-[#111827]">
                    Tạo mật khẩu mới
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-[#64748b]">
                    Nhập mã 6 chữ số trong email và mật khẩu mới có ít nhất 8 ký tự, gồm chữ và số.
                  </p>

                  {identifier && (
                    <div className="mt-5 flex gap-3 rounded-lg border border-[#dbe3ee] bg-[#f8fafc] px-4 py-3">
                      {isEmail ? (
                        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#0b1220]" />
                      ) : (
                        <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#0b1220]" />
                      )}
                      <p className="text-sm leading-6 text-[#475569]">
                        Mã đã được gửi tới <strong>{destinationLabel}</strong> của{" "}
                        <strong className="break-all text-[#0f172a]">{identifier}</strong>.
                      </p>
                    </div>
                  )}

                  <div className="mt-7 grid gap-5">
                    <label htmlFor="reset-code" className="grid gap-2 text-sm font-bold text-[#334155]">
                      Mã đặt lại mật khẩu
                      <input
                        id="reset-code"
                        value={token}
                        onChange={(event) => {
                          setToken(event.target.value.replace(/\D/g, "").slice(0, 6));
                          setError("");
                          setSuccess("");
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

                    <PasswordInput
                      id="new-password"
                      label="Mật khẩu mới"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        setError("");
                        setSuccess("");
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
                        setSuccess("");
                      }}
                      visible={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((current) => !current)}
                      autoComplete="new-password"
                    />
                  </div>

                  {identifier && (
                    <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-[#64748b]">
                        {secondsLeft > 0 ? `Gửi lại sau ${formattedTimer}` : "Bạn chưa nhận được mã?"}
                      </span>
                      <button
                        type="button"
                        onClick={resendCode}
                        disabled={secondsLeft > 0 || isResending}
                        className="inline-flex items-center gap-1.5 font-bold text-[#0b1220] disabled:cursor-not-allowed disabled:text-[#a8b1bf]"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isResending ? "animate-spin" : ""}`} />
                        {isResending ? "Đang gửi..." : "Gửi lại mã"}
                      </button>
                    </div>
                  )}

                  <Feedback message={error} tone="error" />
                  <Feedback message={success} tone="success" />
                  <SubmitButton loading={isSubmitting} loadingText="Đang cập nhật...">
                    Xác nhận thay đổi
                  </SubmitButton>

                  <button
                    type="button"
                    onClick={goBackToIdentifier}
                    className="mx-auto mt-7 inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-[#64748b] transition hover:text-[#0b1220]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Nhập lại email hoặc số điện thoại
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feedback({ message, tone }) {
  if (!message) return null;

  const isSuccess = tone === "success";

  return (
    <p
      role={isSuccess ? "status" : "alert"}
      aria-live="polite"
      className={`mt-4 flex items-start gap-2 rounded-md border px-4 py-3 text-sm font-semibold ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {isSuccess && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{message}</span>
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
