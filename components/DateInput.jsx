"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { vi } from "date-fns/locale";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function isoToDisplay(value) {
  if (!value) return "";
  const text = String(value).slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function isoToDate(value) {
  const text = String(value || "").slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function dateToIso(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function defaultStartMonth() {
  const today = new Date();
  return new Date(today.getFullYear() - 100, 0, 1);
}

function defaultEndMonth() {
  const today = new Date();
  return new Date(today.getFullYear() + 10, 11, 31);
}

function displayToIso(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, rawDay, rawMonth, rawYear] = match;
  const day = Number(rawDay);
  const month = Number(rawMonth);
  const year = Number(rawYear);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${rawYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeDateValue(value) {
  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return dateToIso(isoToDate(text));
  return displayToIso(text) || "";
}

function formatDisplayInput(value) {
  const isoValue = normalizeDateValue(value);
  if (isoValue) return isoToDisplay(isoValue);

  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function buildEvent(originalEvent, value, name) {
  return {
    ...originalEvent,
    target: {
      ...(originalEvent?.target || {}),
      name,
      value,
    },
    currentTarget: {
      ...(originalEvent?.currentTarget || {}),
      name,
      value,
    },
  };
}

export function DateInput({
  value,
  defaultValue = "",
  name,
  onChange,
  onBlur,
  placeholder = "dd/mm/yyyy",
  inputMode = "numeric",
  pattern = "\\d{1,2}/\\d{1,2}/\\d{4}",
  min,
  max,
  className,
  wrapperClassName,
  disabled,
  required,
  ...props
}) {
  const initialValue = value ?? defaultValue;
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(() =>
    isoToDisplay(normalizeDateValue(initialValue)) || String(initialValue || ""),
  );
  const [fieldValue, setFieldValue] = useState(() =>
    normalizeDateValue(initialValue) || String(initialValue || ""),
  );

  useEffect(() => {
    if (value === undefined) return;
    const normalizedValue = normalizeDateValue(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayValue(isoToDisplay(normalizedValue) || String(value || ""));
    setFieldValue(normalizedValue || String(value || ""));
  }, [value]);

  function updateValue(event, nextDisplayValue, callback, notifyOnInvalid) {
    const isoValue = normalizeDateValue(nextDisplayValue);
    const nextFieldValue = isoValue || (nextDisplayValue.trim() ? nextDisplayValue : "");

    setDisplayValue(isoValue ? isoToDisplay(isoValue) : nextDisplayValue);
    setFieldValue(nextFieldValue);

    if (isoValue || notifyOnInvalid || !nextDisplayValue.trim()) {
      callback?.(buildEvent(event, isoValue || nextFieldValue, name));
    }
  }

  function commit(event, { notifyOnInvalid = false } = {}) {
    const isoValue = normalizeDateValue(displayValue);
    const nextValue = isoValue || (displayValue.trim() ? displayValue : "");

    if (isoValue) {
      setDisplayValue(isoToDisplay(isoValue));
      setFieldValue(isoValue);
      if (min && isoValue < min) {
        onChange?.(buildEvent(event, isoValue, name));
        onBlur?.(buildEvent(event, isoValue, name));
        return;
      }
      if (max && isoValue > max) {
        onChange?.(buildEvent(event, isoValue, name));
        onBlur?.(buildEvent(event, isoValue, name));
        return;
      }
      onChange?.(buildEvent(event, isoValue, name));
    } else if (notifyOnInvalid || !displayValue.trim()) {
      setFieldValue(nextValue);
      onChange?.(buildEvent(event, nextValue, name));
    }

    onBlur?.(buildEvent(event, nextValue, name));
  }

  function handleCalendarSelect(date) {
    const isoValue = dateToIso(date);
    if (!isoValue) return;

    setIsOpen(false);
    setDisplayValue(isoToDisplay(isoValue));
    setFieldValue(isoValue);
    onChange?.(buildEvent(undefined, isoValue, name));
    onBlur?.(buildEvent(undefined, isoValue, name));
  }

  const selectedDate = isoToDate(normalizeDateValue(fieldValue));
  const startMonth = isoToDate(min) || defaultStartMonth();
  const endMonth = isoToDate(max) || defaultEndMonth();
  const disabledDate = (date) => {
    const isoValue = dateToIso(date);
    return Boolean((min && isoValue < min) || (max && isoValue > max));
  };

  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      {name && <input type="hidden" name={name} value={fieldValue} />}
      <input
        {...props}
        type="text"
        inputMode={inputMode}
        pattern={pattern}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        value={displayValue}
        onChange={(event) => {
          const nextDisplayValue = formatDisplayInput(event.target.value);
          updateValue(event, nextDisplayValue, onChange, false);
        }}
        onBlur={(event) => commit(event, { notifyOnInvalid: true })}
        className={cn("w-full", className, "pr-11")}
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#45474c] transition hover:bg-[#f5f3f4] hover:text-[#091426] disabled:pointer-events-none disabled:opacity-50"
            aria-label="Chọn ngày"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            reverseYears
            selected={selectedDate}
            defaultMonth={selectedDate}
            disabled={disabledDate}
            onSelect={handleCalendarSelect}
            locale={vi}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateInput;
