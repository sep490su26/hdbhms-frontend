"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTHS = Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`);

function parseMonth(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12
    ? { year: Number(match[1]), month }
    : null;
}

export default function VietnameseMonthPicker({ value, onChange, disabled = false }) {
  const selected = useMemo(() => parseMonth(value), [value]);
  const [open, setOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(selected?.year || new Date().getFullYear());

  const displayValue = selected
    ? `Tháng ${String(selected.month).padStart(2, "0")}/${selected.year}`
    : "Chọn kỳ hóa đơn";

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && selected?.year) setVisibleYear(selected.year);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-left text-sm font-semibold text-slate-900 outline-none transition hover:bg-slate-50 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:hover:bg-white/5 dark:disabled:bg-white/5"
          aria-label="Chọn kỳ hóa đơn gộp"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate">{displayValue}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#0f172a]"
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setVisibleYear((year) => year - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Năm trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            Năm {visibleYear}
          </span>
          <button
            type="button"
            onClick={() => setVisibleYear((year) => year + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Năm sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((monthLabel, index) => {
            const month = index + 1;
            const isSelected = selected?.year === visibleYear && selected?.month === month;
            return (
              <button
                key={monthLabel}
                type="button"
                onClick={() => {
                  onChange(`${visibleYear}-${String(month).padStart(2, "0")}`);
                  setOpen(false);
                }}
                className={`flex h-10 items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold transition ${
                  isSelected
                    ? "bg-[#1e40af] text-white shadow-sm"
                    : "text-slate-700 hover:bg-blue-50 hover:text-[#1e40af] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-blue-300"
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
                {monthLabel}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
