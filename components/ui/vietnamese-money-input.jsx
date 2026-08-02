"use client";

import { cn } from "@/lib/utils";

const moneyFormatter = new Intl.NumberFormat("vi-VN");

function normalizeVietnameseMoneyValue(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatVietnameseMoney(value) {
  const digits = normalizeVietnameseMoneyValue(value);
  if (!digits) return "";
  return moneyFormatter.format(Number(digits));
}

function VietnameseMoneyInput({
  className,
  suffix,
  suffixClassName,
  type = "text",
  value,
  onChange,
  onValueChange,
  ...props
}) {
  const suffixPadding = suffix && String(suffix).length > 4 ? "pr-24" : "pr-14";

  function handleChange(event) {
    onChange?.(event);
    onValueChange?.(normalizeVietnameseMoneyValue(event.target.value));
  }

  const input = (
    <input
      type={type}
      inputMode="numeric"
      value={formatVietnameseMoney(value)}
      onChange={handleChange}
      className={cn(className, suffixPadding)}
      {...props}
    />
  );

  if (!suffix) return input;

  return (
    <span className="relative block">
      {input}
      <span
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400",
          suffixClassName,
        )}
      >
        {suffix}
      </span>
    </span>
  );
}

export {
  VietnameseMoneyInput,
  formatVietnameseMoney,
  normalizeVietnameseMoneyValue,
};
