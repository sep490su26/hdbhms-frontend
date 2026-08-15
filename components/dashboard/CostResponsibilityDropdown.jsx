"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const COST_RESPONSIBILITY_OPTIONS = [
  { value: "OWNER", label: "Chủ trọ chịu" },
  { value: "TENANT", label: "Khách thuê chịu" },
];

export function normalizeCostResponsibility(value) {
  const normalized = String(value || "OWNER").trim().toUpperCase();

  // Keep old records readable after removing the duplicate legacy options.
  if (
    normalized === "PROPERTY" ||
    normalized === "OPERATION" ||
    normalized === "UNDECIDED"
  ) {
    return "OWNER";
  }

  return COST_RESPONSIBILITY_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "OWNER";
}

export const COST_RESPONSIBILITY_LABELS = Object.fromEntries(
  COST_RESPONSIBILITY_OPTIONS.map((option) => [option.value, option.label]),
);

export default function CostResponsibilityDropdown({
  value,
  onChange,
  disabled = false,
  className,
}) {
  const normalizedValue = normalizeCostResponsibility(value);
  const selectedOption = COST_RESPONSIBILITY_OPTIONS.find(
    (option) => option.value === normalizedValue,
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-left text-sm font-semibold text-slate-900 outline-none transition hover:bg-slate-50 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:hover:bg-white/5 dark:disabled:bg-white/5 dark:disabled:text-slate-500",
            className,
          )}
          aria-label="Trách nhiệm chi phí"
        >
          <span className="truncate">{selectedOption.label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg border border-[#d9dde5] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#0f172a]"
      >
        {COST_RESPONSIBILITY_OPTIONS.map((option) => {
          const isSelected = option.value === normalizedValue;

          return (
            <DropdownMenuItem
              key={option.value}
              asChild
              className="rounded-md p-0 focus:bg-transparent"
            >
              <button
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f1f3f5] dark:text-slate-200 dark:hover:bg-white/5",
                  isSelected && "bg-[#f1f3f5] dark:bg-white/5",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {option.label}
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
