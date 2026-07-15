"use client";

import {useState} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {changeCurrentUserPassword} from "@/services/identityAccessService";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

const INITIAL_VALUES = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function validate(values) {
  const errors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Enter your current password.";
  }

  if (!values.newPassword) {
    errors.newPassword = "Enter a new password.";
  } else if (values.newPassword.length < 6) {
    errors.newPassword = "The new password must contain at least 6 characters.";
  } else if (values.newPassword === values.currentPassword) {
    errors.newPassword = "The new password must differ from your current password.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "The password confirmation does not match.";
  }

  return errors;
}

function PasswordField({
  id,
  label,
  value,
  error,
  autoComplete,
  visible,
  onChange,
  onToggleVisibility,
}) {
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-bold text-slate-900 dark:text-white" htmlFor={id}>
        {label}
      </label>
      <span className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 w-full rounded-lg border bg-white dark:bg-[#0f172a] px-3 pr-11 text-sm font-semibold text-slate-900 dark:text-white outline-none transition placeholder:text-[#9ca3af] focus:ring-2 ${
            error
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
              : "border-[#c5c6cd] dark:border-white/10 focus:border-[#1e40af] focus:ring-[#1e40af]/10"
          }`}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1e40af]/20"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
      {error && (
        <span id={errorId} className="text-xs font-bold text-rose-700 dark:text-rose-300">
          {error}
        </span>
      )}
    </div>
  );
}

export default function SecuritySettingsPage() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [visibleFields, setVisibleFields] = useState({});
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setValues((current) => ({...current, [field]: value}));
    setErrors((current) => ({...current, [field]: undefined}));
    setStatus(null);
  }

  function toggleVisibility(field) {
    setVisibleFields((current) => ({...current, [field]: !current[field]}));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus({tone: "error", message: "Review the highlighted fields and try again."});
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const result = await changeCurrentUserPassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      setValues(INITIAL_VALUES);
      setErrors({});
      setVisibleFields({});
      setStatus({
        tone: "success",
        message: result?.message || "Your password has been changed successfully.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error?.message || "Unable to change your password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSuccess = status?.tone === "success";
  const StatusIcon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <>
      <header>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 rounded-md text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <div className="mt-5">
          <DashboardPageHeader
            title="Security & Password"
            description="Update your password to keep your account secure."
          />
        </div>
      </header>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-xl border border-[#c5c6cd] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:p-8"
        >
          <div className="flex items-start gap-4 border-b border-[#e2e8f0] dark:border-white/10 pb-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f2f4f6] dark:bg-white/5 text-slate-900 dark:text-white">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Change password</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Enter your current password before choosing a new one.
              </p>
            </div>
          </div>

          {status && (
            <div
              className={`mt-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${
                isSuccess
                  ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300"
              }`}
              role={isSuccess ? "status" : "alert"}
            >
              <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
              {status.message}
            </div>
          )}

          <div className="mt-6 grid gap-5">
            <PasswordField
              id="current-password"
              label="Current Password"
              value={values.currentPassword}
              error={errors.currentPassword}
              autoComplete="current-password"
              visible={Boolean(visibleFields.currentPassword)}
              onChange={(event) => updateField("currentPassword", event.target.value)}
              onToggleVisibility={() => toggleVisibility("currentPassword")}
            />
            <PasswordField
              id="new-password"
              label="New Password"
              value={values.newPassword}
              error={errors.newPassword}
              autoComplete="new-password"
              visible={Boolean(visibleFields.newPassword)}
              onChange={(event) => updateField("newPassword", event.target.value)}
              onToggleVisibility={() => toggleVisibility("newPassword")}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm Password"
              value={values.confirmPassword}
              error={errors.confirmPassword}
              autoComplete="new-password"
              visible={Boolean(visibleFields.confirmPassword)}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              onToggleVisibility={() => toggleVisibility("confirmPassword")}
            />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#e2e8f0] dark:border-white/10 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/settings"
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-[#f2f4f6] dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]/20"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-[#c5c6cd] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Password guidance</h2>
          </div>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1e40af] dark:bg-[#2563eb]" />
              Use at least 6 characters.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1e40af] dark:bg-[#2563eb]" />
              Avoid reusing passwords from other accounts.
            </li>

          </ul>
        </aside>
      </section>
    </>
  );
}
