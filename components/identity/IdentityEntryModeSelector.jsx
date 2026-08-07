"use client";

import { Keyboard, ScanLine } from "lucide-react";

const MODES = [
  {
    value: "manual",
    label: "Nhập thủ công",
    description: "Tự điền thông tin",
    icon: Keyboard,
  },
  {
    value: "scan",
    label: "Quét CCCD",
    description: "Tự điền từ ảnh CCCD",
    icon: ScanLine,
  },
];

export default function IdentityEntryModeSelector({
  value = "manual",
  onChange,
  disabled = false,
  className = "",
}) {
  return (
    <div className={`sm:col-span-2 ${className}`}>
      <p className="text-xs font-semibold text-[#45474c]">
        Cách nhập thông tin <span className="text-rose-600">*</span>
      </p>
      <div
        className="mt-2 grid gap-2 rounded-lg border border-[#d8dde6] bg-[#f8fafc] p-1.5 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Cách nhập thông tin định danh"
      >
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const selected = value === mode.value;

          return (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange?.(mode.value)}
              className={`flex min-h-16 items-center gap-3 rounded-md border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-[#091426] bg-white text-[#091426] shadow-sm"
                  : "border-transparent bg-transparent text-[#5a6678] hover:bg-white"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${
                  selected ? "bg-[#091426] text-white" : "bg-white text-[#45474c]"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{mode.label}</span>
                <span className="mt-0.5 block text-xs leading-5">{mode.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
