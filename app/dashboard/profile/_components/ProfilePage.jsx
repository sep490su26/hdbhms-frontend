"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { useProfile } from "../_hooks/useProfile";
import { formatDate as formatDisplayDate } from "@/lib/dateFormat";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

function getInitials(name) {
  return String(name || "User")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value) {
  return formatDisplayDate(value, value || "Chưa cập nhật");
}

function CompletionBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
      <AlertCircle className="h-3 w-3" />
      Cập nhật hồ sơ
    </span>
  );
}

function ProfileAvatar({ src, name, isUploading, onSelect, error, missing }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const imageFailed = Boolean(src && failedSrc === src);

  return (
    <div className="flex flex-col items-center gap-3">
      <label className="group relative block h-32 w-32 cursor-pointer overflow-hidden rounded-xl border-4 border-[#eceef0] dark:border-white/10 bg-[#d3e4fe]">
        {src && !imageFailed ? (
          <Image
            src={src}
            alt={`Ảnh đại diện của ${name || "người dùng"}`}
            fill
            sizes="128px"
            className="object-cover"
            unoptimized
            onError={() => setFailedSrc(src)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-900 dark:text-white">
            {getInitials(name)}
          </span>
        )}
        <span
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white transition-opacity ${
            isUploading
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Camera className="h-6 w-6" />
          )}
          <span className="text-[11px] font-bold">
            {isUploading ? "Đang tải..." : "Tải ảnh lên"}
          </span>
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onSelect(file);
            event.target.value = "";
          }}
        />
      </label>
      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        JPG, PNG hoặc WebP. Tối đa 2MB.
      </p>
      {missing && <CompletionBadge />}
      {error && (
        <p className="text-center text-xs font-bold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  missing,
  editable,
  error,
  type = "text",
  onChange,
}) {
  return (
    <label className="grid gap-2">
      <span className="flex min-h-5 items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-300">
        {label}
        {missing && <CompletionBadge />}
      </span>
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        readOnly={!editable}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-md border px-3 text-sm font-semibold outline-none transition ${
          editable
            ? "border-[#c5c6cd] dark:border-white/10 bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
            : "cursor-default border-[#e0e3e5] dark:border-white/10 bg-[#f2f4f6] dark:bg-white/5 text-slate-600 dark:text-slate-300"
        } ${error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
      />
      {error && (
        <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
          {error}
        </span>
      )}
    </label>
  );
}

function WorkItem({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex gap-4 rounded-lg bg-[#f7f9fb] dark:bg-white/5 p-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-900 dark:text-white">
          {value || "Chưa cập nhật"}
        </p>
      </div>
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div
      className={`fixed bottom-4 right-4 z-[80] flex w-[min(420px,calc(100vw-2rem))] items-center gap-3 rounded-xl px-4 py-3 text-white shadow-xl ${
        isError ? "bg-rose-700" : "bg-emerald-700"
      }`}
      role={isError ? "alert" : "status"}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <p className="flex-1 text-sm font-bold">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 hover:bg-white/10"
        aria-label="Đóng thông báo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="h-[420px] animate-pulse rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a]" />
      <div className="h-[420px] animate-pulse rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a]" />
    </section>
  );
}

export function ProfilePage() {
  const state = useProfile();

  if (state.isLoading && !state.profile) {
    return (
      <>
        <DashboardPageHeader
          title="Hồ sơ của tôi"
          description="Đang tải thông tin cá nhân và công việc..."
        />
        <LoadingState />
      </>
    );
  }

  const profile = state.profile || {};
  const isMissing = (field) => state.missingFields.includes(field);

  return (
    <>
      <DashboardPageHeader
        title="Hồ sơ của tôi"
        description="Quản lý thông tin cá nhân và thông tin công việc của bạn."
        actions={state.missingFields.length > 0 ? <CompletionBadge /> : null}
      />

      {state.loadError && (
        <div
          className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-yellow-300"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          {state.loadError}
        </div>
      )}

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.9fr)]">
        <article className="rounded-xl border border-[#c5c6cd] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Thông tin cá nhân
            </h2>
            {!state.isEditing ? (
              <button
                type="button"
                onClick={state.beginEditing}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-900 dark:text-white hover:bg-[#f2f4f6] dark:hover:bg-white/5"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={state.cancelEditing}
                  disabled={state.isSaving}
                  className="h-9 rounded-lg px-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-[#f2f4f6] dark:hover:bg-white/5 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={state.saveProfile}
                  disabled={state.isSaving}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {state.isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Lưu thay đổi
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
            <ProfileAvatar
              src={state.avatarPreview || profile.avatarUrl}
              name={profile.fullName}
              isUploading={state.isUploading}
              onSelect={state.uploadAvatar}
              error={state.fieldErrors.avatar}
              missing={isMissing("avatarUrl")}
            />
            <div className="grid content-start gap-5 sm:grid-cols-2">
              <Field
                label="Họ tên"
                value={profile.fullName}
                missing={isMissing("fullName")}
              />
              <Field
                label="Số điện thoại"
                value={state.isEditing ? state.draft.phone : profile.phone}
                missing={isMissing("phone")}
                editable={state.isEditing}
                error={state.fieldErrors.phone}
                type="tel"
                onChange={(event) =>
                  state.updateDraft("phone", event.target.value)
                }
              />
              <div className="sm:col-span-2">
                <Field
                  label="Email"
                  value={state.isEditing ? state.draft.email : profile.email}
                  missing={isMissing("email")}
                  editable={state.isEditing}
                  error={state.fieldErrors.email}
                  type="email"
                  onChange={(event) =>
                    state.updateDraft("email", event.target.value)
                  }
                />
              </div>
              <p className="sm:col-span-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Họ tên được đồng bộ từ hồ sơ nhân sự. Bạn có thể cập nhật SĐT,
                email và ảnh đại diện.
              </p>
            </div>
          </div>
        </article>

        <aside className="rounded-xl border border-[#c5c6cd] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Thông tin công việc
          </h2>
          <div className="mt-7 grid gap-4">
            <WorkItem
              icon={Building2}
              label="Cơ sở phụ trách"
              value={profile.assignedBranch}
              tone="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
            />
            <WorkItem
              icon={BriefcaseBusiness}
              label="Vai trò/Chức vụ"
              value={profile.position}
              tone="bg-slate-100 text-slate-700"
            />
            <WorkItem
              icon={CalendarDays}
              label="Ngày bắt đầu làm việc"
              value={formatDate(profile.startDate)}
              tone="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
          </div>
          <div className="mt-7 rounded-lg border border-dashed border-[#c5c6cd] dark:border-white/10 bg-[#f2f4f6] dark:bg-white/5 p-4 text-xs leading-5 text-slate-600 dark:text-slate-300">
            <strong>Lưu ý:</strong> Thông tin công việc được thiết lập bởi bộ
            phận Nhân sự. Nếu có sai sót, vui lòng liên hệ Admin hệ thống để cập
            nhật.
          </div>
        </aside>
      </section>

      <Toast toast={state.toast} onDismiss={state.dismissToast} />
    </>
  );
}
