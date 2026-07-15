"use client";

import { Check, Droplets, Zap, X } from "lucide-react";

function UtilityNumberInput({
  label,
  name,
  value,
  suffix,
  disabled,
  onChange,
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(name, event.target.value)}
          className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 pr-24 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1e40af] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-white/10 dark:bg-[#0b1220] dark:text-white dark:focus:ring-blue-500/10"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}

export function FacilityUtilitySettingsDialog({
  state,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!state.isOpen) return null;

  const disabled = state.loading || state.saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Cài đặt giá điện nước"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#0f172a]">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Giá điện nước
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {state.facility?.name || "Cơ sở"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={state.saving}
            aria-label="Đóng"
            className="rounded-md p-2 text-slate-600 hover:bg-[#f2f4f6] disabled:opacity-60 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-6">
          {state.loading ? (
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Đang tải giá điện nước...
            </div>
          ) : (
            <form id="facility-utility-settings-form" className="grid gap-4" onSubmit={onSubmit}>
              {state.error ? (
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  {state.error}
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <section className="grid gap-4 rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      <Zap className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Điện
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Áp dụng cho toàn bộ phòng trong cơ sở này.
                      </p>
                    </div>
                  </div>
                  <UtilityNumberInput
                    label="Đơn giá điện"
                    name="electricityUnitPrice"
                    suffix="VNĐ/kWh"
                    value={state.values.electricityUnitPrice}
                    disabled={disabled}
                    onChange={onChange}
                  />
                  <UtilityNumberInput
                    label="Định mức miễn phí"
                    name="electricityFreeAllowance"
                    suffix="kWh"
                    value={state.values.electricityFreeAllowance}
                    disabled={disabled}
                    onChange={onChange}
                  />
                </section>

                <section className="grid gap-4 rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-sky-50 p-2 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                      <Droplets className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Nước
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Áp dụng cho toàn bộ phòng trong cơ sở này.
                      </p>
                    </div>
                  </div>
                  <UtilityNumberInput
                    label="Đơn giá nước"
                    name="waterUnitPrice"
                    suffix="VNĐ/m³"
                    value={state.values.waterUnitPrice}
                    disabled={disabled}
                    onChange={onChange}
                  />
                  <UtilityNumberInput
                    label="Định mức miễn phí"
                    name="waterFreeAllowance"
                    suffix="m³"
                    value={state.values.waterFreeAllowance}
                    disabled={disabled}
                    onChange={onChange}
                  />
                </section>
              </div>
            </form>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#e2e8f0] px-6 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={state.saving}
            className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="facility-utility-settings-form"
            disabled={disabled}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#2563eb]"
          >
            <Check className="h-4 w-4" />
            {state.saving ? "Đang lưu..." : "Lưu giá"}
          </button>
        </div>
      </div>
    </div>
  );
}
