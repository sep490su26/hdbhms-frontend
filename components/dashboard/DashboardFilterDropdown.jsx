"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardFilterDropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) {
  const selectedOption = options.find(
    (option) => String(option.value) === String(value),
  );

  return (
    <div className="grid min-w-0 gap-1.5">
      {label ? (
        <span className="text-[11px] font-semibold text-[#8490a5] dark:text-slate-400">
          {label}
        </span>
      ) : null}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="inline-flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[#c8ceda] bg-white px-3 text-left text-sm font-semibold text-[#0f1d33] outline-none transition hover:bg-[#f6f8fc] focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10 disabled:cursor-not-allowed disabled:bg-[#eef2f7] disabled:text-[#8490a5] dark:border-white/10 dark:bg-[#020817] dark:text-white dark:hover:bg-white/10 dark:disabled:bg-white/5 dark:disabled:text-slate-500"
          >
            <span className="truncate">
              {selectedOption?.label || label}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#687184] dark:text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] min-w-48 overflow-y-auto rounded-lg border border-[#d9dde5] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#0f172a]"
        >
          {options.map((option) => {
            const selected = String(option.value) === String(value);
            return (
              <DropdownMenuItem
                key={option.value}
                asChild
                className="rounded-md p-0 focus:bg-transparent"
              >
                <button
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#0f1d33] transition hover:bg-[#f3f6fb] dark:text-slate-200 dark:hover:bg-white/10 ${
                    selected ? "bg-[#f3f6fb] dark:bg-white/10" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {option.label}
                  </span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-[#1e40af] dark:text-blue-300" />
                  )}
                </button>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
